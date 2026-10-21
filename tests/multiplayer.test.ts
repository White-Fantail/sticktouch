import test from "node:test";
import assert from "node:assert/strict";
import {assignPlayerPoses,assignPlayerHands,buildTwoPlayerFrames,createTwoPlayerState} from "../src/tracking/multiplayer.ts";
import type {Landmark,Viewport} from "../src/core.ts";

const view:Viewport={width:800,height:500,videoWidth:800,videoHeight:500,mirror:false,fit:"contain"};
function person(x:number):Landmark[]{
  const points=Array.from({length:33},()=>({x,y:.5,visibility:0,presence:0}));
  const fill=(index:number,px:number,y:number)=>{points[index]={x:px,y,visibility:1,presence:1};};
  fill(0,x,.16);fill(11,x-.07,.35);fill(12,x+.07,.35);
  fill(13,x-.12,.44);fill(14,x+.12,.44);
  fill(15,x-.14,.50);fill(16,x+.14,.50);
  fill(17,x-.16,.51);fill(18,x+.16,.51);
  fill(19,x-.12,.51);fill(20,x+.12,.51);
  fill(23,x-.045,.6);fill(24,x+.045,.6);
  fill(31,x-.04,.93);fill(32,x+.04,.93);
  return points;
}
function handAt(x:number,y=.50):Landmark[]{
  const landmarks=Array.from({length:21},()=>({x,y,visibility:1,presence:1}));
  landmarks[0]={x,y,visibility:1,presence:1};
  return landmarks;
}
test("fresh pair receives P1/P2 by display-left even when detector returns reverse order",()=>{
  const s=createTwoPlayerState();
  let r=assignPlayerPoses(s,[person(.77),person(.23)],100,false);
  assert.equal(r[0].pose?.[0].x,.23);assert.equal(r[1].pose?.[0].x,.77);
  r=assignPlayerPoses(createTwoPlayerState(),[person(.77),person(.23)],100,true);
  assert.equal(r[0].pose?.[0].x,.77);assert.equal(r[1].pose?.[0].x,.23);
});
test("player ID remains stable when model order reverses during crossing",()=>{
  const s=createTwoPlayerState();
  assignPlayerPoses(s,[person(.25),person(.75)],100,false);
  let frames=assignPlayerPoses(s,[person(.62),person(.38)],200,false);
  assert.equal(frames[0].pose?.[0].x,.38);assert.equal(frames[1].pose?.[0].x,.62);
  frames=assignPlayerPoses(s,[person(.48),person(.52)],300,false);
  assert.equal(frames[0].pose?.[0].x,.48);assert.equal(frames[1].pose?.[0].x,.52);
  frames=assignPlayerPoses(s,[person(.38),person(.62)],400,false);
  assert.equal(frames[0].pose?.[0].x,.62);assert.equal(frames[1].pose?.[0].x,.38);
});
test("missing player produces no ghost hitpoints and does not steal the other's points",()=>{
  const s=createTwoPlayerState();
  let f=buildTwoPlayerFrames(s,[person(.23),person(.77)],[],100,view,100,false,.05);
  assert.equal(f[0].visible,true);assert.equal(f[1].visible,true);
  assert.equal(f[0].points.filter(p=>p.part.endsWith("Hand")).length,2);
  assert.equal(f[1].points.filter(p=>p.part.endsWith("Hand")).length,2);
  f=buildTwoPlayerFrames(s,[person(.78)],[],200,view,100,false,.05);
  assert.equal(f[0].visible,false);assert.deepEqual(f[0].points,[]);
  assert.equal(f[1].visible,true);
});
test("a single person only gets one slot",()=>{
  const frames=buildTwoPlayerFrames(createTwoPlayerState(),[person(.3)],[],100,view,100,false,.05);
  assert.equal(frames.filter(p=>p.visible).length,1);
});
test("globally unique hand-to-wrist assignments across players",()=>{
  const poses=[person(.33),person(.67)];
  const s=createTwoPlayerState();
  const assigned=assignPlayerPoses(s,poses,100,false);
  const result=assignPlayerHands(assigned,[handAt(.47)]);
  const matched=[...Object.values(result.p1),...Object.values(result.p2)];
  assert.equal(matched.length,1);
});
test("precise Hand/Pose fallback is isolated per player and screen mirror applies",()=>{
  const s=createTwoPlayerState();
  const f=buildTwoPlayerFrames(s,[person(.23),person(.77)],[handAt(.09)],100,view,100,true,.08);
  assert.equal(f[0].handSources.left,"hand");
  assert.equal(f[0].handSources.right,"pose");
  assert.equal(f[1].handSources.left,"pose");
  const viewMirrored={...view,mirror:true};
  const mirrored=buildTwoPlayerFrames(createTwoPlayerState(),[person(.23),person(.77)],[],100,viewMirrored,100,false,.08);
  assert.ok(mirrored[0].points.find(p=>p.part==="head")!.x < mirrored[1].points.find(p=>p.part==="head")!.x);
});
test("unreliable pose and unmatched hands cannot generate a player",()=>{
 const s=createTwoPlayerState();
 const bad=person(.3);bad[23].visibility=0;bad[24].visibility=0;bad[11].visibility=0;bad[12].visibility=0;
 const frames=buildTwoPlayerFrames(s,[bad],[handAt(.16)],100,view,100,true,.05);
 assert.equal(frames[0].visible,false);assert.equal(frames[1].visible,false);
});
