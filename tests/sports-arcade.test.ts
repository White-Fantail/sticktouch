import test from "node:test";
import assert from "node:assert/strict";
import {SPORT_GAME_IDS,createSportRound,stepSportRound,trackSportMotion,
  bowlingPins} from "../src/games/sports-arcade/game.ts";
import {GAMES} from "../src/games/registry.ts";
import {createGameRound,gameHint,gameTracking,stepGameRound} from "../src/games/runtime.ts";
import type {Point,Landmark} from "../src/core.ts";

const W=800,H=500,view={width:W,height:H,videoWidth:W,videoHeight:H,mirror:false};
const palm=(x:number,y:number,part:Point["part"]="leftHand"):Point=>({part,x:x*W,y:y*H,radius:14});
const two=(x:number,y:number):Point[]=>[palm(x,y),palm(.9,.9,"rightHand")];
function pose():Landmark[]{
  const arr=Array.from({length:33},()=>({x:.5,y:.5,visibility:1,presence:1}));
  return arr;
}
function tick(r:ReturnType<typeof createSportRound>,points:Point[],dt=.08){
  return stepSportRound(r,dt,W,H,points,1,()=>.5);
}
test("all six sports games appear in the catalog with distinct runtime rules",()=>{
  assert.equal(SPORT_GAME_IDS.length,6);
  assert.equal(new Set(SPORT_GAME_IDS).size,6);
  assert.equal(GAMES.length,35);
  for(const id of SPORT_GAME_IDS){
    const entry=GAMES.find(g=>g.id===id);
    assert.equal(entry?.status,"available",id);
    assert.equal(entry?.category,"physics",id);
    assert.equal(entry?.recommendedSeconds,60,id);
    assert.equal(createGameRound(id).kind,id);
    assert.ok(gameHint(id).length>20,id);
    const r=createGameRound(id);
    assert.equal(gameTracking(r,two(.3,.6),pose()),true,id);
    r.state.playing=true;
    assert.equal(stepGameRound(r,.05,W,H,two(.3,.6),pose(),view).finished,false,id);
  }
});
test("all six freeze on idle, pause, missing tracking, and end once",()=>{
  for(const id of SPORT_GAME_IDS){
    const r=createSportRound(id,.15,()=>.5);
    assert.equal(tick(r,two(.4,.6)).events.length,0);
    assert.equal(r.time,.15,id);
    r.playing=true;r.paused=true;
    assert.equal(tick(r,two(.4,.6)).events.length,0);
    assert.equal(r.time,.15,id);
    r.paused=false;
    tick(r,[]);assert.equal(r.time,.15,id);
    assert.equal(tick(r,two(.4,.6)).finished,false,id);
    assert.equal(tick(r,two(.4,.6)).finished,true,id);
    assert.equal(tick(r,two(.4,.6)).finished,false,id);
    assert.equal(r.score,0,id);
  }
});
test("stationary pose cannot produce motion or automatic gravity force",()=>{
  const r=createSportRound("i-am-gravity",9,()=>.5);r.playing=true;
  const still=two(.50,.55);
  const x=r.balls[0].x,y=r.balls[0].y;
  for(let i=0;i<14;i++)tick(r,still);
  assert.equal(r.balls[0].charged,false);
  assert.notEqual(r.balls[0].x,Number.NaN);
  assert.ok(Math.abs(r.balls[0].x-x)<.2);
  assert.ok(Math.abs(r.balls[0].y-y)<.2);
  trackSportMotion(r,still,.08,W,H);
  assert.equal(Object.keys(r.moved).length,0);
});
test("goalkeeper rejects passive overlap, but accepts a hand moving into the shot",()=>{
  const r=createSportRound("super-goalkeeper",8,()=>.5);r.playing=true;
  const b=r.balls[0];Object.assign(b,{x:.5,y:.55,vx:0,vy:0,r:.04});
  tick(r,[palm(.5,.55)]);tick(r,[palm(.5,.55)]);
  assert.equal(r.balls.length,1);
  tick(r,[palm(.18,.55)]);
  assert.deepEqual(tick(r,[palm(.5,.55)]).events.map(e=>e.type),["hit"]);
  assert.equal(r.balls.length,0);
});
test("goalkeeper counts a missed goal after the ball crosses the goal line",()=>{
  const r=createSportRound("super-goalkeeper",8,()=>.5);r.playing=true;
  Object.assign(r.balls[0],{x:.5,y:.958,vx:0,vy:.4});
  const result=tick(r,[palm(.1,.5)]);
  assert.deepEqual(result.events.map(e=>e.type),["miss"]);
});
test("ping-pong needs a real swat and reflects the ball upward",()=>{
  const r=createSportRound("air-pingpong",8,()=>.5);r.playing=true;
  Object.assign(r.balls[0],{x:.5,y:.55,vx:0,vy:.25});
  tick(r,[palm(.5,.55)]);tick(r,[palm(.5,.55)]);
  assert.equal(r.stage,0);
  tick(r,[palm(.15,.55)]);
  const result=tick(r,[palm(.5,.55)]);
  assert.deepEqual(result.events.map(e=>e.type),["hit"]);
  assert.ok(r.balls[0].vy<0);
  assert.equal(r.stage,1);
});
test("bowling cannot start motionlessly; swipe launches, pins scatter on impact",()=>{
  const r=createSportRound("motion-bowling",10,()=>.5);r.playing=true;
  assert.equal(bowlingPins().length,10);
  for(let i=0;i<5;i++)tick(r,[palm(.5,.60)]);
  assert.equal(r.balls.length,0);
  tick(r,[palm(.50,.70)]);
  tick(r,[palm(.50,.52)]);
  assert.equal(r.balls.length,1);
  Object.assign(r.balls[0],{x:.5,y:.22,vx:0,vy:0});
  const hit=tick(r,[palm(.50,.52)]);
  assert.ok(hit.events.some(e=>e.type==="hit"));
  assert.ok(r.pins.some(p=>p.down));
});
test("basketball requires an upward throw then a downward hoop crossing",()=>{
  const r=createSportRound("zero-g-basketball",10,()=>.5);r.playing=true;
  for(let i=0;i<5;i++)tick(r,[palm(.4,.60)]);
  assert.equal(r.balls.length,0);
  tick(r,[palm(.40,.70)]);tick(r,[palm(.52,.54)]);
  assert.equal(r.balls.length,1);
  Object.assign(r.balls[0],{x:.79,y:.39,vx:0,vy:.31});
  const scored=tick(r,[palm(.52,.54)]);
  assert.deepEqual(scored.events.map(e=>e.type),["perfect"]);
});
test("fishing demands a cast, a fish bite, then an upward reel",()=>{
  const r=createSportRound("fishing-master",10,()=>.5);r.playing=true;
  for(let i=0;i<5;i++)tick(r,[palm(.4,.52)]);
  assert.equal(r.hook,null);
  tick(r,[palm(.40,.54)]);tick(r,[palm(.55,.48)]);
  assert.ok(r.hook);
  const fish=r.fish[0];
  Object.assign(fish,{x:.55,y:.73,vx:0});
  Object.assign(r.hook!,{x:.55,y:.73,vx:0,vy:0});
  tick(r,[palm(.55,.48)]);
  assert.equal(r.hooked,fish.id);
  r.hook!.y=.578;fish.y=.578;
  tick(r,[palm(.54,.62)]);
  const landed=tick(r,[palm(.54,.42)]);
  assert.deepEqual(landed.events.map(e=>e.type),["collect"]);
});
test("moving hands apply separate attraction and repulsion to charged planets",()=>{
  const r=createSportRound("i-am-gravity",10,()=>.5);r.playing=true;
  Object.assign(r.balls[0],{x:.40,y:.45,vx:0,vy:0,charged:false});
  tick(r,two(.2,.3));
  const before=r.balls[0].vx;
  tick(r,two(.55,.45));
  assert.equal(r.balls[0].charged,true);
  assert.ok(r.balls[0].vx>before);
  const candidate=r.balls[0];Object.assign(candidate,{x:.78,y:.21,vx:0,vy:0,charged:true});
  const scored=tick(r,two(.55,.45));
  assert.ok(scored.events.some(e=>e.type==="collect"));
  assert.equal(candidate.charged,false);
});
