import test from "node:test";
import assert from "node:assert/strict";
import {GameFeelSession,comboMultiplier} from "../src/engine/game-feel.ts";

test("shared scoring increases combos and awards configured tiers",()=>{
  const game=new GameFeelSession();
  for(let i=1;i<=4;i++){
    const result=game.dispatch({id:"hit:"+i,type:"hit",targetId:String(i)});
    assert.equal(result?.points,10);
  }
  const fifth=game.dispatch({id:"hit:5",type:"hit",targetId:"5"});
  assert.equal(fifth?.points,12);
  assert.equal(fifth?.milestone,true);
  assert.equal(game.stats.score,52);
  assert.equal(game.stats.maxCombo,5);
  assert.equal(comboMultiplier(10),1.5);
  assert.equal(comboMultiplier(20),2);
});

test("duplicate event ids and duplicate target hits cannot award more points",()=>{
  const game=new GameFeelSession();
  const first={id:"x",type:"hit" as const,targetId:"balloon-1"};
  assert.ok(game.dispatch(first));
  assert.equal(game.dispatch(first),null);
  assert.equal(game.dispatch({...first,id:"y",type:"collect"}),null);
  assert.equal(game.stats.score,10);
  assert.equal(game.stats.successes,1);
});

test("miss breaks combo but does not lose previously earned points",()=>{
  const game=new GameFeelSession();
  game.dispatch({id:"hit1",type:"hit"});
  game.dispatch({id:"hit2",type:"hit"});
  const miss=game.dispatch({id:"miss1",type:"miss"});
  assert.equal(miss?.combo,0);
  assert.equal(miss?.points,0);
  const hit=game.dispatch({id:"hit3",type:"hit"});
  assert.equal(hit?.combo,1);
  assert.deepEqual({score:game.stats.score,maxCombo:game.stats.maxCombo,
    successes:game.stats.successes,misses:game.stats.misses,accuracy:game.stats.accuracy},
  {score:30,maxCombo:2,successes:3,misses:1,accuracy:75});
});

test("custom profiles and resets remain independent per game",()=>{
  const a=new GameFeelSession({basePoints:5,comboTiers:[{at:1,multiplier:1},{at:2,multiplier:3}]});
  const b=new GameFeelSession();
  assert.equal(a.dispatch({id:"1",type:"collect"})?.points,5);
  assert.equal(a.dispatch({id:"2",type:"collect"})?.points,15);
  assert.equal(b.stats.score,0);
  a.reset();
  assert.equal(a.stats.score,0);
  assert.equal(a.dispatch({id:"1",type:"collect"})?.points,5);
});

test("invalid score values never allow negative or non-finite points",()=>{
  const game=new GameFeelSession();
  assert.equal(game.dispatch({id:"a",type:"bonus",basePoints:-100})?.points,0);
  assert.equal(game.dispatch({id:"b",type:"hit",basePoints:Infinity})?.points,10);
  assert.equal(game.stats.score,10);
});

test("fever doubles hits and bonuses after combo but never multiplies misses",()=>{
  const game=new GameFeelSession();
  assert.equal(game.dispatch({id:"hit:normal",type:"hit",basePoints:14},1)?.points,14);
  assert.equal(game.dispatch({id:"hit:fever",type:"hit",basePoints:14},2)?.points,28);
  assert.equal(game.dispatch({id:"bonus:fever",type:"bonus",basePoints:9},2)?.points,18);
  assert.equal(game.dispatch({id:"miss:fever",type:"miss"},2)?.points,0);
  assert.equal(game.stats.score,60);
  assert.equal(game.stats.successes,2);
});
