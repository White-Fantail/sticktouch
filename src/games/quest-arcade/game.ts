import {mapPoint,type BodyPart,type Landmark,type Point,type Viewport} from "../../core.ts";
import {TouchEntries,touchCircle} from "../../engine/touch-entry.ts";
import {ROUND_DURATION_SECONDS} from "../../engine/round-tempo.ts";
import {matchesPose} from "../pose-challenge/game.ts";
import type {GameEvent} from "../../engine/game-feel.ts";

export type QuestGameId="laser-mirror"|"space-rescuer"|"deep-sea-explorer"|
  "memory-ghost"|"time-bomb-pass"|"magic-garden"|"monster-maker"|
  "time-clone"|"i-am-path"|"body-programming"|"move-world";
export const QUEST_GAME_IDS:readonly QuestGameId[]=[
  "laser-mirror","space-rescuer","deep-sea-explorer","memory-ghost",
  "time-bomb-pass","magic-garden","monster-maker","time-clone",
  "i-am-path","body-programming","move-world"
];
export type Vec={x:number;y:number};
type Command="up"|"down"|"left"|"right";
export const RESCUE_SITES:readonly Vec[]=[
  {x:.27,y:.35},{x:.76,y:.62},{x:.25,y:.72},{x:.74,y:.30}
];
export const TREASURES:readonly Vec[]=[
  {x:.24,y:.76},{x:.76,y:.78},{x:.43,y:.70},{x:.67,y:.62}
];
export const GARDEN_BEDS=[.24,.50,.76] as const;
export const MONSTER_PARTS=["머리","왼팔","오른팔","다리"] as const;
export const PROGRAMS:readonly (readonly Command[])[]=[
  ["up","right","right"],["down","right","up"],["left","up","up"],
  ["right","down","right"],["up","up","left"],["down","left","up"]
];
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
const distance=(a:Vec,b:Vec)=>Math.hypot(a.x-b.x,a.y-b.y);
const position=(p:Point,w:number,h:number):Vec=>({x:p.x/w,y:p.y/h});
const reliable=(p:Landmark|undefined):p is Landmark=>!!p&&
  Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1&&
  (p.visibility??1)>=.5&&(p.presence??1)>=.5;
const part=(points:readonly Point[],name:BodyPart)=>points.find(p=>p.part===name);
const pointCircle=(p:Vec,r:number,w:number,h:number)=>touchCircle(p,r,w,h);
const virtual=(v:Vec,w:number,h:number):Point=>({part:"leftHand",x:v.x*w,y:v.y*h,radius:Math.min(w,h)*.018});
const hands=["leftHand","rightHand"] as const;
const resetVec=():Vec=>({x:.16,y:.55});
export type QuestRound={
  kind:QuestGameId;playing:boolean;paused:boolean;score:number;time:number;duration:number;
  stage:number;phase:number;step:number;hold:number;armed:boolean;seq:number;cooldown:number;
  touches:TouchEntries;previous:Partial<Record<BodyPart,Vec>>;
  player:Vec;ball:Vec;velocity:Vec;start:Vec;goal:Vec;
  trace:Vec[];ghost:Vec[];drawn:Vec[];lastSample:number;travel:number;matched:number;
  carrying:boolean;oxygen:number;health:number;grown:number;pieces:number;
  instructions:Command[];robot:{x:number;y:number};execution:number;
  angle:number;rayEnd:Vec;safe:boolean;message:string;worldMode:number;
};
export function createQuestRound(kind:QuestGameId,seconds=ROUND_DURATION_SECONDS):QuestRound{
  return {kind,playing:false,paused:false,score:0,time:seconds,duration:seconds,
    stage:0,phase:0,step:0,hold:0,armed:false,seq:0,cooldown:0,
    touches:new TouchEntries(),previous:{},player:resetVec(),ball:resetVec(),
    velocity:{x:0,y:0},start:resetVec(),goal:{x:.82,y:.4},
    trace:[],ghost:[],drawn:[],lastSample:0,travel:0,matched:0,
    carrying:false,oxygen:1,health:3,grown:0,pieces:0,
    instructions:[],robot:{x:1,y:2},execution:0,
    angle:0,rayEnd:{x:.5,y:.5},safe:false,message:"",worldMode:0};
}
export function trackedQuest(id:QuestGameId,points:readonly Point[],pose?:readonly Landmark[]):boolean{
  const both=hands.every(p=>!!part(points,p));
  const either=hands.some(p=>!!part(points,p));
  if(id==="laser-mirror"||id==="move-world"||id==="monster-maker")
    return both&&!!pose&&[0,11,12,13,14,15,16,23,24,25,26,31,32].every(i=>reliable(pose[i]));
  if(id==="i-am-path")return points.some(p=>p.part!=="head");
  if(id==="memory-ghost")return !!part(points,"rightHand");
  return either&&(id!=="time-clone"&&id!=="time-bomb-pass"?true:both);
}
function fire(r:QuestRound,events:GameEvent[],type:GameEvent["type"],w:number,h:number,
  basePoints=0,v:Vec={x:.5,y:.5}){
  const id=r.kind+":"+(++r.seq);
  events.push({id,targetId:id,type,basePoints,position:{x:v.x*w,y:v.y*h}});
}
function clearStage(r:QuestRound){
  r.stage++;r.phase=0;r.step=0;r.hold=0;r.armed=false;r.cooldown=0;
  r.touches.reset();r.trace=[];r.ghost=[];r.drawn=[];r.travel=0;r.matched=0;
  r.lastSample=0;r.carrying=false;r.pieces=0;r.instructions=[];
  r.velocity={x:0,y:0};r.execution=0;r.safe=false;r.message="";
}
function fail(r:QuestRound,events:GameEvent[],w:number,h:number){
  fire(r,events,"miss",w,h);
  clearStage(r);
}
function complete(r:QuestRound,events:GameEvent[],w:number,h:number,points=30,v?:Vec){
  fire(r,events,"perfect",w,h,points,v);
  clearStage(r);
}
function entered(r:QuestRound,key:string,p:Point|undefined,at:Vec,w:number,h:number,rad=.06){
  return r.touches.enter(key,p,pointCircle(at,rad,w,h),w,h);
}
function guided(r:QuestRound,matched:boolean|null,dt:number,required=.30):boolean{
  if(matched===null){r.hold=0;r.armed=false;return false;}
  if(!matched){r.armed=true;r.hold=0;return false;}
  if(r.armed)r.hold+=dt;
  return r.armed&&r.hold>=required;
}
/** Reflect an incident laser against the player's actual forearm tangent. */
export function reflectedLaser(pose:readonly Landmark[],view:Viewport,side:0|1){
  const a=pose[13+side],b=pose[15+side];
  if(!reliable(a)||!reliable(b))return null;
  const ea=mapPoint(a.x,a.y,view),eb=mapPoint(b.x,b.y,view);
  const midpoint={x:(ea.x+eb.x)/(2*view.width),y:(ea.y+eb.y)/(2*view.height)};
  const dx=(eb.x-ea.x)/view.width,dy=(eb.y-ea.y)/view.height;
  const length=Math.hypot(dx,dy);
  if(length<.025)return null;
  const normal={x:-dy/length,y:dx/length};
  const source=side===0?{x:.10,y:.26}:{x:.90,y:.26};
  const dest=side===0?{x:.87,y:.72}:{x:.13,y:.72};
  const inc={x:midpoint.x-source.x,y:midpoint.y-source.y};
  const il=Math.max(.001,Math.hypot(inc.x,inc.y));
  inc.x/=il;inc.y/=il;
  const dot=inc.x*normal.x+inc.y*normal.y;
  const out={x:inc.x-2*dot*normal.x,y:inc.y-2*dot*normal.y};
  const aim={x:dest.x-midpoint.x,y:dest.y-midpoint.y};
  const al=Math.max(.001,Math.hypot(aim.x,aim.y));
  const alignment=(out.x*aim.x+out.y*aim.y)/al;
  return {source,dest,midpoint,out,alignment};
}
function ship(points:readonly Point[],w:number,h:number):Vec|null {
  const detected=hands.map(name=>part(points,name)).filter((p):p is Point=>!!p);
  if(!detected.length)return null;
  return {x:clamp(detected.reduce((n,p)=>n+p.x/w,0)/detected.length,.06,.94),
    y:clamp(detected.reduce((n,p)=>n+p.y/h,0)/detected.length,.12,.92)};
}
function startDrawing(r:QuestRound,v:Vec){
  r.start={...v};
  // Place the goal near the actual measured limb, reachable on small webcams.
  r.goal={x:clamp(v.x+(v.x>.58?-.28:.28),.15,.85),
    y:clamp(v.y+(v.y>.55?-.11:.11),.17,.87)};
  r.drawn=[{...v}];r.player={...v};r.armed=true;
}
export function requiredPathPart(stage:number):BodyPart{
  return (["leftHand","rightHand","leftFoot","rightFoot"] as const)[stage%4];
}
function targetGrid(stage:number){
  const commands=PROGRAMS[stage%PROGRAMS.length];
  let x=1,y=2;
  for(const cmd of commands){
    if(cmd==="up")y--;if(cmd==="down")y++;if(cmd==="left")x--;if(cmd==="right")x++;
  }
  return {x,y};
}
export const COMMAND_BUTTONS:readonly {name:Command;x:number;y:number;label:string}[]=[
  {name:"up",x:.31,y:.25,label:"↑"},
  {name:"down",x:.69,y:.25,label:"↓"},
  {name:"left",x:.31,y:.76,label:"←"},
  {name:"right",x:.69,y:.76,label:"→"}
];
export function stepQuestRound(r:QuestRound,delta:number,w:number,h:number,
  points:Point[],pose:readonly Landmark[]|undefined,view:Viewport,speed=1
):{finished:boolean;events:GameEvent[]}{
  if(!r.playing||r.paused)return {finished:false,events:[]};
  if(!(w>0&&h>0)||!trackedQuest(r.kind,points,pose)){
    r.previous={};r.touches.reset();r.hold=0;r.armed=false;
    return {finished:false,events:[]};
  }
  const dt=clamp(Number.isFinite(delta)?delta:0,0,.08),sim=dt*speed;
  r.time=Math.max(0,r.time-dt);r.phase+=sim;r.cooldown=Math.max(0,r.cooldown-sim);
  const events:GameEvent[]=[];
  const movements:Partial<Record<BodyPart,number>>={};
  for(const p of points){
    const current=position(p,w,h),old=r.previous[p.part];
    movements[p.part]=old?Math.min(.5,distance(current,old)):0;
    r.previous[p.part]=current;
  }
  switch(r.kind){
    case "laser-mirror":{
      const laser=pose?reflectedLaser(pose,view,r.stage%2 as 0|1):null;
      if(laser){
        r.player=laser.midpoint;r.rayEnd={x:laser.midpoint.x+laser.out.x*.8,
          y:laser.midpoint.y+laser.out.y*.8};
        r.angle=laser.alignment;
        if(guided(r,laser.alignment>.94,sim,.28))
          complete(r,events,w,h,35,laser.dest);
      }
      if(r.phase>4.5)fail(r,events,w,h);
      break;
    }
    case "space-rescuer":{
      const s=ship(points,w,h)!;r.player=s;
      const site=RESCUE_SITES[r.stage%RESCUE_SITES.length],base={x:.5,y:.84};
      const hazard={x:.5+Math.sin(r.phase*1.5)*.21,y:.54};
      if(distance(s,hazard)<.07 && r.cooldown<=0){
        r.health=Math.max(0,r.health-1);r.cooldown=1;
        fire(r,events,"damage",w,h,0,s);r.carrying=false;r.touches.reset();
      }
      if(!r.carrying&&entered(r,"pickup:"+r.stage,virtual(s,w,h),site,w,h,.06)){
        r.carrying=true;r.touches.reset();
      }
      if(r.carrying&&entered(r,"base:"+r.stage,virtual(s,w,h),base,w,h,.075))
        complete(r,events,w,h,32,base);
      if(r.phase>10||r.health<=0){r.health=3;fail(r,events,w,h);}
      break;
    }
    case "deep-sea-explorer":{
      const s=ship(points,w,h)!;r.player=s;
      r.oxygen=Math.max(0,r.oxygen-sim*.063);
      const site=TREASURES[r.stage%TREASURES.length],surface={x:.5,y:.23};
      const fish={x:.5+Math.sin(r.phase*1.7)*.32,y:.62};
      if(distance(s,fish)<.07&&r.cooldown<=0){
        r.cooldown=1;fire(r,events,"damage",w,h,0,s);r.carrying=false;
        r.oxygen=Math.max(.16,r.oxygen-.24);r.touches.reset();
      }
      if(!r.carrying&&entered(r,"treasure:"+r.stage,virtual(s,w,h),site,w,h,.062)){
        r.carrying=true;r.touches.reset();
      }
      if(r.carrying&&entered(r,"surface:"+r.stage,virtual(s,w,h),surface,w,h,.082)){
        r.oxygen=1;complete(r,events,w,h,36,surface);
      }
      if(!r.carrying&&distance(s,surface)<.09)r.oxygen=Math.min(1,r.oxygen+sim*.5);
      if(r.oxygen<=0){r.oxygen=1;fail(r,events,w,h);}
      break;
    }
    case "memory-ghost":{
      const hand=part(points,"rightHand")!,p=position(hand,w,h);
      if(r.phase<2.45){
        if(r.phase-r.lastSample>=.10){
          const last=r.trace[r.trace.length-1];
          if(last)r.travel+=distance(last,p);
          r.trace.push(p);r.lastSample=r.phase;
        }
      }else{
        if(!r.ghost.length){
          r.ghost=r.trace.map(v=>({...v}));r.trace=[];r.step=0;r.lastSample=2.45;
          r.armed=false;r.travel=0;
        }
        if(r.phase>3.03){
          const idx=Math.floor((r.phase-3.03)/.10);
          if(idx>r.step&&idx<r.ghost.length){
            // Score only after moving away from the initial recording point.
            if(movements.rightHand!>.004)r.travel+=movements.rightHand!;
            const expected=r.ghost[idx];
            if(distance(p,expected)<.10&&r.travel>.11)r.matched++;
            r.step=idx;
          }
          if(idx>=r.ghost.length){
            if(r.ghost.length>=9&&r.matched>=r.ghost.length*.57&&r.travel>.11)
              complete(r,events,w,h,38,p);
            else fail(r,events,w,h);
          }
        }
      }
      if(r.phase>8)fail(r,events,w,h);
      break;
    }
    case "time-bomb-pass":{
      const leftFirst=r.stage%2===0,high=r.stage%4<2;
      const y=high?.42:.68,from={x:leftFirst?.25:.75,y},
        to={x:leftFirst?.75:.25,y};
      const giver=part(points,leftFirst?"leftHand":"rightHand");
      const receiver=part(points,leftFirst?"rightHand":"leftHand");
      if(r.step===0&&entered(r,"take:"+r.stage,giver,from,w,h,.063)){
        r.step=1;r.touches.reset();r.message="PASS!";
      }else if(r.step===1&&entered(r,"give:"+r.stage,receiver,to,w,h,.065))
        complete(r,events,w,h,34,to);
      if(r.phase>3.8)fail(r,events,w,h);
      break;
    }
    case "magic-garden":{
      const x=GARDEN_BEDS[r.stage%3],p1={x,y:.79},p2={x,y:.49};
      if(r.step===0&&r.touches.contact("seed:"+r.stage,points,pointCircle(p1,.066,w,h),w,h,hands)){
        r.step=1;r.touches.reset();
      }else if(r.step===1&&r.touches.contact("water:"+r.stage,points,pointCircle(p2,.066,w,h),w,h,hands)){
        r.step=2;r.armed=false;r.hold=0;
      }else if(r.step===2&&pose){
        const lh=part(points,"leftHand"),rh=part(points,"rightHand");
        const shoulderY=(mapPoint(pose[11].x,pose[11].y,view).y+
          mapPoint(pose[12].x,pose[12].y,view).y)/(2*h);
        const up=!!lh&&!!rh&&lh.y/h<shoulderY-.13&&rh.y/h<shoulderY-.13;
        if(guided(r,up,sim,.35)){
          r.grown++;complete(r,events,w,h,34,{x,y:.65});
        }
      }
      if(r.phase>9)fail(r,events,w,h);
      break;
    }
    case "monster-maker":{
      const spots:readonly Vec[]=[{x:.5,y:.33},{x:.26,y:.53},
        {x:.74,y:.53},{x:.5,y:.78}];
      if(r.step<4){
        const aim=spots[r.step];
        if(r.touches.contact("piece:"+r.stage+":"+r.step,points,
          pointCircle(aim,.073,w,h),w,h,hands)){
          r.pieces++;r.step++;r.touches.reset();r.phase=0;
        }
        if(r.phase>4.1)fail(r,events,w,h);
      }else{
        const evade=r.stage%2===0?matchesPose(pose,"squat"):
          !!pose&&reliable(pose[11])&&reliable(pose[12])&&
          !!part(points,"leftHand")&&!!part(points,"rightHand")&&
          points.filter(p=>p.part==="leftHand"||p.part==="rightHand")
            .every(p=>p.y/h<Math.min(mapPoint(pose![11].x,pose![11].y,view).y/h,
              mapPoint(pose![12].x,pose![12].y,view).y/h)-.08);
        if(guided(r,evade,sim,.4))complete(r,events,w,h,45);
        if(r.phase>3.7)fail(r,events,w,h);
      }
      break;
    }
    case "time-clone":{
      const lh=position(part(points,"leftHand")!,w,h);
      const rh=position(part(points,"rightHand")!,w,h);
      if(r.phase<2.2){
        if(r.phase-r.lastSample>=.10){
          const last=r.trace[r.trace.length-1];
          if(last)r.travel+=distance(last,lh);
          r.trace.push(lh);r.lastSample=r.phase;
        }
      }else{
        if(!r.ghost.length){
          if(r.trace.length<10||r.travel<.19){fail(r,events,w,h);break;}
          r.ghost=r.trace.map(p=>({x:1-p.x,y:p.y}));r.trace=[];
          r.lastSample=2.2;r.step=0;r.travel=0;
        }
        if(r.phase>=2.75){
          const idx=Math.floor((r.phase-2.75)/.10);
          if(idx>r.step&&idx<r.ghost.length){
            const movement=movements.rightHand??0;
            if(movement>.004&&movement<.20)r.travel+=movement;
            if(distance(rh,r.ghost[idx])<.115&&r.travel>.09)r.matched++;
            r.step=idx;
          }
          if(idx>=r.ghost.length){
            if(r.travel>.13&&r.matched>=r.ghost.length*.55)
              complete(r,events,w,h,42,rh);
            else fail(r,events,w,h);
          }
        }
      }
      if(r.phase>8)fail(r,events,w,h);
      break;
    }
    case "i-am-path":{
      const required=requiredPathPart(r.stage);
      const input=part(points,required);
      if(!input)break;
      const p=position(input,w,h);
      if(!r.armed){startDrawing(r,p);break;}
      const last=r.drawn[r.drawn.length-1];
      const move=distance(last,p);
      if(move>.009&&move<.17){
        const obstacle={x:(r.start.x+r.goal.x)*.5,y:(r.start.y+r.goal.y)*.5};
        // A segment is unsafe if its midpoint or endpoint clips the obstacle.
        const mid={x:(p.x+last.x)/2,y:(p.y+last.y)/2};
        if(distance(p,obstacle)<.055||distance(mid,obstacle)<.055){
          fail(r,events,w,h);break;
        }
        r.drawn.push(p);if(r.drawn.length>100)r.drawn.shift();
        r.travel+=move;r.player=p;
      }
      if(r.travel>.28&&distance(p,r.goal)<.095)
        complete(r,events,w,h,40,p);
      if(r.phase>9)fail(r,events,w,h);
      break;
    }
    case "body-programming":{
      if(r.step===0){
        r.robot={x:1,y:2};
        if(r.cooldown<=0&&r.instructions.length<3){
          for(const b of COMMAND_BUTTONS){
            if(r.touches.contact("cmd:"+r.stage+":"+r.instructions.length+":"+b.name,
              points,pointCircle(b,.063,w,h),w,h,hands)){
              r.instructions.push(b.name);r.touches.reset();r.cooldown=.16;break;
            }
          }
        }
        if(r.instructions.length===3){r.step=1;r.execution=0;r.phase=0;}
        if(r.phase>9)fail(r,events,w,h);
      }else{
        const i=Math.floor(r.phase/.55);
        while(r.execution<Math.min(i,3)){
          const cmd=r.instructions[r.execution];
          if(cmd==="up")r.robot.y--;if(cmd==="down")r.robot.y++;
          if(cmd==="left")r.robot.x--;if(cmd==="right")r.robot.x++;
          r.execution++;
        }
        if(r.execution>=3){
          const goal=targetGrid(r.stage);
          if(r.robot.x===goal.x&&r.robot.y===goal.y&&
            r.robot.x>=0&&r.robot.x<4&&r.robot.y>=0&&r.robot.y<4)
            complete(r,events,w,h,48);
          else fail(r,events,w,h);
        }
      }
      break;
    }
    case "move-world":{
      const a=pose![11],b=pose![12],hipL=pose![23],hipR=pose![24];
      const shoulders={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
      const hips={x:(hipL.x+hipR.x)/2,y:(hipL.y+hipR.y)/2};
      const lean=(shoulders.x-hips.x)/Math.max(.08,Math.abs(a.x-b.x));
      const above=hands.every(name=>{
        const p=part(points,name);return !!p&&p.y/h<shoulders.y-.12;
      });
      const squat=matchesPose(pose,"squat")===true;
      const mode=r.stage%3;r.worldMode=mode;
      // Three distinct controls: tilt gravity, raise arms to freeze the bridge,
      // squat to push a wave. Standing still never moves the orb to the exit.
      if(mode===0)r.velocity.x+=clamp(lean,-1,1)*sim*.56;
      if(mode===1&&above){r.safe=true;r.velocity.x+=sim*.21;}
      else if(mode===1)r.safe=false;
      if(mode===2&&squat){r.safe=true;r.velocity.x+=sim*.27;r.velocity.y-=sim*.17;}
      else if(mode===2)r.safe=false;
      r.velocity.x=clamp(r.velocity.x,-.5,.52)*Math.pow(.975,sim*60);
      r.velocity.y=clamp(r.velocity.y+sim*.12,-.30,.30)*Math.pow(.98,sim*60);
      r.ball.x+=r.velocity.x*sim;r.ball.y+=r.velocity.y*sim;
      if(r.ball.y>.80){r.ball.y=.80;r.velocity.y*=-.45;}
      if(r.ball.y<.25){r.ball.y=.25;r.velocity.y=Math.abs(r.velocity.y)*.5;}
      if(r.ball.x<.11){r.ball.x=.11;r.velocity.x=Math.abs(r.velocity.x)*.45;}
      if(mode!==0&&r.ball.x>.39&&r.ball.x<.65&&!r.safe){
        r.ball.x=.13;r.ball.y=.55;r.velocity={x:0,y:0};
        fire(r,events,"damage",w,h,0,r.ball);
      }
      if(r.ball.x>.84&&r.ball.y>.22&&r.ball.y<.83){
        complete(r,events,w,h,40,{x:.88,y:.54});
        r.ball={x:.13,y:.55};r.velocity={x:0,y:0};
      }
      if(r.phase>12){
        r.ball={x:.13,y:.55};fail(r,events,w,h);
      }
      break;
    }
  }
  if(r.time<=0)r.playing=false;
  return {finished:r.time<=0,events};
}
