import {circlesOverlap,mapPoint,type Landmark,type Point,type BodyPart,type Viewport} from "../../core.ts";
import {matchesPose,type PoseName} from "../pose-challenge/game.ts";
import {TouchEntries,touchCircle} from "../../engine/touch-entry.ts";
import {ROUND_DURATION_SECONDS} from "../../engine/round-tempo.ts";
import type {GameEvent} from "../../engine/game-feel";

export type BodyGameId =
  | "bomb-defusal" | "human-tetris" | "left-right-brain" | "ninja-training"
  | "volcano-escape" | "trick-teacher" | "do-opposite" | "weird-yoga"
  | "balance-tower" | "perfect-symmetry" | "intruder-alarm";
export const BODY_GAME_IDS:readonly BodyGameId[] = [
  "bomb-defusal","human-tetris","left-right-brain","ninja-training",
  "volcano-escape","trick-teacher","do-opposite","weird-yoga",
  "balance-tower","perfect-symmetry","intruder-alarm"
];
export const LIMBS:readonly BodyPart[]=["leftHand","rightHand","leftFoot","rightFoot"];
export const SWITCHES=[
  {x:.23,y:.40},{x:.77,y:.40},{x:.25,y:.84},{x:.75,y:.84}
] as const;
export const LOCKS=[{x:.30,y:.38},{x:.70,y:.38}] as const;
export const PLATES=[{x:.30,y:.86},{x:.70,y:.86}] as const;
export const POSE_WALLS:readonly PoseName[]=[
  "t-pose","arms-up","star","squat","one-arm-up","hands-hips"
];
export const YOGA_NAMES=["나무 자세 · 왼발","나무 자세 · 오른발","전사 자세","의자 자세","비틀기"] as const;
export const BRAIN_TASKS=["왼손 위 · 오른손 아래","왼손 아래 · 오른손 위",
  "왼손 밖 · 오른손 안","왼손 안 · 오른손 밖"] as const;
export const OPPOSITES=["왼손 올려!","오른손 올려!","두 손 올려!","두 손 내려!"] as const;
export const TEACHER_TASKS=["만세!","비행기!","허리에 손!","별 모양!"] as const;
const TEACHER_POSES:readonly PoseName[]=["arms-up","t-pose","hands-hips","star"];

export type BodyRound={
  kind:BodyGameId;playing:boolean;paused:boolean;score:number;time:number;duration:number;seq:number;
  stage:number;phase:number;index:number;hold:number;armed:boolean;completed:boolean;
  waveScored:boolean;strikes:number;baseline:number|null;plateReady:boolean;
  touches:TouchEntries;
};
const clamp=(n:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,n));
const visible=(p:Landmark|undefined):p is Landmark=>!!p&&Number.isFinite(p.x)&&
  Number.isFinite(p.y)&&p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1&&
  (p.visibility??1)>=.5&&(p.presence??1)>=.5;
const pos=(x:number,y:number,w:number,h:number)=>({x:x*w,y:y*h});
const isOn=(p:Point|undefined,at:{x:number;y:number},radius:number,w:number,h:number)=>
  !!p&&circlesOverlap(p,touchCircle(at,radius,w,h));
const point=(points:readonly Point[],part:BodyPart)=>points.find(p=>p.part===part);
const poseAt=(pose:readonly Landmark[],i:number,view:Viewport)=>
  visible(pose[i])?mapPoint(pose[i].x,pose[i].y,view):null;
const center=(pose:readonly Landmark[],i:number,j:number)=>{
  if(!visible(pose[i])||!visible(pose[j]))return null;
  return {x:(pose[i].x+pose[j].x)/2,y:(pose[i].y+pose[j].y)/2};
};
const wristPose=(pose:readonly Landmark[],side:0|1)=>{
  const shoulder=pose[11+side],wrist=pose[15+side],hip=pose[23+side];
  if(!visible(shoulder)||!visible(wrist)||!visible(hip))return null;
  return {shoulder,wrist,hip};
};
export function createBodyRound(kind:BodyGameId,seconds=ROUND_DURATION_SECONDS):BodyRound{
  return {kind,playing:false,paused:false,score:0,time:seconds,duration:seconds,seq:0,
    stage:0,phase:0,index:0,hold:0,armed:false,completed:false,
    waveScored:false,strikes:0,baseline:null,plateReady:false,touches:new TouchEntries()};
}
function emit(r:BodyRound,events:GameEvent[],type:GameEvent["type"],w:number,h:number,
  detail:string,basePoints=0,x=.5,y=.48,part?:string){
  const id=++r.seq;
  events.push({id:r.kind+":"+detail+":"+id,type,
    targetId:r.kind+":"+detail+":"+id,basePoints,
    position:pos(x,y,w,h),bodyPart:part});
}
function next(r:BodyRound){
  r.stage++;r.phase=0;r.index=0;r.hold=0;r.armed=false;
  r.completed=false;r.waveScored=false;r.plateReady=false;r.touches.reset();
}
function holdNew(r:BodyRound,matched:boolean,dt:number,seconds:number){
  // A pose already matched on the first frame must be released before it can score.
  if(!matched){r.armed=true;r.hold=0;return false;}
  if(r.armed)r.hold+=dt;
  return r.armed&&r.hold>=seconds;
}
function checkTimeout(r:BodyRound,events:GameEvent[],w:number,h:number,after:number){
  if(r.phase<after)return false;
  emit(r,events,"miss",w,h,"timeout");next(r);return true;
}
/** Explicit dual-arm commands use a body-relative coordinate system, not pixel positions. */
export function armCommand(pose:readonly Landmark[],side:0|1,command:"up"|"down"|"out"|"in"):boolean|null{
  const p=wristPose(pose,side);
  if(!p)return null;
  const torso=Math.max(.05,p.hip.y-p.shoulder.y),width=Math.max(.08,
    visible(pose[11])&&visible(pose[12])?Math.abs(pose[11].x-pose[12].x):.2);
  if(command==="up")return p.wrist.y<p.shoulder.y-torso*.17;
  if(command==="down")return p.wrist.y>p.shoulder.y+torso*.47;
  const outward=side===0?(p.shoulder.x-p.wrist.x):(p.wrist.x-p.shoulder.x);
  if(command==="out")return outward>width*.48;
  return Math.abs(p.wrist.x-p.hip.x)<width*.36&&p.wrist.y>p.shoulder.y+torso*.20;
}
const brainCommands=(stage:number):readonly ["up"|"down"|"out"|"in","up"|"down"|"out"|"in"]=>
  ([["up","down"],["down","up"],["out","in"],["in","out"]] as const)[stage%4];
function motionPose(pose:readonly Landmark[],kind:"duck"|"left"|"right"):boolean|null{
  const head=pose[0],hips=center(pose,23,24),shoulders=center(pose,11,12);
  if(!visible(head)||!hips||!shoulders)return null;
  if(kind==="duck")return matchesPose(pose,"squat");
  const width=Math.max(.08,Math.abs(pose[11].x-pose[12].x));
  const tilt=(shoulders.x-hips.x)/width;
  return kind==="left"?tilt<-.22:tilt>.22;
}
const kneeBent=(pose:readonly Landmark[],side:0|1)=>{
  const [hip,knee,ankle]=side===0?[23,25,31]:[24,26,32];
  if(![pose[hip],pose[knee],pose[ankle]].every(visible))return null;
  const a=pose[hip],b=pose[knee],c=pose[ankle];
  const v1=[a.x-b.x,a.y-b.y],v2=[c.x-b.x,c.y-b.y];
  return (v1[0]*v2[0]+v1[1]*v2[1])/Math.max(.0001,Math.hypot(...v1)*Math.hypot(...v2))>-.56;
};
export function yogaMatch(pose:readonly Landmark[],kind:number):boolean|null{
  if(![0,11,12,15,16,23,24,25,26,31,32].every(i=>visible(pose[i])))return null;
  const left=pose[31],right=pose[32];
  const torso=Math.max(.07,(pose[23].y+pose[24].y-pose[11].y-pose[12].y)/2);
  const bothUp=armCommand(pose,0,"up")===true&&armCommand(pose,1,"up")===true;
  switch(kind%5){
    case 0:return bothUp&&left.y<right.y-torso*.33; // lift left foot
    case 1:return bothUp&&right.y<left.y-torso*.33;
    case 2:return matchesPose(pose,"t-pose")===true&&
      Math.abs(left.x-right.x)>Math.abs(pose[11].x-pose[12].x)*1.30;
    case 3:return bothUp&&kneeBent(pose,0)===true&&kneeBent(pose,1)===true;
    default:return (armCommand(pose,0,"in")===true&&armCommand(pose,1,"out")===true)||
      (armCommand(pose,1,"in")===true&&armCommand(pose,0,"out")===true);
  }
}
export function symmetryMatch(pose:readonly Landmark[],level:number):boolean|null{
  if(![11,12,15,16,23,24].every(i=>visible(pose[i])))return null;
  const shoulders=center(pose,11,12)!;
  const wrists=center(pose,15,16)!;
  const width=Math.max(.06,Math.abs(pose[12].x-pose[11].x));
  const torso=Math.max(.08,(pose[23].y+pose[24].y)/2-shoulders.y);
  const mirrored=Math.abs(wrists.x-shoulders.x)<width*.18&&
    Math.abs(pose[15].y-pose[16].y)<torso*.20;
  const targets=["up","out","down"] as const;
  const target=targets[level%3];
  return mirrored && armCommand(pose,0,target)===true && armCommand(pose,1,target)===true;
}
/** Keep a moving hazard phase and score only an actual response to the warning. */
export function stepBodyRound(r:BodyRound,delta:number,w:number,h:number,points:Point[],
  pose:readonly Landmark[]|undefined,view:Viewport|undefined,speed=1
):{finished:boolean;events:GameEvent[]}{
  if(!r.playing||r.paused){r.touches.reset();return {finished:false,events:[]};}
  const required=[0,11,12,15,16,23,24,25,26,31,32];
  if(!pose||!view||!required.every(i=>visible(pose[i]))||
    w<=0||h<=0||!Number.isFinite(w)||!Number.isFinite(h)){
    r.touches.reset();r.hold=0;r.armed=false;return {finished:false,events:[]};
  }
  const dt=clamp(Number.isFinite(delta)?delta:0,0,.08),sim=dt*speed;
  r.time=Math.max(0,r.time-dt);r.phase+=sim;
  const events:GameEvent[]=[];
  switch(r.kind){
    case "bomb-defusal":{
      const seq=[0,2,1,3,1,0,3,2];
      const limb=seq[(r.stage*3+r.index)%seq.length];
      const target=SWITCHES[limb],part=LIMBS[limb];
      if(r.touches.contact("wire:"+r.stage+":"+r.index,points,
        touchCircle(target,.080,w,h),w,h,[part])){
        emit(r,events,"good",w,h,"wire",20,target.x,target.y,part);
        r.index++;r.phase=0;
        if(r.index>=4){emit(r,events,"bonus",w,h,"defused",35);next(r);}
      } else if(r.phase>3.4){
        emit(r,events,"damage",w,h,"explosion");next(r);
      }
      break;
    }
    case "human-tetris":{
      const shape=POSE_WALLS[r.stage%POSE_WALLS.length];
      const match=matchesPose(pose,shape);
      if(match!==null&&!r.completed&&holdNew(r,match,sim,.40)){
        r.completed=true;emit(r,events,"perfect",w,h,"wall",30);
      }
      if(r.phase>=3.1){
        if(!r.completed)emit(r,events,"damage",w,h,"wall-collision");
        next(r);
      }
      break;
    }
    case "left-right-brain":{
      const [lcmd,rcmd]=brainCommands(r.stage);
      const l=armCommand(pose,0,lcmd),rr=armCommand(pose,1,rcmd);
      if(l!==null&&rr!==null&&!r.completed&&holdNew(r,l&&rr,sim,.42)){
        emit(r,events,"perfect",w,h,"duality",28);
        r.completed=true;
      }
      if(r.phase>=2.9){
        if(!r.completed)emit(r,events,"miss",w,h,"brain-timeout");
        next(r);
      }
      break;
    }
    case "ninja-training":{
      const target={x:r.stage%2===0?.23:.77,y:r.stage%3===0?.40:.52};
      const attackPart:BodyPart=r.stage%2===0?"leftHand":"rightHand";
      if(!r.completed&&r.phase<2&&r.touches.contact("ninja:"+r.stage,points,
        touchCircle(target,.075,w,h),w,h,[attackPart])){
        r.completed=true;emit(r,events,"hit",w,h,"shuriken",20,target.x,target.y,attackPart);
      }
      const mode=r.stage%3===0?"duck":r.stage%3===1?"left":"right";
      if(r.phase>=2.0&&r.phase<3.1){
        const safe=motionPose(pose,mode);
        if(safe!==null&&!r.waveScored&&holdNew(r,safe,sim,.30)){
          r.waveScored=true;emit(r,events,"collect",w,h,"dodge",20);
        }
      }
      if(r.phase>=3.2){
        if(!r.completed||!r.waveScored)emit(r,events,"damage",w,h,"ninja-hit");
        else emit(r,events,"bonus",w,h,"ninja-clean",15);
        next(r);
      }
      break;
    }
    case "volcano-escape":{
      const ankle=(pose[31].y+pose[32].y)/2;
      if(r.baseline===null)r.baseline=ankle;
      // Learn standing level only outside the jump window; never chase a jump mid-air.
      if(r.phase<.60&&r.stage===0)r.baseline=r.baseline*.93+ankle*.07;
      const jumping=r.baseline-ankle>.055;
      const safe=r.stage%2===0?jumping:matchesPose(pose,"squat")===true;
      if(r.phase>=.85&&r.phase<1.95&&!r.waveScored&&safe){
        r.hold+=sim;
        if(r.hold>=(r.stage%2===0?.16:.32)){
          r.waveScored=true;emit(r,events,"collect",w,h,"survive",25);
        }
      }else if(!safe)r.hold=0;
      if(r.phase>=2.05&&!r.completed){
        r.completed=true;
        if(!r.waveScored)emit(r,events,"damage",w,h,"lava",0);
      }
      if(r.phase>=2.8){next(r);r.baseline=ankle;}
      break;
    }
    case "trick-teacher":{
      const honest=r.stage%3!==2,idx=r.stage%TEACHER_POSES.length;
      const target=honest?matchesPose(pose,TEACHER_POSES[idx]):
        matchesPose(pose,"hands-hips");
      if(target!==null&&!r.completed&&holdNew(r,target,sim,.42)){
        r.completed=true;emit(r,events,"good",w,h,"teacher",honest?25:30);
      }
      if(r.phase>=2.9){
        if(!r.completed)emit(r,events,"miss",w,h,"teacher-timeout");
        next(r);
      }
      break;
    }
    case "do-opposite":{
      const stage=r.stage%4;
      const goal:readonly ("up"|"down")[]=["down","down","down","up"];
      const left=armCommand(pose,0,stage===1? "up":goal[stage]);
      const right=armCommand(pose,1,stage===0? "up":goal[stage]);
      if(left!==null&&right!==null&&!r.completed&&holdNew(r,left&&right,sim,.38)){
        r.completed=true;emit(r,events,"perfect",w,h,"reversed",28);
      }
      if(r.phase>=2.65){
        if(!r.completed)emit(r,events,"miss",w,h,"opposite-timeout");
        next(r);
      }
      break;
    }
    case "weird-yoga":{
      const matched=yogaMatch(pose,r.stage%5);
      if(matched!==null&&!r.completed&&holdNew(r,matched,sim,1.05)){
        r.completed=true;emit(r,events,"perfect",w,h,"yoga",35);
      }
      if(r.phase>=5.6){
        if(!r.completed)emit(r,events,"miss",w,h,"yoga-timeout");
        next(r);
      }
      break;
    }
    case "balance-tower":{
      const shoulders=center(pose,11,12),hips=center(pose,23,24);
      const width=Math.max(.07,Math.abs(pose[11].x-pose[12].x));
      const sway=shoulders&&hips?(shoulders.x-hips.x)/width:0;
      const targets=[-.28,.28,0,-.28,.28] as const,target=targets[r.stage%targets.length];
      const matched=Math.abs(sway-target)<.13;
      if(!r.completed&&holdNew(r,matched,sim,1.05)){
        r.completed=true;emit(r,events,"collect",w,h,"stack",35);
      }
      if(r.phase>=4.2){
        if(!r.completed)emit(r,events,"miss",w,h,"topple");
        next(r);
      }
      break;
    }
    case "perfect-symmetry":{
      const mirrored=symmetryMatch(pose,r.stage);
      if(mirrored!==null&&!r.completed&&holdNew(r,mirrored,sim,.92)){
        r.completed=true;emit(r,events,"perfect",w,h,"mirror",35);
      }
      if(r.phase>=3.8){
        if(!r.completed)emit(r,events,"miss",w,h,"mirror-timeout");
        next(r);
      }
      break;
    }
    case "intruder-alarm":{
      const side=(r.stage%2) as 0|1;
      const foot:BodyPart=side===0?"leftFoot":"rightFoot";
      const hand:BodyPart=side===0?"rightHand":"leftHand";
      const plate=PLATES[side],lock=LOCKS[1-side];
      const p=point(points,foot);
      if(!r.plateReady){
        if(r.touches.contact("plate:"+r.stage,points,touchCircle(plate,.075,w,h),w,h,[foot]))
          r.plateReady=true;
      }
      if(r.plateReady){
        if(!isOn(p,plate,.09,w,h)){
          r.plateReady=false;r.hold=0;r.touches.reset();
        }else{
          r.hold=Math.min(1,r.hold+sim);
          if(r.hold>=.48&&r.touches.contact("lock:"+r.stage,points,
            touchCircle(lock,.075,w,h),w,h,[hand])){
            emit(r,events,"perfect",w,h,"unlocked",40,lock.x,lock.y,hand);next(r);
          }
        }
      }
      if(r.phase>5.5){emit(r,events,"damage",w,h,"alarm");next(r);}
      break;
    }
  }
  if(r.time<=0)r.playing=false;
  return {finished:r.time<=0,events};
}
