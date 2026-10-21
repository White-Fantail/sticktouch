/** Two independent local-camera players; no game rules or score sharing.
 * All coordinates are camera-normalized until converted through the common viewport.
 * P1/P2 are initially assigned by displayed left/right, then by motion continuity. */
import {getHitpoints,smoothHitpoints,type HandAnchors,type Landmark,type Point,type Viewport} from "../core.ts";
import {palmCenter} from "../hands.ts";

export type PlayerId="p1"|"p2";
export const PLAYER_IDS:readonly PlayerId[]=["p1","p2"] as const;
export type HandOrigin="hand"|"pose"|"none";
export type PlayerFrame={
  id:PlayerId;pose:Landmark[]|undefined;points:Point[];visible:boolean;
  handSources:{left:HandOrigin;right:HandOrigin};
};
type XY={x:number;y:number};
type Slot={center:XY|null;velocity:XY;seenAt:number;points:Point[]};
export type TwoPlayerState={slots:Record<PlayerId,Slot>};
const TRACK_GRACE_MS=1200, MAX_MATCH_DISTANCE=.30;
const emptySlot=():Slot=>({center:null,velocity:{x:0,y:0},seenAt:-Infinity,points:[]});
export function createTwoPlayerState():TwoPlayerState{
  return {slots:{p1:emptySlot(),p2:emptySlot()}};
}
function reliable(p:Landmark|undefined):p is Landmark{
  return !!p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&
    p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1&&
    (p.visibility??1)>=.5&&(p.presence??1)>=.5;
}
function centerOf(pose:readonly Landmark[]):XY|null{
  const hips=[pose[23],pose[24]],shoulders=[pose[11],pose[12]];
  const pair=hips.every(reliable)?hips:shoulders;
  if(!pair.every(reliable))return null;
  return {x:(pair[0].x+pair[1].x)/2,y:(pair[0].y+pair[1].y)/2};
}
const distance=(a:XY,b:XY)=>Math.hypot(a.x-b.x,a.y-b.y);
type Observation={pose:Landmark[];center:XY};
export type AssignedPose={id:PlayerId;pose:Landmark[]|undefined};
/** Model output order is *not* stable. Match to previous centers first;
 * in a fresh scene, P1 is display-left and P2 display-right. */
export function assignPlayerPoses(state:TwoPlayerState,poses:readonly Landmark[][],
  now:number,mirror:boolean):AssignedPose[]{
  const observations:Observation[]=poses.map(pose=>({pose,center:centerOf(pose)}))
    .filter((item):item is Observation=>item.center!==null).slice(0,2);
  const assigned:Partial<Record<PlayerId,Observation>>={};
  const used=new Set<number>();
  const candidates:{id:PlayerId;index:number;cost:number}[]=[];
  for(const id of PLAYER_IDS){
    const slot=state.slots[id],age=now-slot.seenAt;
    if(!slot.center||age>TRACK_GRACE_MS||age<0)continue;
    const ahead=Math.min(.18,Math.max(0,age/1000));
    const predicted={x:slot.center.x+slot.velocity.x*ahead,y:slot.center.y+slot.velocity.y*ahead};
    observations.forEach((ob,index)=>{
      const displacement=distance(slot.center!,ob.center);
      if(displacement<=MAX_MATCH_DISTANCE) candidates.push({
        id,index,cost:distance(predicted,ob.center)+displacement*.16
      });
    });
  }
  candidates.sort((a,b)=>a.cost-b.cost);
  for(const candidate of candidates){
    if(assigned[candidate.id]||used.has(candidate.index))continue;
    assigned[candidate.id]=observations[candidate.index];
    used.add(candidate.index);
  }
  const remaining=observations.map((ob,index)=>({ob,index})).filter(x=>!used.has(x.index))
    .sort((a,b)=>(mirror?-1:1)*(a.ob.center.x-b.ob.center.x));
  const free=PLAYER_IDS.filter(id=>!assigned[id] &&
    (!state.slots[id].center||now-state.slots[id].seenAt>TRACK_GRACE_MS));
  // Fresh pair: order by displayed position; a lone person begins as P1
  // unless they clearly stand in the right half (P2).
  for(const item of remaining){
    if(!free.length)break;
    let id:PlayerId;
    if(free.length===2 && remaining.length===1){
      const displayedX=mirror?1-item.ob.center.x:item.ob.center.x;
      id=displayedX>.65?"p2":"p1";
    }else id=free[0];
    assigned[id]=item.ob;free.splice(free.indexOf(id),1);
  }
  return PLAYER_IDS.map(id=>{
    const slot=state.slots[id],ob=assigned[id];
    if(!ob){slot.points=[];return {id,pose:undefined};}
    const age=now-slot.seenAt;
    if(slot.center&&age>0&&age<=TRACK_GRACE_MS){
      const seconds=Math.max(.05,age/1000);
      const vx=Math.max(-2,Math.min(2,(ob.center.x-slot.center.x)/seconds));
      const vy=Math.max(-2,Math.min(2,(ob.center.y-slot.center.y)/seconds));
      slot.velocity={x:slot.velocity.x*.35+vx*.65,y:slot.velocity.y*.35+vy*.65};
    }else slot.velocity={x:0,y:0};
    slot.center=ob.center;slot.seenAt=now;
    return {id,pose:ob.pose};
  });
}
/** Global one-to-one wrist matching avoids giving one physical hand to
 * both players when arms overlap. Unmatched hands never become hit points. */
export function assignPlayerHands(assigned:readonly AssignedPose[],
  hands:readonly (readonly Landmark[])[]):Record<PlayerId,HandAnchors>{
  const anchors:Record<PlayerId,HandAnchors>={p1:{},p2:{}};
  const candidates:{id:PlayerId;side:"left"|"right";hand:number;distance:number;center:XY}[]=[];
  for(const player of assigned){
    if(!player.pose)continue;
    const a=player.pose[11],b=player.pose[12];
    const shoulders=reliable(a)&&reliable(b)?distance(a,b):.17;
    const max=Math.max(.11,Math.min(.34,shoulders*1.25));
    for(const side of ["left","right"] as const){
      const wrist=player.pose[side==="left"?15:16];
      if(!reliable(wrist))continue;
      hands.forEach((hand,index)=>{
        const hw=hand[0],palm=palmCenter(hand);
        if(!reliable(hw)||!palm)return;
        const gap=distance(wrist,hw);
        if(gap<=max)candidates.push({id:player.id,side,hand:index,distance:gap,center:palm});
      });
    }
  }
  candidates.sort((a,b)=>a.distance-b.distance);
  const used=new Set<number>();
  for(const candidate of candidates){
    if(used.has(candidate.hand)||anchors[candidate.id][candidate.side])continue;
    anchors[candidate.id][candidate.side]=candidate.center;
    used.add(candidate.hand);
  }
  return anchors;
}
/** Game-facing input frame. Future duo games use frames[0]/frames[1] independently
 * and namespace all per-player touch-entry/score state by player.id. */
export function buildTwoPlayerFrames(state:TwoPlayerState,poses:readonly Landmark[][],
  hands:readonly (readonly Landmark[])[],now:number,view:Viewport,scale:number,
  usePreciseHands:boolean,dt:number):readonly [PlayerFrame,PlayerFrame]{
  const assigned=assignPlayerPoses(state,poses,now,view.mirror);
  const anchors=usePreciseHands?assignPlayerHands(assigned,hands):{p1:{},p2:{}};
  const players=assigned.map(({id,pose}):PlayerFrame=>{
    const slot=state.slots[id],raw=getHitpoints(pose,view,scale,anchors[id]);
    const points=pose?smoothHitpoints(raw,slot.points,dt):[];
    slot.points=points;
    return {id,pose,points,visible:!!pose,handSources:{
      left:points.find(p=>p.part==="leftHand")?.source??"none",
      right:points.find(p=>p.part==="rightHand")?.source??"none"
    }};
  });
  return [players[0],players[1]];
}
