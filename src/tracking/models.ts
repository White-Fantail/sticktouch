/** Shared MediaPipe model loading for solo games and the two-player camera.
 * Callers own camera streams and must close both returned models on teardown. */
import {FilesetResolver, HandLandmarker, PoseLandmarker} from "@mediapipe/tasks-vision";

const POSE_MODEL="https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
const HAND_MODEL="https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
const WASM="https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1/wasm";

export type PlayerCapacity=1|2;
export interface CameraModels {pose:PoseLandmarker;hand:HandLandmarker|null}
/** Single-player runs 1 pose + 2 hands; two-player runs 2 poses + 4 hands.
 * A failed hand model is non-fatal: each pose can estimate its own palms. */
export async function loadCameraModels(players:PlayerCapacity):Promise<CameraModels>{
  const vision=await FilesetResolver.forVisionTasks(WASM);
  let pose:PoseLandmarker;
  try{
    pose=await PoseLandmarker.createFromOptions(vision,{
      baseOptions:{modelAssetPath:POSE_MODEL,delegate:"GPU"},runningMode:"VIDEO",numPoses:players
    });
  }catch{
    pose=await PoseLandmarker.createFromOptions(vision,{
      baseOptions:{modelAssetPath:POSE_MODEL,delegate:"CPU"},runningMode:"VIDEO",numPoses:players
    });
  }
  let hand:HandLandmarker|null=null;
  try{
    try{
      hand=await HandLandmarker.createFromOptions(vision,{
        baseOptions:{modelAssetPath:HAND_MODEL,delegate:"GPU"},runningMode:"VIDEO",
        numHands:players*2,minHandDetectionConfidence:.55,
        minHandPresenceConfidence:.55,minTrackingConfidence:.5
      });
    }catch{
      hand=await HandLandmarker.createFromOptions(vision,{
        baseOptions:{modelAssetPath:HAND_MODEL,delegate:"CPU"},runningMode:"VIDEO",
        numHands:players*2,minHandDetectionConfidence:.55,
        minHandPresenceConfidence:.55,minTrackingConfidence:.5
      });
    }
  }catch(error){
    console.warn("Hand model unavailable; using Pose palm estimates",error);
  }
  return {pose,hand};
}
