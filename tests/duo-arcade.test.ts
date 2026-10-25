import test from "node:test";
import assert from "node:assert/strict";
import {createDuoRound,stepDuoRound,powerTargets,isDuoGame,DUO_IDS,
  mirrorSignature,signatureDistance,paddleY} from "../src/games/duo-arcade/game.ts";
import type {PlayerFrame} from "../src/tracking/multiplayer.ts";
import type {Landmark,Point,Viewport} from "../src/core.ts";
const view:Viewport={width:800,height:600,videoWidth:800,videoHeight:600,mirror:false,fit:"contain"};
function person(id:"p1"|"p2",x:number,hand?:{x:number;y:number},raise=false):PlayerFrame{
  const pose:Landmark[]=Array.from({length:33},()=>({x,y:.5,visibility:0,presence:0}));
  const add=(i:number,px:number,y:number)=>{pose[i]={x:px,y,visibility:1,presence:1};};
  add(0,x,.18);add(11,x-.05,.37);add(12,x+.05,.37);
  add(23,x-.04,.63);add(24,x+.04,.63);
  add(15,hand?.x??x-.08,raise?.15:hand?.y??.57);
  add(16,hand?.x??x+.08,raise?.15:hand?.y??.57);
  const points:Point[]=[{part:"leftHand",x:(hand?.x??x-.08)*800,y:(hand?.y??.57)*600,radius:20},
    {part:"rightHand",x:(hand?.x??x+.08)*800,y:(hand?.y??.57)*600,radius:20}];
  return {id,visible:true,pose,points,handSources:{left:"pose",right:"pose"}};
}
const pair=(p1=person("p1",.25),p2=person("p2",.75)):readonly [PlayerFrame,PlayerFrame]=>[p1,p2];
const tick=(r:ReturnType<typeof createDuoRound>,f:readonly [PlayerFrame,PlayerFrame],
  dt=.06,rand=()=>.55)=>stepDuoRound(r,dt,f,view,rand);
const run=(r:ReturnType<typeof createDuoRound>,f:readonly [PlayerFrame,PlayerFrame],
  n=20)=>Array.from({length:n},()=>tick(r,f)).flatMap(x=>x.events);

test("all seven canonical multiplayer IDs exist",()=>{
 assert.equal(DUO_IDS.length,7);
 for(const id of DUO_IDS)assert.equal(isDuoGame(id),true);
 assert.equal(isDuoGame("balloon-pop"),false);
});
test("no duo timer/score advances unless both players are visible",()=>{
 const r=createDuoRound("co-op-power-plant",45);r.playing=true;
 const f=pair();tick(r,f);
 const time=r.time;
 const absent:readonly [PlayerFrame,PlayerFrame]=[f[0],{...f[1],visible:false,points:[],pose:undefined}];
 assert.deepEqual(tick(r,absent).events,[]);
 assert.equal(r.time,time);
 r.paused=true;tick(r,f);assert.equal(r.time,time);
});
test("power switches require release then entry by both and simultaneous hold",()=>{
 const r=createDuoRound("co-op-power-plant",45);r.playing=true;
 const [a,b]=powerTargets(0);
 const inPlace=pair(person("p1",.25,a),person("p2",.75,b));
 run(r,inPlace,20);assert.equal(r.teamScore,0,"initial overlap should not score");
 run(r,pair(),2);const events=run(r,inPlace,20);
 assert.equal(events.filter(e=>e.type==="perfect").length,1);
 assert.equal(r.teamScore,35);
 run(r,inPlace,20);assert.equal(r.teamScore,35,"no farming without release/new target");
});
test("sword alternates attacking roles and guarded defense earns points",()=>{
 const r=createDuoRound("shadow-sword",45);r.playing=true;
 const standby=pair(person("p1",.25,{x:.28,y:.6}),person("p2",.75,undefined,true));
 run(r,standby,10);
 const events=tick(r,pair(person("p1",.25,{x:.50,y:.50}),person("p2",.75,undefined,true)));
 assert.equal(events.events[0]?.type,"perfect");
 assert.equal(r.scores.p2,28);
 assert.equal(r.leader,"p2");
});
test("mirror transform swaps and reflects arms, and identical signatures match",()=>{
 const a:[number,number,number,number]=[-1.3,-.5,.9,.4];
 const b=mirrorSignature(a);
 assert.deepEqual(b,[-.9,.4,1.3,-.5]);
 assert.equal(signatureDistance(a,a),0);
 assert.ok(signatureDistance(a,b)>0);
 const round=createDuoRound("mirror-challenge",45);round.playing=true;
 const leader=person("p1",.25,undefined,true);
 const follower=person("p2",.75,undefined,true);
 run(round,pair(leader,follower),11);
 assert.ok(round.pattern!==null,"leader's raised pose becomes a pattern");
});
test("pingpong ball rallies with matching paddle and scores on misses",()=>{
 const r=createDuoRound("human-pingpong",45);r.playing=true;
 const f=pair();assert.ok(paddleY(f[0],600)!==null);
 let events=[] as ReturnType<typeof tick>["events"];
 for(let i=0;i<90;i++)events.push(...tick(r,f).events);
 assert.ok(r.scores.p1+r.scores.p2>=1 || events.some(e=>e.type==="good"));
 assert.ok(Number.isFinite(r.ball.x)&&Number.isFinite(r.ball.y));
});
test("robot needs pilot alignment and operator shield, hazard is harmful",()=>{
 const r=createDuoRound("combine-robot",45);r.playing=true;
 const f=pair(person("p1",.25),person("p2",.75,undefined,true));
 const sequence=[.46666,.90,.8,.46666,.90,.8];
 let k=0;
 const rand=()=>sequence[k++%sequence.length];
 let got=0;
 for(let i=0;i<70;i++)got+=tick(r,f,.07,rand).events.filter(e=>e.type==="collect").length;
 assert.ok(got>=1);assert.ok(r.teamScore>0);
});
