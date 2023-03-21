import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import msRest from "@azure/ms-rest-js";
import Face from "@azure/cognitiveservices-face";
import { v4 as uuid } from 'uuid';

const key = "1acd88ba5fb247a18a18d2b8fdb62cc5";
const endpoint = "https://teste-controle-frota.cognitiveservices.azure.com/";

const credentials = new msRest.ApiKeyCredentials({ inHeader: { 'Ocp-Apim-Subscription-Key': key } });
const client = new Face.FaceClient(credentials, endpoint);

const image_base_url = "https://raw.githubusercontent.com/Azure-Samples/cognitive-services-sample-data-files/master/Face/images/";
const person_group_id:string = uuid();

function sleep(ms:number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
async function DetectFaceRecognize(url: string) {
  // Detect faces from image URL. Since only recognizing, use the recognition model 4.
  // We use detection model 3 because we are only retrieving the qualityForRecognition attribute.
  // Result faces with quality for recognition lower than "medium" are filtered out.
  let detected_faces = client.face.detectWithUrl(url,
    {
      detectionModel: "detection_03",
      recognitionModel: "recognition_04",
      returnFaceAttributes: ["QualityForRecognition"]
    });
  return detected_faces.then((detected_faces:any) => {
    detected_faces.filter(
      (face: any) => face.faceAttributes.qualityForRecognition == 'high' ||
        face.faceAttributes.qualityForRecognition == 'medium');
  });

}

async function AddFacesToPersonGroup(person_dictionary: any, person_group_id: any) {
  console.log ("Adding faces to person group...");
  // The similar faces will be grouped into a single person group person.
  
  await Promise.all (Object.keys(person_dictionary).map (async function (key) {
      const value = person_dictionary[key];


      let person = await client.personGroupPerson.create(person_group_id, { name : key });
      console.log("Create a persongroup person: " + key + ".");

      // Add faces to the person group person.
      await Promise.all (value.map (async function (similar_image: string) {

          // Wait briefly so we do not exceed rate limits.
          await sleep (1000);


          // Check if the image is of sufficent quality for recognition.
          let sufficientQuality = true;
          let detected_faces = client.face.detectWithUrl(image_base_url + similar_image,
            {
              returnFaceAttributes: ["QualityForRecognition"],
              detectionModel: "detection_03",
              recognitionModel: "recognition_03"
            });
          detected_faces.then((detected_faces:any) => {
            detected_faces.forEach((detected_face:any) => {
              if (detected_face.faceAttributes.qualityForRecognition != 'high'){
                  sufficientQuality = false;
              }
          });
          });

          // Wait briefly so we do not exceed rate limits.
          await sleep (1000);

          // Quality is sufficent, add to group.
          if (sufficientQuality){
              console.log("Add face to the person group person: (" + key + ") from image: " + similar_image + ".");
              await client.personGroupPerson.addFaceFromUrl(person_group_id, person.personId, image_base_url + similar_image);
          }
          // Wait briefly so we do not exceed rate limits.
          await sleep (1000);
      }));
  }));

  console.log ("Done adding faces to person group.");
}

async function WaitForPersonGroupTraining(person_group_id:any) {
  // Wait so we do not exceed rate limits.
  console.log ("Waiting 10 seconds...");
  await sleep (10000);
  let result = await client.personGroup.getTrainingStatus(person_group_id);
  console.log("Training status: " + result.status + ".");
  if (result.status !== "succeeded") {
      await WaitForPersonGroupTraining(person_group_id);
  }
}

async function IdentifyInPersonGroup() {
  console.log("========IDENTIFY FACES========");
  console.log();

// Create a dictionary for all your images, grouping similar ones under the same key.
  const person_dictionary = {
      "Family1-Dad" : ["Family1-Dad1.jpg", "Family1-Dad2.jpg"],
      "Family1-Mom" : ["Family1-Mom1.jpg", "Family1-Mom2.jpg"],
      "Family1-Son" : ["Family1-Son1.jpg", "Family1-Son2.jpg"],
      "Family1-Daughter" : ["Family1-Daughter1.jpg", "Family1-Daughter2.jpg"],
      "Family2-Lady" : ["Family2-Lady1.jpg", "Family2-Lady2.jpg"],
      "Family2-Man" : ["Family2-Man1.jpg", "Family2-Man2.jpg"]
  };

  // A group photo that includes some of the persons you seek to identify from your dictionary.
  let source_image_file_name = "identification1.jpg";

  
  // Create a person group. 
  console.log("Creating a person group with ID: " + person_group_id);
  await client.personGroup.create(person_group_id, person_group_id, {recognitionModel : "recognition_04" });

  await AddFacesToPersonGroup(person_dictionary, person_group_id);

  // Start to train the person group.
  console.log();
  console.log("Training person group: " + person_group_id + ".");
  await client.personGroup.train(person_group_id);

  await WaitForPersonGroupTraining(person_group_id);
  console.log();

  // Detect faces from source image url and only take those with sufficient quality for recognition.
  let face_ids = (await DetectFaceRecognize(image_base_url + source_image_file_name)).map ((face:any) => face.faceId);
  
  // Identify the faces in a person group.
  let results = await client.face.identify(face_ids, { personGroupId : person_group_id});
  await Promise.all (results.map (async (result:any) => {
      try{
          let person = await client.personGroupPerson.get(person_group_id, result.candidates[0].personId);

          console.log("Person: " + person.name + " is identified for face in: " + source_image_file_name + " with ID: " + result.faceId + ". Confidence: " + result.candidates[0].confidence + ".");

          // Verification:
          let verifyResult = await client.face.verifyFaceToPerson(result.faceId, person.personId, {personGroupId : person_group_id});
          console.log("Verification result between face "+ result.faceId +" and person "+ person.personId+ ": " +verifyResult.isIdentical + " with confidence: "+ verifyResult.confidence);

      } catch(error:any) {
          //console.log("no persons identified for face with ID " + result.faceId);
          console.log(error.toString());
      }
      
  }));
  console.log();
}

export default function App() {
  React.useEffect(() => {
    IdentifyInPersonGroup().then(() => console.log("Done."))
  }, []);
  return (
    <View style={styles.container}>
      <Text>Open up App.tsx to start working on your app!</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
