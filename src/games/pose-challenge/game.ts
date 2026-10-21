import type {Landmark} from "../../core.ts";
import type {GameEvent} from "../../engine/game-feel";
import {ROUND_DURATION_SECONDS} from "../../engine/round-tempo.ts";

export type PoseName="arms-up"|"t-pose"|"hands-hips"|"one-arm-up"|"star"|"squat";
export const POSE_SEQUENCE:readonly {id:PoseName;label:string;instruction:string}[]=[
  {id:"arms-up",label:"만세!",instruction:"두 손을 머리보다 높이 들어요"},
  {id:"t-pose",label:"비행기",instruction:"양팔을 어깨 높이로 벌려요"},
  {id:"hands-hips",label:"허리에 손",instruction:"두 손을 각각 허리 가까이에 둬요"},
  {id:"one-arm-up",label:"한 손만!",instruction:"한 손은 위로, 다른 손은 아래로"},
  {id:"star",label:"별 모양",instruction:"양손을 펼쳐 들고 발을 벌려요"},
  {id:"squat",label:"앉았다 일어나!",instruction:"무릎을 굽혀 몸을 낮춰요"}
] as const;
export const POSE_HOLD_SECONDS=0.30;
/** Six quarter-note ticks of the rhythm track (0.24 seconds each). */
export const POSE_TARGET_SECONDS=1.44;
export const POSE_DURATION_SECONDS=ROUND_DURATION_SECONDS;
export type PoseRound={
  playing:boolean;paused:boolean;score:number;time:number;
  step:number; hold:number;targetTime:number; tracking:boolean; scored:boolean;
};
export function createPoseRound(seconds=POSE_DURATION_SECONDS):PoseRound {
  return {playing:false,paused:false,score:0,time:seconds,step:0,hold:0,targetTime:0,tracking:false,scored:false};
}
export function poseTarget(round:PoseRound){return POSE_SEQUENCE[round.step%POSE_SEQUENCE.length];}
function visible(p:Landmark|undefined):p is Landmark {
  return !!p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1&&
    (p.visibility??1)>=0.5&&(p.presence??1)>=0.5;
}
/** true/false = recognized/mismatched; null = insufficient tracking (never a miss). */
export function matchesPose(pose:readonly Landmark[]|undefined,kind:PoseName):boolean|null {
  if(!pose)return null;
  const [ls,rs,lw,rw,lh,rh]=[11,12,15,16,23,24].map(i=>pose[i]);
  if(![ls,rs,lw,rw,lh,rh].every(visible))return null;
  const torso=Math.max(0.035,((lh.y+rh.y)-(ls.y+rs.y))/2);
  const shoulderWidth=Math.max(0.04,Math.abs(ls.x-rs.x));
  const sign=Math.sign(ls.x-rs.x)||-1;
  const leftOut=(lw.x-ls.x)*sign;
  const rightOut=(rw.x-rs.x)*-sign;
  switch(kind){
    case "arms-up":
      return lw.y<ls.y-torso*0.23&&rw.y<rs.y-torso*0.23;
    case "t-pose":
      return leftOut>shoulderWidth*0.58&&rightOut>shoulderWidth*0.58&&
        Math.abs(lw.y-ls.y)<torso*0.45&&Math.abs(rw.y-rs.y)<torso*0.45;
    case "hands-hips":
      return Math.hypot((lw.x-lh.x)/shoulderWidth,(lw.y-lh.y)/torso)<0.85&&
        Math.hypot((rw.x-rh.x)/shoulderWidth,(rw.y-rh.y)/torso)<0.85;
    case "one-arm-up":
      return (lw.y<ls.y-torso*0.27&&rw.y>rs.y+torso*0.17)||
        (rw.y<rs.y-torso*0.27&&lw.y>ls.y+torso*0.17);
    case "squat":{
      const lk=pose[25],rk=pose[26];
      if(!visible(lk)||!visible(rk))return null;
      const legSpan=((lk.y+rk.y)-(lh.y+rh.y))/2;
      return legSpan<torso*.85&&legSpan>torso*.10&&
        lw.y>ls.y&&rw.y>rs.y;
    }
    case "star":{
      const la=pose[31],ra=pose[32];
      if(!visible(la)||!visible(ra))return null;
      return lw.y<ls.y-torso*0.15&&rw.y<rs.y-torso*0.15&&
        leftOut>shoulderWidth*0.45&&rightOut>shoulderWidth*0.45&&
        (la.x-lh.x)*sign>shoulderWidth*0.35&&
        (ra.x-rh.x)*-sign>shoulderWidth*0.35;
    }
  }
}
export function stepPoseRound(round:PoseRound,delta:number,pose:readonly Landmark[]|undefined,
  width:number,height:number,speed=1):{finished:boolean;events:GameEvent[]} {
  if(!round.playing||round.paused)return {finished:false,events:[]};
  const match=matchesPose(pose,poseTarget(round).id);
  round.tracking=match!==null;
  if(match===null)return {finished:false,events:[]};
  const dt=Math.max(0,Math.min(0.08,delta));
  round.time=Math.max(0,round.time-dt);
  round.targetTime+=dt*speed;
  round.hold=match?round.hold+dt*speed:0;
  const events:GameEvent[]=[];
  // A dance step remains visible through the full beat, even after success.
  // This creates a continuous choreography instead of clearing a static pose on contact.
  if(!round.scored && round.targetTime>=.30 && round.hold>=POSE_HOLD_SECONDS){
    round.scored=true;
    events.push({id:"dance:step:"+round.step,
      type:round.targetTime<=.92?"perfect":"good",
      targetId:String(round.step),basePoints:round.targetTime<=.92?25:15,
      position:{x:width*.5,y:height*.42},color:"#a5fce4"});
  }
  if(round.targetTime>=POSE_TARGET_SECONDS){
    if(!round.scored)events.push({id:"dance:miss:"+round.step,
      type:"miss",targetId:String(round.step),
      position:{x:width*.5,y:height*.42}});
    round.step++;
    round.targetTime%=POSE_TARGET_SECONDS;
    round.hold=0;round.scored=false;
  }
  if(round.time<=0)round.playing=false;
  return {finished:round.time<=0,events};
}
