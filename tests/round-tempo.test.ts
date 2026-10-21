import test from "node:test";
import assert from "node:assert/strict";
import {ROUND_DURATION_SECONDS,ROUND_DURATIONS,FINAL_RUSH_SECONDS,FINAL_RUSH_SPEED,gameplaySpeed,scoreMultiplier,rulesetForDuration} from "../src/engine/round-tempo.ts";
import {GAMES} from "../src/games/registry.ts";
import {createGameRound,stepGameRound} from "../src/games/runtime.ts";
import {createStartGesture,resetStartGesture,raisedHandsGesture,stepStartGesture} from "../src/engine/start-gesture.ts";
import type {Landmark,Point} from "../src/core.ts";

const pose=():Landmark[]=>{
  const landmarks=Array.from({length:33},()=>({x:.5,y:.5,visibility:1,presence:1}));
  landmarks[11]={x:.35,y:.45,visibility:1,presence:1};
  landmarks[12]={x:.65,y:.45,visibility:1,presence:1};
  landmarks[15]={x:.35,y:.28,visibility:1,presence:1};
  landmarks[16]={x:.65,y:.28,visibility:1,presence:1};
  return landmarks;
};
test("all registered games support shared 30/45/60 modes and their recommendations",()=>{
  assert.equal(GAMES.length,53);
  for(const game of GAMES){
    assert.ok(ROUND_DURATIONS.includes(game.recommendedSeconds),game.id);
    for(const seconds of ROUND_DURATIONS){
      assert.equal(createGameRound(game.id,seconds).state.time,seconds,game.id);
    }
  }
  assert.equal(ROUND_DURATION_SECONDS,45);
  assert.equal(GAMES.filter(g=>g.recommendedSeconds===30).length,3);
  assert.ok(GAMES.filter(g=>g.recommendedSeconds===60).length>=13);
  assert.notEqual(rulesetForDuration(30),rulesetForDuration(45));
  assert.notEqual(rulesetForDuration(45),rulesetForDuration(60));
});
test("start gesture requires two reliable raised hands, sustained hold, and release to re-arm",()=>{
  const landmarks=pose(),state=createStartGesture();
  assert.ok(raisedHandsGesture(landmarks));
  for(let i=0;i<11;i++)assert.equal(stepStartGesture(state,landmarks,.08).triggered,false);
  assert.equal(stepStartGesture(state,landmarks,.08).triggered,true);
  assert.equal(stepStartGesture(state,landmarks,.08).triggered,false);
  const lowered=pose();lowered[15].y=.7;
  assert.equal(stepStartGesture(state,lowered,.08).triggered,false);
  for(let i=0;i<12;i++)stepStartGesture(state,landmarks,.08);
  assert.equal(state.armed,false);
  resetStartGesture(state,true);
  assert.equal(stepStartGesture(state,landmarks,.08).triggered,false);
  lowered[16].y=.7;
  stepStartGesture(state,lowered,.08);
  assert.ok(state.armed);
  const obscured=pose();obscured[15].visibility=.1;
  assert.equal(raisedHandsGesture(obscured),false);
});
test("invalid tracking cannot accumulate start hold",()=>{
  const g=createStartGesture();
  for(let i=0;i<9;i++)stepStartGesture(g,pose(),.08);
  assert.equal(stepStartGesture(g,undefined,.08).progress,0);
  assert.equal(g.hold,0);
  assert.equal(stepStartGesture(g,pose(),.08).triggered,false);
});
test("last fifteen seconds increase simulation speed but not the game clock",()=>{
  assert.equal(gameplaySpeed(FINAL_RUSH_SECONDS+.01),1);
  assert.equal(gameplaySpeed(FINAL_RUSH_SECONDS),FINAL_RUSH_SPEED);
  assert.equal(gameplaySpeed(0),1);
  assert.equal(scoreMultiplier(FINAL_RUSH_SECONDS+.01),1);
  assert.equal(scoreMultiplier(FINAL_RUSH_SECONDS),2);
  assert.equal(scoreMultiplier(0),2);
  const hand:Point={part:"leftHand",x:100,y:100,radius:12};
  const view={width:800,height:500,videoWidth:800,videoHeight:500,mirror:false};
  const normal=createGameRound("balloon-pop"),rush=createGameRound("balloon-pop");
  normal.state.playing=true;rush.state.playing=true;
  normal.state.time=16;rush.state.time=14;
  stepGameRound(normal,.08,800,500,[hand],undefined,view);
  stepGameRound(rush,.08,800,500,[hand],undefined,view);
  assert.ok(Math.abs(normal.state.time-15.92)<1e-9);
  assert.ok(Math.abs(rush.state.time-13.92)<1e-9);
  if(normal.kind!=="balloon-pop"||rush.kind!=="balloon-pop")throw Error("unexpected game type");
  assert.ok(rush.state.spawning>normal.state.spawning);
});
