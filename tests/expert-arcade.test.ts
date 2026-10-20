import test from "node:test";
import assert from "node:assert/strict";
import {createExpertRound,stepExpertRound,EXPERT_GAME_IDS,TRACE_PATTERNS,
  shadowTargets,portalTargets} from "../src/games/expert-arcade/game.ts";
import {createGameRound,gameTracking,gameHint,stepGameRound} from "../src/games/runtime.ts";
import {GAMES} from "../src/games/registry.ts";
import type {Point} from "../src/core.ts";

const W=800,H=500;
const hand=(x:number,y:number,part:"leftHand"|"rightHand"="leftHand"):Point=>
  ({x,y,part,radius:12});
const at=(p:{x:number;y:number},part:"leftHand"|"rightHand"="leftHand")=>
  hand(p.x*W,p.y*H,part);
const both=[hand(30,440),hand(770,440,"rightHand")];
const tick=(r:ReturnType<typeof createExpertRound>,dt=.08,points:Point[]=both)=>
  stepExpertRound(r,dt,W,H,points,()=>0);
const viewport={width:W,height:H,videoWidth:W,videoHeight:H,mirror:false};

test("expert games register as five distinct available camera rounds",()=>{
  assert.equal(GAMES.length,18);
  for(const id of EXPERT_GAME_IDS){
    const definition=GAMES.find(game=>game.id===id);
    assert.equal(definition?.status,"available");
    assert.ok(definition?.description);
    const round=createGameRound(id);
    assert.equal(round.kind,id);
    assert.ok(gameHint(id).length>10);
    round.state.playing=true;
    assert.equal(stepGameRound(round,.02,W,H,both,undefined,viewport).finished,false);
  }
});
test("idle, pause and tracking loss never consume time or emit penalties",()=>{
  for(const id of EXPERT_GAME_IDS){
    const r=createExpertRound(id,10);
    tick(r);assert.equal(r.time,10,id);
    r.playing=true;r.paused=true;tick(r);assert.equal(r.time,10,id);
    r.paused=false;assert.deepEqual(tick(r,.08,[]).events,[],id);
    assert.equal(r.time,10,id);
    if(id==="gravity-lab"||id==="shadow-sync"||id==="dual-portals"){
      assert.equal(gameTracking(createGameRound(id),[both[0]],undefined),false,id);
      tick(r,.08,[both[0]]);assert.equal(r.time,10,id);
    }
    tick(r);assert.equal(r.time,9.92,id);
    assert.equal(r.score,0,id);
  }
});
test("boss weak-point needs entry, deals one strike and telegraphs danger",()=>{
  const r=createExpertRound("boss-raid",10);r.playing=true;r.boss.age=.80;
  const target=at(r.boss.weak);
  assert.deepEqual(tick(r,.02,[target]).events.map(e=>e.type),["hit"]);
  assert.equal(r.boss.health,3);
  assert.deepEqual(tick(r,.02,[target]).events,[]);
  r.boss.age=1.43;
  const attack=at({x:.20,y:.79});
  assert.deepEqual(tick(r,.02,[attack]).events.map(e=>e.type),["damage"]);
  assert.deepEqual(tick(r,.02,[attack]).events,[]);
});
test("boss health stages progress on the fourth unique hit",()=>{
  const r=createExpertRound("boss-raid",20);r.playing=true;
  for(let i=0;i<4;i++){
    r.boss.age=.8;r.boss.hit=false;r.boss.touching=false;
    const events=tick(r,.02,[at(r.boss.weak)]).events;
    assert.equal(events[0]?.type,"hit");
    if(i===3)assert.deepEqual(events.map(e=>e.type),["hit","bonus"]);
  }
  assert.equal(r.boss.stage,2);
  assert.equal(r.boss.health,5);
});
test("two-hand tilt gives ball inertia; goal finishes only once per arrival",()=>{
  const r=createExpertRound("gravity-lab",15);r.playing=true;
  tick(r,.08,[at({x:.2,y:.28}),at({x:.8,y:.72},"rightHand")]);
  assert.ok(r.maze.vx>0);
  assert.ok(r.maze.ball.x>.16);
  r.maze.ball={x:.86,y:.26};r.maze.vx=0;r.maze.vy=0;
  const neutral=[at({x:.2,y:.5}),at({x:.8,y:.5},"rightHand")];
  assert.deepEqual(tick(r,.02,neutral).events.map(e=>e.type),["collect"]);
  assert.equal(r.maze.level,2);
  assert.deepEqual(tick(r,.02,neutral).events,[]);
});
test("shadow replay requires both moving positions matched over time",()=>{
  const r=createExpertRound("shadow-sync",15);r.playing=true;
  r.shadow.phase="echo";r.shadow.age=0;
  let successes=0;
  for(let i=0;i<12;i++){
    const targets=shadowTargets(r.shadow.age+.08,0);
    const events=tick(r,.08,[at(targets[0]),at(targets[1],"rightHand")]).events;
    successes+=events.filter(e=>e.type==="perfect").length;
    if(successes)break;
  }
  assert.equal(successes,1);
  assert.equal(r.shadow.phase,"rest");
  assert.equal(r.shadow.level,2);
  assert.equal(tick(r).events.length,0);
});
test("trace follows visible numbered nodes with one hand, then rotates pattern",()=>{
  const r=createExpertRound("constellation-trace",15);r.playing=true;
  const nodes=TRACE_PATTERNS[0],events=[];
  for(const node of nodes)events.push(...tick(r,.02,[at(node)]).events);
  assert.deepEqual(events.map(e=>e.type),["good","good","good","good","good","bonus"]);
  assert.equal(r.trace.level,2);
  assert.equal(r.trace.pattern,1);
  assert.equal(r.trace.index,0);
});
test("portal charge requires both drifting positions and blocks held farming",()=>{
  const r=createExpertRound("dual-portals",15);r.playing=true;
  let collects=0;
  for(let i=0;i<16;i++){
    const spots=portalTargets(r.portal.age+.08,r.portal.stage);
    const events=tick(r,.08,[at(spots[0]),at(spots[1],"rightHand")]).events;
    collects+=events.filter(e=>e.type==="collect").length;
  }
  assert.equal(collects,1);
  assert.equal(r.portal.stage,2);
  assert.equal(tick(r).events.length,0);
});
test("all five expert rounds finish once and do not continue after expiry",()=>{
  for(const id of EXPERT_GAME_IDS){
    const r=createExpertRound(id,.01);r.playing=true;
    assert.equal(tick(r).finished,true,id);
    assert.equal(tick(r).finished,false,id);
  }
});
