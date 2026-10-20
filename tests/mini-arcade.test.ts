import test from "node:test";
import assert from "node:assert/strict";
import {createMiniRound,stepMiniRound,MINI_GAME_IDS,MOLE_SPOTS,COLOR_SPOTS} from "../src/games/mini-arcade/game.ts";
import {createGameRound,gameTracking,stepGameRound,gameHint} from "../src/games/runtime.ts";
import {GAMES} from "../src/games/registry.ts";
import type {Point} from "../src/core.ts";

const W=800,H=500;
const hand=(x:number,y:number,radius=12):Point=>({part:"leftHand",x,y,radius});
const at=(p:{x:number;y:number})=>hand(p.x*W,p.y*H);
const rand=()=>0;

test("all five games are registered, playable, and use the shared game runtime",()=>{
  assert.equal(GAMES.length,18);
  for(const id of MINI_GAME_IDS){
    assert.equal(GAMES.find(g=>g.id===id)?.status,"available");
    assert.equal(createGameRound(id).kind,id);
    assert.ok(gameHint(id).length>10);
  }
});
test("new game clocks are frozen when idle, paused, or hands disappear",()=>{
  for(const kind of MINI_GAME_IDS){
    const round=createMiniRound(kind,4);
    stepMiniRound(round,0.08,W,H,[hand(100,100)],rand);
    assert.equal(round.time,4,kind+" idle");
    round.playing=true;round.paused=true;
    stepMiniRound(round,0.08,W,H,[hand(100,100)],rand);
    assert.equal(round.time,4,kind+" paused");
    round.paused=false;
    stepMiniRound(round,0.08,W,H,[],rand);
    assert.equal(round.time,4,kind+" missing tracking");
    stepMiniRound(round,0.08,W,H,[hand(100,100)],rand);
    assert.ok(round.time<4,kind+" tracked");
    assert.equal(round.score,0,kind+" never scores locally");
  }
});
test("tracking for mini games requires a palm, not only a head or foot",()=>{
  for(const kind of MINI_GAME_IDS){
    const round=createGameRound(kind);
    assert.equal(gameTracking(round,[{part:"head",x:300,y:200,radius:20}],undefined),false);
    assert.equal(gameTracking(round,[hand(300,200)],undefined),true);
  }
});
test("mole emits exactly one hit when touched and does not farm a held palm",()=>{
  const round=createMiniRound("mole-whack",10);round.playing=true;
  const p=at(MOLE_SPOTS[0]);
  stepMiniRound(round,0.02,W,H,[hand(5,5)],rand); // spawn away from the palm
  assert.equal(round.slot,0);
  const event=stepMiniRound(round,0.02,W,H,[p],rand).events;
  assert.deepEqual(event.map(e=>e.type),["hit"]);
  for(let i=0;i<25;i++){
    assert.equal(stepMiniRound(round,0.08,W,H,[p],rand).events.filter(e=>e.type==="hit").length,0);
  }
  assert.equal(round.score,0);
});
test("a mole appearing under a still hand requires release before hitting",()=>{
  const round=createMiniRound("mole-whack",10);round.playing=true;
  const p=at(MOLE_SPOTS[0]);
  stepMiniRound(round,.02,W,H,[p],rand); // target spawns under the palm
  assert.equal(stepMiniRound(round,.02,W,H,[p],rand).events.length,0);
  stepMiniRound(round,.02,W,H,[hand(5,5)],rand);
  assert.equal(stepMiniRound(round,.02,W,H,[p],rand).events[0]?.type,"hit");
});
test("untouched mole expires with one miss event",()=>{
  const round=createMiniRound("mole-whack",10);round.playing=true;
  stepMiniRound(round,0.02,W,H,[hand(W/2,H*.91)],rand);
  let missed=0;
  for(let i=0;i<35;i++) missed+=stepMiniRound(round,0.08,W,H,[hand(W/2,H*.91)],rand).events.filter(e=>e.type==="miss").length;
  assert.equal(missed,1);
});
test("color matching distinguishes correct and incorrect pads, with one decision per target",()=>{
  const correct=createMiniRound("color-match",10);correct.playing=true;
  const selected=at(COLOR_SPOTS[0]);
  const hit=stepMiniRound(correct,0.02,W,H,[selected],rand).events;
  assert.deepEqual(hit.map(e=>e.type),["good"]);
  assert.equal(stepMiniRound(correct,0.02,W,H,[selected],rand).events.length,0);
  const wrong=createMiniRound("color-match",10);wrong.playing=true;
  const miss=stepMiniRound(wrong,0.02,W,H,[at(COLOR_SPOTS[1])],rand).events;
  assert.deepEqual(miss.map(e=>e.type),["miss"]);
  assert.equal(stepMiniRound(wrong,0.02,W,H,[at(COLOR_SPOTS[1])],rand).events.length,0);
});
test("star can be collected once and times out otherwise",()=>{
  const found=createMiniRound("star-hunt",10);found.playing=true;
  stepMiniRound(found,0.02,W,H,[hand(100,100)],rand);
  const star=found.items[0];assert.ok(star);
  const events=stepMiniRound(found,0.02,W,H,[at(star)],rand).events;
  assert.deepEqual(events.map(e=>e.type),["collect"]);
  assert.equal(stepMiniRound(found,0.02,W,H,[at(star)],rand).events.length,0);
  const timeout=createMiniRound("star-hunt",10);timeout.playing=true;
  stepMiniRound(timeout,0.01,W,H,[hand(5,5)],rand);
  let misses=0;
  for(let i=0;i<42;i++)misses+=stepMiniRound(timeout,0.08,W,H,[hand(5,5)],rand).events.filter(e=>e.type==="miss").length;
  assert.equal(misses,1);
});
test("star spawning stays away from a held hand even if random returns a constant",()=>{
  const round=createMiniRound("star-hunt",10);round.playing=true;
  stepMiniRound(round,.02,W,H,[hand(5,5)],rand);
  const star=round.items[0];
  const held=at(star);
  assert.equal(stepMiniRound(round,.02,W,H,[held],rand).events[0]?.type,"collect");
  stepMiniRound(round,.08,W,H,[held],rand);
  stepMiniRound(round,.08,W,H,[held],rand);
  assert.ok(round.items[0]);
  const next=round.items[0];
  assert.ok(Math.hypot(held.x-next.x*W,held.y-next.y*H)>held.radius+Math.min(W,H)*.19);
});
test("meteor collision is damage; evaded meteor gives a single collect",()=>{
  const crash=createMiniRound("meteor-dodge",10);crash.playing=true;
  crash.items=[{id:1,x:.5,y:.5,vx:.25,vy:0,radius:.05,age:0}];
  const hit=stepMiniRound(crash,.01,W,H,[hand(W*.5,H*.5)],rand);
  assert.equal(hit.events[0]?.type,"damage");
  assert.equal(crash.items.length,0);
  const dodge=createMiniRound("meteor-dodge",10);dodge.playing=true;
  dodge.items=[{id:2,x:1.13,y:.5,vx:.25,vy:0,radius:.05,age:0}];
  const evaded=stepMiniRound(dodge,.08,W,H,[hand(1,1)],rand);
  assert.deepEqual(evaded.events.map(e=>e.type),["collect"]);
  assert.equal(stepMiniRound(dodge,.02,W,H,[hand(1,1)],rand).events.filter(e=>e.type==="collect").length,0);
});
test("freeze dance rewards green motion but penalizes excess red motion once",()=>{
  const round=createMiniRound("freeze-dance",12);round.playing=true;
  const green: string[]=[];
  for(const x of [.12,.17,.22,.27,.32,.37]){
    green.push(...stepMiniRound(round,.08,W,H,[hand(x*W,H*.5)],rand).events.map(e=>e.type));
  }
  assert.ok(green.includes("collect"));
  for(let i=0;i<47;i++)stepMiniRound(round,.08,W,H,[hand(.37*W,H*.5)],rand);
  assert.equal(round.green,false);
  const redEvents:string[]=[];
  for(const x of [.37,.43,.49,.55,.61,.67]){
    redEvents.push(...stepMiniRound(round,.08,W,H,[hand(x*W,H*.5)],rand).events.map(e=>e.type));
  }
  assert.equal(redEvents.filter(type=>type==="damage").length,1);
});
test("a finished round produces a one-time finish signal",()=>{
  for(const kind of MINI_GAME_IDS){
    const round=createMiniRound(kind,.015);round.playing=true;
    assert.equal(stepMiniRound(round,.08,W,H,[hand(100,100)],rand).finished,true);
    assert.equal(stepMiniRound(round,.08,W,H,[hand(100,100)],rand).finished,false);
  }
});
test("mini games use runtime-generated normalized hitpoints without alternate coordinate transforms",()=>{
  const round=createGameRound("star-hunt");round.state.playing=true;
  const view={width:W,height:H,videoWidth:W,videoHeight:H,mirror:false};
  const result=stepGameRound(round,.02,W,H,[hand(10,10)],undefined,view);
  assert.equal(result.finished,false);
  assert.equal(round.state.time<60,true);
});
