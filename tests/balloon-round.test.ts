import test from "node:test";
import assert from "node:assert/strict";
import {createBalloonRound,stepBalloonRound} from "../src/games/balloon-pop/game.ts";
import {ROUND_DURATION_SECONDS} from "../src/engine/round-tempo.ts";

test("balloon rounds start idle with a clear score",()=>{
 const g=createBalloonRound();
 assert.equal(g.time,ROUND_DURATION_SECONDS);assert.equal(g.score,0);
 assert.equal(g.playing,false);assert.deepEqual(g.balls,[]);
});
test("balloon rounds do not advance unless playing and unpaused",()=>{
 const g=createBalloonRound(10);
 stepBalloonRound(g,0.08,640,360,[]);
 assert.equal(g.time,10);
 g.playing=true;g.paused=true;
 stepBalloonRound(g,0.08,640,360,[]);
 assert.equal(g.time,10);
 g.paused=false;
 stepBalloonRound(g,0.08,640,360,[]);
 assert.ok(g.time<10);
});
test("the timer expires exactly once and prevents further updates",()=>{
 const g=createBalloonRound(0.05);
 g.playing=true;
 assert.equal(stepBalloonRound(g,0.08,640,360,[]).finished,true);
 assert.equal(g.time,0);assert.equal(g.playing,false);
 assert.equal(stepBalloonRound(g,0.08,640,360,[]).finished,false);
});

test("balloon module emits one hit event instead of directly calculating a score",()=>{
  const g=createBalloonRound(5);g.playing=true;
  g.balls=[{id:7,x:100,y:80,radius:20,vx:0,vy:0,color:"#80f5b9"}];
  stepBalloonRound(g,0.016,640,360,[{part:"rightHand",x:10,y:10,radius:15}]);
  const result=stepBalloonRound(g,0.016,640,360,[{part:"rightHand",x:100,y:80,radius:15}]);
  assert.equal(result.hits,1);
  assert.deepEqual(result.events.map(event=>event.id),["balloon:hit:7"]);
  assert.equal(result.events[0].basePoints,14);
  assert.equal(g.score,0);
  assert.equal(stepBalloonRound(g,0.016,640,360,[]).events.length,0);
});
test("an escaped balloon emits exactly one miss event",()=>{
  const g=createBalloonRound(5);g.playing=true;
  g.balls=[{id:4,x:657,y:80,radius:10,vx:300,vy:0,color:"#f00"}];
  const result=stepBalloonRound(g,0.08,640,360,[]);
  assert.equal(result.events[0]?.type,"miss");
  assert.equal(result.events[0]?.targetId,"4");
  assert.equal(stepBalloonRound(g,0.08,640,360,[]).events.filter(e=>e.type==="miss").length,0);
});

test("a wrong body part pops the bubble as a miss, not as a score",()=>{
  const g=createBalloonRound(5);g.playing=true;
  g.balls=[{id:1,x:110,y:100,radius:20,vx:0,vy:0,color:"#60dbff"}];
  stepBalloonRound(g,.02,640,360,[{part:"leftHand",x:10,y:10,radius:12}]);
  const miss=stepBalloonRound(g,.02,640,360,[{part:"leftHand",x:110,y:100,radius:12}]);
  assert.equal(miss.hits,0);
  assert.deepEqual(miss.events.map(e=>e.type),["miss"]);
  assert.equal(g.balls.length,0);
  g.balls=[{id:2,x:100,y:80,radius:20,vx:0,vy:0,color:"#ef91ff"}];
  stepBalloonRound(g,.02,640,360,[{part:"head",x:10,y:10,radius:12}]);
  const hit=stepBalloonRound(g,.02,640,360,[{part:"head",x:100,y:80,radius:12}]);
  assert.equal(hit.hits,1);
  assert.equal(hit.events[0].bodyPart,"head");
});
