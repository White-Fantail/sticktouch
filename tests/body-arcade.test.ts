import test from "node:test";
import assert from "node:assert/strict";
import {BODY_GAME_IDS,BRAIN_TASKS,POSE_WALLS,LIMBS,SWITCHES,
  createBodyRound,stepBodyRound,armCommand,symmetryMatch,yogaMatch} from "../src/games/body-arcade/game.ts";
import {createGameRound,gameHint,gameTracking,stepGameRound} from "../src/games/runtime.ts";
import {GAMES} from "../src/games/registry.ts";
import type {Landmark,Point} from "../src/core.ts";

const w=800,h=500;
const view={width:w,height:h,videoWidth:w,videoHeight:h,mirror:false};
const at=(part:Point["part"],x:number,y:number):Point=>({part,x:x*w,y:y*h,radius:12});
function body():Landmark[]{
  const p=Array.from({length:33},()=>({x:.5,y:.5,visibility:0,presence:1}));
  const set=(i:number,x:number,y:number)=>{p[i]={x,y,visibility:1,presence:1};};
  set(0,.5,.14);set(11,.35,.30);set(12,.65,.30);
  set(13,.27,.46);set(14,.73,.46);set(15,.26,.57);set(16,.74,.57);
  set(23,.40,.58);set(24,.60,.58);set(25,.4,.76);set(26,.6,.76);
  set(31,.35,.93);set(32,.65,.93);
  return p;
}
function points(p=body()):Point[]{
  return [at("leftHand",p[15].x,p[15].y),at("rightHand",p[16].x,p[16].y),
    at("leftFoot",p[31].x,p[31].y),at("rightFoot",p[32].x,p[32].y),at("head",p[0].x,p[0].y)];
}
function frame(r:ReturnType<typeof createBodyRound>,p=body(),ps=points(p),dt=.08){
  return stepBodyRound(r,dt,w,h,ps,p,view,1);
}
test("all 11 missing whole-body games are discoverable with distinct runtime and guidance",()=>{
  assert.equal(BODY_GAME_IDS.length,11);
  assert.equal(new Set(BODY_GAME_IDS).size,11);
  assert.equal(GAMES.length,35);
  for(const id of BODY_GAME_IDS){
    const game=GAMES.find(g=>g.id===id);
    assert.equal(game?.status,"available",id);
    assert.equal(game?.recommendedSeconds,60,id);
    assert.equal(createGameRound(id).kind,id);
    assert.ok(gameHint(id).length>=20,id);
    assert.equal(gameTracking(createGameRound(id),points(),body()),true,id);
  }
});
test("all games freeze on lost tracking, pauses, and idle, and finish exactly once",()=>{
  for(const id of BODY_GAME_IDS){
    const r=createBodyRound(id,.15);
    assert.equal(frame(r).finished,false);assert.equal(r.time,.15);
    r.playing=true;r.paused=true;
    assert.equal(frame(r).events.length,0);assert.equal(r.time,.15);
    r.paused=false;
    assert.equal(stepBodyRound(r,.08,w,h,[],undefined,view).finished,false);
    assert.equal(r.time,.15,id);
    assert.equal(frame(r).finished,false,id);
    assert.equal(frame(r).finished,true,id);
    assert.equal(frame(r).finished,false,id);
    assert.equal(r.score,0,id); // The platform, not the game, owns scoring.
    const game=createGameRound(id);game.state.playing=true;
    assert.equal(stepGameRound(game,.03,w,h,points(),body(),view).finished,false,id);
  }
});
test("bomb switches require the correct limb and an actual out-to-in transition",()=>{
  const r=createBodyRound("bomb-defusal",10);r.playing=true;
  const target=SWITCHES[0];
  assert.equal(LIMBS[0],"leftHand");
  assert.equal(frame(r,body(),[at("leftHand",target.x,target.y)]).events.length,0);
  assert.equal(frame(r,body(),[at("rightHand",.05,.94)]).events.length,0);
  assert.equal(frame(r,body(),[at("rightHand",target.x,target.y)]).events.length,0);
  assert.equal(frame(r,body(),[at("leftHand",target.x,target.y)]).events.length,0);
  frame(r,body(),[at("leftHand",.06,.94)]);
  const hit=frame(r,body(),[at("leftHand",target.x,target.y)]);
  assert.deepEqual(hit.events.map(e=>e.type),["good"]);
  assert.equal(r.index,1);
  assert.equal(frame(r,body(),[at("leftHand",target.x,target.y)]).events.length,0);
});
test("human tetris cannot auto-score a preexisting pose and advances its wall",()=>{
  const r=createBodyRound("human-tetris",10);r.playing=true;
  assert.equal(POSE_WALLS[0],"t-pose");
  const p=body();p[15].x=.04;p[15].y=.30;p[16].x=.96;p[16].y=.30;
  for(let i=0;i<10;i++)frame(r,p);
  assert.equal(r.completed,false);
  frame(r,body());
  let events=[];
  for(let i=0;i<6;i++)events.push(...frame(r,p).events);
  assert.deepEqual(events.map(e=>e.type),["perfect"]);
  assert.equal(frame(r,p).events.length,0);
  for(let i=0;i<25;i++)frame(r,p);
  assert.equal(r.stage,1);
});
test("left and right brain commands really differ by side",()=>{
  const p=body();p[15].y=.08;p[16].y=.60;
  assert.equal(BRAIN_TASKS.length,4);
  assert.equal(armCommand(p,0,"up"),true);
  assert.equal(armCommand(p,1,"up"),false);
  assert.equal(armCommand(p,1,"down"),true);
  const r=createBodyRound("left-right-brain",10);r.playing=true;
  // Start already on target: no free points without a deliberate change.
  for(let i=0;i<7;i++)frame(r,p);
  assert.equal(r.completed,false);
  frame(r,body());
  let successes=0;
  for(let i=0;i<6;i++)successes+=frame(r,p).events.filter(e=>e.type==="perfect").length;
  assert.equal(successes,1);
});
test("volcano survival demands a measured jump, not stationary ankles",()=>{
  const r=createBodyRound("volcano-escape",10);r.playing=true;
  for(let i=0;i<13;i++)frame(r);
  assert.equal(r.waveScored,false);
  const p=body();p[31].y-=.10;p[32].y-=.10;
  let collect=0;
  for(let i=0;i<5;i++)collect+=frame(r,p).events.filter(e=>e.type==="collect").length;
  assert.equal(collect,1);
});
test("symmetry enforces matched arm heights and left-right mirror geometry",()=>{
  const p=body();p[15].x=.2;p[16].x=.8;p[15].y=.08;p[16].y=.08;
  assert.equal(symmetryMatch(p,0),true);
  p[16].y=.58;assert.equal(symmetryMatch(p,0),false);
  assert.equal(yogaMatch(p,0),false);
});
test("alarm requires deliberate foot pressure and the opposite hand lock",()=>{
  const r=createBodyRound("intruder-alarm",10);r.playing=true;
  assert.equal(frame(r).events.length,0);
  const moved=points();
  moved[2]=at("leftFoot",PLATE_X,PLATE_Y);
  frame(r,body(),moved); // Foot materializes on target, so it does not arm.
  assert.equal(r.plateReady,false);
  moved[2]=at("leftFoot",.05,.95);frame(r,body(),moved);
  moved[2]=at("leftFoot",PLATE_X,PLATE_Y);frame(r,body(),moved);
  assert.equal(r.plateReady,true);
  for(let i=0;i<8;i++)frame(r,body(),moved);
  assert.ok(r.hold>=.48);
  moved[1]=at("rightHand",.94,.94);frame(r,body(),moved);
  moved[1]=at("rightHand",.70,.38);
  assert.deepEqual(frame(r,body(),moved).events.map(e=>e.type),["perfect"]);
  assert.equal(r.stage,1);
});
const PLATE_X=.30,PLATE_Y=.86;
