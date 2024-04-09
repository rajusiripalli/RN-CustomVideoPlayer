import React, {useState, useRef} from 'react';
import {
  View,
  StyleSheet,
  TouchableWithoutFeedback,
  Animated,
  Text,
  Dimensions,
} from 'react-native';
import Video from 'react-native-video';
import Slider from '@react-native-community/slider';
import {TapGestureHandler, State} from 'react-native-gesture-handler';
import Ionicons from 'react-native-vector-icons/Ionicons';

const YoutubePlayer = ({videoSource}) => {
  const [paused, setPaused] = useState(true);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [volume, setVolume] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const {width, height} = Dimensions.get('window');

  const togglePlayPause = () => {
    setPaused(!paused);
    toggleControls();
  };

  const toggleControls = () => {
    Animated.timing(fadeAnim, {
      toValue: showControls ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    setShowControls(!showControls);
  };

  const onSliderValueChange = value => {
    setCurrentTime(value);
  };

  const onSliderSlidingComplete = value => {
    setCurrentTime(value);
  };

  const onFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  return (
    <View style={styles.container}>
      <TouchableWithoutFeedback onPress={toggleControls}>
        <View>
          <Video
            source={{uri: videoSource}}
            style={isFullScreen ? styles.fullScreenVideo : styles.video}
            paused={paused}
            resizeMode={isFullScreen ? 'contain' : 'cover'}
            volume={volume}
            onLoad={data => setDuration(data.duration)}
            onProgress={data => setCurrentTime(data.currentTime)}
          />
          {showControls && (
            <Animated.View style={[styles.controls, {opacity: fadeAnim}]}>
              <View style={styles.controlsRow}>
                <TouchableWithoutFeedback onPress={togglePlayPause}>
                  <Ionicons
                    name={paused ? 'play' : 'pause'}
                    size={30}
                    color="#fff"
                  />
                </TouchableWithoutFeedback>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={duration}
                  value={currentTime}
                  onValueChange={onSliderValueChange}
                  onSlidingComplete={onSliderSlidingComplete}
                  minimumTrackTintColor="#fff"
                  maximumTrackTintColor="rgba(255, 255, 255, 0.5)"
                  thumbTintColor="#fff"
                />
                <Text style={styles.durationText}>
                  {formatTime(currentTime)} / {formatTime(duration)}
                </Text>
                <TouchableWithoutFeedback onPress={onFullScreen}>
                  <Ionicons
                    name={isFullScreen ? 'contract' : 'expand'}
                    size={30}
                    color="#fff"
                  />
                </TouchableWithoutFeedback>
              </View>
              <Slider
                style={styles.volumeSlider}
                minimumValue={0}
                maximumValue={1}
                value={volume}
                onValueChange={setVolume}
                minimumTrackTintColor="#fff"
                maximumTrackTintColor="rgba(255, 255, 255, 0.5)"
                thumbTintColor="#fff"
              />
            </Animated.View>
          )}
        </View>
      </TouchableWithoutFeedback>
    </View>
  );
};

const formatTime = seconds => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${padZero(minutes)}:${padZero(remainingSeconds)}`;
};

const padZero = num => {
  return num < 10 ? `0${num}` : num;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: '100%',
    height: 300,
  },
  fullScreenVideo: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  controls: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    paddingBottom: 20,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  slider: {
    flex: 1,
    marginHorizontal: 10,
  },
  durationText: {
    color: '#fff',
  },
  volumeSlider: {
    width: 100,
    alignSelf: 'center',
  },
});

export default YoutubePlayer;
