import {circlesOverlap,newBalloon,stepBalloons,type Balloon,type Point,type BodyPart} from "../../core.ts";
import {ROUND_DURATION_SECONDS} from "../../engine/round-tempo.ts";
import type {GameEvent} from "../../engine/game-feel";

/** Palette is indexed by balloon.id % 4 in core.newBalloon. */
export const BUBBLE_PART_RULES:readonly {label:string;parts:readonly BodyPart[];color:string}[]=[
  {label:"왼손",parts:["leftHand"],color:"#ffbe6b"},
  {label:"양발",parts:["leftFoot","rightFoot"],color:"#60dbff"},
  {label:"머리",parts:["head"],color:"#ef91ff"},
  {label:"오른손",parts:["rightHand"],color:"#80f5b9"}
];
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
  const events:GameEvent[]=[
    ...missed.map(ball=>({id:"balloon:miss:"+ball.id,type:"miss" as const,
      targetId:String(ball.id),position:{x:ball.x,y:ball.y}}))
  ];
  const remaining:Balloon[]=[];
  let hits=0;
  for(const ball of moved){
    const rule=BUBBLE_PART_RULES[ball.id% BUBBLE_PART_RULES.length];
    const touching=points.filter(p=>circlesOverlap(p,ball));
    if(!touching.length){remaining.push(ball);continue;}
    const valid=touching.find(p=>rule.parts.includes(p.part));
    if(valid){
      hits++;
      events.push({id:"balloon:hit:"+ball.id,type:"hit",targetId:String(ball.id),
        basePoints:14,bodyPart:valid.part,position:{x:ball.x,y:ball.y},color:ball.color});
    }else{
      events.push({id:"balloon:wrong:"+ball.id,type:"miss",targetId:String(ball.id),
        position:{x:ball.x,y:ball.y},color:ball.color});
    }
  }
  round.balls=remaining;
  if(round.time<=0)round.playing=false;
  return {hits,finished:round.time<=0,events};
}
