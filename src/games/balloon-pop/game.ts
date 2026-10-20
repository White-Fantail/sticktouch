import {hitBalloons,newBalloon,stepBalloons,type Balloon,type Point} from "../../core.ts";

export type BalloonRound={
  playing:boolean;
  paused:boolean;
  score:number;
  time:number;
  spawning:number;
  seq:number;
  balls:Balloon[];
};
export const BALLOON_DURATION_SECONDS=60;
export function createBalloonRound(seconds=BALLOON_DURATION_SECONDS):BalloonRound {
  return {playing:false,paused:false,score:0,time:seconds,spawning:0,seq:0,balls:[]};
}
/** Advance only the balloon game. Camera inference and rendering are reusable across games. */
export function stepBalloonRound(round:BalloonRound,delta:number,width:number,height:number,points:Point[]):
  {hits:number;finished:boolean} {
  if(!round.playing || round.paused)return {hits:0,finished:false};
  const dt=Math.max(0,Math.min(delta,0.08));
  round.time=Math.max(0,round.time-dt);
  round.spawning+=dt;
  if(round.spawning>=1.2){round.spawning=0;round.balls.push(newBalloon(++round.seq,width,height));}
  round.balls=stepBalloons(round.balls,dt,width,height);
  const hit=hitBalloons(round.balls,points,["leftHand","rightHand","leftFoot","rightFoot","head"]);
  round.balls=hit.remaining;
  if(hit.hits.length)round.score+=hit.hits.length*10;
  if(round.time<=0)round.playing=false;
  return {hits:hit.hits.length,finished:round.time<=0};
}
