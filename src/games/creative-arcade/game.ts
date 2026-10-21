import {mapPoint,type BodyPart,type Landmark,type Point,type Viewport} from "../../core.ts";
import {TouchEntries,touchCircle} from "../../engine/touch-entry.ts";
import {matchesPose,type PoseName} from "../pose-challenge/game.ts";
import {ROUND_DURATION_SECONDS} from "../../engine/round-tempo.ts";
import type {GameEvent} from "../../engine/game-feel.ts";

export type CreativeGameId =
  | "air-drummer" | "music-maker" | "zombie-dance-battle" | "body-charades"
  | "body-painter" | "human-orchestra" | "shadow-theater";
export const CREATIVE_GAME_IDS:readonly CreativeGameId[] = [
  "air-drummer","music-maker","zombie-dance-battle","body-charades",
  "body-painter","human-orchestra","shadow-theater"
];
export const DRUM_PADS:readonly {part:BodyPart;x:number;y:number;name:string;note:number}[] = [
  {part:"leftHand",x:.25,y:.41,name:"스네어",note:196},
  {part:"rightHand",x:.75,y:.41,name:"탐",note:261.6},
  {part:"leftFoot",x:.27,y:.82,name:"킥",note:82.4},
  {part:"rightFoot",x:.73,y:.82,name:"하이햇",note:659.3}
];
export const DRUM_PATTERN=[0,1,2,1,0,3,1,2,3,0,2,1] as const;
export const MUSIC_NOTES=[261.63,293.66,329.63,392,440,523.25] as const;
export const ZOMBIE_POSES:readonly PoseName[]=[
  "t-pose","arms-up","hands-hips","one-arm-up","star","squat"
];
export const CHARADES:readonly {name:string;icon:string;pose:PoseName;guide:string}[]=[
  {name:"비행기",icon:"✈️",pose:"t-pose",guide:"양팔을 옆으로 쭉 펴세요"},
  {name:"로켓 발사",icon:"🚀",pose:"arms-up",guide:"양손을 하늘로 높이!" },
  {name:"슈퍼 히어로",icon:"🦸",pose:"hands-hips",guide:"양손을 허리에 두세요"},
  {name:"자유의 여신상",icon:"🗽",pose:"one-arm-up",guide:"한 손만 높이 드세요"},
  {name:"반짝이는 별",icon:"⭐",pose:"star",guide:"팔다리를 크게 펼쳐요"},
  {name:"개구리",icon:"🐸",pose:"squat",guide:"무릎을 굽혀 앉아요"}
];
export const ORCHESTRA:readonly {name:string;icon:string;pose:PoseName;note:number;instrument:NonNullable<GameEvent["instrument"]>}[]=[
  {name:"현악기",icon:"🎻",pose:"t-pose",note:293.66,instrument:"strings"},
  {name:"트럼펫",icon:"🎺",pose:"one-arm-up",note:392,instrument:"brass"},
  {name:"팀파니",icon:"🥁",pose:"squat",note:146.83,instrument:"drum"},
  {name:"심벌즈",icon:"✨",pose:"star",note:659.26,instrument:"drum"},
  {name:"하프",icon:"🎼",pose:"arms-up",note:523.25,instrument:"strings"}
];
export const SHADOW_STORY:readonly {title:string;icon:string;pose:PoseName;caption:string}[]=[
  {title:"막이 열리고",icon:"🎭",pose:"t-pose",caption:"양팔을 펼쳐 무대를 열어요"},
  {title:"달이 떠올라",icon:"🌙",pose:"arms-up",caption:"달을 머리 위로 올려요"},
  {title:"영웅이 나타나",icon:"🦸",pose:"hands-hips",caption:"멋진 영웅 자세를 해요"},
  {title:"별이 쏟아져",icon:"✨",pose:"star",caption:"온몸으로 별빛을 표현해요"},
  {title:"비밀 문을 열고",icon:"🗝️",pose:"one-arm-up",caption:"한 팔로 문을 열어요"},
  {title:"마지막 인사",icon:"🙇",pose:"squat",caption:"앉아서 관객에게 인사해요"}
];
export type Stroke={x1:number;y1:number;x2:number;y2:number;color:string};
type HandPos={x:number;y:number};
export type CreativeRound={
  kind:CreativeGameId;playing:boolean;paused:boolean;score:number;time:number;duration:number;
  stage:number;phase:number;hold:number;armed:boolean;completed:boolean;seq:number;
  cooldown:number;touches:TouchEntries;hands:Partial<Record<"leftHand"|"rightHand",HandPos>>;
  strokes:Stroke[];ink:number;notes:number[];lastNote:number;
};
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
const handParts:readonly ("leftHand"|"rightHand")[]=["leftHand","rightHand"];
export function createCreativeRound(kind:CreativeGameId,seconds=ROUND_DURATION_SECONDS):CreativeRound{
  return {kind,playing:false,paused:false,score:0,time:seconds,duration:seconds,
    stage:0,phase:0,hold:0,armed:false,completed:false,seq:0,cooldown:0,
    touches:new TouchEntries(),hands:{},strokes:[],ink:0,notes:[],lastNote:0};
}
function visible(p:Landmark|undefined):p is Landmark{
  return !!p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1&&
    (p.visibility??1)>=.5&&(p.presence??1)>=.5;
}
export function trackedCreative(kind:CreativeGameId,points:readonly Point[],pose?:readonly Landmark[]):boolean{
  const has=(part:BodyPart)=>points.some(p=>p.part===part);
  if(kind==="air-drummer")return DRUM_PADS.some(p=>has(p.part));
  if(kind==="music-maker"||kind==="body-painter")return handParts.some(has);
  return !!pose&&[0,11,12,15,16,23,24,25,26,31,32].every(i=>visible(pose[i])) &&
    has("leftHand")&&has("rightHand");
}
function result(r:CreativeRound,events:GameEvent[],type:GameEvent["type"],w:number,h:number,
  points:number,x=.5,y=.5,notes?:{pitch:number;instrument:GameEvent["instrument"]}){
  const id=r.kind+":"+(++r.seq);
  events.push({id,type,targetId:id,basePoints:points,position:{x:x*w,y:y*h},
    ...(notes?{pitch:notes.pitch,instrument:notes.instrument}:{})});
}
function advance(r:CreativeRound){
  r.stage++;r.phase=0;r.hold=0;r.armed=false;r.completed=false;
  r.cooldown=0;r.touches.reset();
}
/** A held pose never gets a point. The player must first visibly release it,
 * then form the requested pose and keep it for the scoring hold interval. */
export function novelPose(r:CreativeRound,matched:boolean|null,dt:number,required=.30):boolean{
  if(matched===null){r.armed=false;r.hold=0;return false;}
  if(!matched){r.armed=true;r.hold=0;return false;}
  if(!r.armed)return false;
  r.hold+=dt;
  return r.hold>=required;
}
function addHandStrokes(r:CreativeRound,points:readonly Point[],w:number,h:number,
  events:GameEvent[]){
  const next:CreativeRound["hands"]={};
  for(const part of handParts){
    const p=points.find(p=>p.part===part);
    if(!p)continue;
    next[part]={x:p.x,y:p.y};
    const prior=r.hands[part];
    if(!prior)continue;
    const dx=(p.x-prior.x)/w,dy=(p.y-prior.y)/h;
    const dist=Math.hypot(dx,dy);
    // Ignore tracking jitter and discontinuous jumps instead of drawing teleport lines.
    if(dist<.012||dist>.16)continue;
    r.strokes.push({x1:prior.x/w,y1:prior.y/h,x2:p.x/w,y2:p.y/h,
      color:part==="leftHand"?"#77d7ff":"#ffa8d9"});
    if(r.strokes.length>320)r.strokes.splice(0,r.strokes.length-320);
    r.ink+=dist;
    if(r.ink>=.48){
      r.ink-=.48;
      result(r,events,"collect",w,h,22,p.x/w,p.y/h,{pitch:523.25,instrument:"paint"});
    }
  }
  r.hands=next;
}
/** A strum must physically cross the centre string. Height selects the note;
 * speed selects the attack. No score for hovering, camera jitter or hand detection swaps. */
function strum(r:CreativeRound,points:readonly Point[],w:number,h:number,events:GameEvent[]){
  const next:CreativeRound["hands"]={};
  for(const part of handParts){
    const p=points.find(p=>p.part===part);
    if(!p)continue;
    next[part]={x:p.x,y:p.y};
    const prev=r.hands[part];
    if(!prev||r.cooldown>0)continue;
    const dx=p.x-prev.x;
    const crossed=(prev.x<w*.5&&p.x>=w*.5)||(prev.x>w*.5&&p.x<=w*.5);
    if(!crossed||Math.abs(dx)<Math.max(6,w*.01))continue;
    if(p.y<h*.17||p.y>h*.88)continue;
    const index=clamp(Math.floor((.88-p.y/h)/.71*MUSIC_NOTES.length),0,MUSIC_NOTES.length-1);
    r.notes.push(index);if(r.notes.length>8)r.notes.shift();
    r.lastNote=index;r.stage++;r.cooldown=.12;
    result(r,events,"good",w,h,10+Math.round(Math.min(14,Math.abs(dx)/w*65)),
      .5,p.y/h,{pitch:MUSIC_NOTES[index],instrument:"keys"});
    if(r.stage%4===0&&new Set(r.notes.slice(-4)).size>=3)
      result(r,events,"bonus",w,h,20,.5,.23);
  }
  r.hands=next;
}
export function stepCreativeRound(r:CreativeRound,delta:number,w:number,h:number,
  points:Point[],pose:readonly Landmark[]|undefined,view:Viewport,
  speed=1):{finished:boolean;events:GameEvent[]}{
  if(!r.playing||r.paused)return {finished:false,events:[]};
  if(!Number.isFinite(w)||!Number.isFinite(h)||w<=0||h<=0||
    !trackedCreative(r.kind,points,pose)){
    r.hands={};r.touches.reset();r.armed=false;r.hold=0;
    return {finished:false,events:[]};
  }
  if(r.time<=0)return {finished:false,events:[]};
  const dt=clamp(Number.isFinite(delta)?delta:0,0,.08),sim=dt*speed;
  r.time=Math.max(0,r.time-dt);r.phase+=sim;r.cooldown=Math.max(0,r.cooldown-sim);
  const events:GameEvent[]=[];
  switch(r.kind){
    case "air-drummer":{
      const pad=DRUM_PADS[DRUM_PATTERN[r.stage%DRUM_PATTERN.length]];
      const input=points.find(p=>p.part===pad.part);
      const struck=r.touches.enter("drum:"+r.stage+":"+pad.part,input,
        touchCircle(pad,.077,w,h),w,h);
      if(struck&&!r.completed){
        result(r,events,"perfect",w,h,24,pad.x,pad.y,
          {pitch:pad.note,instrument:"drum"});
        r.completed=true;
      }
      if(r.phase>=1.10){
        if(!r.completed)result(r,events,"miss",w,h,0,pad.x,pad.y);
        advance(r);
      }
      break;
    }
    case "music-maker":strum(r,points,w,h,events);break;
    case "body-painter":addHandStrokes(r,points,w,h,events);break;
    case "zombie-dance-battle":{
      const target=ZOMBIE_POSES[(r.stage*5+Math.floor(r.stage/3))%ZOMBIE_POSES.length];
      if(!r.completed&&novelPose(r,matchesPose(pose,target),sim,.33)){
        r.completed=true;
        result(r,events,r.phase<1.30?"perfect":"good",w,h,
          r.phase<1.30?27:17,.5,.42);
      }
      if(r.phase>=2.35){
        if(!r.completed)result(r,events,"miss",w,h,0);
        advance(r);
      }
      break;
    }
    case "body-charades":{
      const cue=CHARADES[r.stage%CHARADES.length];
      if(!r.completed&&novelPose(r,matchesPose(pose,cue.pose),sim,.55)){
        r.completed=true;result(r,events,"collect",w,h,28);
      }
      if(r.phase>=3.50){
        if(!r.completed)result(r,events,"miss",w,h,0);
        advance(r);
      }
      break;
    }
    case "human-orchestra":{
      const part=ORCHESTRA[(r.stage*3)%ORCHESTRA.length];
      if(!r.completed&&novelPose(r,matchesPose(pose,part.pose),sim,.32)){
        r.completed=true;r.notes.push(r.stage%5);
        if(r.notes.length>8)r.notes.shift();
        result(r,events,"perfect",w,h,27,.5,.42,
          {pitch:part.note,instrument:part.instrument});
        if(r.stage%5===4)result(r,events,"bonus",w,h,35);
      }
      if(r.phase>=2.15){
        if(!r.completed)result(r,events,"miss",w,h,0);
        advance(r);
      }
      break;
    }
    case "shadow-theater":{
      const chapter=SHADOW_STORY[r.stage%SHADOW_STORY.length];
      if(!r.completed&&novelPose(r,matchesPose(pose,chapter.pose),sim,.60)){
        r.completed=true;
        result(r,events,"perfect",w,h,30,.5,.48);
        if(r.stage%SHADOW_STORY.length===SHADOW_STORY.length-1)
          result(r,events,"bonus",w,h,40);
      }
      if(r.phase>=3.30){
        if(!r.completed)result(r,events,"miss",w,h,0);
        advance(r);
      }
      break;
    }
  }
  if(r.time<=0)r.playing=false;
  return {finished:r.time<=0,events};
}
/** Normalized live silhouette joints for story rendering, independent of camera mirror. */
export function storyJoint(pose:readonly Landmark[]|undefined,index:number,view:Viewport){
  if(!pose||!visible(pose[index]))return null;
  const point=mapPoint(pose[index].x,pose[index].y,view);
  return {x:point.x/view.width,y:point.y/view.height};
}
