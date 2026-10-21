import {circlesOverlap,type Point} from "../../core.ts";
import type {GameEvent} from "../../engine/game-feel";
import {ROUND_DURATION_SECONDS} from "../../engine/round-tempo.ts";

export type MiniGameId="mole-whack"|"color-match"|"star-hunt"|"meteor-dodge"|"freeze-dance";
export type MiniItem={id:number;x:number;y:number;vx:number;vy:number;radius:number;age:number};
export type MiniRound={
  kind:MiniGameId;playing:boolean;paused:boolean;score:number;time:number;
  seq:number;slot:number;lockedSlot:number;phaseTime:number;wait:number;
  items:MiniItem[];green:boolean;redTravel:number;danceDistance:number;
  redPenalty:boolean;lastHand:{part:string;x:number;y:number}|null;
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
    green:true,redTravel:0,danceDistance:0,redPenalty:false,lastHand:null};
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
      if(hands.some(p=>touch(p,MOLE_SPOTS[round.slot],0.082,width,height)))
        round.lockedSlot=round.slot;
    }
    return;
  }
  round.phaseTime+=dt;
  const spot=MOLE_SPOTS[round.slot];
  if(round.lockedSlot!==round.slot&&hands.some(p=>touch(p,spot,0.082,width,height))){
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
  const selected=COLOR_SPOTS.findIndex(spot=>hands.some(p=>touch(p,spot,0.115,width,height)));
  if(selected>=0&&selected!==round.lockedSlot){
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
  if(hands.some(p=>touch(p,star,star.radius,width,height))){
    events.push({id:"star:collect:"+star.id,type:"collect",targetId:"star:"+star.id,basePoints:12,
      position:{x:star.x*width,y:star.y*height},color:"#ffe586"});
    round.items=[];round.wait=0.16;
  }else if(star.age>=3.2){
    events.push({id:"star:miss:"+star.id,type:"miss",targetId:"star:"+star.id,
      position:{x:star.x*width,y:star.y*height}});
    round.items=[];round.wait=0.13;
  }
}
function stepMeteor(round:MiniRound,dt:number,hands:Point[],width:number,height:number,
  rand:()=>number,events:GameEvent[]){
  round.phaseTime+=dt;
  if(round.phaseTime>=Math.max(0.56,1.1-(ROUND_DURATION_SECONDS-round.time)*0.005)){
    round.phaseTime=0;
    const fromLeft=rand()<0.5,speed=0.27+rand()*0.13;
    round.items.push({id:++round.seq,x:fromLeft?-0.1:1.1,y:0.25+rand()*0.54,
      vx:fromLeft?speed:-speed,vy:0,radius:0.055,age:0});
  }
  const live:MiniItem[]=[];
  for(const meteor of round.items){
    meteor.x+=meteor.vx*dt;meteor.age+=dt;
    if(hands.some(p=>touch(p,meteor,meteor.radius,width,height))){
      events.push({id:"meteor:damage:"+meteor.id,type:"damage",targetId:"meteor:"+meteor.id,
        position:{x:meteor.x*width,y:meteor.y*height},color:"#ff7b7b"});
    }else if(meteor.x<-0.13||meteor.x>1.13){
      events.push({id:"meteor:dodge:"+meteor.id,type:"collect",targetId:"meteor:"+meteor.id,
        basePoints:15,position:{x:clamp(meteor.x,0,1)*width,y:meteor.y*height},color:"#aaf7c5"});
    }else live.push(meteor);
  }
  round.items=live;
}
function stepDance(round:MiniRound,dt:number,hands:Point[],width:number,height:number,
  events:GameEvent[]){
  const hand=hands.find(p=>p.part===round.lastHand?.part)??hands[0];
  const next={part:hand.part,x:hand.x,y:hand.y};
  const prev=round.lastHand;
  const raw=prev&&prev.part===hand.part?
    Math.hypot((hand.x-prev.x)/width,(hand.y-prev.y)/height):0;
  // Ignore sub-pixel jitter and sudden tracking jumps.
  const distance=raw<0.0015||raw>0.14?0:raw;
  round.lastHand=next;round.phaseTime+=dt;
  if(round.green){
    round.danceDistance+=distance;
    if(round.danceDistance>=0.18){
      round.danceDistance-=0.18;
      events.push({id:"dance:move:"+ ++round.seq,type:"collect",
        targetId:"dance:"+round.seq,basePoints:20,
        position:{x:hand.x,y:hand.y},color:"#90f9b7"});
    }
    if(round.phaseTime>=3.7){round.green=false;round.phaseTime=0;
      round.redTravel=0;round.redPenalty=false;round.lastHand=next;}
  }else{
    if(round.phaseTime>0.25)round.redTravel+=distance;
    if(round.redTravel>=0.048&&!round.redPenalty){
      round.redPenalty=true;
      events.push({id:"dance:move-red:"+ ++round.seq,type:"damage",
        position:{x:hand.x,y:hand.y},color:"#ff8f8f"});
    }
    if(round.phaseTime>=2.3){round.green=true;round.phaseTime=0;
      round.danceDistance=0;round.lastHand=next;}
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
    case "meteor-dodge":stepMeteor(round,simDt,hands,width,height,rand,events);break;
    case "freeze-dance":stepDance(round,simDt,hands,width,height,events);break;
  }
  if(round.time<=0)round.playing=false;
  return {finished:round.time<=0,events};
}
