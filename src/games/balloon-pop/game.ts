import {hitBalloons,newBalloon,stepBalloons,type Balloon,type Point} from "../../core.ts";
import {ROUND_DURATION_SECONDS} from "../../engine/round-tempo.ts";
import type {GameEvent} from "../../engine/game-feel";

export type BalloonRound={
  playing:boolean;
  paused:boolean;
  /** Mirrored from GameFeelSession by the host; not calculated in the game module. */
  score:number;
  time:number;
  spawning:number;
  seq:number;
  balls:Balloon[];
};
export const BALLOON_DURATION_SECONDS=ROUND_DURATION_SECONDS;
export function createBalloonRound(seconds=BALLOON_DURATION_SECONDS):BalloonRound {
  return {playing:false,paused:false,score:0,time:seconds,spawning:0,seq:0,balls:[]};
}
/** A game only reports semantic events; the platform owns scoring, SFX and effects. */
export function stepBalloonRound(round:BalloonRound,delta:number,width:number,height:number,points:Point[],speed=1):
  {hits:number;finished:boolean;events:GameEvent[]} {
  if(!round.playing || round.paused)return {hits:0,finished:false,events:[]};
  const dt=Math.max(0,Math.min(delta,0.08));
  round.time=Math.max(0,round.time-dt);
  round.spawning+=dt*speed;
  if(round.spawning>=1.2){
    round.spawning-=1.2;
    round.balls.push(newBalloon(++round.seq,width,height));
  }
  const previous=round.balls;
  const moved=stepBalloons(previous,dt*speed,width,height);
  const live=new Set(moved.map(ball=>ball.id));
  const missed=previous.filter(ball=>!live.has(ball.id));
  const hit=hitBalloons(moved,points,["leftHand","rightHand","leftFoot","rightFoot","head"]);
  round.balls=hit.remaining;
  const events:GameEvent[]=[
    ...missed.map(ball=>({id:"balloon:miss:"+ball.id,type:"miss" as const,
      targetId:String(ball.id),position:{x:ball.x,y:ball.y}})),
    ...hit.hits.map(ball=>({id:"balloon:hit:"+ball.id,type:"hit" as const,
      targetId:String(ball.id),basePoints:10,position:{x:ball.x,y:ball.y},color:ball.color}))
  ];
  if(round.time<=0)round.playing=false;
  return {hits:hit.hits.length,finished:round.time<=0,events};
}
