import {coverRect,type Landmark,type Point,type Viewport} from "../core.ts";
import {ROUND_DURATION_SECONDS,gameplaySpeed,type RoundDuration} from "../engine/round-tempo.ts";
import type {GameEvent} from "../engine/game-feel";
import {createBalloonRound,stepBalloonRound,type BalloonRound} from "./balloon-pop/game.ts";
import {createFruitRound,fruitCameraBox,stepFruitRound,type FruitRound} from "./fruit-catch/game.ts";
import {createPoseRound,matchesPose,poseTarget,stepPoseRound,type PoseRound} from "./pose-challenge/game.ts";
import {createMiniRound,stepMiniRound,type MiniGameId,type MiniRound} from "./mini-arcade/game.ts";
import {createAdvancedRound,stepAdvancedRound,type AdvancedGameId,type AdvancedRound} from "./advanced-arcade/game.ts";
import {createExpertRound,stepExpertRound,TRACE_PARTS,type ExpertGameId,type ExpertRound} from "./expert-arcade/game.ts";
import {createBodyRound,stepBodyRound,type BodyGameId,type BodyRound} from "./body-arcade/game.ts";
import {createSportRound,stepSportRound,type SportGameId,type SportRound} from "./sports-arcade/game.ts";

export type GameRound =
  | {kind:"balloon-pop";state:BalloonRound}
  | {kind:"fruit-catch";state:FruitRound}
  | {kind:"pose-challenge";state:PoseRound}
  | {kind:MiniGameId;state:MiniRound}
  | {kind:AdvancedGameId;state:AdvancedRound}
  | {kind:ExpertGameId;state:ExpertRound}
  | {kind:BodyGameId;state:BodyRound}
  | {kind:SportGameId;state:SportRound};
export type GameState=GameRound["state"];
export const GAME_SECONDS=ROUND_DURATION_SECONDS;
export function createGameRound(id:string,seconds:RoundDuration=ROUND_DURATION_SECONDS as RoundDuration):GameRound {
  switch(id){
    case "super-goalkeeper":case "air-pingpong":case "motion-bowling":
    case "zero-g-basketball":case "fishing-master":case "i-am-gravity":
      return {kind:id,state:createSportRound(id,seconds)};
    case "fruit-catch":return {kind:"fruit-catch",state:createFruitRound(seconds)};
    case "pose-challenge":return {kind:"pose-challenge",state:createPoseRound(seconds)};
    case "mole-whack":case "color-match":case "star-hunt":case "meteor-dodge":case "freeze-dance":
      return {kind:id,state:createMiniRound(id,seconds)};
    case "rhythm-pads":case "shield-guard":case "memory-sequence":case "laser-lane":case "parcel-sort":
      return {kind:id,state:createAdvancedRound(id,seconds)};
    case "boss-raid":case "gravity-lab":case "shadow-sync":case "constellation-trace":case "dual-portals":
      return {kind:id,state:createExpertRound(id,seconds)};
    case "bomb-defusal":case "human-tetris":case "left-right-brain":case "ninja-training":
    case "volcano-escape":case "trick-teacher":case "do-opposite":case "weird-yoga":
    case "balance-tower":case "perfect-symmetry":case "intruder-alarm":
      return {kind:id,state:createBodyRound(id,seconds)};
    default:return {kind:"balloon-pop",state:createBalloonRound(seconds)};
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
    case "super-goalkeeper":return hand||points.some(p=>p.part==="leftFoot"||p.part==="rightFoot");
    case "air-pingpong":case "motion-bowling":case "zero-g-basketball":case "fishing-master":return hand;
    case "i-am-gravity":return points.some(p=>p.part==="leftHand")&&points.some(p=>p.part==="rightHand");
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
    case "bomb-defusal":case "intruder-alarm":
      return body&&points.some(p=>p.part==="leftHand")&&points.some(p=>p.part==="rightHand")&&
        points.some(p=>p.part==="leftFoot")&&points.some(p=>p.part==="rightFoot");
    case "human-tetris":case "left-right-brain":case "ninja-training":
    case "volcano-escape":case "trick-teacher":case "do-opposite":
    case "weird-yoga":case "balance-tower":case "perfect-symmetry":
      return body&&points.some(p=>p.part==="leftHand")&&points.some(p=>p.part==="rightHand");
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
    case "super-goalkeeper":case "air-pingpong":case "motion-bowling":
    case "zero-g-basketball":case "fishing-master":case "i-am-gravity":
      return stepSportRound(round.state,dt,width,height,points,speed);
    case "balloon-pop":return stepBalloonRound(round.state,dt,width,height,points,speed);
    case "fruit-catch":return stepFruitRound(round.state,dt,width,height,basketInput(points,view),undefined,speed);
    case "pose-challenge":return stepPoseRound(round.state,dt,pose,width,height,speed);
    case "mole-whack":case "color-match":case "star-hunt":case "meteor-dodge":case "freeze-dance":
      return stepMiniRound(round.state,dt,width,height,points,undefined,speed);
    case "rhythm-pads":case "shield-guard":case "memory-sequence":case "laser-lane":case "parcel-sort":
      return stepAdvancedRound(round.state,dt,width,height,points,Math.random,speed,pose,view);
    case "boss-raid":case "gravity-lab":case "shadow-sync":case "constellation-trace":case "dual-portals":
      return stepExpertRound(round.state,dt,width,height,points,undefined,speed);
    case "bomb-defusal":case "human-tetris":case "left-right-brain":case "ninja-training":
    case "volcano-escape":case "trick-teacher":case "do-opposite":case "weird-yoga":
    case "balance-tower":case "perfect-symmetry":case "intruder-alarm":
      return stepBodyRound(round.state,dt,width,height,points,pose,view,speed);
  }
}
export function gameHint(id:string){
  switch(id){
    case "super-goalkeeper":return "골문으로 오는 공을 손이나 발을 직접 움직여 막아요. 가만히 있는 손에 맞아서는 세이브되지 않습니다.";
    case "air-pingpong":return "날아오는 공을 손바닥으로 휘둘러 라켓처럼 반사하세요. 손의 방향에 따라 공의 궤적이 달라져요.";
    case "motion-bowling":return "손을 화면 아래에서 위로 빠르게 움직여 투구하세요. 공의 궤적과 핀 사이의 충돌로 점수를 얻어요.";
    case "zero-g-basketball":return "골대를 향해 손을 비스듬히 위로 스윙해 공을 던져요. 공이 떠오르고 느리게 떨어져 골대 안으로 들어가게 하세요.";
    case "fishing-master":return "팔을 휘둘러 바늘을 던진 뒤 물고기가 물면 손을 반복해서 위로 움직여 릴링하세요.";
    case "i-am-gravity":return "왼손을 움직이면 행성이 당겨지고, 오른손을 움직이면 밀려나요. 행성을 위쪽 포털로 유도하세요.";
    case "fruit-catch":return "카메라 중앙에서 손을 조금만 좌우로 움직여도 바구니가 끝까지 이동해요. 과일을 받고 폭탄은 피하세요!";
    case "pose-challenge":return "1.44초마다 안무가 바뀌어요. 기본 자세에서 새 자세로 움직여 박자를 맞추세요.";
    case "mole-whack":return "손을 두더지 밖으로 뺐다가 다시 넣어 터치하세요. 놓치기 전에 빠르게!";
    case "color-match":return "손을 색깔 원 밖에서 안으로 움직여 정답을 선택하세요.";
    case "star-hunt":return "손으로 움직이는 별을 쫓아가 터치하세요. 가만히 있으면 잡히지 않아요.";
    case "meteor-dodge":return "손을 움직여 작은 운석을 타격하세요. 큰 운석은 양손을 각각 밖에서 안으로 넣어 협동 공격!";
    case "freeze-dance":return "음악 10박자 동안 온몸으로 춤추고, STOP 6박자 동안 머리·손·발까지 모두 멈추세요.";
    case "rhythm-pads":return "위쪽은 양손, 아래쪽은 양발! 패드 밖에서 안으로 들어가는 동작으로 박자를 맞추세요.";
    case "shield-guard":return "공격 방향을 보고 팔뚝을 가로로 세워 실드를 만드세요. 각도가 맞으면 탄환이 반사돼요.";
    case "memory-sequence":return "순서를 외운 다음, 기존 자세를 풀고 새 자세를 0.4초 유지해 암호를 해독하세요.";
    case "laser-lane":return "레이저가 나타나기 전 몸을 숙이거나 양옆으로 기울여 피하세요. 머리부터 발까지 충돌을 검사합니다.";
    case "parcel-sort":return "상자 밖에서 손을 넣어 집고, 배송함에도 새로 손을 넣어 배달하세요.";
    case "boss-raid":return "황금 약점이 열린 순간 손을 새로 넣어 터치해요. 빨간 공격 지역은 피하세요!";
    case "gravity-lab":return "두 손을 편하게 들고 시작하세요. 한쪽 손을 내리면 공이 그쪽으로, 양손을 함께 올리거나 내리면 공이 상하로 움직여요.";
    case "shadow-sync":return "그림자를 본 뒤 두 손을 각 목표 밖에서 안으로 이동하고 잠시 유지하세요.";
    case "constellation-trace":return "표시된 손·발·머리를 별 밖에서 안으로 움직여 연결하세요. 이미 겹치면 밖으로 뺐다 다시 터치!";
    case "dual-portals":return "양손을 각각 포털 밖에서 안으로 움직여 동시에 잠시 유지하세요.";
    case "bomb-defusal":return "화면에 지정된 왼손·오른손·왼발·오른발 스위치를 순서대로 밖에서 안으로 터치해요.";
    case "human-tetris":return "다가오는 벽의 전신 자세를 보고 먼저 다른 자세를 만든 뒤 0.4초 유지하세요.";
    case "left-right-brain":return "두 손에 서로 다른 지시가 나옵니다. 팔을 움직여 두 조건을 동시에 충족하세요.";
    case "ninja-training":return "첫 2초 동안 지정된 손으로 표창을 치고, 다음에는 몸을 숙이거나 좌우로 기울여 공격을 피하세요.";
    case "volcano-escape":return "용암이 오면 실제로 두 발을 들어 점프하고, 화산재가 오면 무릎을 굽혀 앉으세요.";
    case "trick-teacher":return "초록 표시에서는 지시를 따라하고, 빨간 속임수에서는 양손을 허리에 올려요.";
    case "do-opposite":return "화면에 손을 올리라고 하면 내리고, 내리라고 하면 올려요. 원래 자세에서 벗어났다가 맞추세요.";
    case "weird-yoga":return "나무·전사·의자·비틀기 자세를 몸으로 만들고 안정적으로 1초 이상 유지해요.";
    case "balance-tower":return "상체를 왼쪽·오른쪽·중앙 목표로 천천히 이동해 1초 동안 균형을 유지하세요.";
    case "perfect-symmetry":return "양팔의 높이와 좌우 벌림을 거울처럼 맞춰 0.9초 이상 유지해요.";
    case "intruder-alarm":return "지정된 발을 바닥 압력판 밖에서 안으로 이동한 뒤 발을 떼지 않고 반대편 손으로 잠금장치를 터치해요.";
    default:return "주황=왼손, 파랑=발, 보라=머리, 초록=오른손! 부위를 버블 밖에서 안으로 움직여 터뜨려요.";
  }
}
