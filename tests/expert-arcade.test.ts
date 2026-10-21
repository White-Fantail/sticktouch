import test from "node:test";
import assert from "node:assert/strict";
import {createExpertRound,stepExpertRound,EXPERT_GAME_IDS,TRACE_PATTERNS,TRACE_PARTS,
  shadowTargets,portalTargets,mazeWallCollision} from "../src/games/expert-arcade/game.ts";
import {createGameRound,gameTracking,gameHint,stepGameRound} from "../src/games/runtime.ts";
import {GAMES} from "../src/games/registry.ts";
import type {Point} from "../src/core.ts";

const W=800,H=500;
const hand=(x:number,y:number,part:Point["part"]="leftHand"):Point=>
  ({x,y,part,radius:12});
const at=(p:{x:number;y:number},part:Point["part"]="leftHand")=>
  hand(p.x*W,p.y*H,part);
const both=[hand(30,440),hand(770,440,"rightHand")];
const tick=(r:ReturnType<typeof createExpertRound>,dt=.08,points:Point[]=both)=>
  stepExpertRound(r,dt,W,H,points,()=>0);
const viewport={width:W,height:H,videoWidth:W,videoHeight:H,mirror:false};

test("expert games register as five distinct available camera rounds",()=>{
  assert.equal(GAMES.length,53);
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
  tick(r,.02,[hand(5,5)]); // observe the target from outside first
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
    r.boss.age=.8;r.boss.hit=false;r.boss.touching=false;r.boss.cycle=i;
    tick(r,.02,[hand(5,5)]);
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
  tick(r,.02,both);
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
  for(let i=0;i<nodes.length;i++){
    tick(r,.02,[hand(5,5,TRACE_PARTS[0][i])]);
    events.push(...tick(r,.02,[at(nodes[i],TRACE_PARTS[0][i])]).events);
  }
  assert.deepEqual(events.map(e=>e.type),["good","good","good","good","good","bonus"]);
  assert.equal(r.trace.level,2);
  assert.equal(r.trace.pattern,1);
  assert.equal(r.trace.index,0);
});
test("portal charge requires both drifting positions and blocks held farming",()=>{
  const r=createExpertRound("dual-portals",15);r.playing=true;
  tick(r,.02,both);
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

test("gravity maze calibrates from the player's initial hand height",()=>{
  const r=createExpertRound("gravity-lab",15);r.playing=true;
  const neutral=[at({x:.2,y:.68}),at({x:.8,y:.68},"rightHand")];
  tick(r,.08,neutral);
  assert.equal(r.maze.neutralY,.68);
  assert.equal(r.maze.input.y,0);
  tick(r,.08,[at({x:.2,y:.49}),at({x:.8,y:.49},"rightHand")]);
  assert.ok(r.maze.input.y<-.5);
  assert.ok(r.maze.vy<0);
  tick(r,.08,[at({x:.2,y:.44}),at({x:.8,y:.72},"rightHand")]);
  assert.ok(r.maze.input.x>.5);
  assert.ok(r.maze.vx>0);
});
test("gravity maze slides along walls without tunnelling or freezing both axes",()=>{
  const r=createExpertRound("gravity-lab",15);r.playing=true;
  r.maze.neutralY=.5;
  r.maze.ball={x:.29,y:.46};r.maze.vx=.6;r.maze.vy=.20;
  const tilt=[at({x:.2,y:.30}),at({x:.8,y:.70},"rightHand")];
  for(let i=0;i<8;i++){
    tick(r,.08,tilt);
    assert.equal(
      (r.maze.ball.x*W>=.35*W && r.maze.ball.x*W<=.405*W &&
        r.maze.ball.y*H>=.28*H && r.maze.ball.y*H<=.68*H),
      false);
  }
  assert.ok(r.maze.ball.y>.46,"vertical motion should slide along the blocked x axis");
  assert.ok(r.maze.ball.x<.35);
});
test("gravity maze remains collision-safe under rush speed and narrow viewport",()=>{
  const w=360,h=700,r=createExpertRound("gravity-lab",15);r.playing=true;
  r.maze.neutralY=.5;r.maze.ball={x:.27,y:.46};
  r.maze.vx=.6;r.maze.vy=.5;
  for(let i=0;i<20;i++){
    stepExpertRound(r,.08,w,h,[
      {x:w*.15,y:h*.31,part:"leftHand",radius:12},
      {x:w*.85,y:h*.69,part:"rightHand",radius:12}
    ],()=>0,1.25);
    assert.ok(r.maze.ball.x>.07 && r.maze.ball.x<.93);
    assert.ok(r.maze.ball.y>.18 && r.maze.ball.y<.90);
    assert.equal(mazeWallCollision(r.maze.ball,w,h),false,"ball entered a wall");
  }
});
test("trace alternates left, right, upward and downward starts across levels",()=>{
  assert.ok(TRACE_PATTERNS.length>=8);
  const directions=TRACE_PATTERNS.slice(0,4).map(nodes=>{
    const first=nodes[0],last=nodes[nodes.length-1];
    return Math.abs(last.x-first.x)>Math.abs(last.y-first.y)
      ?(last.x>first.x?"right":"left"):(last.y>first.y?"down":"up");
  });
  assert.deepEqual(directions,["right","left","up","down"]);
  const starts=new Set(TRACE_PATTERNS.map(nodes=>
    Math.round(nodes[0].x*100)+":"+Math.round(nodes[0].y*100)));
  assert.ok(starts.size>=6);
  const r=createExpertRound("constellation-trace",30);r.playing=true;
  for(let pattern=0;pattern<4;pattern++){
    assert.equal(r.trace.pattern,pattern);
    const nodes=TRACE_PATTERNS[pattern];
    for(let i=0;i<nodes.length;i++){
      tick(r,.02,[hand(5,5,TRACE_PARTS[pattern][i])]);
      tick(r,.02,[at(nodes[i],TRACE_PARTS[pattern][i])]);
    }
  }
  assert.equal(r.trace.level,5);
  assert.equal(r.trace.pattern,4);
});
