import {coverRect,type Landmark,type Point,type Viewport} from "../core.ts";
import {ROUND_DURATION_SECONDS,gameplaySpeed} from "../engine/round-tempo.ts";
import type {GameEvent} from "../engine/game-feel";
import {createBalloonRound,stepBalloonRound,type BalloonRound} from "./balloon-pop/game.ts";
import {createFruitRound,fruitCameraBox,stepFruitRound,type FruitRound} from "./fruit-catch/game.ts";
import {createPoseRound,matchesPose,poseTarget,stepPoseRound,type PoseRound} from "./pose-challenge/game.ts";
import {createMiniRound,stepMiniRound,type MiniGameId,type MiniRound} from "./mini-arcade/game.ts";
import {createAdvancedRound,stepAdvancedRound,type AdvancedGameId,type AdvancedRound} from "./advanced-arcade/game.ts";
import {createExpertRound,stepExpertRound,type ExpertGameId,type ExpertRound} from "./expert-arcade/game.ts";

export type GameRound =
  | {kind:"balloon-pop";state:BalloonRound}
  | {kind:"fruit-catch";state:FruitRound}
  | {kind:"pose-challenge";state:PoseRound}
  | {kind:MiniGameId;state:MiniRound}
  | {kind:AdvancedGameId;state:AdvancedRound}
  | {kind:ExpertGameId;state:ExpertRound};
export type GameState=GameRound["state"];
export const GAME_SECONDS=ROUND_DURATION_SECONDS;
export function createGameRound(id:string):GameRound {
  switch(id){
    case "fruit-catch":return {kind:"fruit-catch",state:createFruitRound()};
    case "pose-challenge":return {kind:"pose-challenge",state:createPoseRound()};
    case "mole-whack":case "color-match":case "star-hunt":case "meteor-dodge":case "freeze-dance":
      return {kind:id,state:createMiniRound(id)};
    case "rhythm-pads":case "shield-guard":case "memory-sequence":case "laser-lane":case "parcel-sort":
      return {kind:id,state:createAdvancedRound(id)};
    case "boss-raid":case "gravity-lab":case "shadow-sync":case "constellation-trace":case "dual-portals":
      return {kind:id,state:createExpertRound(id)};
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
    case "mole-whack":case "color-match":case "star-hunt":case "meteor-dodge":case "freeze-dance":
      return points.some(p=>p.part==="leftHand"||p.part==="rightHand");
    case "rhythm-pads":case "shield-guard":case "memory-sequence":case "laser-lane":case "parcel-sort":
      return points.some(p=>p.part==="leftHand"||p.part==="rightHand");
    case "gravity-lab":case "shadow-sync":case "dual-portals":
      return points.some(p=>p.part==="leftHand")&&points.some(p=>p.part==="rightHand");
    case "boss-raid":case "constellation-trace":
      return points.some(p=>p.part==="leftHand"||p.part==="rightHand");
    default:return points.length>0;
  }
}
export function stepGameRound(round:GameRound,dt:number,width:number,height:number,
  points:Point[],pose:readonly Landmark[]|undefined,view:Viewport):{finished:boolean;events:GameEvent[]} {
  const speed=gameplaySpeed(round.state.time);
  switch(round.kind){
    case "balloon-pop":return stepBalloonRound(round.state,dt,width,height,points,speed);
    case "fruit-catch":return stepFruitRound(round.state,dt,width,height,basketInput(points,view),undefined,speed);
    case "pose-challenge":return stepPoseRound(round.state,dt,pose,width,height,speed);
    case "mole-whack":case "color-match":case "star-hunt":case "meteor-dodge":case "freeze-dance":
      return stepMiniRound(round.state,dt,width,height,points,undefined,speed);
    case "rhythm-pads":case "shield-guard":case "memory-sequence":case "laser-lane":case "parcel-sort":
      return stepAdvancedRound(round.state,dt,width,height,points,undefined,speed);
    case "boss-raid":case "gravity-lab":case "shadow-sync":case "constellation-trace":case "dual-portals":
      return stepExpertRound(round.state,dt,width,height,points,undefined,speed);
  }
}
export function gameHint(id:string){
  switch(id){
    case "fruit-catch":return "카메라 중앙에서 손을 조금만 좌우로 움직여도 바구니가 끝까지 이동해요. 과일을 받고 폭탄은 피하세요!";
    case "pose-challenge":return "화면 속 자세를 따라 하고 0.85초 동안 유지하세요. 전신이 보이도록 서 주세요.";
    case "mole-whack":return "나타나는 두더지를 손으로 터치하세요. 놓치기 전에 빠르게!";
    case "color-match":return "위에 표시된 색의 동그라미를 손으로 터치하세요.";
    case "star-hunt":return "움직이는 별을 손으로 잡아보세요. 시간이 지나면 사라져요.";
    case "meteor-dodge":return "날아오는 운석에 손이 닿지 않게 피하세요. 지나간 운석마다 득점!";
    case "freeze-dance":return "초록 불엔 손을 크게 움직이고 빨간 불엔 그대로 멈추세요!";
    case "rhythm-pads":return "아래 패드에 노트가 도착할 때마다 손을 새로 넣어 터치하세요. 누르고만 있으면 점수가 나지 않아요.";
    case "shield-guard":return "사방에서 중앙으로 날아오는 구슬을 손으로 막고 코어를 지키세요!";
    case "memory-sequence":return "반짝이는 색상의 순서를 외우고, 안내가 끝나면 같은 순서로 손을 넣어 눌러요.";
    case "laser-lane":return "레이저가 내려오기 전 초록색 안전 틈에 양손을 옮겨 피해 보세요.";
    case "parcel-sort":return "중앙 상자를 손으로 집고, 손을 움직여 같은 색의 배송함에 넣어요.";
    case "boss-raid":return "황금 약점이 열린 순간 손을 새로 넣어 터치해요. 빨간 공격 지역은 피하세요!";
    case "gravity-lab":return "양손의 높낮이 차로 공을 좌우로, 두 손의 평균 높이로 상하로 굴려 목표에 도달해요.";
    case "shadow-sync":return "그림자의 움직임을 보고, 양손으로 두 목표를 동시에 따라가며 잠시 유지하세요.";
    case "constellation-trace":return "한 손으로 별 1 → 2 → 3 → 4 → 5를 순서대로 터치하여 이어 보세요.";
    case "dual-portals":return "서로 움직이는 두 포털에 양손을 동시에 놓고 잠시 유지해 에너지를 보내세요.";
    default:return "손·발·머리의 터치 영역으로 풍선을 터뜨려요";
  }
}
