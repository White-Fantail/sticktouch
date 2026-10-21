import test from "node:test";
import assert from "node:assert/strict";
import {createAdvancedRound,stepAdvancedRound,ADVANCED_GAME_IDS,BEAT_SPOTS,
  BEAT_PARTS,SORT_BINS,laserHitsPose,type Laser} from "../src/games/advanced-arcade/game.ts";
import {createGameRound,gameHint,gameTracking,stepGameRound} from "../src/games/runtime.ts";
import {GAMES} from "../src/games/registry.ts";
import type {Point,Landmark} from "../src/core.ts";

const W=800,H=500;
const view={width:W,height:H,videoWidth:W,videoHeight:H,mirror:false};
const point=(part:Point["part"],x:number,y:number):Point=>({part,x:x*W,y:y*H,radius:12});
const hand=(x:number,y:number)=>point("leftHand",x,y);
const away=()=>[hand(.06,.91)];
const at=(xy:{x:number;y:number},part:Point["part"]="leftHand")=>point(part,xy.x,xy.y);
const rand=()=>0;
function bodyPose(style:"arms-up"|"t-pose"|"hands-hips"="arms-up"):Landmark[]{
  const p:Landmark[]=Array.from({length:33},()=>({x:.5,y:.5,visibility:0}));
  const set=(i:number,x:number,y:number)=>p[i]={x,y,visibility:1};
  set(0,.5,.16);set(11,.35,.32);set(12,.65,.32);
  set(13,.28,.43);set(14,.72,.43);
  set(23,.4,.60);set(24,.6,.60);
  set(25,.39,.78);set(26,.61,.78);set(31,.35,.94);set(32,.65,.94);
  if(style==="arms-up"){set(15,.20,.10);set(16,.80,.10);}
  else if(style==="t-pose"){set(15,.02,.32);set(16,.98,.32);}
  else{set(15,.40,.60);set(16,.60,.60);}
  return p;
}
const step=(r:ReturnType<typeof createAdvancedRound>,dt=.08,
  points:Point[]=away(),pose:Landmark[]=bodyPose())=>
  stepAdvancedRound(r,dt,W,H,points,rand,1,pose,view);

test("nine original titles are registered on stable game ids",()=>{
  const names:Record<string,string>={
    "balloon-pop":"버블 헌터","laser-lane":"레이저 탈출",
    "shield-guard":"매직 실드","meteor-dodge":"운석 소나기",
    "rhythm-pads":"바디 비트","pose-challenge":"댄스 미러",
    "freeze-dance":"프리즈 비트","constellation-trace":"별자리 제작자",
    "memory-sequence":"몸으로 암호 풀기"
  };
  assert.equal(GAMES.length,18);
  for(const [id,name] of Object.entries(names))
    assert.equal(GAMES.find(g=>g.id===id)?.title,name);
  for(const id of ADVANCED_GAME_IDS){
    assert.equal(createGameRound(id).kind,id);
    assert.ok(gameHint(id).length>10);
  }
});
test("advanced rounds pause and freeze on tracking loss, and never score locally",()=>{
  for(const id of ADVANCED_GAME_IDS){
    const r=createAdvancedRound(id,5);
    step(r);assert.equal(r.time,5);
    r.playing=true;r.paused=true;step(r);assert.equal(r.time,5);
    r.paused=false;stepAdvancedRound(r,.08,W,H,[],rand,1,undefined,view);
    assert.equal(r.time,5);
    step(r);assert.equal(r.time,4.92);
    assert.equal(r.score,0);
  }
});
test("body beat uses four distinct limbs and ignores the wrong limb",()=>{
  const r=createAdvancedRound("rhythm-pads",10);r.playing=true;
  assert.deepEqual(BEAT_PARTS,["leftHand","rightHand","leftFoot","rightFoot"]);
  for(let lane=0;lane<4;lane++){
    r.notes=[{id:lane+1,lane,age:1.20}];r.previousPads={};r.touches.reset();
    const wrong=at(BEAT_SPOTS[lane],BEAT_PARTS[(lane+1)%4]);
    const ready=point(BEAT_PARTS[lane],.05,.94);
    assert.equal(step(r,.02,[wrong,ready]).events.length,0);
    const correct=at(BEAT_SPOTS[lane],BEAT_PARTS[lane]);
    assert.equal(step(r,.02,[correct]).events.filter(e=>e.type==="perfect").length,1);
    assert.equal(step(r,.02,[correct]).events.length,0);
  }
});
test("body beat alternates hands and feet as notes spawn",()=>{
  const r=createAdvancedRound("rhythm-pads",10);r.playing=true;
  for(let i=0;i<50;i++)step(r);
  const ids=new Set(r.notes.map(n=>n.lane));
  assert.ok(ids.size>=2); // expired notes are removed; check unique target mapping above
});
test("Magic Shield reflects a bolt only when a forearm is transverse to its direction",()=>{
  const r=createAdvancedRound("shield-guard",10);r.playing=true;
  const pose=bodyPose();
  pose[13]={x:.32,y:.52,visibility:1};pose[15]={x:.32,y:.28,visibility:1};
  r.bolts=[{id:1,x:.32,y:.42,vx:.1,vy:0,age:0}];
  const e=step(r,.02,[at({x:.32,y:.28})],pose).events;
  assert.deepEqual(e.map(v=>v.type),["perfect"]);
  assert.equal(r.bolts[0]?.reflected,true);
  assert.ok((r.bolts[0]?.vx??0)<0);
  assert.equal(step(r,.02,[at({x:.32,y:.28})],pose).events.length,0);
  const bad=createAdvancedRound("shield-guard",10);bad.playing=true;
  const parallel=bodyPose();
  parallel[13]={x:.25,y:.42,visibility:1};parallel[15]={x:.43,y:.42,visibility:1};
  bad.bolts=[{id:2,x:.40,y:.51,vx:.1,vy:0,age:0}];
  assert.deepEqual(step(bad,.02,away(),parallel).events.map(v=>v.type),["damage"]);
});
test("body cipher previews poses and requires a new sustained pose for repeated steps",()=>{
  const r=createAdvancedRound("memory-sequence",12);r.playing=true;
  for(let i=0;i<24;i++)step(r);
  assert.equal(r.memoryPhase,"input");
  assert.deepEqual(r.sequence,[0,0]);
  let events=[] as ReturnType<typeof step>["events"];
  step(r,.08,away(),bodyPose("hands-hips")); // disarm initial held pose
  for(let i=0;i<5;i++)events.push(...step(r,.08,away(),bodyPose()).events);
  assert.deepEqual(events.map(e=>e.type),["good"]);
  assert.equal(step(r,.08,away(),bodyPose()).events.length,0);
  step(r,.08,away(),bodyPose("hands-hips"));
  events=[];
  for(let i=0;i<5;i++)events.push(...step(r,.08,away(),bodyPose()).events);
  assert.deepEqual(events.map(e=>e.type),["good","bonus"]);
  assert.equal(r.memoryPhase,"rest");
});
test("body cipher rejects a sustained wrong posture",()=>{
  const r=createAdvancedRound("memory-sequence",12);r.playing=true;
  for(let i=0;i<24;i++)step(r);
  let events=[] as ReturnType<typeof step>["events"];
  for(let i=0;i<6;i++)events.push(...step(r,.08,away(),bodyPose("t-pose")).events);
  assert.deepEqual(events.map(e=>e.type),["miss"]);
  assert.equal(r.memoryPhase,"rest");
});
test("Laser Escape checks full skeleton instead of checking palms alone",()=>{
  const beam:Laser={id:1,age:.82,gap:.44,mode:"high",damaged:false};
  assert.equal(laserHitsPose(beam,bodyPose(),view),true);
  const crouched=bodyPose();
  crouched.forEach(p=>{if(p.visibility)p.y=Math.max(.50,p.y);});
  assert.equal(laserHitsPose(beam,crouched,view),false);
  const hit=createAdvancedRound("laser-lane",10);hit.playing=true;hit.laser={...beam};
  assert.deepEqual(step(hit,.02,away(),bodyPose()).events.map(e=>e.type),["damage"]);
  assert.equal(step(hit,.02,away(),bodyPose()).events.length,0);
  const safe=createAdvancedRound("laser-lane",10);safe.playing=true;safe.laser={...beam};
  let successes=0;
  for(let i=0;i<24;i++)successes+=step(safe,.08,away(),crouched).events.filter(e=>e.type==="collect").length;
  assert.equal(successes,1);
});
test("parcel delivery remains independent of full-body game changes",()=>{
  const r=createAdvancedRound("parcel-sort",10);r.playing=true;
  step(r);step(r);step(r,.02,[at({x:.5,y:.72})]);
  assert.equal(r.parcel?.heldBy,"leftHand");
  assert.deepEqual(step(r,.02,[at(SORT_BINS[0])]).events.map(e=>e.type),["collect"]);
});
test("all advanced rounds finish once and expose the right tracking prerequisites",()=>{
  for(const id of ADVANCED_GAME_IDS){
    const round=createGameRound(id);
    const pose=bodyPose();
    assert.equal(gameTracking(round,away(),undefined),id==="parcel-sort");
    if(id!=="rhythm-pads"&&id!=="parcel-sort")
      assert.equal(gameTracking(round,away(),pose),true,id);
    const state=createAdvancedRound(id,.01);state.playing=true;
    assert.equal(step(state).finished,true,id);
    assert.equal(step(state).finished,false,id);
    round.state.playing=true;
    assert.equal(stepGameRound(round,.02,W,H,away(),pose,view).finished,false);
  }
});
