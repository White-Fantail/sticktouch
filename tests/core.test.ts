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
