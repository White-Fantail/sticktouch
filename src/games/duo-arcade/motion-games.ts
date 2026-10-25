/** Two motion challenges; pure, camera-normalized, per-player state. */
import {mapPoint,type Viewport} from "../../core.ts";
import type {GameEvent} from "../../engine/game-feel.ts";
import type {PlayerFrame,PlayerId} from "../../tracking/multiplayer.ts";
import type {DuoRound} from "./game.ts";
type XY={x:number;y:number};
type Motion={hip:XY;feet:[XY,XY]|null;hands:[XY,XY]|null};
type Runner={progress:number;anchor:Motion|null;cooldown:number;hold:number;caught:boolean;flash:number};
export type RedLightState={phase:"go"|"stop";remaining:number;duration:number;grace:number;winner:PlayerId|null;players:Record<PlayerId,Runner>};
type Arm={baseline:number|null;phase:0|1;lastCycle:number;previous:XY|null};
export type RopePlayer={count:number;ground:number|null;airborne:boolean;jumpPeak:number;cooldown:number;arms:[Arm,Arm];readyUntil:number;lastPair:number;phase:number;clock:number};
export type RopeState={players:Record<PlayerId,RopePlayer>};
const ids:readonly PlayerId[]=["p1","p2"];
const clamp=(x:number,a:number,b:number)=>Math.min(b,Math.max(a,x));
const dist=(a:XY,b:XY)=>Math.hypot(a.x-b.x,a.y-b.y);
function location(p:PlayerFrame,i:number,v:Viewport):XY|null{
 const pt=p.pose?.[i];if(!pt||!Number.isFinite(pt.x)||!Number.isFinite(pt.y)||
 (pt.visibility??1)<.5||(pt.presence??1)<.5)return null;
 const xy=mapPoint(pt.x,pt.y,v);return {x:xy.x/v.width,y:xy.y/v.height};
}
function pair(p:PlayerFrame,a:number,b:number,v:Viewport):[XY,XY]|null{
 const l=location(p,a,v),r=location(p,b,v);return l&&r?[l,r]:null;
}
function sample(p:PlayerFrame,v:Viewport):Motion|null{
 const hips=pair(p,23,24,v)??pair(p,11,12,v);if(!hips)return null;
 return {hip:{x:(hips[0].x+hips[1].x)*.5,y:(hips[0].y+hips[1].y)*.5},
 feet:pair(p,27,28,v),hands:pair(p,15,16,v)};
}
const relative=(p:XY,hip:XY):XY=>({x:p.x-hip.x,y:p.y-hip.y});
function displacement(a:Motion,b:Motion):number{
 let size=dist(a.hip,b.hip)*1.7;
 if(a.feet&&b.feet)for(let i=0;i<2;i++)size=Math.max(size,dist(relative(a.feet[i],a.hip),relative(b.feet[i],b.hip))*.9);
 if(a.hands&&b.hands)for(let i=0;i<2;i++)size=Math.max(size,dist(relative(a.hands[i],a.hip),relative(b.hands[i],b.hip))*.55);
 return size;
}
const runner=():Runner=>({progress:0,anchor:null,cooldown:0,hold:0,caught:false,flash:0});
const arm=():Arm=>({baseline:null,phase:0,lastCycle:-100,previous:null});
const ropePlayer=():RopePlayer=>({count:0,ground:null,airborne:false,jumpPeak:0,cooldown:0,
 arms:[arm(),arm()],readyUntil:-1,lastPair:-1,phase:0,clock:0});
export function createRedLightState():RedLightState{
 return {phase:"go",remaining:3.6,duration:3.6,grace:0,winner:null,players:{p1:runner(),p2:runner()}};
}
export function createRopeState():RopeState{return {players:{p1:ropePlayer(),p2:ropePlayer()}};}
/** Inference loss must not create artificial steps or completed jump cycles. */
export function clearMotionInputs(r:DuoRound){
 for(const id of ids){
   const run=r.redLight.players[id];run.anchor=null;run.cooldown=.22;run.hold=0;
   const p=r.rope.players[id];r.rope.players[id]={...ropePlayer(),count:p.count,clock:p.clock,phase:p.phase};
 }
 if(r.redLight.phase==="stop")r.redLight.grace=Math.max(r.redLight.grace,.45);
}
function event(r:DuoRound,id:PlayerId,type:GameEvent["type"],points:number,xy:XY):GameEvent{
 return {id:"duo:"+r.kind+":"+(++r.seq)+":"+id,type,basePoints:points,
 position:xy,color:id==="p1"?"#7ef3d7":"#ffabdf"};
}
/** Actual camera depth is unknown: walking motion advances a virtual runner. */
export function stepRedLight(r:DuoRound,dt:number,frames:readonly [PlayerFrame,PlayerFrame],
 v:Viewport,random:()=>number,events:GameEvent[]){
 const s=r.redLight;s.remaining-=dt;
 if(s.remaining<=0){
   s.phase=s.phase==="go"?"stop":"go";
   s.remaining=s.phase==="go"?2.7+clamp(random(),0,1)*1.6:1.75+clamp(random(),0,1)*.85;
   s.duration=s.remaining;
   s.grace=s.phase==="stop"?.42:0;
   for(const id of ids){const p=s.players[id];p.anchor=null;p.hold=0;p.cooldown=s.phase==="go"?.18:0;p.caught=false;}
 }
 s.grace=Math.max(0,s.grace-dt);
 for(const frame of frames){
   const p=s.players[frame.id],now=sample(frame,v);
   p.cooldown=Math.max(0,p.cooldown-dt);p.flash=Math.max(0,p.flash-dt);
   if(!now){p.anchor=null;p.hold=0;continue;}
   if(!p.anchor||(s.phase==="stop"&&s.grace>0)){p.anchor=now;continue;}
   const moved=displacement(p.anchor,now);
   if(s.phase==="go"){
     p.hold=0;
     if(p.cooldown<=0&&moved>.038){
       p.progress=clamp(p.progress+.031+Math.min(.022,moved*.13),0,1);
       p.anchor=now;p.cooldown=.17;
       events.push(event(r,frame.id,"good",8,{x:now.hip.x,y:.23}));
       if(p.progress>=1&&!s.winner){
         s.winner=frame.id;events.push(event(r,frame.id,"perfect",80,{x:.5,y:.17}));
         r.message=frame.id.toUpperCase()+" 먼저 술래에게 도착!";r.time=0;r.playing=false;
       }
     }
   }else if(!p.caught){
     p.hold=moved>.080?p.hold+dt:Math.max(0,p.hold-dt*2);
     if(p.hold>=.16){
       p.progress=0;p.caught=true;p.flash=1.65;p.hold=0;
       events.push(event(r,frame.id,"damage",0,{x:now.hip.x,y:.29}));
     }
   }
   r.scores[frame.id]=Math.round(p.progress*100);
 }
 if(!s.winner)r.message=s.phase==="go"?"🟢 술래가 무궁화 꽃이 피었습니다를 외치는 동안 움직여요!"
   :"🔴 술래가 돌아봤어요! 움직이면 출발점으로!";
}
function updateArm(a:Arm,pt:XY,hip:XY,clock:number):number{
 const now=relative(pt,hip),travel=a.previous?dist(a.previous,now):0;
 a.previous=now;if(a.baseline===null){a.baseline=now.y;return travel;}
 // Body-relative stroke prevents body bouncing alone from becoming a rope turn.
 if(a.phase===0&&now.y<a.baseline-.032)a.phase=1;
 else if(a.phase===1&&now.y>a.baseline+.015){a.lastCycle=clock;a.phase=0;a.baseline=now.y;}
 if(a.phase===0&&travel<.006)a.baseline=a.baseline*.999+now.y*.001;
 return travel;
}
export function stepJumpRope(r:DuoRound,dt:number,frames:readonly [PlayerFrame,PlayerFrame],
 v:Viewport,events:GameEvent[]){
 for(const frame of frames){
   const p=r.rope.players[frame.id],now=sample(frame,v);
   p.clock+=dt;p.cooldown=Math.max(0,p.cooldown-dt);
   if(!now){r.rope.players[frame.id]={...ropePlayer(),count:p.count,clock:p.clock};continue;}
   if(p.ground===null)p.ground=now.hip.y;
   if(now.hands){
     const travel=now.hands.reduce((sum,hand,i)=>sum+updateArm(p.arms[i],hand,now.hip,p.clock),0);
     if(Math.abs(p.arms[0].lastCycle-p.arms[1].lastCycle)<.42&&
       Math.max(p.arms[0].lastCycle,p.arms[1].lastCycle)>p.lastPair){
       p.lastPair=Math.max(p.arms[0].lastCycle,p.arms[1].lastCycle);
       p.readyUntil=p.clock+.95;
     }
     if(travel>.008)p.phase=(p.phase+Math.min(.31,travel*3.8))%(Math.PI*2);
   }else{p.arms=[arm(),arm()];p.readyUntil=-1;}
   if(!p.airborne){
     if(now.hip.y<p.ground-.029&&p.cooldown<=0){p.airborne=true;p.jumpPeak=p.ground-now.hip.y;}
     else p.ground=p.ground*.985+now.hip.y*.015;
   }else{
     p.jumpPeak=Math.max(p.jumpPeak,p.ground-now.hip.y);
     if(now.hip.y>=p.ground-.012){
       p.airborne=false;p.cooldown=.18;
       if(p.jumpPeak>.029&&p.clock<=p.readyUntil){
         p.count++;r.scores[frame.id]=p.count;p.readyUntil=-1;
         events.push(event(r,frame.id,"good",16,{x:now.hip.x,y:now.hip.y}));
       }
       p.ground=now.hip.y;
     }
   }
 }
 r.message="양손을 돌리며 뛰세요! 줄에 걸려도 감점 없이 더 많이 넘은 사람이 승리!";
}
