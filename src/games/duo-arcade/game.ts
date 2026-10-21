import {mapPoint,type Landmark,type Viewport} from "../../core.ts";
import {gameplaySpeed} from "../../engine/round-tempo.ts";
import type {GameEvent} from "../../engine/game-feel.ts";
import type {PlayerFrame,PlayerId} from "../../tracking/multiplayer.ts";

export type DuoGameId="co-op-power-plant"|"shadow-sword"|"mirror-challenge"|"human-pingpong"|"combine-robot";
export const DUO_IDS:readonly DuoGameId[]=["co-op-power-plant","shadow-sword","mirror-challenge","human-pingpong","combine-robot"];
export const DUO_VERSUS:readonly DuoGameId[]=["shadow-sword","human-pingpong"];
export const isDuoGame=(id:string):id is DuoGameId=>DUO_IDS.some(item=>item===id);
export const isVersus=(id:DuoGameId)=>DUO_VERSUS.some(item=>item===id);
type XY={x:number;y:number};
type Four=[number,number,number,number];
type Target={x:number;y:number};
type RobotItem={id:number;x:number;y:number;kind:"charge"|"hazard"};
export type DuoRound={
  kind:DuoGameId;playing:boolean;paused:boolean;time:number;duration:number;seq:number;
  scores:Record<PlayerId,number>;teamScore:number;round:number;hold:number;rest:number;
  /** A new target does not score until the hand has left its radius. */
  armed:Record<PlayerId,boolean>;previous:Record<PlayerId,XY|null>;
  phaseTime:number;leader:PlayerId;pattern:Four|null;followArmed:boolean;
  ball:{x:number;y:number;vx:number;vy:number;serve:number;rally:number};
  robot:{items:RobotItem[];spawn:number;neutral:number|null;pilotX:number;shieldY:number;shieldOn:boolean};
  message:string;
};
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
const dist=(a:XY,b:XY)=>Math.hypot(a.x-b.x,a.y-b.y);
const other=(id:PlayerId):PlayerId=>id==="p1"?"p2":"p1";
const part=(p:PlayerFrame,name:string,w:number,h:number):XY|null=>{
  const anchor=p.points.find(point=>point.part===name);
  return anchor?{x:anchor.x/w,y:anchor.y/h}:null;
};
const hands=(p:PlayerFrame,w:number,h:number):XY[]=>["leftHand","rightHand"]
  .map(name=>part(p,name,w,h)).filter((point):point is XY=>!!point);
const body=(p:PlayerFrame,view:Viewport,index:number):XY|null=>{
  const point=p.pose?.[index];
  if(!point||!Number.isFinite(point.x)||!Number.isFinite(point.y)||
    (point.visibility??1)<.5||(point.presence??1)<.5)return null;
  const xy=mapPoint(point.x,point.y,view);
  return {x:xy.x/view.width,y:xy.y/view.height};
};
const center=(p:PlayerFrame,view:Viewport):XY|null=>{
  const l=body(p,view,23),r=body(p,view,24);
  return l&&r?{x:(l.x+r.x)*.5,y:(l.y+r.y)*.5}:null;
};
const raised=(p:PlayerFrame,view:Viewport):boolean=>{
  const l=body(p,view,11),r=body(p,view,12);
  const handsY=[body(p,view,15),body(p,view,16)];
  return !!(l&&r&&handsY.some(hand=>hand&&hand.y<Math.min(l.y,r.y)-.08));
};
export function powerTargets(index:number):readonly [Target,Target]{
  const y=[.40,.58,.33,.64,.47][index%5];
  return [{x:.36,y},{x:.64,y:index%2?y-.07:y+.07}];
}
const emit=(r:DuoRound,type:GameEvent["type"],key:string,xy:XY,points=0):GameEvent=>({
  id:"duo:"+r.kind+":"+(++r.seq)+":"+key,type,basePoints:points,
  position:{x:xy.x,y:xy.y},color:type==="damage"?"#fc7284":"#8ffbe4"
});
export function createDuoRound(kind:DuoGameId,seconds=45):DuoRound{
  return {kind,playing:false,paused:false,time:seconds,duration:seconds,seq:0,
    scores:{p1:0,p2:0},teamScore:0,round:0,hold:0,rest:0,
    armed:{p1:false,p2:false},previous:{p1:null,p2:null},phaseTime:0,
    leader:"p1",pattern:null,followArmed:false,
    ball:{x:.5,y:.5,vx:.43,vy:.18,serve:.8,rally:0},
    robot:{items:[],spawn:.7,neutral:null,pilotX:.36,shieldY:.65,shieldOn:false},
    message:"두 명이 함께 준비해 주세요."};
}
export function clearDuoMotion(r:DuoRound){
  r.hold=0;r.armed={p1:false,p2:false};
  r.previous={p1:null,p2:null};r.followArmed=false;
  // Tracking gaps never produce a new scoring contact on reappearance.
  if(r.kind==="mirror-challenge"){r.pattern=null;r.phaseTime=0;}
  if(r.kind==="combine-robot"){r.robot.neutral=null;r.robot.shieldOn=false;}
}
function power(r:DuoRound,frames:readonly [PlayerFrame,PlayerFrame],
  dt:number,w:number,h:number,ev:GameEvent[]){
  if(r.rest>0){r.rest=Math.max(0,r.rest-dt);return;}
  const targets=powerTargets(r.round);
  const inside=frames.map((p,i)=>hands(p,w,h).some(xy=>dist(xy,targets[i])<.085)) as [boolean,boolean];
  for(let i=0;i<2;i++){
    const id=frames[i].id;
    if(!inside[i])r.armed[id]=true;
  }
  if(inside[0]&&inside[1]&&r.armed.p1&&r.armed.p2)r.hold+=dt;
  else r.hold=Math.max(0,r.hold-dt*1.6);
  r.message="P1·P2 스위치에 손을 넣고 0.7초 함께 유지하세요";
  if(r.hold>=.7){
    r.teamScore+=35;r.round++;r.hold=0;r.rest=.55;
    r.armed={p1:false,p2:false};
    ev.push(emit(r,"perfect","power",{x:.5,y:.5},35));
  }
}
function sword(r:DuoRound,frames:readonly [PlayerFrame,PlayerFrame],
  dt:number,w:number,h:number,view:Viewport,ev:GameEvent[]){
  r.phaseTime+=dt;
  const attacker=r.leader,defender=other(attacker);
  const a=frames.find(p=>p.id===attacker)!,d=frames.find(p=>p.id===defender)!;
  const target={x:.5,y:.50};
  const tips=hands(a,w,h);
  const near=tips.some(tip=>dist(tip,target)<.115);
  if(!near)r.armed[attacker]=true;
  const moved=tips.some(tip=>r.previous[attacker]&&dist(tip,r.previous[attacker]!)>.023);
  const p=tips.reduce<XY|null>((best,tip)=>!best||dist(tip,target)<dist(best,target)?tip:best,null);
  if(r.phaseTime>.3&&r.phaseTime<2.8&&near&&moved&&r.armed[attacker]){
    const blocked=raised(d,view);
    const winner=blocked?defender:attacker;
    r.scores[winner]+=blocked?28:20;
    ev.push(emit(r,blocked?"perfect":"hit",blocked?"block":"strike",
      p??target,blocked?28:20));
    r.message=blocked?"방어 성공!":"검 공격 성공!";
    r.round++;r.leader=other(r.leader);r.phaseTime=0;r.armed={p1:false,p2:false};
  }else if(r.phaseTime>=3.5){
    ev.push(emit(r,"miss","timeout",target));
    r.message="공격 시간이 끝났어요";
    r.round++;r.leader=other(r.leader);r.phaseTime=0;r.armed={p1:false,p2:false};
  }else r.message=`${attacker.toUpperCase()} 공격! 화면 중앙으로 손을 휘두르세요 · 상대는 손을 어깨 위로 들어 방어`;
  r.previous[attacker]=p;
}
/** Four camera-space arm coordinates relative to shoulders:
 * [leftX,leftY,rightX,rightY]; swapped/reflected for a mirror partner. */
export function armSignature(p:PlayerFrame,view:Viewport):Four|null{
  const l=body(p,view,11),rr=body(p,view,12),lh=body(p,view,15),rh=body(p,view,16);
  if(!l||!rr||!lh||!rh)return null;
  const spread=Math.max(.07,dist(l,rr));
  const midX=(l.x+rr.x)*.5,midY=(l.y+rr.y)*.5;
  return [(lh.x-midX)/spread,(lh.y-midY)/spread,
    (rh.x-midX)/spread,(rh.y-midY)/spread];
}
export function mirrorSignature(signature:Four):Four{
  return [-signature[2],signature[3],-signature[0],signature[1]];
}
export function signatureDistance(a:Four,b:Four):number{
  return Math.hypot(...a.map((x,i)=>x-b[i]));
}
function mirror(r:DuoRound,frames:readonly [PlayerFrame,PlayerFrame],dt:number,
  view:Viewport,ev:GameEvent[]){
  r.phaseTime+=dt;
  const leader=frames.find(p=>p.id===r.leader)!;
  const follower=frames.find(p=>p.id===other(r.leader))!;
  const a=armSignature(leader,view),b=armSignature(follower,view);
  if(!r.pattern){
    // Leader deliberately raises/spreads an arm; idle hanging arms do not trigger.
    if(a&&(a[1]<-.24||a[3]<-.24||Math.abs(a[0])>1.5||Math.abs(a[2])>1.5)&&r.phaseTime>.5){
      r.pattern=mirrorSignature(a);r.phaseTime=0;r.followArmed=false;r.hold=0;
    }else if(r.phaseTime>5.5){r.leader=other(r.leader);r.phaseTime=0;}
    r.message=`${r.leader.toUpperCase()} 리더! 양팔로 새로운 포즈를 만들어 주세요`;
    return;
  }
  const gap=b?signatureDistance(b,r.pattern):Infinity;
  if(gap>.92)r.followArmed=true;
  if(r.followArmed&&gap<.65)r.hold+=dt;
  else r.hold=Math.max(0,r.hold-dt*2);
  r.message=`${other(r.leader).toUpperCase()}가 리더의 팔 모양을 거울처럼 따라해요!`;
  if(r.hold>=.55){
    r.teamScore+=32;r.scores[other(r.leader)]+=32;
    ev.push(emit(r,"perfect","mirror",{x:.5,y:.31},32));
    r.round++;r.leader=other(r.leader);r.pattern=null;r.phaseTime=0;r.hold=0;
  }else if(r.phaseTime>5){
    ev.push(emit(r,"miss","mirror-timeout",{x:.5,y:.35}));
    r.round++;r.leader=other(r.leader);r.pattern=null;r.phaseTime=0;r.hold=0;
  }
}
export function paddleY(p:PlayerFrame,h:number):number|null{
  const anchor=p.points.find(pt=>pt.part==="leftHand"||pt.part==="rightHand");
  return anchor?clamp(.5+(anchor.y/h-.52)*1.65,.17,.83):null;
}
function pong(r:DuoRound,frames:readonly [PlayerFrame,PlayerFrame],
  dt:number,h:number,speed:number,ev:GameEvent[]){
  const ball=r.ball;
  if(ball.serve>0){ball.serve=Math.max(0,ball.serve-dt);r.message="공이 곧 출발해요! 손을 위아래로 움직여 패들을 조작하세요";return;}
  const oldX=ball.x;
  ball.x+=ball.vx*dt*speed;ball.y+=ball.vy*dt*speed;
  if(ball.y<.16){ball.y=.16+( .16-ball.y);ball.vy=Math.abs(ball.vy);}
  if(ball.y>.85){ball.y=.85-(ball.y-.85);ball.vy=-Math.abs(ball.vy);}
  const left=paddleY(frames[0],h),right=paddleY(frames[1],h);
  const towardsLeft=ball.vx<0;
  const px=towardsLeft?.15:.85;
  const paddle=towardsLeft?left:right;
  if((towardsLeft&&oldX>.15&&ball.x<=px)||(!towardsLeft&&oldX<.85&&ball.x>=px)){
    if(paddle!==null&&Math.abs(paddle-ball.y)<.13){
      const dy=clamp((ball.y-paddle)*2,-.32,.32);
      ball.x=px;ball.vx=(towardsLeft?1:-1)*Math.min(.95,Math.abs(ball.vx)*1.045);
      ball.vy=clamp(ball.vy*.5+dy,-.48,.48);ball.rally++;
      ev.push(emit(r,"good","rally",{x:px,y:ball.y},8));
      r.message=`랠리 ${ball.rally}회! 공의 높이로 손을 옮기세요`;
    }else{
      const scorer:PlayerId=towardsLeft?"p2":"p1";
      r.scores[scorer]+=1;
      ev.push(emit(r,"hit","goal",{x:px,y:ball.y},24));
      r.message=scorer.toUpperCase()+" 득점!";
      ball.x=.5;ball.y=.5;ball.vx=(scorer==="p1"?-1:1)*.43;
      ball.vy=(r.round%2===0?.17:-.17);ball.serve=.85;ball.rally=0;r.round++;
    }
  }
}
function robot(r:DuoRound,frames:readonly [PlayerFrame,PlayerFrame],
  dt:number,view:Viewport,speed:number,random:()=>number,ev:GameEvent[]){
  const pilot=center(frames[0],view),operator=frames[1];
  if(pilot){
    if(r.robot.neutral===null)r.robot.neutral=pilot.x;
    r.robot.pilotX=clamp(.48+(pilot.x-r.robot.neutral)*2.5,.16,.84);
  }
  const hand=body(operator,view,16)??body(operator,view,15);
  const shoulder=body(operator,view,12)??body(operator,view,11);
  r.robot.shieldOn=!!(hand&&shoulder&&hand.y<shoulder.y-.07);
  r.robot.shieldY=hand?clamp(hand.y+.38,.45,.8):.65;
  r.robot.spawn-=dt*speed;
  if(r.robot.spawn<=0){
    const id=++r.seq;
    r.robot.items.push({id,x:.2+random()*.6,y:-.10,kind:random()<.28?"hazard":"charge"});
    r.robot.spawn=.75+random()*.36;
  }
  for(const item of r.robot.items){
    item.y+=.32*dt*speed;
    if(item.y<.77)continue;
    if(Math.abs(item.x-r.robot.pilotX)<.10){
      if(item.kind==="charge"&&r.robot.shieldOn){
        r.teamScore+=22;ev.push(emit(r,"collect","charge",{x:item.x,y:item.y},22));
      }else if(item.kind==="hazard"&&r.robot.shieldOn){
        ev.push(emit(r,"damage","hazard",{x:item.x,y:item.y}));
      }else if(item.kind==="charge"){
        ev.push(emit(r,"miss","charge-drop",{x:item.x,y:item.y}));
      }
      item.y=2;
    }else if(item.y>.92){
      if(item.kind==="charge")ev.push(emit(r,"miss","missed",{x:item.x,y:.88}));
      item.y=2;
    }
  }
  r.robot.items=r.robot.items.filter(item=>item.y<1);
  r.message="P1 몸을 좌우로 움직여 로봇 조종 · P2 손을 어깨 위로 들어 충전 수집, 위험하면 내려요";
}
export function stepDuoRound(r:DuoRound,seconds:number,frames:readonly [PlayerFrame,PlayerFrame],
  view:Viewport,random:()=>number=Math.random):{finished:boolean;events:GameEvent[]}{
  if(!r.playing||r.paused)return {finished:false,events:[]};
  if(!frames.every(p=>p.visible)||view.width<1||view.height<1){
    clearDuoMotion(r);return {finished:false,events:[]};
  }
  const dt=clamp(Number.isFinite(seconds)?seconds:0,0,.08);
  const speed=gameplaySpeed(r.time),events:GameEvent[]=[];
  r.time=Math.max(0,r.time-dt);
  switch(r.kind){
    case "co-op-power-plant":power(r,frames,dt*speed,view.width,view.height,events);break;
    case "shadow-sword":sword(r,frames,dt*speed,view.width,view.height,view,events);break;
    case "mirror-challenge":mirror(r,frames,dt*speed,view,events);break;
    case "human-pingpong":pong(r,frames,dt,view.height,speed,events);break;
    case "combine-robot":robot(r,frames,dt,view,speed,random,events);break;
  }
  if(r.time<=0)r.playing=false;
  return {finished:r.time<=0,events};
}
