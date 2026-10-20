import {coverRect,type Landmark,type Point,type Viewport} from "../core.ts";
import type {GameEvent} from "../engine/game-feel";
import {createBalloonRound,stepBalloonRound,type BalloonRound} from "./balloon-pop/game";
import {createFruitRound,fruitCameraBox,stepFruitRound,type FruitRound} from "./fruit-catch/game";
import {createPoseRound,matchesPose,poseTarget,stepPoseRound,type PoseRound} from "./pose-challenge/game";

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
/** Use the actual visible (contained) video rect, so mirroring and pillarboxing do not skew control. */
export function basketInput(points:readonly Point[],view:Viewport):number|null {
  const palms=points.filter(p=>p.part==="leftHand"||p.part==="rightHand");
  const image=coverRect(view);
  if(!palms.length||image.width<=0)return null;
  return Math.max(0,Math.min(1,palms.reduce((sum,p)=>sum+(p.x-image.x)/image.width,0)/palms.length));
}
export function gameTracking(round:GameRound,points:readonly Point[],pose:readonly Landmark[]|undefined):boolean {
  switch(round.kind){
    case "fruit-catch":return basketInput(points,{width:1,height:1,videoWidth:1,videoHeight:1,mirror:false})!==null;
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
    case "fruit-catch":return "아래쪽 카메라 속 손을 좌우로 움직여 바구니로 과일을 받으세요. 폭탄은 피하세요!";
    case "pose-challenge":return "화면 속 자세를 따라 하고 0.85초 동안 유지하세요. 전신이 보이도록 서 주세요.";
    default:return "손·발·머리의 터치 영역으로 풍선을 터뜨려요";
  }
}
