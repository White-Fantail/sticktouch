import {coverRect,type Landmark,type Point,type Viewport} from "../core.ts";
import type {GameEvent} from "../engine/game-feel";
import {createBalloonRound,stepBalloonRound,type BalloonRound} from "./balloon-pop/game.ts";
import {createFruitRound,fruitCameraBox,stepFruitRound,type FruitRound} from "./fruit-catch/game.ts";
import {createPoseRound,matchesPose,poseTarget,stepPoseRound,type PoseRound} from "./pose-challenge/game.ts";

export type GameRound =
  | {kind:"balloon-pop";state:BalloonRound}
  | {kind:"fruit-catch";state:FruitRound}
  | {kind:"pose-challenge";state:PoseRound};
export type GameState=GameRound["state"];
export const GAME_SECONDS=60;
export function createGameRound(id:string):GameRound {
  switch(id){
    case "fruit-catch":return {kind:"fruit-catch",state:createFruitRound()};
    case "pose-challenge":return {kind:"pose-challenge",state:createPoseRound()};
    default:return {kind:"balloon-pop",state:createBalloonRound()};
  }
}
export function gameViewport(id:string,width:number,height:number,videoWidth:number,videoHeight:number,mirror:boolean):Viewport {
  const box=id==="fruit-catch"?fruitCameraBox(width,height):{width,height};
  return {width:box.width,height:box.height,videoWidth,videoHeight,mirror,
    fit:id==="fruit-catch"?"contain":"cover"};
}
/** Amplify comfortable mid-camera hand movement to the whole basket track.
 * Unlike a hitpoint, the basket is a steering control, not a direct touch target. */
export const FRUIT_BASKET_REACH={min:0.30,max:0.70} as const;
/** Respect the actual contained video rectangle and mirror direction before applying gain. */
export function basketInput(points:readonly Point[],view:Viewport):number|null {
  const palms=points.filter(p=>(p.part==="leftHand"||p.part==="rightHand")&&Number.isFinite(p.x));
  const image=coverRect(view);
  if(!palms.length||image.width<=0)return null;
  const cameraX=palms.reduce((sum,p)=>sum+(p.x-image.x)/image.width,0)/palms.length;
  return Math.max(0,Math.min(1,(cameraX-FRUIT_BASKET_REACH.min)/
    (FRUIT_BASKET_REACH.max-FRUIT_BASKET_REACH.min)));
}
export function gameTracking(round:GameRound,points:readonly Point[],pose:readonly Landmark[]|undefined):boolean {
  switch(round.kind){
    case "fruit-catch":return points.some(p=>p.part==="leftHand"||p.part==="rightHand");
    case "pose-challenge":return matchesPose(pose,poseTarget(round.state).id)!==null;
    default:return points.length>0;
  }
}
export function stepGameRound(round:GameRound,dt:number,width:number,height:number,
  points:Point[],pose:readonly Landmark[]|undefined,view:Viewport):{finished:boolean;events:GameEvent[]} {
  switch(round.kind){
    case "balloon-pop":return stepBalloonRound(round.state,dt,width,height,points);
    case "fruit-catch":return stepFruitRound(round.state,dt,width,height,basketInput(points,view));
    case "pose-challenge":return stepPoseRound(round.state,dt,pose,width,height);
  }
}
export function gameHint(id:string){
  switch(id){
    case "fruit-catch":return "카메라 중앙에서 손을 조금만 좌우로 움직여도 바구니가 끝까지 이동해요. 과일을 받고 폭탄은 피하세요!";
    case "pose-challenge":return "화면 속 자세를 따라 하고 0.85초 동안 유지하세요. 전신이 보이도록 서 주세요.";
    default:return "손·발·머리의 터치 영역으로 풍선을 터뜨려요";
  }
}
