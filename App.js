import {SafeAreaView, StyleSheet, Text, View} from 'react-native';
import React from 'react';
import CustomVideoPlayer from './src/CustomVideoPlayer';
import YoutubePlayer from './src/YoutubePlayer';
const url =
  'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

const App = () => {
  //return <CustomVideoPlayer videoSource={url} />;
  return (
    <SafeAreaView style={styles.container}>
      <CustomVideoPlayer videoSource={url} />
    </SafeAreaView>
  );
};

export default App;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
