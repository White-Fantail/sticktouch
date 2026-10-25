import test from "node:test";
import assert from "node:assert/strict";
import {createDuoRound,stepDuoRound} from "../src/games/duo-arcade/game.ts";
import type {PlayerFrame} from "../src/tracking/multiplayer.ts";
import type {Landmark,Viewport} from "../src/core.ts";
const view:Viewport={width:800,height:600,videoWidth:800,videoHeight:600,mirror:false,fit:"contain"};
function player(id:"p1"|"p2",hip=.62,footOffset=0,handOffset=0):PlayerFrame{
 const x=id==="p1"?.27:.73;
 const pose:Landmark[]=Array.from({length:33},()=>({x,y:.5,visibility:0,presence:0}));
 const put=(i:number,px:number,py:number)=>{pose[i]={x:px,y:py,visibility:1,presence:1};};
 put(11,x-.05,.35);put(12,x+.05,.35);put(23,x-.04,hip);put(24,x+.04,hip);
 put(27,x-.06+footOffset,.91);put(28,x+.06-footOffset,.91);
 put(15,x-.13,hip-.11+handOffset);put(16,x+.13,hip-.11+handOffset);
 return {id,visible:true,pose,points:[],handSources:{left:"pose",right:"pose"}};
}
function tick(r:ReturnType<typeof createDuoRound>,p1=player("p1"),p2=player("p2"),dt=.06){
 return stepDuoRound(r,dt,[p1,p2],view,()=>0);
}
test("green light requires real motion, idle player stays at start",()=>{
 const r=createDuoRound("red-light-green-light",60);r.playing=true;
 for(let i=0;i<12;i++)tick(r);
 assert.equal(r.scores.p1,0);
 for(let i=0;i<20;i++)tick(r,player("p1",.62,i%4<2?.11:0));
 assert.ok(r.scores.p1>0);
 assert.equal(r.scores.p2,0);
});
test("red light catches only one moving player after grace",()=>{
 const r=createDuoRound("red-light-green-light",60);r.playing=true;
 for(let i=0;i<20;i++)tick(r,player("p1",.62,i%4<2?.11:0),player("p2",.62,i%4<2?.11:0));
 const other=r.scores.p2;assert.ok(other>0);
 r.redLight.phase="stop";r.redLight.remaining=3;r.redLight.grace=0;
 tick(r);
 for(let i=0;i<7;i++)tick(r,player("p1",.62,.15),player("p2"));
 assert.equal(r.scores.p1,0);assert.equal(r.scores.p2,other);
 assert.equal(r.redLight.players.p1.caught,true);
 assert.equal(r.redLight.players.p2.caught,false);
});
test("stop-go noise spike does not punish and tracking loss cannot move players",()=>{
 const r=createDuoRound("red-light-green-light",60);r.playing=true;
 r.redLight.phase="stop";r.redLight.remaining=3;r.redLight.grace=0;
 tick(r);tick(r,player("p1",.62,.12));tick(r);
 assert.equal(r.redLight.players.p1.caught,false);
 const remaining=r.time;
 tick(r,player("p1"),{...player("p2"),visible:false,pose:undefined});
 assert.equal(r.time,remaining);
 assert.equal(r.redLight.players.p1.anchor,null);
});
test("rope rejects idle, jumping alone, and hand swings alone",()=>{
 const r=createDuoRound("jump-rope-duel",60);r.playing=true;
 for(let i=0;i<10;i++)tick(r);
 for(let i=0;i<32;i++)tick(r,player("p1",.62,0,i%4<2?-.07:.04));
 assert.equal(r.scores.p1,0);
 for(let i=0;i<32;i++)tick(r,player("p1",i%4<2?.57:.62));
 assert.equal(r.scores.p1,0);
});
test("one synchronized rope rotation plus jump-and-landing scores exactly once",()=>{
 const r=createDuoRound("jump-rope-duel",60);r.playing=true;
 tick(r);
 tick(r,player("p1",.62,0,-.07));
 tick(r,player("p1",.62,0,.04));
 tick(r,player("p1",.56));tick(r,player("p1",.54));
 const landed=tick(r,player("p1",.62));
 assert.equal(r.scores.p1,1);assert.equal(r.scores.p2,0);
 assert.equal(landed.events.filter(e=>e.type==="good").length,1);
 for(let i=0;i<8;i++)tick(r);
 assert.equal(r.scores.p1,1);
});
test("rope cannot award a phantom landing after losing camera tracking",()=>{
 const r=createDuoRound("jump-rope-duel",60);r.playing=true;
 tick(r);tick(r,player("p1",.62,0,-.07));tick(r,player("p1",.62,0,.04));
 tick(r,player("p1",.55));
 tick(r,{...player("p1"),visible:false,pose:undefined});
 tick(r);assert.equal(r.scores.p1,0);
});
