import test from "node:test";
import assert from "node:assert/strict";
import { circlesOverlap, getHitpoints, hitBalloons, mapPoint, newBalloon, stepBalloons, type Landmark, type Balloon } from "../src/core.ts";
const view={width:800,height:450,videoWidth:1280,videoHeight:720,mirror:false};
test("cover/mirror coordinates match the visible position",()=>{
  assert.deepEqual(mapPoint(0.2,0.4,view),{x:160,y:180});
  assert.deepEqual(mapPoint(0.2,0.4,{...view,mirror:true}),{x:640,y:180});
});
test("cover crop maps offscreen points outside the game",()=>{
  const wide={width:1000,height:300,videoWidth:640,videoHeight:480,mirror:false};
  assert.ok(mapPoint(0.5,0,wide).y<0);
});
test("only reliable visible joints count, and scaled hitboxes enlarge",()=>{
  const pose:Landmark[]=Array.from({length:33},()=>({x:0.5,y:0.5,visibility:0}));
  pose[11]={x:0.4,y:0.4,visibility:0.9};
  pose[12]={x:0.6,y:0.4,visibility:0.9};
  pose[15]={x:0.4,y:0.5,visibility:0.9};
  pose[16]={x:1.1,y:0.5,visibility:0.9};
  const a=getHitpoints(pose,view,100),b=getHitpoints(pose,view,200);
  assert.deepEqual(a.map(p=>p.part),["leftHand"]);
  assert.equal(b[0].radius,a[0].radius*2);
});
test("circle overlap includes tangent and excludes separated target",()=>{
  assert.equal(circlesOverlap({x:0,y:0,radius:10},{x:20,y:0,radius:10}),true);
  assert.equal(circlesOverlap({x:0,y:0,radius:10},{x:21,y:0,radius:10}),false);
});
test("each balloon is scored only once even with two hands",()=>{
  const balloon:Balloon={id:1,x:80,y:80,radius:12,vx:0,vy:0,color:"#fff"};
  const points=[{part:"leftHand" as const,x:80,y:80,radius:10},{part:"rightHand" as const,x:80,y:80,radius:10}];
  const hit=hitBalloons([balloon],points,["leftHand","rightHand"]);
  assert.equal(hit.hits.length,1);
  assert.equal(hit.remaining.length,0);
});
test("balloon step bounds dt and spawns from an edge",()=>{
  const b=newBalloon(1,800,450,()=>0.1);
  assert.ok(b.x<0);
  assert.equal(stepBalloons([{...b,x:20,y:20,vx:100,vy:0}],1,800,450)[0].x,28);
});

import { palmCenter, matchHandPalms } from "../src/hands.ts";
import { posePalmCenter, smoothHitpoints } from "../src/core.ts";

function makePose(): Landmark[] {
  const pose=Array.from({length:33},()=>({x:0.5,y:0.5,visibility:0} as Landmark));
  pose[11]={x:0.35,y:0.35,visibility:0.95};
  pose[12]={x:0.65,y:0.35,visibility:0.95};
  pose[15]={x:0.25,y:0.5,visibility:0.95};
  pose[16]={x:0.75,y:0.5,visibility:0.95};
  pose[13]={x:0.32,y:0.52,visibility:0.95};
  pose[14]={x:0.68,y:0.52,visibility:0.95};
  return pose;
}
function makeHand(wristX: number, palmX: number, y=0.5): Landmark[] {
  const points=Array.from({length:21},()=>({x:palmX,y}));
  points[0]={x:wristX,y};
  return points;
}
test("Hand Landmarker palm center is shifted from the wrist to the knuckles",()=>{
  const hand=makeHand(0.25,0.33);
  assert.equal(Number(palmCenter(hand)!.x.toFixed(3)),0.318);
  assert.equal(palmCenter(hand)!.y,0.5);
});
test("malformed hand landmarks are excluded",()=>{
  const hand=makeHand(0.25,0.33);
  hand[17]={x:NaN,y:0.4};
  assert.equal(palmCenter(hand),null);
});
test("match hands to Pose wrist identity even when model order reverses",()=>{
  const pose=makePose();
  const matched=matchHandPalms(pose,[makeHand(0.75,0.82),makeHand(0.25,0.18)]);
  assert.ok(matched.left&&matched.right);
  assert.ok(matched.left.x<matched.right.x);
  assert.equal(matched.right.x,0.8095);
});
test("a single detected hand is never assigned twice",()=>{
  const pose=makePose();
  pose[16]={x:0.27,y:0.5,visibility:0.95};
  const matched=matchHandPalms(pose,[makeHand(0.25,0.33)]);
  assert.equal(Object.keys(matched).length,1);
});
test("stray hand beyond Pose wrist matching threshold is ignored",()=>{
  const pose=makePose();
  const matched=matchHandPalms(pose,[makeHand(0.5,0.52,0.1)]);
  assert.equal(Object.keys(matched).length,0);
});
test("preferred Hand palm maps through the same mirror geometry and respects missing Pose wrist",()=>{
  const pose=makePose();
  const precise=matchHandPalms(pose,[makeHand(0.25,0.35)]);
  const regular=getHitpoints(pose,view,100,precise).find(p=>p.part==="leftHand")!;
  const flipped=getHitpoints(pose,{...view,mirror:true},100,precise).find(p=>p.part==="leftHand")!;
  assert.equal(regular.x+flipped.x,view.width);
  assert.ok(regular.x>getHitpoints(pose,view,100).find(p=>p.part==="leftHand")!.x);
  pose[15].visibility=0;
  assert.equal(getHitpoints(pose,view,100,precise).some(p=>p.part==="leftHand"),false);
});
test("Pose palm estimate follows forearm instead of staying on wrist",()=>{
  const pose=makePose();
  assert.ok(posePalmCenter(pose,"left")!.x<pose[15].x);
});
test("fallback transition interpolates instead of teleporting the hitpoint",()=>{
  const previous=[{part:"leftHand" as const,x:200,y:160,radius:20}];
  const current=[{part:"leftHand" as const,x:300,y:160,radius:35}];
  const next=smoothHitpoints(current,previous,1/60)[0];
  assert.ok(next.x>200 && next.x<300);
  assert.equal(next.radius,35);
});
