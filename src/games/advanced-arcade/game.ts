import {circlesOverlap,mapPoint,BONES,type Landmark,type Point,type Viewport,type BodyPart} from "../../core.ts";
import {matchesPose,POSE_SEQUENCE} from "../pose-challenge/game.ts";
import type {GameEvent} from "../../engine/game-feel";
import {ROUND_DURATION_SECONDS} from "../../engine/round-tempo.ts";
import {TouchEntries,touchCircle} from "../../engine/touch-entry.ts";

export type AdvancedGameId=
  |"rhythm-pads"|"shield-guard"|"memory-sequence"|"laser-lane"|"parcel-sort";
export const ADVANCED_GAME_IDS:readonly AdvancedGameId[]=[
  "rhythm-pads","shield-guard","memory-sequence","laser-lane","parcel-sort"
];
export const BEAT_SPOTS=[{x:.25,y:.45},{x:.75,y:.45},{x:.28,y:.78},{x:.72,y:.78}] as const;
export const BEAT_PARTS:readonly BodyPart[]=["leftHand","rightHand","leftFoot","rightFoot"];
export const MEMORY_SPOTS=[
  {x:.27,y:.40},{x:.73,y:.40},{x:.27,y:.71},{x:.73,y:.71}
] as const;
export const SORT_BINS=[{x:.2,y:.25},{x:.5,y:.25},{x:.8,y:.25}] as const;
export const SORT_COLORS=["#69dafa","#ffcb73","#cd9dff"] as const;
export type Note={id:number;lane:number;age:number};
export type Bolt={id:number;x:number;y:number;vx:number;vy:number;age:number;reflected?:boolean};
export type Laser={id:number;gap:number;age:number;damaged:boolean;mode?:"high"|"side"};
export type Parcel={id:number;kind:number;x:number;y:number;age:number;heldBy:string|null;armed:boolean};
type MemoryPhase="watch"|"input"|"rest";
export type AdvancedRound={
  kind:AdvancedGameId;playing:boolean;paused:boolean;score:number;time:number;duration:number;seq:number;
  phaseTime:number;spawnTime:number;wait:number;
  notes:Note[];bolts:Bolt[];
  sequence:number[];memoryPhase:MemoryPhase;memoryIndex:number;memoryLit:number;memoryCorrect:boolean;
  previousPads:Record<string,number>;
  poseHold:number;wrongHold:number;poseArmed:boolean;shieldArms:{x:number;y:number;angle:number}[];
  laser:Laser|null;parcel:Parcel|null;
  touches:TouchEntries;
};
const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
const handsOnly=(points:readonly Point[])=>points.filter(p=>
  (p.part==="leftHand"||p.part==="rightHand")&&
  Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.radius));
const choose=(size:number,rand:()=>number)=>clamp(Math.floor(rand()*size),0,size-1);
const position=(x:number,y:number,w:number,h:number)=>({x:x*w,y:y*h});
const touch=(p:Point,at:{x:number;y:number},radius:number,w:number,h:number)=>
  circlesOverlap(p,{...position(at.x,at.y,w,h),radius:radius*Math.min(w,h)});

export function createAdvancedRound(kind:AdvancedGameId,seconds=ROUND_DURATION_SECONDS):AdvancedRound{
  return {kind,playing:false,paused:false,score:0,time:seconds,duration:seconds,seq:0,
    phaseTime:0,spawnTime:0,wait:0,notes:[],bolts:[],sequence:[],
    memoryPhase:"watch",memoryIndex:0,memoryLit:-1,memoryCorrect:false,
    previousPads:{},poseHold:0,wrongHold:0,poseArmed:false,shieldArms:[],laser:null,parcel:null,
    touches:new TouchEntries()};
}
/** A press is entering a pad, not holding a palm over it across frames.
 * Maintain the same history during preview and cooldown as during input. */
function padPresses(round:AdvancedRound,hands:Point[],
  spots:readonly {x:number;y:number}[],radius:number,w:number,h:number){
  const next:Record<string,number>={};
  const pressed:{part:string;pad:number}[]=[];
  for(const hand of hands){
    const pad=spots.findIndex(s=>touch(hand,s,radius,w,h));
    next[hand.part]=pad;
    if(pad>=0&&round.previousPads[hand.part]!==undefined&&
      round.previousPads[hand.part]!==pad)pressed.push({part:hand.part,pad});
  }
  round.previousPads=next;
  return pressed;
}
function stepBeats(round:AdvancedRound,dt:number,points:Point[],w:number,h:number,
  rand:()=>number,events:GameEvent[]){
  round.spawnTime+=dt;
  while(round.spawnTime>=.72){
    round.spawnTime-=.72;
    // Rotate through all four limbs; all lanes must be playable, not just hands.
    round.notes.push({id:++round.seq,lane:(round.seq-1+choose(4,rand))%4,age:0});
  }
  for(const note of round.notes)note.age+=dt;
  const next:Record<string,number>={};
  for(const point of points){
    const lane=BEAT_PARTS.indexOf(point.part);
    if(lane<0)continue;
    next[point.part]=touch(point,BEAT_SPOTS[lane],.095,w,h)?lane:-1;
    if(!round.touches.contact("pad:"+lane,[point],
      touchCircle(BEAT_SPOTS[lane],.095,w,h),w,h,[point.part]))continue;
    const possible=round.notes.filter(n=>n.lane===lane&&Math.abs(n.age-1.24)<=.28)
      .sort((a,b)=>Math.abs(a.age-1.24)-Math.abs(b.age-1.24))[0];
    if(!possible)continue;
    const precise=Math.abs(possible.age-1.24)<=.115;
    events.push({id:"beat:hit:"+possible.id,type:precise?"perfect":"good",
      targetId:"beat:"+possible.id,basePoints:precise?25:15,
      position:position(BEAT_SPOTS[lane].x,BEAT_SPOTS[lane].y,w,h),
      color:precise?"#ffe388":"#97f8d0",bodyPart:point.part});
    round.notes=round.notes.filter(n=>n.id!==possible.id);
  }
  round.previousPads=next;
  const expired=round.notes.filter(n=>n.age>1.58);
  for(const note of expired)events.push({id:"beat:miss:"+note.id,type:"miss",
    targetId:"beat:"+note.id,position:position(BEAT_SPOTS[note.lane].x,BEAT_SPOTS[note.lane].y,w,h)});
  round.notes=round.notes.filter(n=>n.age<=1.58);
}
function spawnBolt(round:AdvancedRound,rand:()=>number){
  const edge=choose(4,rand),lane=.20+rand()*.60;
  const x=edge===0?-.08:edge===1?1.08:lane;
  const y=edge===2?-.08:edge===3?1.08:lane;
  const dx=.5-x,dy=.51-y,length=Math.hypot(dx,dy)||1;
  const speed=.20+rand()*.09;
  round.bolts.push({id:++round.seq,x,y,vx:dx/length*speed,vy:dy/length*speed,age:0});
}
export function shieldForearms(pose:readonly Landmark[]|undefined,view:Viewport|undefined){
  if(!pose||!view)return [];
  const arms:{part:"leftHand"|"rightHand";a:{x:number;y:number};b:{x:number;y:number};angle:number}[]=[];
  for(const side of ["left","right"] as const){
    const elbow=pose[side==="left"?13:14],wrist=pose[side==="left"?15:16];
    if(!elbow||!wrist||[elbow,wrist].some(p=>
      !Number.isFinite(p.x)||!Number.isFinite(p.y)||(p.visibility??1)<.5))continue;
    const a=mapPoint(elbow.x,elbow.y,view),b=mapPoint(wrist.x,wrist.y,view);
    arms.push({part:side==="left"?"leftHand":"rightHand",a,b,
      angle:Math.atan2(b.y-a.y,b.x-a.x)});
  }
  return arms;
}
function stepShield(round:AdvancedRound,dt:number,points:Point[],w:number,h:number,
  rand:()=>number,events:GameEvent[],pose?:readonly Landmark[],view?:Viewport){
  const arms=shieldForearms(pose,view);
  round.shieldArms=arms.map(arm=>({x:(arm.a.x+arm.b.x)/2/w,
    y:(arm.a.y+arm.b.y)/2/h,angle:arm.angle}));
  round.spawnTime+=dt;
  const interval=Math.max(.67,1.12-(round.duration-round.time)*.006);
  while(round.spawnTime>=interval){round.spawnTime-=interval;spawnBolt(round,rand);}
  const remaining:Bolt[]=[];
  for(const bolt of round.bolts){
    bolt.x+=bolt.vx*dt;bolt.y+=bolt.vy*dt;bolt.age+=dt;
    if(bolt.reflected){
      if(bolt.x>-.20&&bolt.x<1.20&&bolt.y>-.20&&bolt.y<1.20&&bolt.age<8)
        remaining.push(bolt);
      continue;
    }
    const bx=bolt.x*w,by=bolt.y*h;
    const incoming=Math.hypot(bolt.vx*w,bolt.vy*h)||1;
    const reflector=arms.find(arm=>{
      const dx=arm.b.x-arm.a.x,dy=arm.b.y-arm.a.y;
      const len=Math.hypot(dx,dy)||1;
      const t=clamp(((bx-arm.a.x)*dx+(by-arm.a.y)*dy)/(len*len),0,1);
      const separation=Math.hypot(bx-(arm.a.x+dx*t),by-(arm.a.y+dy*t));
      const aligned=Math.abs((dx*bolt.vx*w+dy*bolt.vy*h)/(len*incoming));
      return separation<=Math.min(w,h)*.063&&aligned<.64;
    });
    if(reflector){
      // The forearm forms the reflecting plane. Tangential arm contact does
      // not reflect; align the arm crosswise to the incoming projectile.
      bolt.reflected=true;bolt.vx*=-1.45;bolt.vy*=-1.45;
      events.push({id:"shield:reflect:"+bolt.id,type:"perfect",
        targetId:"shield:"+bolt.id,basePoints:30,
        position:{x:bx,y:by},color:"#8afbed",bodyPart:reflector.part});
      remaining.push(bolt);
    }else if(Math.hypot(bolt.x-.5,bolt.y-.51)<.105){
      events.push({id:"shield:damage:"+bolt.id,type:"damage",targetId:"shield:"+bolt.id,
        position:position(.5,.51,w,h),color:"#ff808a"});
    }else if(bolt.age<8)remaining.push(bolt);
  }
  round.bolts=remaining;
}
function beginMemorySequence(round:AdvancedRound,rand:()=>number,extend:boolean){
  if(!extend)round.sequence=[choose(POSE_SEQUENCE.length,rand),choose(POSE_SEQUENCE.length,rand)];
  else round.sequence.push(choose(POSE_SEQUENCE.length,rand));
  round.memoryPhase="watch";round.phaseTime=0;round.memoryIndex=0;
  round.memoryLit=-1;round.memoryCorrect=false;round.poseHold=0;round.wrongHold=0;round.poseArmed=false;
}
function stepMemory(round:AdvancedRound,dt:number,pose:readonly Landmark[]|undefined,
  w:number,h:number,rand:()=>number,events:GameEvent[]){
  if(!pose)return;
  if(!round.sequence.length)beginMemorySequence(round,rand,false);
  round.phaseTime+=dt;
  if(round.memoryPhase==="watch"){
    const t=round.phaseTime-.4,idx=Math.floor(t/.74);
    round.memoryLit=t>=0&&idx<round.sequence.length&&t%.74<.55
      ?round.sequence[idx]:-1;
    if(round.phaseTime>=.4+round.sequence.length*.74){
      round.memoryPhase="input";round.phaseTime=0;round.memoryLit=-1;
      round.poseArmed=false;round.poseHold=0;round.wrongHold=0;
    }
    return;
  }
  if(round.memoryPhase==="rest"){
    if(round.phaseTime>=.65)
      beginMemorySequence(round,rand,round.memoryCorrect&&round.sequence.length<6);
    return;
  }
  const expected=POSE_SEQUENCE[round.sequence[round.memoryIndex]];
  const matched=matchesPose(pose,expected.id);
  if(matched===null)return;
  if(!matched){
    round.poseArmed=true;round.poseHold=0;
    const wrong=POSE_SEQUENCE.some((candidate,i)=>
      i!==round.sequence[round.memoryIndex]&&matchesPose(pose,candidate.id)===true);
    round.wrongHold=wrong?round.wrongHold+dt:0;
    if(round.wrongHold>=.4){
      events.push({id:"memory:wrong:"+ ++round.seq,type:"miss",
        position:position(.5,.48,w,h),color:"#ff9599"});
      round.memoryCorrect=false;round.memoryPhase="rest";round.phaseTime=0;
      round.wrongHold=0;return;
    }
  }else{round.wrongHold=0;if(round.poseArmed)round.poseHold+=dt;}
  if(matched&&round.poseArmed&&round.poseHold>=.40){
    const id=++round.seq;
    events.push({id:"memory:pose:"+id,type:"good",
      targetId:"memory:"+id,basePoints:18,
      position:position(.5,.48,w,h),color:"#a2f4cd",bodyPart:"body"});
    round.memoryLit=round.sequence[round.memoryIndex];round.phaseTime=0;
    round.memoryIndex++;round.poseHold=0;round.poseArmed=false;
    if(round.memoryIndex===round.sequence.length){
      events.push({id:"memory:complete:"+id,type:"bonus",
        basePoints:round.sequence.length*12,position:position(.5,.48,w,h),color:"#ffe88c"});
      round.memoryCorrect=true;round.memoryPhase="rest";
    }
  }else if(round.phaseTime>=5.2){
    events.push({id:"memory:timeout:"+ ++round.seq,type:"miss",
      position:position(.5,.48,w,h)});
    round.memoryCorrect=false;round.memoryPhase="rest";round.phaseTime=0;
  }else if(round.phaseTime>.30){
    round.memoryLit=-1;
  }
}
/** Beam collision is measured against the head and all tracked skeleton
 * segments, never just the hand targets. Coordinates use the camera viewport
 * so crop and mirroring behave exactly as they do for stickman rendering. */
export function laserHitsPose(laser:Laser,pose:readonly Landmark[]|undefined,
  view:Viewport|undefined):boolean{
  if(!pose||!view)return false;
  const mapped=new Map<number,{x:number;y:number}>();
  for(const idx of [0,11,12,13,14,15,16,23,24,25,26,27,28,31,32]){
    const p=pose[idx];
    if(p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&
      (p.visibility??1)>=.50&&(p.presence??1)>=.50)
      mapped.set(idx,mapPoint(p.x,p.y,view));
  }
  const w=view.width,h=view.height,s=Math.min(w,h);
  const high=laser.mode==="high",beam=high?h*.35:w*laser.gap;
  const collide=(p:{x:number;y:number})=>
    high?Math.abs(p.y-beam)<s*.026:Math.abs(p.x-beam)<s*.026;
  if([...mapped.values()].some(collide))return true;
  for(const [from,to] of BONES){
    const a=mapped.get(from),b=mapped.get(to);
    if(!a||!b)continue;
    for(let i=1;i<8;i++){
      const t=i/8;
      if(collide({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t}))return true;
    }
  }
  return false;
}
function stepLaser(round:AdvancedRound,dt:number,pose:readonly Landmark[]|undefined,
  w:number,h:number,rand:()=>number,events:GameEvent[],view?:Viewport){
  if(!round.laser){
    round.wait-=dt;
    if(round.wait<=0){
      const mode=choose(3,rand)===0?"high":"side";
      round.laser={id:++round.seq,mode,gap:rand()<.5?.44:.56,age:0,damaged:false};
    }
    return;
  }
  const laser=round.laser;laser.age+=dt;
  if(laser.age>=.8&&laser.age<2.55&&!laser.damaged&&laserHitsPose(laser,pose,view)){
    laser.damaged=true;
    events.push({id:"laser:hit:"+laser.id,type:"damage",targetId:"laser:"+laser.id,
      position:position(laser.mode==="high"?.5:laser.gap,
        laser.mode==="high"?.35:.5,w,h),color:"#ff7f8d"});
  }
  if(laser.age>=2.6){
    if(!laser.damaged)events.push({id:"laser:clear:"+laser.id,type:"collect",
      targetId:"laser:"+laser.id,basePoints:30,
      position:position(.5,.5,w,h),color:"#9ff9d2"});
    round.laser=null;round.wait=.25;
  }
}
function spawnParcel(round:AdvancedRound,rand:()=>number){
  round.parcel={id:++round.seq,kind:choose(3,rand),x:.5,y:.72,
    age:0,heldBy:null,armed:false};
}
function stepParcel(round:AdvancedRound,dt:number,hands:Point[],w:number,h:number,
  rand:()=>number,events:GameEvent[]){
  if(!round.parcel){
    round.wait-=dt;
    if(round.wait<=0)spawnParcel(round,rand);
    return;
  }
  const parcel=round.parcel;parcel.age+=dt;
  const owner=hands.find(p=>p.part===parcel.heldBy);
  if(parcel.heldBy){
    if(owner){
      parcel.x=clamp(owner.x/w,.045,.955);parcel.y=clamp(owner.y/h,.10,.94);
      const dest=SORT_BINS.findIndex((bin,i)=>!!round.touches.contact(
        "parcel:"+parcel.id+":bin:"+i,[owner],touchCircle(bin,.093,w,h),w,h,[owner.part]));
      if(dest>=0){
        const correct=dest===parcel.kind;
        events.push({id:"parcel:deliver:"+parcel.id,type:correct?"collect":"miss",
          targetId:"parcel:"+parcel.id,basePoints:correct?30:0,
          position:position(SORT_BINS[dest].x,SORT_BINS[dest].y,w,h),
          color:correct?SORT_COLORS[dest]:"#ff8995",bodyPart:owner.part});
        round.parcel=null;round.wait=.40;
      }
    }else{
      // Hand changes or dropout never teleport the carried parcel.
      parcel.heldBy=null;parcel.armed=false;parcel.x=.5;parcel.y=.72;
    }
  }else{
    const entering=round.touches.contact("parcel:"+parcel.id+":pickup",
      hands,touchCircle(parcel,.065,w,h),w,h,["leftHand","rightHand"]);
    if(entering){
      parcel.heldBy=entering.part;
      // Prime destination pads away from the parcel before it starts moving.
      SORT_BINS.forEach((bin,i)=>round.touches.contact(
        "parcel:"+parcel.id+":bin:"+i,[entering],touchCircle(bin,.093,w,h),w,h,[entering.part]));
    }
  }
  if(round.parcel&&parcel.age>=9){
    events.push({id:"parcel:expired:"+parcel.id,type:"miss",targetId:"parcel:"+parcel.id,
      position:position(parcel.x,parcel.y,w,h)});
    round.parcel=null;round.wait=.35;
  }
}
/** Gameplay is deterministic for injected randomness and reports only platform events.
 * Timer, simulation, and misses freeze whenever hand tracking disappears. */
export function stepAdvancedRound(round:AdvancedRound,delta:number,w:number,h:number,points:Point[],
  rand:()=>number=Math.random,speed=1,pose?:readonly Landmark[],view?:Viewport
):{finished:boolean;events:GameEvent[]}{
  if(!round.playing||round.paused){round.touches.reset();return {finished:false,events:[]};}
  const hands=handsOnly(points);
  const bodyGame=round.kind==="laser-lane"||round.kind==="memory-sequence"||round.kind==="shield-guard";
  const inputOK=round.kind==="rhythm-pads"?points.some(p=>BEAT_PARTS.includes(p.part)):
    bodyGame?!!pose&&!!view&&!!pose[0]&&!!pose[11]&&!!pose[12]&&!!pose[23]&&!!pose[24]:
    hands.length>0;
  if(!inputOK||w<=0||h<=0||!Number.isFinite(w)||!Number.isFinite(h)){
    round.touches.reset();return {finished:false,events:[]};
  }
  const dt=clamp(Number.isFinite(delta)?delta:0,0,.08);
  round.time=Math.max(0,round.time-dt);
  const events:GameEvent[]=[];
  const simDt=dt*speed;
  switch(round.kind){
    case "rhythm-pads":stepBeats(round,simDt,points,w,h,rand,events);break;
    case "shield-guard":stepShield(round,simDt,points,w,h,rand,events,pose,view);break;
    case "memory-sequence":stepMemory(round,simDt,pose,w,h,rand,events);break;
    case "laser-lane":stepLaser(round,simDt,pose,w,h,rand,events,view);break;
    case "parcel-sort":stepParcel(round,simDt,hands,w,h,rand,events);break;
  }
  if(round.time<=0)round.playing=false;
  return {finished:round.time<=0,events};
}
