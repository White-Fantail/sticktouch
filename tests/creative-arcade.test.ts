import test from "node:test";
import assert from "node:assert/strict";
import {CREATIVE_GAME_IDS,DRUM_PADS,createCreativeRound,stepCreativeRound,
  novelPose,storyJoint,trackedCreative} from "../src/games/creative-arcade/game.ts";
import {GAMES} from "../src/games/registry.ts";
import {createGameRound,gameTracking,gameHint,stepGameRound} from "../src/games/runtime.ts";
import {GameFeelSession} from "../src/engine/game-feel.ts";
import type {Landmark,Point} from "../src/core.ts";

const W=800,H=500,view={width:W,height:H,videoWidth:W,videoHeight:H,mirror:false};
const at=(x:number,y:number,part:Point["part"]="leftHand"):Point=>({x:x*W,y:y*H,radius:12,part});
function pose(armsUp=false):Landmark[]{
  const p=Array.from({length:33},()=>({x:.5,y:.55,visibility:1,presence:1}));
  const set=(i:number,x:number,y:number)=>{p[i]={x,y,visibility:1,presence:1};};
  set(0,.5,.18);set(11,.62,.36);set(12,.38,.36);
  set(23,.62,.67);set(24,.38,.67);
  set(15,.84,armsUp?.15:.36);set(16,.16,armsUp?.15:.36);
  set(25,.64,.82);set(26,.36,.82);set(31,.66,.96);set(32,.34,.96);
  return p;
}
const poor=()=>{const p=pose();p[11].visibility=.05;return p;};
function tick(r:ReturnType<typeof createCreativeRound>,points:Point[],dt=.08,
  body:Landmark[]=pose()){
  return stepCreativeRound(r,dt,W,H,points,body,view,1);
}
const hands=[at(.20,.30),at(.80,.30,"rightHand")];
test("all seven creative games appear in the catalog and share live game runtime",()=>{
  assert.equal(CREATIVE_GAME_IDS.length,7);
  assert.equal(new Set(CREATIVE_GAME_IDS).size,7);
  assert.equal(GAMES.filter(game=>game.players!==2).length,53);
  for(const id of CREATIVE_GAME_IDS){
    const definition=GAMES.find(g=>g.id===id);
    assert.equal(definition?.status,"available",id);
    assert.equal(definition?.category,"creative",id);
    assert.equal(definition?.recommendedSeconds,60,id);
    const round=createGameRound(id);
    assert.equal(round.kind,id);
    assert.ok(gameHint(id).length>=15,id);
    assert.equal(gameTracking(round,hands,pose()),true,id);
    round.state.playing=true;
    const stepped=stepGameRound(round,.05,W,H,hands,pose(),view);
    assert.equal(stepped.finished,false,id);
  }
});
test("duration, pause, no detection and completion are safe in every mode",()=>{
  for(const id of CREATIVE_GAME_IDS){
    const r=createCreativeRound(id,.14);assert.equal(tick(r,hands).events.length,0,id);
    assert.equal(r.time,.14,id);
    r.playing=true;r.paused=true;
    tick(r,hands);assert.equal(r.time,.14,id);r.paused=false;
    tick(r,[],.08,poor());assert.equal(r.time,.14,id);
    assert.equal(tick(r,hands).finished,false,id);
    assert.equal(tick(r,hands).finished,true,id);
    assert.equal(tick(r,hands).finished,false,id);
    assert.equal(r.score,0,id);
  }
});
test("air drums only register specified limbs after a real re-entry",()=>{
  const r=createCreativeRound("air-drummer",10);r.playing=true;
  const pad=DRUM_PADS[0];
  assert.deepEqual(tick(r,[at(pad.x,pad.y)]).events,[]);
  assert.deepEqual(tick(r,[at(pad.x,pad.y)]).events,[]);
  tick(r,[at(.05,.20)]);
  const hit=tick(r,[at(pad.x,pad.y)]);
  assert.equal(hit.events.length,1);assert.equal(hit.events[0].instrument,"drum");
  assert.equal(hit.events[0].pitch,pad.note);
  assert.equal(tick(r,[at(pad.x,pad.y)]).events.length,0);
  const stats=new GameFeelSession();
  assert.ok(stats.dispatch(hit.events[0])!.points>0);
});
test("drum wrong limb never earns points, and missing beat yields miss",()=>{
  const r=createCreativeRound("air-drummer",9);r.playing=true;
  tick(r,[at(.05,.20,"rightHand")]);
  assert.equal(tick(r,[at(.25,.41,"rightHand")]).events.length,0);
  const missed=tick(r,[at(.25,.41,"rightHand")],.08);
  assert.equal(missed.events.length,0);
  for(let i=0;i<12;i++){const out=tick(r,[at(.20,.50,"rightHand")]);if(out.events.length){
    assert.equal(out.events[0].type,"miss");return;}}
  assert.fail("expected missed beat event");
});
test("music maker needs a horizontal centre crossing and derives pitch from hand height",()=>{
  const r=createCreativeRound("music-maker",8);r.playing=true;
  for(let i=0;i<5;i++)tick(r,[at(.30,.60)]);
  assert.equal(r.notes.length,0);
  const crossed=tick(r,[at(.70,.60)]);
  assert.equal(crossed.events.filter(e=>e.type==="good").length,1);
  assert.equal(crossed.events[0].instrument,"keys");
  assert.ok(crossed.events[0].pitch!>0);
  tick(r,[at(.70,.60)]);tick(r,[at(.70,.60)]);
  assert.equal(r.notes.length,1);
  tick(r,[at(.70,.60)],.08);tick(r,[at(.28,.28)]);
  assert.equal(r.notes.length,2);
  assert.notEqual(r.notes[0],r.notes[1]);
});
test("air painting uses real movement, separate hand colours and bounded segments",()=>{
  const r=createCreativeRound("body-painter",10);r.playing=true;
  const handsA=[at(.28,.45),at(.70,.52,"rightHand")];
  for(let i=0;i<5;i++)tick(r,handsA);
  assert.equal(r.strokes.length,0);
  tick(r,[at(.33,.45),at(.65,.52,"rightHand")]);
  assert.equal(r.strokes.length,2);
  assert.notEqual(r.strokes[0].color,r.strokes[1].color);
  tick(r,[at(.90,.85),at(.10,.1,"rightHand")]);
  assert.equal(r.strokes.length,2,"discontinuous camera jumps should not paint");
  assert.deepEqual(r.strokes.map(s=>[s.x1,s.y1]).length,2);
  tick(r,[]);assert.equal(Object.keys(r.hands).length,0);
});
test("pose holds require release then a fresh pose rather than standing still",()=>{
  const r=createCreativeRound("zombie-dance-battle",8);r.playing=true;
  for(let i=0;i<10;i++)tick(r,hands,.08,pose());
  assert.equal(r.stage,0);assert.equal(r.completed,false);
  const down=pose();down[15]={...down[15],x:.63,y:.65};down[16]={...down[16],x:.37,y:.65};
  tick(r,hands,.08,down);
  let scored=false;
  for(let i=0;i<6;i++)scored ||=tick(r,hands,.08,pose()).events.some(e=>e.type==="perfect");
  assert.equal(scored,true);
  assert.equal(r.completed,true);
  assert.equal(novelPose(createCreativeRound("body-charades"),true,.8),false);
});
test("charades, orchestra and shadow theater use independent posture chapters",()=>{
  for(const id of ["body-charades","human-orchestra","shadow-theater"] as const){
    const r=createCreativeRound(id,9);r.playing=true;
    tick(r,hands,.08,pose(true));
    let achieved=false;
    for(let i=0;i<10;i++){
      const res=tick(r,hands,.08,pose());
      achieved ||=res.events.some(e=>e.type==="collect"||e.type==="perfect");
    }
    assert.equal(achieved,true,id);
    assert.equal(r.completed,true,id);
  }
  assert.equal(trackedCreative("shadow-theater",hands,poor()),false);
  assert.equal(storyJoint(pose(),0,view)?.x,.5);
  assert.equal(storyJoint(poor(),11,view),null);
});
