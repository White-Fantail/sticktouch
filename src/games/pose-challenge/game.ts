import type {Landmark} from "../../core.ts";
import type {GameEvent} from "../../engine/game-feel";

export type PoseName="arms-up"|"t-pose"|"hands-hips"|"one-arm-up"|"star";
export const POSE_SEQUENCE:readonly {id:PoseName;label:string;instruction:string}[]=[
  {id:"arms-up",label:"만세!",instruction:"두 손을 머리보다 높이 들어요"},
  {id:"t-pose",label:"비행기",instruction:"양팔을 어깨 높이로 벌려요"},
  {id:"hands-hips",label:"허리에 손",instruction:"두 손을 각각 허리 가까이에 둬요"},
  {id:"one-arm-up",label:"한 손만!",instruction:"한 손은 위로, 다른 손은 아래로"},
  {id:"star",label:"별 모양",instruction:"양손을 펼쳐 들고 발을 벌려요"}
] as const;
export const POSE_HOLD_SECONDS=0.85;
export const POSE_TARGET_SECONDS=8;
export const POSE_DURATION_SECONDS=60;
export type PoseRound={
  playing:boolean;paused:boolean;score:number;time:number;
  step:number; hold:number;targetTime:number; tracking:boolean;
};
export function createPoseRound(seconds=POSE_DURATION_SECONDS):PoseRound {
  return {playing:false,paused:false,score:0,time:seconds,step:0,hold:0,targetTime:0,tracking:false};
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
  width:number,height:number):{finished:boolean;events:GameEvent[]} {
  if(!round.playing||round.paused)return {finished:false,events:[]};
  const match=matchesPose(pose,poseTarget(round).id);
  round.tracking=match!==null;
  if(match===null)return {finished:false,events:[]};
  const dt=Math.max(0,Math.min(0.08,delta));
  round.time=Math.max(0,round.time-dt);
  round.targetTime+=dt;
  round.hold=match?round.hold+dt:0;
  const events:GameEvent[]=[];
  if(round.hold>=POSE_HOLD_SECONDS){
    events.push({id:"pose:success:"+round.step,type:round.targetTime<3.5?"perfect":"good",
      targetId:String(round.step),basePoints:round.targetTime<3.5?25:15,
      position:{x:width*0.5,y:height*0.42},color:"#a5fce4"});
  }else if(round.targetTime>=POSE_TARGET_SECONDS){
    events.push({id:"pose:miss:"+round.step,type:"miss",targetId:String(round.step),
      position:{x:width*0.5,y:height*0.42}});
  }
  if(events.length){round.step++;round.hold=0;round.targetTime=0;}
  if(round.time<=0)round.playing=false;
  return {finished:round.time<=0,events};
}
