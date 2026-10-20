import test from "node:test";
import assert from "node:assert/strict";
import {matchesPose,createPoseRound,stepPoseRound,poseTarget,POSE_HOLD_SECONDS} from "../src/games/pose-challenge/game.ts";
import type {Landmark} from "../src/core.ts";
import {GAMES} from "../src/games/registry.ts";

function player():Landmark[]{
  const a:Landmark[]=Array.from({length:33},()=>({x:.5,y:.5,visibility:0}));
  const set=(i:number,x:number,y:number)=>a[i]={x,y,visibility:.99};
  set(11,.35,.32);set(12,.65,.32);set(23,.4,.6);set(24,.6,.6);
  set(15,.2,.09);set(16,.8,.09);set(31,.16,.94);set(32,.84,.94);
  return a;
}
test("pose goals match distinct body geometries",()=>{
  const a=player();
  assert.equal(matchesPose(a,"arms-up"),true);
  assert.equal(matchesPose(a,"t-pose"),false);
  a[15].x=.02;a[15].y=.32;a[16].x=.98;a[16].y=.32;
  assert.equal(matchesPose(a,"t-pose"),true);
  a[15].x=.4;a[15].y=.6;a[16].x=.6;a[16].y=.6;
  assert.equal(matchesPose(a,"hands-hips"),true);
  a[15].x=.3;a[15].y=.07;a[16].x=.7;a[16].y=.65;
  assert.equal(matchesPose(a,"one-arm-up"),true);
  a[15].x=.04;a[15].y=.12;a[16].x=.96;a[16].y=.12;
  assert.equal(matchesPose(a,"star"),true);
});
test("unreliable joints stop pose timer and do not count as a failure",()=>{
  const g=createPoseRound(10);g.playing=true;
  const a=player();a[16].visibility=0;
  const result=stepPoseRound(g,.08,a,640,480);
  assert.equal(g.tracking,false);assert.equal(g.time,10);
  assert.equal(result.events.length,0);assert.equal(matchesPose(a,"arms-up"),null);
});
test("pose needs sustained correct posture and emits one perfect event",()=>{
  const g=createPoseRound(10);g.playing=true;
  const a=player();
  for(let i=0;i<9;i++)stepPoseRound(g,.08,a,640,480);
  assert.equal(g.step,0);assert.ok(g.hold<POSE_HOLD_SECONDS);
  const event=stepPoseRound(g,.08,a,640,480);
  assert.equal(event.events.length,0);
  assert.equal(stepPoseRound(g,.08,a,640,480).events[0]?.type,"perfect");
  assert.equal(g.score,0);
  assert.equal(g.step,1);
  assert.equal(poseTarget(g).id,"t-pose");
});
test("an unmatched pose times out once and moves to next goal",()=>{
  const g=createPoseRound(20);g.playing=true;
  const a=player();a[15].y=.6;a[16].y=.6;
  const events=[];
  for(let i=0;i<102;i++)events.push(...stepPoseRound(g,.08,a,640,480).events);
  assert.deepEqual(events.map(e=>e.type),["miss"]);
  assert.equal(g.step,1);
});
test("registered mini games are all playable and use distinct input rules",()=>{
  for(const id of ["balloon-pop","fruit-catch","pose-challenge",
    "mole-whack","color-match","star-hunt","meteor-dodge","freeze-dance"]){
    assert.equal(GAMES.find(g=>g.id===id)?.status,"available",id);
  }
  assert.equal(new Set(GAMES.map(g=>g.id)).size,GAMES.length);
});
