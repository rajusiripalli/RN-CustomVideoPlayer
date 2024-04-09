import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  PanResponder,
  Animated,
  Modal,
  Easing,
  AppState,
  BackHandler,
  Dimensions,
  StatusBar,
  ScrollView,
  DeviceEventEmitter,
} from 'react-native';
import React, {useEffect, useRef, useState} from 'react';
import Video from 'react-native-video';
import {Icon} from '@rneui/themed';
import Slider from '@react-native-community/slider';
import responsiveSize from '../styles/responsiveSize';
import Orientation from 'react-native-orientation-locker';
import {VolumeManager} from 'react-native-volume-manager';
import DeviceBrightness from '@adrianso/react-native-device-brightness';
import PipHandler, {usePipModeListener} from 'react-native-pip-android';
import {useNavigation} from '@react-navigation/native';
import _ from 'lodash';
import {
  CastButton,
  useCastState,
  useMediaStatus,
  useRemoteMediaClient,
  useStreamPosition,
} from 'react-native-google-cast';
import RNFetchBlob from 'rn-fetch-blob';
import {
  ThumbnailPreview,
  ThumbnailPreviewConfig,
} from '../library/thumbnailSeekbar';
import LinearGradient from 'react-native-linear-gradient';
import {TAB_COLOR} from '../constants';

const AdvancePlayer = ({
  hideVideoPlayer,
  videoSource,
  saveContinueWatch,
  startTime,
  onEnd,
  fullscreen,
  resolutions,
  thumbnailURL,
  baseURL,
  showAd,
  preAds,
  setShowAd,
  setPreAds,
  analyticsCallback,
  subscriptionId,
  skipOptions,
  title,
  genres,
  rating,
  isOfflineVideo,
}) => {
  const {height, width, scale, moderateScale, verticalScale} = responsiveSize();
  const navigation = useNavigation();
  const videoURL = videoSource;
  const [showControls, setShowControls] = useState(true);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(null);
  const [seekInterval, setSeekInterval] = useState(0);
  const [showForwardSeek, setShowForwardSeek] = useState(false);
  const [showBackwardSeek, setShowBackwardSeek] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [prevShowFullscreen, setPrevShowFullscreen] = useState(false);
  const [showThumbnailSeekBar, setShowThumbnailSeekBar] = useState(false);
  const [fitToScreen, setFitToScreen] = useState(false);
  const [volume, setVolume] = useState(0);
  const [brightness, setBrightness] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [pan] = useState(new Animated.ValueXY());
  const [isAutoRotateEnabled, setAutoRotateEnabled] = useState(false);
  const [interactingWithControls, setInteractingWithControls] = useState(false);
  const [isInPipMode, setIsInPipMode] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [selectedSetting, setSelectedSetting] = useState('Quality');
  const [selectedResolution, setSelectedResolution] = useState(null);
  const [showSkipIntro, setShowSkipIntro] = useState(false);
  const [showSkipCredits, setShowSkipCredits] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isCasting, setIsCasting] = useState(false);
  const [adIntervals, setAdIntervals] = useState([]);
  const [shownAdIndices, setShownAdIndices] = useState([]);
  const [count, setCount] = useState(0);
  const [showTitle, setShowTitle] = useState(true);

  const videoRef = useRef(null);
  const sliderRef = useRef();
  const resetTimer = useRef(null);
  const slidingTimeout = useRef(null);
  const appState = useRef(AppState.currentState);
  const controlOpacity = useRef(new Animated.Value(1)).current;
  const fadeAnim = new Animated.Value(1);
  const inPipMode = usePipModeListener();
  const client = useRemoteMediaClient();
  const castState = useCastState();
  const status = useMediaStatus();
  const position = useStreamPosition();

  // console.log(videoRef.current);

  // useEffect(() => {
  //   if (!subscriptionId) {
  //     setPreAds(true);
  //     setPaused(true);
  //     setShowControls(false);
  //   }
  // }, []);

  useEffect(() => {
    const adFailSubscription = DeviceEventEmitter.addListener(
      'onAdFailedToLoad',
      () => {
        console.log('adFailed');
        setPreAds(false);
        setPaused(false);
      },
    );

    const adClosedSubscription = DeviceEventEmitter.addListener(
      'onAdClosed',
      () => {
        console.log('adClosed');
        setPreAds(false);
        setPaused(false);
      },
    );

    return () => {
      adClosedSubscription.remove();
      adFailSubscription.remove();
    };
  }, [preAds]);

  useEffect(() => {
    const adFailSubscription = DeviceEventEmitter.addListener(
      'onAdFailedToLoad',
      () => {
        console.log('adFailed');
        setShowAd(false);
        setPaused(false);
      },
    );
    const adClosedSubscription = DeviceEventEmitter.addListener(
      'onAdClosed',
      () => {
        console.log('adClosed');
        setShowAd(false);
        setPaused(false);
      },
    );

    return () => {
      adClosedSubscription.remove();
      adFailSubscription.remove();
    };
  }, [showAd]);

  useEffect(() => {
    const unsubscribeFocus = navigation.addListener('focus', () => {
      setPaused(false);
    });

    const unsubscribeBlur = navigation.addListener('blur', () => {
      setPaused(true);
    });

    return () => {
      unsubscribeFocus();
      unsubscribeBlur();
    };
  }, [navigation]);

  useEffect(() => {
    if (castState === 'connected') {
      setIsConnected(true);
    } else {
      setIsConnected(false);
      setIsCasting(false);
    }
  }, [castState]);

  useEffect(() => {
    if (isConnected && videoURL != '' && client) {
      client?.loadMedia({
        mediaInfo: {
          contentUrl: videoURL,
          contentType: 'video/m3u8',
          streamDuration: progress?.seekableDuration,
          metadata: {
            title: title,
          },
        },
        startTime: progress?.currentTime,
      });
      client?.onMediaPlaybackStarted(() => {
        setIsCasting(true);
      });
      client?.onMediaProgressUpdated(x => {
        setProgress({...progress, currentTime: x});
      });
      client?.onMediaPlaybackEnded(() => console.log('playback ended'));
    }
  }, [isConnected, client]);

  useEffect(() => {
    if (status?.playerState === 'paused') {
      setPaused(true);
    } else {
      setPaused(false);
    }
  }, [status]);

  useEffect(() => {
    if (!isCasting && !isConnected && progress?.currentTime) {
      videoRef.current?.seek(progress?.currentTime);
    }
  }, [isCasting, isConnected]);

  useEffect(() => {
    if (isCasting) {
      if (paused) {
        client?.pause();
      } else {
        client?.play();
      }
    }
  }, [paused, isCasting]);

  useEffect(() => {
    if (isCasting) {
      client?.seek({position: progress?.currentTime});
    }
  }, [isCasting]);

  const clearCache = async () => {
    try {
      const cacheDirectory = RNFetchBlob.fs.dirs.CacheDir;
      await RNFetchBlob.fs.unlink(cacheDirectory);
      console.log('Cache cleared');
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  };

  useEffect(() => {
    setIsInPipMode(inPipMode);
    if (!isInPipMode) {
      setPrevShowFullscreen(showFullscreen);
    }

    if (inPipMode) {
      setShowFullscreen(false);
      setPaused(false);
    } else if (!inPipMode && !showFullscreen) {
      setShowFullscreen(prevShowFullscreen);
    }
    PipHandler.onPipModeChanged(x => {
      if (!x) {
        setPaused(false);
      }
    });
  }, [inPipMode, isInPipMode, prevShowFullscreen]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'background' && inPipMode) {
        setPaused(false);
      }

      if (nextAppState === 'background' && !inPipMode) {
        setPaused(true);
      }
      if (nextAppState === 'active' && paused) {
        setPaused(false);
      }

      if (nextAppState === 'background') {
        PipHandler.enterPipMode(350, 214);
      }

      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    const backAction = () => {
      if (isOfflineVideo) {
        Orientation.lockToPortrait();
        StatusBar.setHidden(false);
        clearCache();
        navigation.goBack();
        return true;
      } else {
        if (showFullscreen) {
          if (paused) {
            setPaused(false);
          }
          Orientation.lockToPortrait();
          StatusBar.setHidden(false);
          setShowFullscreen(!showFullscreen);
          return true;
        } else if (!showFullscreen) {
          Orientation.lockToPortrait();
          StatusBar.setHidden(false);
          if (progress?.currentTime !== progress?.seekableDuration) {
            handleSaveContinueWatch();
          }
          clearCache();
          navigation.goBack();
          return true;
        } else {
          return false;
        }
      }
    };

    BackHandler.addEventListener('hardwareBackPress', backAction);

    return () => {
      BackHandler.removeEventListener('hardwareBackPress', backAction);
    };
  }, [showFullscreen]);

  const transferFullScreen = () => {
    if (inPipMode) {
      fullscreen(true);
    } else {
      fullscreen(showFullscreen);
    }
  };

  useEffect(() => {
    transferFullScreen();
  }, [showFullscreen, inPipMode]);

  useEffect(() => {
    if (isOfflineVideo) {
      setShowFullscreen(true);
      Orientation.lockToLandscape();
      StatusBar.setHidden(true);
      videoRef.current.presentFullscreenPlayer();
    } else {
      setShowFullscreen(false);
    }
  }, [isOfflineVideo]);

  useEffect(() => {
    ThumbnailPreviewConfig.initCacheImage(RNFetchBlob);
    if (thumbnailURL !== '' && baseURL !== '') {
      ThumbnailPreviewConfig.preFetchVttImage(thumbnailURL, baseURL);
    }
    return () => {
      ThumbnailPreviewConfig.removeCacheImage();
    };
  }, [thumbnailURL]);

  useEffect(() => {
    let countInterval;
    const handleVideoPlayback = () => {
      if (!paused) {
        countInterval = setInterval(() => {
          setCount(prevCount => prevCount + 1);
        }, 1000);
      } else {
        clearInterval(countInterval);
        setCount(0);
      }
    };
    handleVideoPlayback();

    return () => {
      clearInterval(countInterval);
    };
  }, [paused]);

  useEffect(() => {
    if (paused) {
      analyticsCallback('pb_end', count, '02');
    } else {
      analyticsCallback('pb_start', 1, '01');
    }
  }, [paused]);

  const handleSaveContinueWatch = () => {
    const lastWatchedAt = progress?.currentTime;
    saveContinueWatch(lastWatchedAt, 'playing');
  };

  const changeResolution = async resolutionValue => {
    setSelectedResolution(resolutionValue);
    setSettingsVisible(false);
    setPaused(false);
  };

  const handleVideoLoad = x => {
    setIsLoading(false);
    console.log(x);

    videoRef.current.seek(startTime);
    // analyticsCallback("pb_start", 1, "01");
  };

  const triggeredPercentages = useRef({
    percent10: false,
    percent25: false,
    percent50: false,
    percent75: false,
    percent90: false,
  });

  const handleVideoProgress = x => {
    if (x.currentTime >= 0 && x.seekableDuration >= 0) {
      setProgress(x);
      setIsLoading(false);
      const currentTimeInSeconds = Math.floor(x.currentTime);
      const startSkipIntroTime = Math.floor(skipOptions?.introStart);
      const endSkipIntroTime = Math.floor(skipOptions?.introEnd);
      if (
        currentTimeInSeconds == startSkipIntroTime &&
        startSkipIntroTime > 0
      ) {
        setShowSkipIntro(true);
      }
      if (showSkipIntro && currentTimeInSeconds > endSkipIntroTime) {
        setShowSkipIntro(false);
      }
      const startSkipCreditsTime = Math.floor(skipOptions?.creditStart);
      if (
        currentTimeInSeconds == startSkipCreditsTime &&
        startSkipCreditsTime > 0
      ) {
        setShowSkipCredits(true);
      }

      const duration = Math.floor(x?.seekableDuration);

      const percent10 = Math.floor(duration * 0.1);
      const percent25 = Math.floor(duration * 0.25);
      const percent50 = Math.floor(duration * 0.5);
      const percent75 = Math.floor(duration * 0.75);
      const percent90 = Math.floor(duration * 0.9);

      if (
        currentTimeInSeconds === percent10 &&
        !triggeredPercentages.current.percent10
      ) {
        analyticsCallback('pb_10', percent10);
        triggeredPercentages.current.percent10 = true;
      } else if (
        currentTimeInSeconds === percent25 &&
        !triggeredPercentages.current.percent25
      ) {
        analyticsCallback('pb_25', percent25);
        triggeredPercentages.current.percent25 = true;
      } else if (
        currentTimeInSeconds === percent50 &&
        !triggeredPercentages.current.percent50
      ) {
        analyticsCallback('pb_50', percent50);
        triggeredPercentages.current.percent50 = true;
      } else if (
        currentTimeInSeconds === percent75 &&
        !triggeredPercentages.current.percent75
      ) {
        analyticsCallback('pb_75', percent75);
        triggeredPercentages.current.percent75 = true;
      } else if (
        currentTimeInSeconds === percent90 &&
        !triggeredPercentages.current.percent90
      ) {
        analyticsCallback('pb_90', percent90);
        triggeredPercentages.current.percent90 = true;
      }
    }

    // if (!subscriptionId) {
    //   adIntervals.forEach((element) => {
    //     if (
    //       x?.currentTime >= element &&
    //       !showFullscreen &&
    //       !shownAdIndices.includes(element)
    //     ) {
    //       setShowAd(true);
    //       setPaused(true);
    //       setShowControls(false);
    //       setShownAdIndices((prevState) => [...prevState, element]);
    //       adIntervals.shift();
    //     } else if (showFullscreen) {
    //       setShowAd(false);
    //       setPaused(false);
    //     }
    //   });
    // }
  };

  const calculateAdPositions = videoDuration => {
    let numAds;
    if (videoDuration < 600) {
      numAds = 1;
    } else if (videoDuration < 1800) {
      numAds = Math.floor(videoDuration / 900);
    } else {
      numAds = Math.floor(videoDuration / 1500);
    }

    const adPositions = [];

    if (videoDuration < 600) {
      adPositions.push(Math.random() * (videoDuration - 60));
      numAds--;
    }

    const adInterval = videoDuration / (numAds + 1);

    for (let i = 1; i <= numAds; i++) {
      const minPosition = adInterval * i;
      const maxPosition = minPosition + 600;

      const randomPosition = Math.min(
        Math.random() * (maxPosition - minPosition) + minPosition,
        videoDuration,
      );

      adPositions.push(randomPosition);
    }

    adPositions.sort((a, b) => a - b);

    setAdIntervals(adPositions);
  };

  // useEffect(() => {
  //   if (!subscriptionId) {
  //     calculateAdPositions(parseInt(progress?.seekableDuration));
  //   }
  // }, [progress?.seekableDuration]);

  const resolutionText = {
    2160: '4K',
    1080: 'Full HD',
    720: 'HD',
    480: 'SD',
    360: 'Data Saver',
    240: 'Low',
  };
  const resolutionTextDetails = {
    2160: '(Up to 2160p)',
    1080: '(Up to 1080p)',
    720: '(Up to 720p)',
    480: '(480p)',
    360: '(360p)',
    240: '(240p)',
  };

  const toggleSettings = () => {
    setSettingsVisible(!settingsVisible);
    if (!paused) {
      setPaused(true);
    }
  };

  const handleSettingSelection = name => {
    setSelectedSetting(name);
  };

  const handleControlInteraction = isInteracting => {
    setInteractingWithControls(isInteracting);

    clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => {
      setInteractingWithControls(false);
    }, 1000);
  };

  const handleShowControls = () => {
    setShowControls(!showControls || paused);
    setShowThumbnailSeekBar(false);

    Animated.timing(controlOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  useEffect(() => {
    if (!paused && !interactingWithControls) {
      const timer = setTimeout(() => {
        setShowControls(false);
        setShowThumbnailSeekBar(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
    if (paused && !interactingWithControls) {
      const timer = setTimeout(() => {
        setShowThumbnailSeekBar(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [
    paused,
    interactingWithControls,
    showControls,
    settingsVisible,
    showFullscreen,
    showThumbnailSeekBar,
  ]);

  const handleSeek = forward => {
    const direction = forward ? 1 : -1;
    if (seekInterval === 0) {
      const seekTime = progress?.currentTime + 10 * direction;
      const newSeekTime = Math.min(
        Math.max(seekTime, 0),
        progress?.seekableDuration,
      );

      setProgress({...progress, currentTime: newSeekTime});
      videoRef.current.seek(newSeekTime);
      if (isCasting) {
        client?.seek({
          position: newSeekTime,
        });
      }
    } else {
      const seekTime = progress?.currentTime + seekInterval * direction;
      const newSeekTime = Math.min(
        Math.max(seekTime, 0),
        progress?.seekableDuration,
      );

      setProgress({...progress, currentTime: newSeekTime});
      videoRef.current.seek(newSeekTime);
      if (isCasting) {
        client?.seek({
          position: newSeekTime,
        });
      }
    }
  };

  const startSeeking = forward => {
    setInteractingWithControls(true);
    setSeekInterval(seekInterval + 10);
    handleSeek(forward);

    if (forward) {
      setShowForwardSeek(true);
      setShowBackwardSeek(false);
    } else {
      setShowForwardSeek(false);
      setShowBackwardSeek(true);
    }

    clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => {
      setSeekInterval(0);
      setShowForwardSeek(false);
      setShowBackwardSeek(false);
      setInteractingWithControls(false);
    }, 1000);
  };

  useEffect(() => {
    const intervalId = setInterval(() => {
      const checkAutoRotate = async () => {
        try {
          Orientation.getAutoRotateState(state => {
            setAutoRotateEnabled(state);
          });
        } catch (error) {}
      };
      checkAutoRotate();
    }, 3000);

    return () => clearInterval(intervalId);
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderMove: (_, gestureState) => {
        const {dy} = gestureState;
        if (dy < -50) {
          setShowFullscreen(true);
          Animated.timing(pan, {
            toValue: {x: 0, y: dy},
            useNativeDriver: false,
          }).start();
        }
        if (dy > 50) {
          setShowFullscreen(false);
          Animated.timing(pan, {
            toValue: {x: 0, y: dy},
            useNativeDriver: false,
          }).start();
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const {dy} = gestureState;
        if (dy < -50) {
          handleFullScreen();
        }
        if (dy > 50) {
          if (paused) {
            setPaused(false);
          }
          Orientation.lockToPortrait();
          StatusBar.setHidden(false);
          videoRef.current.dismissFullscreenPlayer();
        }
        Animated.timing(pan, {
          toValue: {x: 0, y: 0},
          useNativeDriver: false,
        }).start();
      },
    }),
  ).current;

  useEffect(() => {
    (async () => {
      const deviceBrightness =
        await DeviceBrightness.getSystemBrightnessLevel();
      setBrightness(deviceBrightness / 10);
      console.log(deviceBrightness);
    })();
  }, []);

  const handleBrightnessChange = async value => {
    await DeviceBrightness.setBrightnessLevel(value);
    setBrightness(value);
    handleControlInteraction(true);
  };

  useEffect(() => {
    (async () => {
      try {
        await VolumeManager.showNativeVolumeUI({enabled: true});
        const {music} = await VolumeManager.getVolume();
        setVolume(music);
      } catch (error) {
        console.error('Error getting device volume:', error);
      }
    })();

    VolumeManager.addVolumeListener(result => {
      handleVolumeChange(result.music);
    });
  }, []);

  const handleVolumeChange = async value => {
    try {
      await VolumeManager.showNativeVolumeUI({enabled: true});
      await VolumeManager.setVolume(value);
      setVolume(value);
      handleControlInteraction(true);
    } catch (error) {
      console.error('Error setting device volume:', error);
    }
  };

  const formatTime = sec => {
    const hours = parseInt(sec / 3600)
      .toString()
      .padStart(2, '0');
    const minutes = parseInt((sec % 3600) / 60)
      .toString()
      .padStart(2, '0');
    const seconds = (Math.trunc(sec) % 60).toString().padStart(2, '0');

    if (hours !== '00') {
      return `${hours}:${minutes}:${seconds}`;
    } else {
      return `${minutes}:${seconds}`;
    }
  };

  const handleFullScreen = () => {
    setShowFullscreen(!showFullscreen);
    if (!showFullscreen) {
      if (paused) {
        setPaused(false);
      }
      Orientation.lockToLandscape();
      StatusBar.setHidden(true);
      videoRef.current.presentFullscreenPlayer();
    } else {
      if (paused) {
        setPaused(false);
      }
      Orientation.lockToPortrait();
      StatusBar.setHidden(false);
      videoRef.current.dismissFullscreenPlayer();
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowTitle(false);
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 2000,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }).start();
    }, 10000);

    return () => clearTimeout(timer);
  }, []);

  const renderTopView = () => {
    return (
      <View style={styles.topView}>
        {!isOfflineVideo && showTitle ? (
          <Animated.View
            style={{
              flexDirection: 'row',
              backgroundColor: 'rgba(0,0,0,0.5)',
              opacity: fadeAnim,
              maxWidth: '90%',
            }}>
            <LinearGradient
              colors={['#e00d0d', '#780e0e', '#3f0808']}
              style={{
                height: 'auto',
                width: showFullscreen ? scale(4) : scale(5),
              }}
            />
            <View style={{marginHorizontal: scale(7)}}>
              <Text style={{color: '#ffffff', fontSize: 14, fontWeight: '700'}}>
                {title}
              </Text>
              {rating !== '' && rating !== null && (
                <Text
                  style={{color: '#ffffff', fontSize: 12, fontWeight: '600'}}>
                  {rating}
                </Text>
              )}
              <Text style={{color: '#ffffff', fontSize: 10}}>
                {genres.join(', ')}
              </Text>
            </View>
          </Animated.View>
        ) : (
          <TouchableOpacity
            style={{
              padding: scale(5),
              borderRadius: 100,
            }}
            onPress={() => {
              if (isOfflineVideo) {
                Orientation.lockToPortrait();
                clearCache();
                hideVideoPlayer(count);
              } else {
                if (showFullscreen) {
                  if (paused) {
                    setPaused(false);
                  }
                  setShowFullscreen(!showFullscreen);
                  Orientation.lockToPortrait();
                  StatusBar.setHidden(false);
                } else {
                  if (progress.currentTime !== progress?.seekableDuration) {
                    handleSaveContinueWatch();
                  }
                  clearCache();
                  hideVideoPlayer(count);
                }
              }
            }}>
            <Icon
              name="arrowleft"
              type="antdesign"
              color={'#FFFFFF'}
              size={28}
            />
          </TouchableOpacity>
        )}
        <CastButton
          style={{
            width: 24,
            height: 24,
            tintColor: '#FFFFFF',
            position: 'absolute',
            right: scale(25),
          }}
        />
      </View>
    );
  };

  const renderMiddleView = () => {
    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '50%',
        }}>
        {showFullscreen && !showThumbnailSeekBar && (
          <View
            style={{
              position: 'absolute',
              left: -15,
              flexDirection: 'row',
              transform: [{rotate: '90deg'}],
              alignItems: 'center',
              padding: 5,
            }}>
            <Icon
              name="sunny-outline"
              type="ionicon"
              color={'#FFFFFF'}
              size={moderateScale(14)}
            />

            <Slider
              style={{
                transform: [{rotate: '-180deg'}],
                width: scale(60),
              }}
              vertical={true}
              minimumValue={0}
              maximumValue={1}
              step={0.0625}
              minimumTrackTintColor="#FFFFFF"
              maximumTrackTintColor="#B2ACAC"
              thumbTintColor="transparent"
              onValueChange={handleBrightnessChange}
              value={brightness}
              onSlidingStart={() => handleControlInteraction(true)}
            />
          </View>
        )}
        {!showThumbnailSeekBar && (
          <View
            style={[
              styles.controllerView,
              {width: showFullscreen ? '60%' : '80%'},
            ]}>
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                padding: scale(5),
                alignItems: 'center',
                justifyContent: 'center',
                width: '30%',
                position: 'absolute',
                left: 0,
              }}
              onPress={() => startSeeking(false)}>
              <Icon
                name="chevron-double-left"
                type="material-community"
                size={showFullscreen ? moderateScale(25) : moderateScale(30)}
                color={'#FFFFFF'}
              />
              {showBackwardSeek && (
                <Text style={{color: '#d6dddd'}}>-{seekInterval} sec</Text>
              )}
            </TouchableOpacity>

            {!isLoading && (
              <TouchableOpacity
                style={{
                  marginHorizontal: moderateScale(50),
                  padding: scale(10),
                  borderRadius: 100,
                  justifyContent: 'center',
                  alignItems: 'center',
                  // backgroundColor: "rgba(0,0,0, 0.3)",
                }}
                onPress={() => {
                  setPaused(!paused);
                  handleControlInteraction(true);
                }}>
                {paused ? (
                  <Icon
                    name="play"
                    type="ionicon"
                    size={
                      showFullscreen ? moderateScale(30) : moderateScale(35)
                    }
                    color={'#FFFFFF'}
                  />
                ) : (
                  <Icon
                    name="pause"
                    type="ionicon"
                    size={
                      showFullscreen ? moderateScale(30) : moderateScale(35)
                    }
                    color={'#FFFFFF'}
                  />
                )}
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={{
                flexDirection: 'row',
                padding: scale(5),
                alignItems: 'center',
                justifyContent: 'center',
                width: '30%',
                position: 'absolute',
                right: 0,
              }}
              onPress={() => startSeeking(true)}>
              {showForwardSeek && (
                <Text style={{color: '#d6dddd'}}>{seekInterval} sec</Text>
              )}
              <Icon
                name="chevron-double-right"
                type="material-community"
                size={showFullscreen ? moderateScale(25) : moderateScale(30)}
                color={'#FFFFFF'}
              />
            </TouchableOpacity>
          </View>
        )}
        {showFullscreen && !showThumbnailSeekBar && (
          <View
            style={{
              position: 'absolute',
              right: -15,
              flexDirection: 'row',
              transform: [{rotate: '90deg'}],
              alignItems: 'center',
              padding: 5,
            }}>
            <Icon
              name={
                volume >= 0.5 && volume < 0.75
                  ? 'volume-medium-outline'
                  : volume === 0
                  ? 'volume-off-outline'
                  : volume >= 0.75
                  ? 'volume-high-outline'
                  : 'volume-low-outline'
              }
              type="ionicon"
              color={'#FFFFFF'}
              style={{transform: [{rotate: '-90deg'}]}}
              size={moderateScale(14)}
            />

            <Slider
              style={{
                transform: [{rotate: '-180deg'}],
                width: scale(60),
              }}
              vertical={true}
              step={0.0625}
              minimumValue={0}
              maximumValue={1}
              minimumTrackTintColor="#FFFFFF"
              maximumTrackTintColor="#B2ACAC"
              thumbTintColor="transparent"
              onValueChange={handleVolumeChange}
              onSlidingStart={() => handleControlInteraction(true)}
              value={volume}
            />
          </View>
        )}
      </View>
    );
  };

  const handleSliderSlidingStart = async () => {
    handleControlInteraction(true);
    setShowThumbnailSeekBar(true);
    setPaused(true);
  };

  const handleSliderSlidingComplete = async () => {
    setShowThumbnailSeekBar(false);
    handleControlInteraction(false);
    setPaused(false);
  };

  const handleValueChange = value => {
    videoRef.current?.seek(value);
    setProgress({...progress, currentTime: value});
    handleControlInteraction(true);
    // setShowThumbnailSeekBar(true);
    if (isCasting) {
      client?.seek({position: value});
    }

    if (slidingTimeout.current) {
      clearTimeout(slidingTimeout.current);
    }

    slidingTimeout.current = setTimeout(() => {
      handleControlInteraction(false);
      setPaused(false);
    }, 1000);
  };

  const renderBottomView = () => {
    return (
      <View style={styles.bottomView}>
        <View
          style={{
            position: 'relative',
            marginLeft: showFullscreen ? scale(5) : 0,
          }}>
          <Slider
            style={{
              width: showFullscreen ? '96%' : '100%',
              height: moderateScale(15),
              top: 0,
              zIndex: 2,
            }}
            ref={sliderRef}
            minimumValue={0}
            maximumValue={progress?.seekableDuration || 0}
            minimumTrackTintColor="#ffffff"
            maximumTrackTintColor="#aaaaaa"
            thumbTintColor="#FFFFFF"
            onValueChange={handleValueChange}
            value={progress?.currentTime}
            onSlidingStart={handleSliderSlidingStart}
            onSlidingComplete={handleSliderSlidingComplete}
            onTouchStart={() => {
              handleControlInteraction(true);
              setShowThumbnailSeekBar(true);
            }}
            onTouchEnd={() => {
              handleControlInteraction(false);
              setShowThumbnailSeekBar(false);
            }}
          />
          <Slider
            style={{
              width: showFullscreen ? '96%' : '100%',
              height: moderateScale(15),
              position: 'absolute',
              top: 0,
              zIndex: 1,
            }}
            minimumValue={0}
            maximumValue={progress?.seekableDuration || 0}
            minimumTrackTintColor="#cdcdcd"
            maximumTrackTintColor="#aaaaaa"
            thumbTintColor="transparent"
            value={progress?.playableDuration}
            onValueChange={x => {
              videoRef.current.seek(x);
            }}
          />
          {adIntervals.length > 0 &&
            adIntervals?.map((interval, index) => (
              <View
                key={index}
                style={{
                  position: 'absolute',
                  left: `${(interval / progress?.seekableDuration) * 100}%`,
                  top: showFullscreen ? 10 : 6,
                  zIndex: 3,
                }}>
                <View
                  style={{width: 3, height: 3, backgroundColor: '#ead519'}}
                />
              </View>
            ))}
        </View>
        <View
          style={[
            styles.innerBottomView,
            {
              paddingHorizontal: moderateScale(15),
            },
          ]}>
          <View style={[styles.timerView, {gap: moderateScale(2)}]}>
            <Text style={{color: '#FFFFFF'}}>
              {progress?.currentTime
                ? formatTime(progress?.currentTime)
                : '00:00'}{' '}
              /{' '}
            </Text>
            <Text style={{color: '#acafb0'}}>
              {progress?.seekableDuration
                ? formatTime(progress?.seekableDuration)
                : '00:00'}{' '}
            </Text>
            {!isOfflineVideo && (
              <Text style={{color: '#FFFFFF'}}>
                {selectedResolution
                  ? resolutionText[selectedResolution]
                  : 'Auto'}
              </Text>
            )}
          </View>
          <View
            style={[
              styles.settingsView,
              {
                marginRight: showFullscreen ? moderateScale(10) : 0,
                width: isOfflineVideo ? '12%' : showFullscreen ? '25%' : '30%',
              },
            ]}>
            {!isOfflineVideo && (
              <TouchableOpacity onPress={toggleSettings}>
                <Icon
                  name="settings-outline"
                  type="ionicon"
                  color={'#FFFFFF'}
                  size={showFullscreen ? moderateScale(15) : moderateScale(20)}
                />
              </TouchableOpacity>
            )}

            <TouchableOpacity onPress={() => PipHandler.enterPipMode(350, 214)}>
              <Icon
                name="picture-in-picture-bottom-right-outline"
                type="material-community"
                color={'#FFFFFF'}
                size={showFullscreen ? moderateScale(15) : moderateScale(20)}
              />
            </TouchableOpacity>
            {showFullscreen && (
              <TouchableOpacity
                onPress={() => {
                  setFitToScreen(!fitToScreen);
                  handleControlInteraction(true);
                }}>
                {!fitToScreen ? (
                  <Icon
                    name="fit-to-screen-outline"
                    type="material-community"
                    color={'#FFFFFF'}
                    size={
                      showFullscreen ? moderateScale(18) : moderateScale(24)
                    }
                  />
                ) : (
                  <Icon
                    name="rectangle-outline"
                    type="material-community"
                    color={'#FFFFFF'}
                    size={
                      showFullscreen ? moderateScale(18) : moderateScale(24)
                    }
                  />
                )}
              </TouchableOpacity>
            )}
            {!isOfflineVideo && (
              <TouchableOpacity onPress={handleFullScreen}>
                {!showFullscreen ? (
                  <Icon
                    name="fullscreen"
                    type="material"
                    color={'#FFFFFF'}
                    size={
                      showFullscreen ? moderateScale(18) : moderateScale(24)
                    }
                  />
                ) : (
                  <Icon
                    name="fullscreen-exit"
                    type="material"
                    color={'#FFFFFF'}
                    size={
                      showFullscreen ? moderateScale(18) : moderateScale(24)
                    }
                  />
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderSettingsView = () => {
    if (selectedSetting === 'Quality') {
      return (
        <ScrollView showsVerticalScrollIndicator={false}>
          <TouchableOpacity
            style={{
              marginTop: verticalScale(10),
              paddingVertical: verticalScale(15),
              flexDirection: 'row',
            }}
            onPress={() => {
              setPaused(false);
              setSettingsVisible(false);
              setSelectedResolution(false);
            }}>
            {!selectedResolution && (
              <Icon
                name="check"
                type="feather"
                color={'#1b7aee'}
                size={showFullscreen ? scale(10) : scale(20)}
              />
            )}
            <Text
              style={{
                color: !selectedResolution ? '#ffffff' : '#b5b3b8',
                marginLeft: !selectedResolution
                  ? scale(10)
                  : showFullscreen
                  ? scale(20)
                  : scale(27),
              }}>
              Auto{' '}
              <Text style={{color: '#b5b3b8'}}>
                (Recommended for best experience)
              </Text>
            </Text>
          </TouchableOpacity>
          {resolutions?.map(item => {
            const isSelected = selectedResolution === item?.vheight;
            return (
              <TouchableOpacity
                key={item?.vheight}
                style={{
                  paddingVertical: verticalScale(15),
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
                onPress={() => {
                  changeResolution(item?.vheight);
                }}>
                {isSelected && (
                  <Icon
                    name="check"
                    type="feather"
                    color={'#1b7aee'}
                    size={showFullscreen ? scale(10) : scale(20)}
                  />
                )}
                <Text
                  style={{
                    color: isSelected ? '#ffffff' : '#b5b3b8',
                    marginLeft: isSelected
                      ? scale(10)
                      : showFullscreen
                      ? scale(20)
                      : scale(27),
                  }}>
                  {resolutionText[item?.vheight]}{' '}
                  <Text style={{color: '#b5b3b8'}}>
                    {resolutionTextDetails[item?.vheight]}
                  </Text>
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      );
    }
  };

  const renderModal = () => {
    return (
      <View>
        <Modal
          animationType="slide"
          transparent={true}
          visible={settingsVisible}>
          <TouchableOpacity
            onPress={() => {
              setSettingsVisible(false);
              setPaused(false);
            }}
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
            }}>
            <View
              style={{
                backgroundColor: showFullscreen ? 'rgba(0,0,0,0.5)' : '#292828',
                padding: scale(20),
                width: width,
                height: showFullscreen ? height : height * 0.5,
                position: 'absolute',
                bottom: 0,
                borderTopLeftRadius: showFullscreen ? 0 : scale(20),
                borderTopRightRadius: showFullscreen ? 0 : scale(20),
              }}>
              {!showFullscreen && (
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                  <Text
                    style={{
                      color: '#ffffff',
                      fontSize: 22,
                      fontWeight: '700',
                    }}>
                    Settings
                  </Text>
                </View>
              )}
              <View
                style={{
                  flexDirection: 'row',
                  gap: showFullscreen ? scale(15) : scale(30),
                  alignItems: 'center',
                  marginTop: showFullscreen ? 0 : verticalScale(25),
                }}>
                <TouchableOpacity
                  onPress={() => handleSettingSelection('Quality')}
                  style={{
                    justifyContent: 'center',
                    alignItems: 'center',
                    paddingVertical: verticalScale(10),
                    borderBottomWidth: selectedSetting === 'Quality' ? 1.5 : 0,
                    borderColor: '#ffffff',
                    zIndex: 1,
                  }}>
                  <Text
                    style={{
                      color:
                        selectedSetting === 'Quality' ? '#ffffff' : '#897f98',
                      fontSize: 16,
                      fontWeight: '500',
                    }}>
                    Quality
                  </Text>
                </TouchableOpacity>
              </View>
              <View
                style={{
                  borderTopWidth: 1,
                  borderColor: '#6d6b6f',
                }}
              />
              {renderSettingsView()}
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    );
  };

  const renderControls = () => {
    return (
      <View
        style={{
          width: showFullscreen ? Dimensions.get('screen').width : width,
          height: showFullscreen
            ? Dimensions.get('screen').height
            : verticalScale(230),
          justifyContent: 'center',
          alignItems: 'center',
        }}>
        {!settingsVisible && !inPipMode && (
          <Animated.View
            style={[
              styles.controlsButton,
              {
                justifyContent: 'center',
                opacity: controlOpacity,
              },
            ]}>
            {renderTopView()}
            {renderMiddleView()}
            {renderBottomView()}
          </Animated.View>
        )}
        {renderModal()}
      </View>
    );
  };

  return (
    <View>
      {/* <StatusBar hidden={showFullscreen} /> */}
      <View
        style={{
          width: inPipMode ? width : Dimensions.get('screen').width,
          height: showFullscreen
            ? Dimensions.get('screen').height
            : inPipMode
            ? height
            : verticalScale(230),
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#000000',
          overflow: 'hidden',
        }}>
        {videoURL && (
          <>
            <Video
              source={{
                uri: videoURL,
              }}
              style={{
                width: '100%',
                height: '100%',
              }}
              resizeMode={
                showFullscreen && fitToScreen
                  ? 'cover'
                  : inPipMode
                  ? 'cover'
                  : 'contain'
              }
              ref={videoRef}
              onProgress={handleVideoProgress}
              // repeat={true}
              playInBackground={false}
              poster={videoSource?.image_url}
              posterResizeMode="contain"
              paused={isCasting ? true : preAds ? true : showAd ? true : paused}
              fullscreen={showFullscreen}
              fullscreenOrientation={'landscape'}
              fullscreenAutorotate={true}
              onLoadStart={() => setIsLoading(true)}
              onLoad={handleVideoLoad}
              selectedVideoTrack={{
                type: selectedResolution ? 'resolution' : 'auto',
                value: selectedResolution,
              }}
              volume={volume}
              shouldPlay={true}
              onEnd={onEnd}
              bufferConfig={{
                minBufferMs: 30000,
                maxBufferMs: 60000,
                bufferForPlaybackMs: 5000,
                bufferForPlaybackAfterRebufferMs: 10000,
              }}
              onBuffer={() => {
                if (isCasting) {
                  setIsLoading(false);
                } else {
                  setIsLoading(true);
                }
              }}
            />
            {thumbnailURL != '' && (
              <View
                style={{
                  borderRadius: 5,
                  position: 'absolute',
                  top: showFullscreen ? verticalScale(350) : verticalScale(85),
                  left: `${Math.min(
                    Math.max(
                      (progress?.currentTime / progress?.seekableDuration) *
                        100,
                      showFullscreen ? 13 : 25,
                    ),
                    showFullscreen ? 86.3 : 87.5,
                  )}%`,
                  transform: [{translateX: -90}],
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: '#1c1c1d',
                  borderWidth: 0.5,
                  borderColor: '#FFFFFF',
                  zIndex: 3,
                  display: showThumbnailSeekBar ? 'flex' : 'none',
                }}>
                <ThumbnailPreview
                  vttUrl={thumbnailURL}
                  baseUrl={baseURL}
                  baseMaxWidth={showFullscreen ? scale(90) : scale(140)}
                  baseMaxHeight={
                    showFullscreen ? height * 0.3 : verticalScale(90)
                  }
                  currentSecond={progress?.currentTime}
                />
                <Text
                  style={{
                    color: '#FFFFFF',
                    position: 'absolute',
                    bottom: 8,
                    fontWeight: '600',
                  }}>
                  {formatTime(progress?.currentTime)}
                </Text>
              </View>
            )}
          </>
        )}
        {isLoading && (
          <>
            <ActivityIndicator
              size="large"
              color={TAB_COLOR}
              style={{position: 'absolute', zIndex: 1}}
            />
            <View style={styles.topView}>
              {!showTitle && (
                <TouchableOpacity
                  style={{
                    padding: scale(5),
                    borderRadius: 100,
                  }}
                  onPress={() => {
                    if (showFullscreen) {
                      if (paused) {
                        setPaused(false);
                      }
                      Orientation.lockToPortrait();
                      setShowFullscreen(!showFullscreen);
                    } else {
                      hideVideoPlayer(count);
                    }
                  }}>
                  <Icon
                    name="arrowleft"
                    type="antdesign"
                    color={'#FFFFFF'}
                    size={28}
                  />
                </TouchableOpacity>
              )}
            </View>
          </>
        )}
      </View>
      <TouchableOpacity
        onPress={handleShowControls}
        style={{
          position: 'absolute',
          width: width,
          height: showFullscreen ? height : verticalScale(230),
          zIndex: 2,
        }}
        disabled={showAd || preAds}>
        {showControls && renderControls()}
      </TouchableOpacity>
      {showSkipIntro && (
        <TouchableOpacity
          onPress={() => {
            const endSkipIntroTime = Math.floor(skipOptions?.introEnd);
            videoRef.current.seek(endSkipIntroTime);
            setShowSkipIntro(false);
            setProgress({...progress, currentTime: endSkipIntroTime});
          }}
          style={{
            position: 'absolute',
            right: showFullscreen ? 70 : 20,
            bottom: showFullscreen ? 75 : 55,
            borderWidth: 1,
            borderColor: '#FFFFFF',
            borderRadius: 5,
            backgroundColor: 'rgba(0,0,0,0.3)',
            padding: 5,
            zIndex: 3,
          }}>
          <Text
            style={{
              fontSize: showFullscreen ? 12 : 10,
              color: '#FFFFFF',
            }}>
            Skip Intro
          </Text>
        </TouchableOpacity>
      )}
      {showSkipCredits && (
        <TouchableOpacity
          onPress={() => {
            const endSkipCreditsTime =
              Math.floor(progress?.seekableDuration) - 5;
            videoRef.current.seek(endSkipCreditsTime);
            setShowSkipCredits(false);
            setProgress({...progress, currentTime: endSkipCreditsTime});
          }}
          style={{
            position: 'absolute',
            right: showFullscreen ? 70 : 20,
            bottom: showFullscreen ? 75 : 55,
            borderWidth: 1,
            borderColor: '#FFFFFF',
            borderRadius: 5,
            backgroundColor: 'rgba(0,0,0,0.3)',
            padding: 5,
            zIndex: 3,
          }}>
          <Text
            style={{
              fontSize: showFullscreen ? 12 : 10,
              color: '#FFFFFF',
            }}>
            Skip Credits
          </Text>
        </TouchableOpacity>
      )}
      <Animated.View
        {...panResponder.panHandlers}
        style={{
          transform: pan.getTranslateTransform(),
          width: width,
          height: showFullscreen ? height : verticalScale(230),
          justifyContent: 'center',
          alignItems: 'center',
          position: 'absolute',
          zIndex: 1,
        }}
      />
    </View>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'absolute',
    top: 0,
  },
  controlsButton: {
    height: '100%',
    width: '100%',
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    flexDirection: 'row',
  },
  controllerView: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomView: {
    width: '100%',
    position: 'absolute',
    bottom: 0,
    backgroundColor: 'rgba(0,0,0, 0.3)',
    paddingVertical: 10,
    paddingHorizontal: 5,
  },
  topView: {
    position: 'absolute',
    top: 0,
    zIndex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 15,
  },
  innerBottomView: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timerView: {
    flexDirection: 'row',
  },
  settingsView: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});

export default AdvancePlayer;
