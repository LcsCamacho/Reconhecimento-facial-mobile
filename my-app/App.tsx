import * as React from 'react';
import { Image } from 'expo-image';
import { Camera, CameraType } from 'expo-camera';
import * as FaceDetector from 'expo-face-detector';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, ScrollView } from 'react-native';

const { width, height } = Dimensions.get('window');

const App = () => {
  const [type, setType] = React.useState(CameraType.back);
  const [permission, requestPermission] = Camera.useCameraPermissions();
  const [faceDetected, setFaceDetected] = React.useState(false);
  const [openCamera, setOpenCamera] = React.useState(false);
  const [image, setImage] = React.useState<string | null>(null);
  const camera = React.useRef<Camera>(null);
  const blurhash =
    '|rF?hV%2WCj[ayj[a|j[az_NaeWBj@ayfRayfQfQM{M|azj[azf6fQfQfQIpWXofj[ayj[j[fQayWCoeoeaya}j[ayfQa{oLj?j[WVj[ayayj[fQoff7azayj[ayj[j[ayofayayayj[fQj[ayayj[ayfjj[j[ayjuayj[';

  React.useEffect(() => {
    requestPermission();
  }, []);

  if (permission === null) {
    return <Text>Permission == null</Text>;
  }
  if (!permission) {
    return <Text>No access to camera</Text>;
  }

  function toggleCameraType() {
    setType(current => (current === CameraType.back ? CameraType.front : CameraType.back));
  }

  const handleTakePicture = async () => {
    if (camera.current) {
      const data = await camera.current.takePictureAsync();
      setImage(data.uri);
    }
  }
  return (
    <ScrollView style={styles.scrollView}>
      <View style={styles.container}>
        <Text>Expo Camera FaceDetector</Text>
        <TouchableOpacity style={styles.openCameraButton} onPress={() => setOpenCamera(!openCamera)}>
          <Text style={styles.text}>Open Camera</Text>
        </TouchableOpacity>
        <Text>Permission: {permission ? 'Yes' : 'No'}</Text>
        <Text>type: {String(type)}</Text>
        <Text>Face detected: {faceDetected ? 'Yes' : 'No'}</Text>
        {openCamera && permission && (
          <Camera
            ref={camera}
            style={styles.camera}
            onFacesDetected={handleFacesDetected}
            faceDetectorSettings={{
              mode: FaceDetector.FaceDetectorMode.fast,
              detectLandmarks: FaceDetector.FaceDetectorLandmarks.all,
              runClassifications: FaceDetector.FaceDetectorClassifications.none,
              minDetectionInterval: 100,
              tracking: true,
            }}
            onCameraReady={() => console.log('Camera is ready')}
            onMountError={error => console.log('Camera mount error', error)}
          >
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.button} onPress={toggleCameraType}>
                <Text style={styles.text}>Flip Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.button} onPress={handleTakePicture}>
                <Text style={styles.text}>Take Picture</Text>
              </TouchableOpacity>
            </View>
          </Camera>
        )}
        <View style={styles.imageContainer}>
          {image && (<>
            <Text style={styles.title}>Foto tirada</Text>
            <Image source={image}
              placeholder={blurhash}
              contentFit="cover"
              transition={1000}
              style={styles.image} />
          </>)}
        </View>
      </View>
    </ScrollView>
  );
}

const handleFacesDetected = ({ faces }: any) => {
  console.log(faces);
};

// I am sending you the codedump of Expo Camera FaceDetector not working that you can see here: https://codedump.io/share/0QZ7ZQZ7ZQZ7/1

export default App;

const styles = StyleSheet.create({
  container: {
    paddingTop: 50,
    paddingBottom: 50,
    padding: 20,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: width,
    gap: 20,
  },
  scrollView: {
    flex: 1,
    width: width,
  },
  buttonContainer: {
    flex: 1,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    margin: 20,
  },
  button: {
    flex: 1,
    alignSelf: 'flex-end',
    alignItems: 'center',
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  openCameraButton: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  text: {
    fontSize: 18,
    color: 'white',
  },
  camera: {
    width: width * .8,
    height: height * .4
  },
  image: {
    width: width * .8,
    height: height * .4,
    backgroundColor: 'red',
  },
  imageContainer: {
    width: width * .8,
    height: height * .4,
    gap: 20,    
  },
  title: {
    width: width * .8,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',

  },
});

