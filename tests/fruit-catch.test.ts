import test from "node:test";
import assert from "node:assert/strict";
import {createFruitRound,stepFruitRound,fruitCameraBox,fruitCatchY} from "../src/games/fruit-catch/game.ts";
import {basketInput,gameViewport} from "../src/games/runtime.ts";
import {coverRect,mapPoint} from "../src/core.ts";

test("fruit round never advances or penalizes while palms are not tracked",()=>{
  const round=createFruitRound(10);round.playing=true;
  round.fruits=[{id:1,x:100,y:110,radius:13,speed:100,kind:"apple"}];
  const result=stepFruitRound(round,0.08,500,400,null);
  assert.equal(round.time,10);
  assert.equal(round.fruits[0].y,110);
  assert.deepEqual(result.events,[]);
});

test("catching fruit emits one collect event, not game-local score",()=>{
  const round=createFruitRound(5);round.playing=true;
  round.fruits=[{id:4,x:250,y:fruitCatchY(400)-13,radius:13,speed:100,kind:"berry"}];
  const result=stepFruitRound(round,0.08,500,400,0.5);
  assert.equal(result.events[0]?.type,"collect");
  assert.equal(result.events[0]?.basePoints,15);
  assert.equal(round.score,0);
  assert.equal(round.fruits.length,0);
  assert.equal(stepFruitRound(round,0.08,500,400,0.5).events.length,0);
});
test("missed fruit resets combo; dodged bombs do not",()=>{
  const round=createFruitRound(5);round.playing=true;
  round.fruits=[
    {id:1,x:15,y:fruitCatchY(400),radius:15,speed:0,kind:"apple"},
    {id:2,x:490,y:fruitCatchY(400),radius:15,speed:0,kind:"bomb"}
  ];
  const result=stepFruitRound(round,0.01,500,400,0.5);
  assert.deepEqual(result.events.map(e=>e.type),["miss"]);
});
test("catching a bomb is damage; expiry fires only once",()=>{
  const round=createFruitRound(0.03);round.playing=true;
  round.fruits=[{id:3,x:250,y:fruitCatchY(400),radius:14,speed:0,kind:"bomb"}];
  const result=stepFruitRound(round,0.08,500,400,0.5);
  assert.equal(result.events[0]?.type,"damage");
  assert.equal(result.finished,true);
  assert.equal(stepFruitRound(round,0.08,500,400,0.5).finished,false);
});
test("bottom camera inset contains portrait video and mirrored palm input stays aligned",()=>{
  const box=fruitCameraBox(800,500);
  assert.ok(box.y>500*0.65);
  const view=gameViewport("fruit-catch",800,500,720,1280,true);
  assert.equal(view.fit,"contain");
  const image=coverRect(view);
  const point=mapPoint(0.2,0.5,view);
  assert.ok(Math.abs((point.x-image.x)/image.width-0.8)<1e-10);
  assert.ok(Math.abs(basketInput([{part:"rightHand",x:point.x,y:point.y,radius:15}],view)!-0.8)<1e-10);
  assert.equal(basketInput([],view),null);
});
