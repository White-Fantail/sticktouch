import {coverRect,type Landmark,type Point,type Viewport} from "../core.ts";
import {ROUND_DURATION_SECONDS,gameplaySpeed} from "../engine/round-tempo.ts";
import type {GameEvent} from "../engine/game-feel";
import {createBalloonRound,stepBalloonRound,type BalloonRound} from "./balloon-pop/game.ts";
import {createFruitRound,fruitCameraBox,stepFruitRound,type FruitRound} from "./fruit-catch/game.ts";
import {createPoseRound,matchesPose,poseTarget,stepPoseRound,type PoseRound} from "./pose-challenge/game.ts";
import {createMiniRound,stepMiniRound,type MiniGameId,type MiniRound} from "./mini-arcade/game.ts";
import {createAdvancedRound,stepAdvancedRound,type AdvancedGameId,type AdvancedRound} from "./advanced-arcade/game.ts";
import {createExpertRound,stepExpertRound,TRACE_PARTS,type ExpertGameId,type ExpertRound} from "./expert-arcade/game.ts";

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
  const hand=points.some(p=>p.part==="leftHand"||p.part==="rightHand");
  const visible=(index:number)=>!!pose?.[index]&&
    (pose[index].visibility??1)>=.50&&(pose[index].presence??1)>=.50;
  const torso=visible(0)&&visible(11)&&visible(12)&&visible(23)&&visible(24);
  const body=torso&&visible(25)&&visible(26)&&visible(31)&&visible(32);
  switch(round.kind){
    case "fruit-catch":return hand;
    case "pose-challenge":return matchesPose(pose,poseTarget(round.state).id)!==null;
    case "mole-whack":case "color-match":case "star-hunt":case "parcel-sort":
    case "boss-raid":return hand;
    case "meteor-dodge":return hand&&torso;
    case "freeze-dance":return body&&hand;
    case "rhythm-pads":return body&&hand;
    case "shield-guard":return torso&&visible(13)&&visible(14)&&hand;
    case "memory-sequence":return body&&hand;
    case "laser-lane":return body&&hand;
    case "gravity-lab":case "shadow-sync":case "dual-portals":
      return points.some(p=>p.part==="leftHand")&&points.some(p=>p.part==="rightHand");
    case "constellation-trace":{
      const part=TRACE_PARTS[round.state.trace.pattern][round.state.trace.index];
      return body&&points.some(p=>p.part===part);
    }
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
      return stepAdvancedRound(round.state,dt,width,height,points,Math.random,speed,pose,view);
    case "boss-raid":case "gravity-lab":case "shadow-sync":case "constellation-trace":case "dual-portals":
      return stepExpertRound(round.state,dt,width,height,points,undefined,speed);
  }
}
export function gameHint(id:string){
  switch(id){
    case "fruit-catch":return "카메라 중앙에서 손을 조금만 좌우로 움직여도 바구니가 끝까지 이동해요. 과일을 받고 폭탄은 피하세요!";
    case "pose-challenge":return "1.44초마다 다음 안무로 바뀌어요. 거울 속 전신 자세를 박자에 맞춰 따라 하세요.";
    case "mole-whack":return "나타나는 두더지를 손으로 터치하세요. 놓치기 전에 빠르게!";
    case "color-match":return "위에 표시된 색의 동그라미를 손으로 터치하세요.";
    case "star-hunt":return "움직이는 별을 손으로 잡아보세요. 시간이 지나면 사라져요.";
    case "meteor-dodge":return "손으로 작은 운석을 부수고, 커다란 운석은 양손으로 양옆을 동시에 공격하세요. 몸에 닿지 않도록!";
    case "freeze-dance":return "음악 10박자 동안 온몸으로 춤추고, STOP 6박자 동안 머리·손·발까지 모두 멈추세요.";
    case "rhythm-pads":return "위쪽 패드는 왼손·오른손, 아래쪽은 왼발·오른발! 각 부위로 박자에 맞춰 패드를 터치하세요.";
    case "shield-guard":return "공격 방향을 보고 팔뚝을 가로로 세워 실드를 만드세요. 각도가 맞으면 탄환이 반사돼요.";
    case "memory-sequence":return "나타나는 전신 자세를 순서대로 외운 후, 같은 자세를 0.4초씩 유지해 암호를 해독하세요.";
    case "laser-lane":return "레이저가 나타나기 전 몸을 숙이거나 양옆으로 기울여 피하세요. 머리부터 발까지 충돌을 검사합니다.";
    case "parcel-sort":return "중앙 상자를 손으로 집고, 손을 움직여 같은 색의 배송함에 넣어요.";
    case "boss-raid":return "황금 약점이 열린 순간 손을 새로 넣어 터치해요. 빨간 공격 지역은 피하세요!";
    case "gravity-lab":return "두 손을 편하게 들고 시작하세요. 한쪽 손을 내리면 공이 그쪽으로, 양손을 함께 올리거나 내리면 공이 상하로 움직여요.";
    case "shadow-sync":return "그림자의 움직임을 보고, 양손으로 두 목표를 동시에 따라가며 잠시 유지하세요.";
    case "constellation-trace":return "각 별에 표시된 왼손·오른손·머리·왼발·오른발을 대세요. 연결 순서와 방향이 바뀝니다.";
    case "dual-portals":return "서로 움직이는 두 포털에 양손을 동시에 놓고 잠시 유지해 에너지를 보내세요.";
    default:return "주황=왼손, 파랑=발, 보라=머리, 초록=오른손! 색깔에 맞는 부위로 버블을 터뜨려요.";
  }
}
