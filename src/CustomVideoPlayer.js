import {
  View,
  Text,
  TouchableOpacity,
  Touchable,
  Image,
  ActivityIndicator,
  StyleSheet,
  AppState,
  Button,
} from 'react-native';
import React, {useEffect, useRef, useState} from 'react';
import Video from 'react-native-video';
import Slider from '@react-native-community/slider';
import Orientation from 'react-native-orientation-locker';
import PipHandler, {usePipModeListener} from 'react-native-pip-android';

const CustomVideoPlayer = ({videoSource}) => {
  // Use this boolean to show / hide ui when pip mode changes
  const inPipMode = usePipModeListener();

  const [backgroundDeteced, setBackgroundDeteced] = React.useState(false);

  const [showControls, setShowControls] = useState(false);
  const [puased, setPaused] = useState(false);
  const [progress, setProgress] = useState(null);
  const [duration, setDuration] = useState(0);
  const [fullScreen, setFullScreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const ref = useRef();

  React.useEffect(() => {
    const appstatus = AppState.addEventListener('change', ev => {
      if (ev === 'background') {
        setBackgroundDeteced(true);
        PipHandler.enterPipMode(350, 214);
      } else {
        setBackgroundDeteced(false);
      }
    });
    return () => {
      appstatus.remove();
    };
  }, []);

  const handleVideoLoad = x => {
    setDuration(format(x.duration));
    setIsLoading(false);
    console.log('handle video load ---> ', x);

    //videoRef.current.seek(startTime);
    // analyticsCallback("pb_start", 1, "01");
  };
  const format = seconds => {
    let mins = parseInt(seconds / 60)
      .toString()
      .padStart(2, '0');
    let secs = (Math.trunc(seconds) % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };
  return (
    <View style={{flex: 1}}>
      <TouchableOpacity
        style={{width: '100%', height: fullScreen ? '100%' : 200}}
        onPress={() => {
          setShowControls(prevclkd => !prevclkd);
        }}>
        {videoSource && (
          <Video
            paused={puased}
            source={{
              uri: videoSource,
            }}
            ref={ref}
            onProgress={x => {
              //console.log(x);
              setProgress(x);
            }}
            onLoadStart={() => setIsLoading(true)}
            onLoad={handleVideoLoad}
            // Can be a URL or a local file.
            //  ref={(ref) => {
            //    this.player = ref
            //  }}                                      // Store reference
            //  onBuffer={this.onBuffer}                // Callback when remote video is buffering
            //  onError={this.videoError}

            // Callback when video cannot be loaded
            muted={false}
            style={{width: '100%', height: fullScreen ? '100%' : 200}}
            resizeMode="cover"
            playInBackground
            pictureInPicture
          />
        )}
        {isLoading && (
          <View
            style={{
              ...StyleSheet.absoluteFillObject,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: 'grey',
            }}>
            <ActivityIndicator
              size="large"
              color={'red'}
              style={{position: 'absolute', zIndex: 1, alignSelf: 'center'}}
            />
          </View>
        )}
        {showControls && (
          <TouchableOpacity
            onPress={() => {
              setShowControls(prevclkd => !prevclkd);
            }}
            style={{
              width: '100%',
              height: '100%',
              position: 'absolute',
              backgroundColor: 'rgba(0,0,0,.5)',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
            <View style={{flexDirection: 'row'}}>
              <TouchableOpacity
                onPress={() => {
                  ref.current.seek(parseInt(progress.currentTime) - 10);
                }}>
                <Image
                  source={require('./icons/backward.png')}
                  style={{width: 30, height: 30, tintColor: 'white'}}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setPaused(!puased);
                }}>
                <Image
                  source={
                    puased
                      ? require('./icons/play-button.png')
                      : require('./icons/pause.png')
                  }
                  style={{
                    width: 30,
                    height: 30,
                    tintColor: 'white',
                    marginLeft: 50,
                  }}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  ref.current.seek(parseInt(progress.currentTime) + 10);
                }}>
                <Image
                  source={require('./icons/forward.png')}
                  style={{
                    width: 30,
                    height: 30,
                    tintColor: 'white',
                    marginLeft: 50,
                  }}
                />
              </TouchableOpacity>
            </View>
            <View
              style={{
                width: '100%',
                flexDirection: 'row',
                justifyContent: 'space-between',
                position: 'absolute',
                bottom: 0,
                paddingLeft: 20,
                paddingRight: 20,
                alignItems: 'center',
              }}>
              <Text style={{color: 'white'}}>
                {format(progress.currentTime)}
              </Text>
              <Slider
                style={{width: '80%', height: 40}}
                minimumValue={0}
                maximumValue={progress.seekableDuration}
                //maximumValue={duration}
                minimumTrackTintColor="#FFFFFF"
                maximumTrackTintColor="#fff"
                onValueChange={x => {
                  ref.current.seek(x);
                }}
              />
              <Text style={{color: 'white'}}>
                {format(progress.seekableDuration)}
                {/* {duration} */}
              </Text>
            </View>
            <View
              style={{
                width: '100%',
                flexDirection: 'row',
                justifyContent: 'space-between',
                position: 'absolute',
                top: 10,
                paddingLeft: 20,
                paddingRight: 20,
                alignItems: 'center',
              }}>
              <TouchableOpacity
                onPress={() => {
                  if (fullScreen) {
                    Orientation.lockToPortrait();
                  } else {
                    Orientation.lockToLandscape();
                  }
                  setFullScreen(!fullScreen);
                }}>
                <Image
                  source={
                    fullScreen
                      ? require('./icons/minimize.png')
                      : require('./icons/full-size.png')
                  }
                  style={{width: 24, height: 24, tintColor: 'white'}}
                />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      {!backgroundDeteced && (
        <Button
          onPress={() => {
            PipHandler.enterPipMode(300, 214);
          }}
          title="PIP"
          style={{marginTop: 20}}
        />
      )}
    </View>
  );
};

export default CustomVideoPlayer;

//http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4
