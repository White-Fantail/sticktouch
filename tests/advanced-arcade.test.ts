import test from "node:test";
import assert from "node:assert/strict";
import {createAdvancedRound,stepAdvancedRound,ADVANCED_GAME_IDS,BEAT_SPOTS,
  MEMORY_SPOTS,SORT_BINS} from "../src/games/advanced-arcade/game.ts";
import {createGameRound,gameHint,gameTracking,stepGameRound} from "../src/games/runtime.ts";
import {GAMES} from "../src/games/registry.ts";
import type {Point} from "../src/core.ts";

const W=800,H=500;
const hand=(x:number,y:number,radius=12):Point=>({part:"leftHand",x,y,radius});
const at=(p:{x:number;y:number})=>hand(p.x*W,p.y*H);
const away=()=>[hand(20,450)];
const rand=()=>0;
const step=(r:ReturnType<typeof createAdvancedRound>,dt=.08,points=away())=>
  stepAdvancedRound(r,dt,W,H,points,rand);

test("five distinct advanced games are available through the common runtime",()=>{
  assert.equal(GAMES.length,18);
  for(const id of ADVANCED_GAME_IDS){
    assert.equal(GAMES.find(g=>g.id===id)?.status,"available");
    const round=createGameRound(id);
    assert.equal(round.kind,id);
    assert.equal(gameTracking(round,[{part:"head",x:200,y:200,radius:10}],undefined),false);
    assert.equal(gameTracking(round,[hand(200,200)],undefined),true);
    assert.ok(gameHint(id).length>10);
    round.state.playing=true;
    const result=stepGameRound(round,.04,W,H,away(),undefined,
      {width:W,height:H,videoWidth:W,videoHeight:H,mirror:false});
    assert.equal(result.finished,false);
  }
});
test("all advanced clocks freeze at idle, pause and tracking loss; host alone owns scores",()=>{
  for(const id of ADVANCED_GAME_IDS){
    const r=createAdvancedRound(id,5);
    step(r);assert.equal(r.time,5);
    r.playing=true;r.paused=true;step(r);
    assert.equal(r.time,5);
    r.paused=false;step(r,.08,[]);
    assert.equal(r.time,5);
    step(r);
    assert.equal(r.time,4.92);
    assert.equal(r.score,0);
  }
});
test("rhythm requires a new entry within the beat timing window; held palms cannot farm",()=>{
  const r=createAdvancedRound("rhythm-pads",10);r.playing=true;
  for(let i=0;i<25;i++)step(r);
  assert.ok(r.notes.length>=1);
  const hit=step(r,.02,[at(BEAT_SPOTS[0])]).events;
  assert.equal(hit.filter(e=>e.type==="perfect"||e.type==="good").length,1);
  for(let i=0;i<4;i++)assert.equal(step(r,.02,[at(BEAT_SPOTS[0])]).events.length,0);
});
test("rhythm notes missed after their timing window emit a single miss",()=>{
  const r=createAdvancedRound("rhythm-pads",10);r.playing=true;
  let misses=0;
  for(let i=0;i<34;i++)misses+=step(r).events.filter(e=>e.type==="miss").length;
  assert.equal(misses,1);
});
test("shield intercepts a projectile once; core impact is damage",()=>{
  const r=createAdvancedRound("shield-guard",10);r.playing=true;
  r.bolts=[{id:1,x:.32,y:.51,vx:.1,vy:0,age:0}];
  assert.deepEqual(step(r,.02,[at({x:.32,y:.51})]).events.map(e=>e.type),["hit"]);
  assert.equal(step(r).events.length,0);
  r.bolts=[{id:2,x:.40,y:.51,vx:.1,vy:0,age:0}];
  assert.deepEqual(step(r,.08,away()).events.map(e=>e.type),["damage"]);
});
test("memory previews two colors, requires reentry for repeats and awards stage completion",()=>{
  const r=createAdvancedRound("memory-sequence",12);r.playing=true;
  for(let i=0;i<25;i++)step(r);
  assert.equal(r.memoryPhase,"input");
  assert.deepEqual(r.sequence,[0,0]);
  assert.deepEqual(step(r,.02,[at(MEMORY_SPOTS[0])]).events.map(e=>e.type),["good"]);
  assert.equal(step(r,.02,[at(MEMORY_SPOTS[0])]).events.length,0);
  step(r,.02,away());
  const result=step(r,.02,[at(MEMORY_SPOTS[0])]).events;
  assert.deepEqual(result.map(e=>e.type),["good","bonus"]);
  assert.equal(r.memoryPhase,"rest");
  for(let i=0;i<12;i++)step(r);
  assert.equal(r.sequence.length,3);
});
test("memory wrong choice breaks combo and resets sequence",()=>{
  const r=createAdvancedRound("memory-sequence",12);r.playing=true;
  for(let i=0;i<25;i++)step(r);
  assert.deepEqual(step(r,.02,[at(MEMORY_SPOTS[1])]).events.map(e=>e.type),["miss"]);
  for(let i=0;i<12;i++)step(r);
  assert.equal(r.sequence.length,2);
});
test("laser telegraphs the gap and awards safe survival or one damage",()=>{
  const safe=createAdvancedRound("laser-lane",10);safe.playing=true;
  step(safe);
  assert.equal(safe.laser?.gap,.24);
  let collects=0;
  for(let i=0;i<41;i++)collects+=step(safe,.08,[at({x:.24,y:.52})])
    .events.filter(e=>e.type==="collect").length;
  assert.equal(collects,1);
  const hurt=createAdvancedRound("laser-lane",10);hurt.playing=true;
  hurt.laser={id:1,gap:.24,age:.8,damaged:false};
  const e=step(hurt,.08,[at({x:.83,y:.18})]).events;
  assert.deepEqual(e.map(x=>x.type),["damage"]);
  assert.equal(step(hurt,.02,[at({x:.83,y:.18})]).events.length,0);
});
test("parcel can be picked, carried into matching bin, or rejected as incorrect",()=>{
  const r=createAdvancedRound("parcel-sort",10);r.playing=true;
  step(r);step(r);
  assert.equal(r.parcel?.armed,true);
  step(r,.02,[at({x:.5,y:.72})]);
  assert.equal(r.parcel?.heldBy,"leftHand");
  assert.deepEqual(step(r,.02,[at(SORT_BINS[0])]).events.map(e=>e.type),["collect"]);
  assert.equal(step(r,.02,[at(SORT_BINS[0])]).events.length,0);
  const bad=createAdvancedRound("parcel-sort",10);bad.playing=true;
  step(bad);step(bad);step(bad,.02,[at({x:.5,y:.72})]);
  assert.deepEqual(step(bad,.02,[at(SORT_BINS[1])]).events.map(e=>e.type),["miss"]);
});
test("advanced round completes only once",()=>{
  for(const id of ADVANCED_GAME_IDS){
    const r=createAdvancedRound(id,.015);r.playing=true;
    assert.equal(step(r).finished,true,id);
    assert.equal(step(r).finished,false,id);
  }
});
