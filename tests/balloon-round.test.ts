import test from "node:test";
import assert from "node:assert/strict";
import {createBalloonRound,stepBalloonRound} from "../src/games/balloon-pop/game.ts";

test("balloon rounds start idle with a clear score",()=>{
 const g=createBalloonRound();
 assert.equal(g.time,60);assert.equal(g.score,0);
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
