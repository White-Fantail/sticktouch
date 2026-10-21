import {circlesOverlap,type Point} from "../../core.ts";
import type {GameEvent} from "../../engine/game-feel";
import {ROUND_DURATION_SECONDS} from "../../engine/round-tempo.ts";
import {TouchEntries,touchCircle} from "../../engine/touch-entry.ts";

export type MiniGameId="mole-whack"|"color-match"|"star-hunt"|"meteor-dodge"|"freeze-dance";
export type MiniItem={id:number;x:number;y:number;vx:number;vy:number;radius:number;age:number;large?:boolean;leftCharged?:string;rightCharged?:string};
export type MiniRound={
  kind:MiniGameId;playing:boolean;paused:boolean;score:number;time:number;
  seq:number;slot:number;lockedSlot:number;phaseTime:number;wait:number;
  items:MiniItem[];green:boolean;redTravel:number;danceDistance:number;
  redPenalty:boolean;lastHand:{part:string;x:number;y:number}|null;
  previousBody:Record<string,{x:number;y:number}>;
  touches:TouchEntries;
};
export const MINI_GAME_IDS:readonly MiniGameId[]=[
  "mole-whack","color-match","star-hunt","meteor-dodge","freeze-dance"
] as const;
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
const randomIndex=(count:number,rand:()=>number)=>clamp(Math.floor(rand()*count),0,count-1);
export const MOLE_SPOTS:readonly {x:number;y:number}[]=
  [0.24,0.5,0.76].flatMap(y=>[0.24,0.5,0.76].map(x=>({x,y})));
export const COLOR_SPOTS:readonly {x:number;y:number}[]=[
  {x:0.21,y:0.54},{x:0.5,y:0.54},{x:0.79,y:0.54}
];
export const COLOR_NAMES=["빨강","파랑","노랑"] as const;
export const COLOR_HEX=["#ff696e","#58b7ff","#ffe071"] as const;
export function createMiniRound(kind:MiniGameId,seconds=ROUND_DURATION_SECONDS):MiniRound {
  return {kind,playing:false,paused:false,score:0,time:seconds,
    seq:0,slot:-1,lockedSlot:-1,phaseTime:0,wait:0,items:[],
    green:true,redTravel:0,danceDistance:0,redPenalty:false,lastHand:null,previousBody:{},
    touches:new TouchEntries()};
}
function palmPoints(points:readonly Point[]){return points.filter(p=>p.part==="leftHand"||p.part==="rightHand");}
function touch(p:Point,spot:{x:number;y:number},radius:number,width:number,height:number){
  return circlesOverlap(p,{x:spot.x*width,y:spot.y*height,radius:radius*Math.min(width,height)});
}
function randomDifferent(previous:number,count:number,rand:()=>number){
  if(previous<0)return randomIndex(count,rand);
  return (previous+1+randomIndex(count-1,rand))%count;
}
function spawnStar(round:MiniRound,hands:Point[],width:number,height:number,rand:()=>number){
  let x=0.5,y=0.5,safe=false;
  for(let attempt=0;attempt<16;attempt++){
    x=0.13+rand()*0.74;y=0.26+rand()*0.5;
    if(hands.every(p=>!touch(p,{x,y},0.19,width,height))){safe=true;break;}
  }
  if(!safe){
    // Even a deterministic/stuck random source must not spawn a star in a held palm.
    const candidates=[{x:.13,y:.26},{x:.87,y:.26},{x:.13,y:.76},{x:.87,y:.76},{x:.5,y:.76}];
    const best=candidates.reduce((a,c)=>{
      const clearance=(s:{x:number;y:number})=>Math.min(...hands.map(p=>
        Math.hypot(p.x-s.x*width,p.y-s.y*height)-p.radius));
      return clearance(c)>clearance(a)?c:a;
    },candidates[0]);
    x=best.x;y=best.y;
  }
  const theta=rand()*Math.PI*2;
  round.items=[{id:++round.seq,x,y,vx:Math.cos(theta)*0.095,
    vy:Math.sin(theta)*0.105,radius:0.064,age:0}];
  round.touches.contact("star:"+round.seq,hands,touchCircle({x,y},.064,width,height),width,height);
}
function stepMole(round:MiniRound,dt:number,hands:Point[],width:number,height:number,
  rand:()=>number,events:GameEvent[]){
  const previousLock=round.lockedSlot;
  if(previousLock>=0&&!hands.some(p=>touch(p,MOLE_SPOTS[previousLock],0.087,width,height)))round.lockedSlot=-1;
  if(round.slot<0){
    round.wait-=dt;
    if(round.wait<=0){
      round.slot=randomDifferent(round.lockedSlot,MOLE_SPOTS.length,rand);
      round.phaseTime=0;round.seq++;
      // A mole appearing under a stationary hand is not an intentional tap.
      round.touches.contact("mole:"+round.seq,hands,
        touchCircle(MOLE_SPOTS[round.slot],.082,width,height),width,height);
    }
    return;
  }
  round.phaseTime+=dt;
  const spot=MOLE_SPOTS[round.slot];
  if(round.touches.contact("mole:"+round.seq,hands,
    touchCircle(spot,.082,width,height),width,height)){
    events.push({id:"mole:hit:"+round.seq,type:"hit",targetId:"mole:"+round.seq,
      basePoints:15,position:{x:spot.x*width,y:spot.y*height},color:"#ffe08f"});
    round.lockedSlot=round.slot;round.slot=-1;round.wait=0.22;
  }else if(round.phaseTime>=2.3){
    events.push({id:"mole:miss:"+round.seq,type:"miss",targetId:"mole:"+round.seq,
      position:{x:spot.x*width,y:spot.y*height}});
    round.slot=-1;round.wait=0.24;
  }
}
function stepColor(round:MiniRound,dt:number,hands:Point[],width:number,height:number,
  rand:()=>number,events:GameEvent[]){
  if(round.slot<0){round.slot=randomDifferent(round.lockedSlot,3,rand);round.seq++;round.phaseTime=0;}
  if(round.lockedSlot>=0&&!hands.some(p=>touch(p,COLOR_SPOTS[round.lockedSlot],0.115,width,height)))
    round.lockedSlot=-1;
  round.phaseTime+=dt;
  const selected=COLOR_SPOTS.findIndex((spot,i)=>!!round.touches.contact(
    "color:"+round.seq+":"+i,hands,touchCircle(spot,.115,width,height),width,height));
  if(selected>=0){
    const correct=selected===round.slot;
    events.push({id:"color:"+round.seq+":"+selected,type:correct?"good":"miss",
      targetId:"color:"+round.seq,basePoints:15,
      position:{x:COLOR_SPOTS[selected].x*width,y:COLOR_SPOTS[selected].y*height},
      color:COLOR_HEX[selected]});
    round.lockedSlot=selected;
    // Wrong answers advance too: no opportunity to farm one target.
    round.slot=-1;round.wait=0;round.phaseTime=0;
  }else if(round.phaseTime>=5){
    events.push({id:"color:timeout:"+round.seq,type:"miss",targetId:"color:"+round.seq});
    round.slot=-1;round.phaseTime=0;
  }
}
function stepStar(round:MiniRound,dt:number,hands:Point[],width:number,height:number,
  rand:()=>number,events:GameEvent[]){
  if(!round.items.length){round.wait-=dt;if(round.wait<=0)spawnStar(round,hands,width,height,rand);return;}
  const star=round.items[0];star.age+=dt;star.x+=star.vx*dt;star.y+=star.vy*dt;
  if(star.x<0.11||star.x>0.89){star.vx=-star.vx;star.x=clamp(star.x,0.11,0.89);}
  if(star.y<0.24||star.y>0.79){star.vy=-star.vy;star.y=clamp(star.y,0.24,0.79);}
  if(round.touches.contact("star:"+star.id,hands,
    touchCircle(star,star.radius,width,height),width,height)){
    events.push({id:"star:collect:"+star.id,type:"collect",targetId:"star:"+star.id,basePoints:12,
      position:{x:star.x*width,y:star.y*height},color:"#ffe586"});
    round.items=[];round.wait=0.16;
  }else if(star.age>=3.2){
    events.push({id:"star:miss:"+star.id,type:"miss",targetId:"star:"+star.id,
      position:{x:star.x*width,y:star.y*height}});
    round.items=[];round.wait=0.13;
  }
}
function stepMeteor(round:MiniRound,dt:number,points:Point[],width:number,height:number,
  rand:()=>number,events:GameEvent[]){
  round.phaseTime+=dt;
  if(round.phaseTime>=Math.max(.52,1.02-(ROUND_DURATION_SECONDS-round.time)*.006)){
    round.phaseTime=0;
    const fromLeft=rand()<.5,speed=.25+rand()*.14,large=rand()<.32;
    round.items.push({id:++round.seq,x:fromLeft?-.13:1.13,y:.27+rand()*.49,
      vx:fromLeft?speed:-speed,vy:0,radius:large?.086:.054,age:0,large});
  }
  const hands=palmPoints(points);
  const live:MiniItem[]=[];
  for(const meteor of round.items){
    meteor.x+=meteor.vx*dt;meteor.age+=dt;
    const left={x:meteor.x-.055,y:meteor.y};
    const right={x:meteor.x+.055,y:meteor.y};
    if(meteor.large){
      const l=round.touches.contact("meteor:"+meteor.id+":left",hands,
        touchCircle(left,.060,width,height),width,height);
      const rr=round.touches.contact("meteor:"+meteor.id+":right",hands,
        touchCircle(right,.060,width,height),width,height);
      if(l)meteor.leftCharged=l.part;
      if(rr)meteor.rightCharged=rr.part;
      if(!hands.some(p=>p.part===meteor.leftCharged&&touch(p,left,.060,width,height)))
        meteor.leftCharged=undefined;
      if(!hands.some(p=>p.part===meteor.rightCharged&&touch(p,right,.060,width,height)))
        meteor.rightCharged=undefined;
    }
    const paired=!!meteor.large&&!!meteor.leftCharged&&!!meteor.rightCharged&&
      meteor.leftCharged!==meteor.rightCharged;
    const punched=!meteor.large&&!!round.touches.contact("meteor:"+meteor.id+":single",
      hands,touchCircle(meteor,meteor.radius,width,height),width,height);
    const damaged=points.some(p=>["head","leftFoot","rightFoot"].includes(p.part)&&
      touch(p,meteor,meteor.radius,width,height));
    if(paired||punched){
      events.push({id:"meteor:destroy:"+meteor.id,type:meteor.large?"perfect":"hit",
        targetId:"meteor:"+meteor.id,basePoints:meteor.large?40:22,
        position:{x:meteor.x*width,y:meteor.y*height},color:"#ffe3a1"});
    }else if(damaged){
      events.push({id:"meteor:damage:"+meteor.id,type:"damage",targetId:"meteor:"+meteor.id,
        position:{x:meteor.x*width,y:meteor.y*height},color:"#ff7b7b"});
    }else if(meteor.x<-.17||meteor.x>1.17){
      events.push({id:"meteor:dodge:"+meteor.id,type:"collect",targetId:"meteor:"+meteor.id,
        basePoints:10,position:{x:clamp(meteor.x,0,1)*width,y:meteor.y*height},color:"#aaf7c5"});
    }else live.push(meteor);
  }
  round.items=live;
}
function stepDance(round:MiniRound,dt:number,points:Point[],width:number,height:number,
  events:GameEvent[]){
  // This samples the entire skeleton; moving only an unseen/irrelevant hand cannot
  // substitute for freezing one's torso, head and feet on the STOP beat.
  const current:Record<string,{x:number;y:number}>={};
  let distance=0,tracked=0;
  for(const p of points){
    if(!Number.isFinite(p.x)||!Number.isFinite(p.y))continue;
    current[p.part]={x:p.x,y:p.y};
    const last=round.previousBody[p.part];
    if(!last)continue;
    const raw=Math.hypot((p.x-last.x)/width,(p.y-last.y)/height);
    if(raw>=.0018&&raw<=.14){distance+=raw;tracked++;}
  }
  round.previousBody=current;
  const oldGreen=round.green;
  round.phaseTime+=dt;
  // The rhythm soundtrack ticks every .24 seconds. Dance for 10 beats,
  // then hold still for 6; repeat on the downbeat.
  const beat=Math.floor(round.phaseTime/.24)%16;
  round.green=beat<10;
  if(round.green!==oldGreen){
    round.redTravel=0;round.redPenalty=false;round.danceDistance=0;
  }
  const motion=tracked>0?distance:0;
  if(round.green){
    round.danceDistance+=motion;
    if(round.danceDistance>=.145){
      round.danceDistance-=.145;
      const p=points.find(p=>p.part==="head")??points[0];
      events.push({id:"freeze:beat:"+ ++round.seq,type:"collect",
        targetId:"freeze:"+round.seq,basePoints:20,
        position:{x:p.x,y:p.y},color:"#90f9b7"});
    }
  }else{
    // Ignore a short transition immediately after the STOP downbeat.
    if(round.phaseTime%(.24*16)>.24*10+.20)round.redTravel+=motion;
    if(round.redTravel>=.043&&!round.redPenalty){
      round.redPenalty=true;
      const p=points.find(p=>p.part==="head")??points[0];
      events.push({id:"freeze:break:"+ ++round.seq,type:"damage",
        position:{x:p.x,y:p.y},color:"#ff8f8f"});
    }
    // Award a successful freeze once on the following GO downbeat.
    if(beat===15&&!round.redPenalty&&round.redTravel<.022&&
      round.phaseTime%(.24*16) >= .24*15+.16){
      round.redPenalty=true;
      events.push({id:"freeze:perfect:"+ ++round.seq,type:"perfect",
        basePoints:28,position:{x:width*.5,y:height*.5},color:"#ccf7ff"});
    }
  }
}
/** Pure gameplay: all five games emit platform GameEvents; the host owns score/combo/audio.
 * Missing hand tracking freezes the timer and objects rather than counting failures. */
export function stepMiniRound(round:MiniRound,delta:number,width:number,height:number,points:Point[],
  rand:()=>number=Math.random,speed=1):{finished:boolean;events:GameEvent[]} {
  if(!round.playing||round.paused)return {finished:false,events:[]};
  const hands=palmPoints(points);
  if(!hands.length||width<=0||height<=0){round.lastHand=null;return {finished:false,events:[]};}
  const dt=clamp(delta,0,0.08);
  round.time=Math.max(0,round.time-dt);
  const events:GameEvent[]=[];
  const simDt=dt*speed;
  switch(round.kind){
    case "mole-whack":stepMole(round,simDt,hands,width,height,rand,events);break;
    case "color-match":stepColor(round,simDt,hands,width,height,rand,events);break;
    case "star-hunt":stepStar(round,simDt,hands,width,height,rand,events);break;
    case "meteor-dodge":stepMeteor(round,simDt,points,width,height,rand,events);break;
    case "freeze-dance":stepDance(round,simDt,points,width,height,events);break;
  }
  if(round.time<=0)round.playing=false;
  return {finished:round.time<=0,events};
}
