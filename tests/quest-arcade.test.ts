import test from "node:test";
import assert from "node:assert/strict";
import type {Landmark,Point} from "../src/core.ts";
import {GameFeelSession} from "../src/engine/game-feel.ts";
import {GAMES} from "../src/games/registry.ts";
import {createGameRound,gameTracking,stepGameRound,gameHint} from "../src/games/runtime.ts";
import {QUEST_GAME_IDS,PROGRAMS,createQuestRound,reflectedLaser,requiredPathPart,
  stepQuestRound,trackedQuest} from "../src/games/quest-arcade/game.ts";

const W=800,H=500,view={width:W,height:H,videoWidth:W,videoHeight:H,mirror:false};
const at=(x:number,y:number,part:Point["part"]="leftHand"):Point=>
  ({x:x*W,y:y*H,part,radius:10});
const hands=(lx=.13,ly=.32,rx=.87,ry=.32):Point[]=>
  [at(lx,ly),at(rx,ry,"rightHand")];
function pose():Landmark[]{
  const p=Array.from({length:33},()=>({x:.5,y:.55,visibility:1,presence:1}));
  const set=(i:number,x:number,y:number)=>p[i]={x,y,visibility:1,presence:1};
  set(0,.5,.15);set(11,.33,.33);set(12,.67,.33);
  set(13,.24,.47);set(14,.76,.47);set(15,.20,.66);set(16,.80,.66);
  set(23,.40,.65);set(24,.60,.65);set(25,.40,.80);set(26,.60,.80);
  set(31,.38,.96);set(32,.62,.96);
  return p;
}
function tick(r:ReturnType<typeof createQuestRound>,points:Point[]=hands(),
  body:Landmark[]=pose(),dt=.08){
  return stepQuestRound(r,dt,W,H,points,body,view);
}
test("D category contains eleven distinct registered and runnable games",()=>{
  assert.equal(GAMES.filter(game=>game.players!==2).length,53);
  assert.equal(QUEST_GAME_IDS.length,11);
  assert.equal(new Set(QUEST_GAME_IDS).size,11);
  for(const id of QUEST_GAME_IDS){
    const item=GAMES.find(g=>g.id===id);
    assert.equal(item?.status,"available",id);
    assert.equal(item?.category,"quest",id);
    assert.equal(item?.recommendedSeconds,60,id);
    assert.ok(gameHint(id).length>25,id);
    const round=createGameRound(id,30);
    assert.equal(round.kind,id);
    assert.equal(round.state.duration,30);
    assert.equal(gameTracking(round,hands(),pose()),true,id);
    round.state.playing=true;
    assert.equal(stepGameRound(round,.08,W,H,hands(),pose(),view).finished,false,id);
  }
});
test("pause, detection loss, and timeout behave the same in all D games",()=>{
  for(const id of QUEST_GAME_IDS){
    const r=createQuestRound(id,.15);
    tick(r);assert.equal(r.time,.15,id);
    r.playing=true;r.paused=true;
    tick(r);assert.equal(r.time,.15,id);
    r.paused=false;
    tick(r,[],pose());assert.equal(r.time,.15,id);
    tick(r);
    assert.equal(tick(r).finished,true,id);
    assert.equal(tick(r).finished,false,id);
  }
  const p=pose();p[11].visibility=.1;
  assert.equal(trackedQuest("laser-mirror",hands(),p),false);
  assert.equal(trackedQuest("time-clone",hands().slice(0,1),p),false);
});
test("laser reflections are based on the actual elbow-wrist tangent and visibility",()=>{
  const p=pose(),reflection=reflectedLaser(p,view,0);
  assert.ok(reflection);
  assert.ok(Number.isFinite(reflection!.alignment));
  p[15].visibility=0;
  assert.equal(reflectedLaser(p,view,0),null);
  const r=createQuestRound("laser-mirror",4);r.playing=true;
  for(let i=0;i<10;i++)tick(r,hands(),pose());
  assert.equal(r.score,0);
});
test("bomb passing is an ordered two-hand entry and cannot score while hovering",()=>{
  const r=createQuestRound("time-bomb-pass",10);r.playing=true;
  for(let i=0;i<5;i++)assert.equal(tick(r,hands(.25,.42,.75,.42)).events.length,0);
  tick(r,hands(.08,.20,.92,.20));
  tick(r,hands(.25,.42,.92,.20));
  assert.equal(r.step,1);
  // The receiver must leave the target and deliberately return.
  tick(r,hands(.25,.42,.75,.42));
  assert.equal(r.stage,0);
  tick(r,hands(.25,.42,.90,.18));
  const scored=tick(r,hands(.25,.42,.75,.42));
  assert.equal(scored.events.filter(e=>e.type==="perfect").length,1);
  assert.equal(r.stage,1);
  assert.ok(new GameFeelSession().dispatch(scored.events[0])!.points>0);
});
test("programming records three real commands and executes grid movement",()=>{
  const r=createQuestRound("body-programming",12);r.playing=true;
  const controls=[{x:.31,y:.25},{x:.69,y:.76},{x:.69,y:.76}];
  for(const goal of controls){
    tick(r,hands(.08,.13,.93,.85));
    tick(r,hands(goal.x,goal.y,.93,.85));
    tick(r,hands(.07,.13,.94,.86));
    tick(r,hands(.07,.13,.94,.86));
  }
  assert.deepEqual(r.instructions,PROGRAMS[0]);
  assert.equal(r.step,1);
  let won=false;
  for(let i=0;i<25;i++){
    const events=tick(r,hands(.07,.13,.94,.86)).events;
    if(events.some(e=>e.type==="perfect")){won=true;break;}
  }
  assert.equal(won,true);
  assert.equal(r.stage,1);
});
test("moving the path limb draws navigable lines around an obstacle",()=>{
  assert.deepEqual([0,1,2,3].map(requiredPathPart),
    ["leftHand","rightHand","leftFoot","rightFoot"]);
  const r=createQuestRound("i-am-path",10);r.playing=true;
  const track:[[number,number],...Array<[number,number]>]=[
    [.20,.55],[.20,.42],[.22,.35],[.34,.35],[.47,.35],
    [.49,.46],[.49,.58],[.48,.66]
  ];
  let achieved=false;
  for(const [x,y] of track){
    const result=tick(r,hands(x,y));
    achieved ||=result.events.some(e=>e.type==="perfect");
  }
  assert.equal(achieved,true);
  assert.equal(r.stage,1);
  const idle=createQuestRound("i-am-path",7);idle.playing=true;
  for(let i=0;i<25;i++)tick(idle,hands(.2,.5));
  assert.equal(idle.stage,0);
});
test("static positions cannot score in gesture-memory, time clone, or gardening",()=>{
  for(const id of ["memory-ghost","time-clone","magic-garden"] as const){
    const r=createQuestRound(id,10);r.playing=true;
    const still=hands(.24,.79,.76,.79);
    let successes=0;
    for(let i=0;i<60;i++){
      successes+=tick(r,still).events.filter(e=>e.type==="good"||
        e.type==="perfect"||e.type==="collect").length;
    }
    assert.equal(successes,0,id);
  }
});
test("world game requires body input before changing the physics position",()=>{
  const r=createQuestRound("move-world",8);r.playing=true;
  const origin=r.ball.x;
  for(let i=0;i<15;i++)tick(r,hands(),pose());
  assert.ok(Math.abs(r.ball.x-origin)<.01,"neutral tilt does not propel the ball");
  const leaning=pose();
  leaning[11].x+=.20;leaning[12].x+=.20;
  for(let i=0;i<14;i++)tick(r,hands(),leaning);
  assert.ok(r.ball.x>origin,"body tilt changes world motion");
});
