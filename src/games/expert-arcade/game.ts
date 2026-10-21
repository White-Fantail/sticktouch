import {circlesOverlap,type Point} from "../../core.ts";
import type {GameEvent} from "../../engine/game-feel";
import {ROUND_DURATION_SECONDS} from "../../engine/round-tempo.ts";

export type ExpertGameId="boss-raid"|"gravity-lab"|"shadow-sync"|"constellation-trace"|"dual-portals";
export const EXPERT_GAME_IDS:readonly ExpertGameId[]=[
  "boss-raid","gravity-lab","shadow-sync","constellation-trace","dual-portals"
];
export type Spot={x:number;y:number};
export const MAZE_WALLS=[
  {x:.35,y:.28,w:.055,h:.43},{x:.55,y:.54,w:.055,h:.33},
  {x:.70,y:.13,w:.045,h:.32}
] as const;
export const TRACE_PATTERNS:readonly (readonly Spot[])[]=[
  [{x:.18,y:.67},{x:.36,y:.32},{x:.53,y:.64},{x:.72,y:.31},{x:.83,y:.69}],
  [{x:.20,y:.32},{x:.20,y:.73},{x:.49,y:.73},{x:.78,y:.73},{x:.78,y:.32}],
  [{x:.18,y:.68},{x:.34,y:.37},{x:.51,y:.68},{x:.67,y:.37},{x:.83,y:.68}]
];
type BossState={health:number;stage:number;age:number;weak:Spot;hit:boolean;touching:boolean;danger:boolean;attackSide:number};
type MazeState={ball:Spot;vx:number;vy:number;level:number;cooldown:number;hazardTime:number};
type ShadowState={phase:"watch"|"echo"|"rest";age:number;hold:number;seed:number;level:number};
type TraceState={pattern:number;index:number;owner:string|null;age:number;level:number};
type PortalState={age:number;hold:number;stage:number;rest:number;armed:boolean};
export type ExpertRound={
  kind:ExpertGameId;playing:boolean;paused:boolean;score:number;time:number;seq:number;
  boss:BossState;maze:MazeState;shadow:ShadowState;trace:TraceState;portal:PortalState;
};
const clamp=(v:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,v));
const pick=(n:number,rand:()=>number)=>clamp(Math.floor(rand()*n),0,n-1);
const pos=(p:Spot,w:number,h:number)=>({x:p.x*w,y:p.y*h});
const palms=(points:readonly Point[])=>points.filter(p=>
  (p.part==="leftHand"||p.part==="rightHand")&&Number.isFinite(p.x)&&
  Number.isFinite(p.y)&&Number.isFinite(p.radius)&&p.radius>=0);
const within=(p:Point,spot:Spot,r:number,w:number,h:number)=>
  circlesOverlap(p,{...pos(spot,w,h),radius:r*Math.min(w,h)});
const event=(r:ExpertRound,key:string,type:GameEvent["type"],spot:Spot,w:number,h:number,
  basePoints=0,bodyPart?:string):GameEvent=>({
    id:"expert:"+r.kind+":"+key+":"+(++r.seq),type,
    basePoints,position:pos(spot,w,h),bodyPart
  });
const weakspots:readonly Spot[]=[{x:.31,y:.34},{x:.69,y:.34},{x:.5,y:.51}];

export function createExpertRound(kind:ExpertGameId,seconds=ROUND_DURATION_SECONDS):ExpertRound{
  return {kind,playing:false,paused:false,score:0,time:seconds,seq:0,
    boss:{health:4,stage:1,age:0,weak:weakspots[0],hit:false,touching:false,danger:false,attackSide:0},
    maze:{ball:{x:.16,y:.78},vx:0,vy:0,level:1,cooldown:0,hazardTime:0},
    shadow:{phase:"watch",age:0,hold:0,seed:0,level:1},
    trace:{pattern:0,index:0,owner:null,age:0,level:1},
    portal:{age:0,hold:0,stage:1,rest:0,armed:true}};
}

function bossStep(r:ExpertRound,dt:number,hands:Point[],w:number,h:number,
  rand:()=>number,events:GameEvent[]){
  const b=r.boss;b.age+=dt;
  const touching=hands.some(p=>within(p,b.weak,.080,w,h));
  if(b.age>=.78&&b.age<1.95&&!b.hit&&touching&&!b.touching){
    b.hit=true;b.health--;
    events.push(event(r,"weak","hit",b.weak,w,h,24));
    if(b.health===0){
      events.push(event(r,"defeat","bonus",{x:.5,y:.42},w,h,80));
      b.stage++;b.health=4+Math.min(3,b.stage-1);
    }
  }
  b.touching=touching;
  if(b.age>=1.36&&b.age<2.12&&!b.danger){
    // The red strip is an announced attack; one penalty at most per cycle.
    const struck=hands.some(p=>p.y>h*.63 &&
      (b.attackSide===0?p.x<w*.50:p.x>w*.50));
    if(struck){b.danger=true;events.push(event(r,"attack","damage",
      {x:b.attackSide===0?.27:.73,y:.77},w,h));}
  }
  if(b.age>=2.42){
    if(!b.hit)events.push(event(r,"weak-expired","miss",b.weak,w,h));
    b.age=0;b.weak=weakspots[pick(weakspots.length,rand)];
    b.attackSide=pick(2,rand);b.hit=false;b.danger=false;
    // A target appearing under an unmoving hand is not a new strike.
    b.touching=hands.some(p=>within(p,b.weak,.080,w,h));
  }
}

function mazeStep(r:ExpertRound,dt:number,hands:Point[],w:number,h:number,
  events:GameEvent[]){
  const m=r.maze;
  const left=hands.find(p=>p.part==="leftHand");
  const right=hands.find(p=>p.part==="rightHand");
  if(!left||!right)return;
  const ly=left.y/h,ry=right.y/h;
  const tilt=clamp((ry-ly)*2.8,-1,1);
  const vertical=clamp(((ly+ry)*.5-.50)*2.6,-1,1);
  const damping=Math.exp(-1.7*dt);
  m.vx=clamp((m.vx+tilt*.68*dt)*damping,-.5,.5);
  m.vy=clamp((m.vy+vertical*.68*dt)*damping,-.5,.5);
  const old={...m.ball};
  const next={x:clamp(old.x+m.vx*dt,.065,.935),y:clamp(old.y+m.vy*dt,.19,.88)};
  if(next.x===.065||next.x===.935)m.vx*=-.48;
  if(next.y===.19||next.y===.88)m.vy*=-.48;
  const radius=.032;
  const collides=MAZE_WALLS.some(rect=> {
    const nearX=clamp(next.x,rect.x,rect.x+rect.w);
    const nearY=clamp(next.y,rect.y,rect.y+rect.h);
    return Math.hypot((next.x-nearX)*w,(next.y-nearY)*h)<radius*Math.min(w,h);
  });
  if(collides){m.vx*=-.55;m.vy*=-.55;}
  else m.ball=next;
  m.hazardTime+=dt;m.cooldown=Math.max(0,m.cooldown-dt);
  const hazard={x:.47+Math.sin(m.hazardTime*1.2)*.11,y:.50};
  if(m.cooldown===0 && Math.hypot((m.ball.x-hazard.x)*w,(m.ball.y-hazard.y)*h)<.060*Math.min(w,h)){
    m.cooldown=1.1;m.vx*=-.6;m.vy*=-.6;
    events.push(event(r,"hazard","damage",m.ball,w,h));
  }
  const goal=m.level%2===1?{x:.86,y:.26}:{x:.16,y:.78};
  if(Math.hypot((m.ball.x-goal.x)*w,(m.ball.y-goal.y)*h)<.073*Math.min(w,h)){
    events.push(event(r,"goal","collect",goal,w,h,50));
    m.level++;m.ball=m.level%2===1?{x:.16,y:.78}:{x:.86,y:.26};
    m.vx=0;m.vy=0;m.cooldown=.6;
  }
}

export function shadowTargets(seconds:number,seed:number):readonly [Spot,Spot]{
  const t=seconds*2.15+seed*.6;
  const lx=.27+.16*Math.sin(t),ly=.52+.18*Math.cos(t*.8);
  const rx=.73+.16*Math.sin(t*.91+1.2),ry=.52+.18*Math.cos(t*.87+1.1);
  return [{x:lx,y:ly},{x:rx,y:ry}];
}
function shadowStep(r:ExpertRound,dt:number,hands:Point[],w:number,h:number,
  events:GameEvent[]){
  const s=r.shadow;s.age+=dt;
  if(s.phase==="watch"){
    if(s.age>=2.0){s.phase="echo";s.age=0;s.hold=0;}
    return;
  }
  if(s.phase==="rest"){
    if(s.age>=.75){s.phase="watch";s.age=0;s.seed++;s.hold=0;}
    return;
  }
  const targets=shadowTargets(s.age,s.seed);
  // Either hand may match either ghost: mirror mode must not swap correctness.
  const matches=(within(hands[0],targets[0],.082,w,h)&&within(hands[1],targets[1],.082,w,h))||
    (within(hands[1],targets[0],.082,w,h)&&within(hands[0],targets[1],.082,w,h));
  s.hold=matches?Math.min(.68,s.hold+dt):Math.max(0,s.hold-dt*1.4);
  if(s.hold>=.64){
    events.push(event(r,"echo","perfect",{x:.5,y:.51},w,h,40));
    s.level++;s.phase="rest";s.age=0;
  }else if(s.age>=3.6){
    events.push(event(r,"echo-expired","miss",{x:.5,y:.51},w,h));
    s.phase="rest";s.age=0;
  }
}

function traceStep(r:ExpertRound,dt:number,hands:Point[],w:number,h:number,
  events:GameEvent[]){
  const s=r.trace;const pattern=TRACE_PATTERNS[s.pattern];
  s.age+=dt;
  if(s.age>8){
    if(s.index>0)events.push(event(r,"trace-timeout","miss",pattern[s.index-1],w,h));
    s.index=0;s.owner=null;s.age=0;s.pattern=(s.pattern+1)%TRACE_PATTERNS.length;return;
  }
  const spot=pattern[s.index];
  const hand=hands.find(p=>(!s.owner||p.part===s.owner)&&within(p,spot,.080,w,h));
  if(!hand)return;
  if(s.index===0)s.owner=hand.part;
  events.push(event(r,"trace-node","good",spot,w,h,12,hand.part));
  s.index++;
  if(s.index===pattern.length){
    events.push(event(r,"trace-clear","bonus",spot,w,h,48,hand.part));
    s.index=0;s.owner=null;s.age=0;s.level++;
    s.pattern=(s.pattern+1)%TRACE_PATTERNS.length;
  }
}

export function portalTargets(age:number,stage:number):readonly [Spot,Spot]{
  return [
    {x:.24+.065*Math.sin(age*1.25+stage),y:.45+.14*Math.cos(age*.9+stage)},
    {x:.76+.065*Math.sin(age*.97+stage*1.2),y:.45+.14*Math.sin(age*1.1+stage)}
  ];
}
function portalStep(r:ExpertRound,dt:number,hands:Point[],w:number,h:number,
  events:GameEvent[]){
  const p=r.portal;
  if(p.rest>0){
    p.rest=Math.max(0,p.rest-dt);
    if(!p.rest){p.age=0;p.hold=0;}
    return;
  }
  p.age+=dt;
  const [a,b]=portalTargets(p.age,p.stage);
  const connected=(within(hands[0],a,.090,w,h)&&within(hands[1],b,.090,w,h))||
    (within(hands[1],a,.090,w,h)&&within(hands[0],b,.090,w,h));
  if(!connected)p.armed=true;
  if(p.armed&&connected)p.hold+=dt;
  else p.hold=Math.max(0,p.hold-dt*1.5);
  if(p.hold>=1.02){
    events.push(event(r,"portal","collect",{x:.5,y:.45},w,h,45));
    p.stage++;p.rest=.9;p.hold=0;p.armed=false;
  }else if(p.age>=6.4){
    events.push(event(r,"portal-expired","miss",{x:.5,y:.45},w,h));
    p.rest=.65;p.hold=0;p.armed=false;
  }
}

/** Fixed-step friendly rules; a missing required hand freezes motion, misses, and clock. */
export function stepExpertRound(r:ExpertRound,delta:number,w:number,h:number,points:Point[],
  rand:()=>number=Math.random,speed=1):{finished:boolean;events:GameEvent[]}{
  if(!r.playing||r.paused)return {finished:false,events:[]};
  const hands=palms(points);
  const needsTwo=r.kind==="gravity-lab"||r.kind==="shadow-sync"||r.kind==="dual-portals";
  if(hands.length<(needsTwo?2:1)||!Number.isFinite(w)||!Number.isFinite(h)||w<=0||h<=0)
    return {finished:false,events:[]};
  const dt=clamp(Number.isFinite(delta)?delta:0,0,.08);
  r.time=Math.max(0,r.time-dt);
  const events:GameEvent[]=[];
  const simDt=dt*speed;
  switch(r.kind){
    case "boss-raid":bossStep(r,simDt,hands,w,h,rand,events);break;
    case "gravity-lab":mazeStep(r,simDt,hands,w,h,events);break;
    case "shadow-sync":shadowStep(r,simDt,hands,w,h,events);break;
    case "constellation-trace":traceStep(r,simDt,hands,w,h,events);break;
    case "dual-portals":portalStep(r,simDt,hands,w,h,events);break;
  }
  if(r.time<=0)r.playing=false;
  return {finished:r.time<=0,events};
}
