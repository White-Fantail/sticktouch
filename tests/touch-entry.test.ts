import test from "node:test";
import assert from "node:assert/strict";
import {TouchEntries,touchCircle} from "../src/engine/touch-entry.ts";
import type {Point} from "../src/core.ts";

const W=800,H=500;
const hand=(x:number,y:number):Point=>({part:"leftHand",x,y,radius:12});
const goal=touchCircle({x:.5,y:.5},.06,W,H);

test("initial overlap is not a touch; release followed by re-entry is",()=>{
 const t=new TouchEntries(),key="target:1";
 assert.equal(t.contact(key,[hand(400,250)],goal,W,H),undefined);
 assert.equal(t.contact(key,[hand(400,250)],goal,W,H),undefined);
 assert.equal(t.contact(key,[hand(120,250)],goal,W,H),undefined);
 assert.equal(t.contact(key,[hand(400,250)],goal,W,H)?.part,"leftHand");
 assert.equal(t.contact(key,[hand(400,250)],goal,W,H),undefined);
});
test("outside then inside requires actual body travel, not a moving target",()=>{
 const t=new TouchEntries(),p=hand(400,250);
 const away={x:550,y:250,radius:20},near={x:400,y:250,radius:20};
 assert.equal(t.contact("moving",[p],away,W,H),undefined);
 assert.equal(t.contact("moving",[p],near,W,H),undefined);
 assert.equal(t.contact("moving",[p],away,W,H),undefined);
 assert.equal(t.contact("moving",[hand(400,250)],near,W,H),undefined);
});
test("jitter around target edge does not arm or count as a tap",()=>{
 const t=new TouchEntries(),key="jitter";
 assert.equal(t.contact(key,[hand(443,250)],goal,W,H),undefined);
 for(const x of [444,446,445,447,443,445,444]){
   assert.equal(t.contact(key,[hand(x,250)],goal,W,H),undefined);
 }
});
test("each target and body part has independent entry state",()=>{
 const t=new TouchEntries(),left=hand(50,50);
 const right:Point={part:"rightHand",x:50,y:50,radius:12};
 const parts=["leftHand","rightHand"] as const;
 assert.equal(t.contact("a",[left,right],goal,W,H,parts),undefined);
 assert.equal(t.contact("a",[hand(400,250),right],goal,W,H,parts)?.part,"leftHand");
 assert.equal(t.contact("a",[hand(400,250),{...right,x:400,y:250}],goal,W,H,parts)?.part,"rightHand");
 assert.equal(t.contact("a",[hand(400,250)],goal,W,H,parts),undefined);
 assert.equal(t.contact("b",[hand(400,250)],goal,W,H,parts),undefined);
});
test("missing tracking and pause resets prevent teleport touches",()=>{
 const t=new TouchEntries();
 t.contact("a",[hand(50,50)],goal,W,H);
 assert.equal(t.contact("a",[],goal,W,H),undefined);
 assert.equal(t.contact("a",[hand(400,250)],goal,W,H),undefined);
 t.reset();
 assert.equal(t.contact("a",[hand(400,250)],goal,W,H),undefined);
});
