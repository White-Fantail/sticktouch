import test from "node:test";
import assert from "node:assert/strict";
import {recordKey,getBestRecord,saveBestRecord} from "../src/engine/records.ts";

test("best records separate ruleset and hitbox difficulty",()=>{
  assert.notEqual(recordKey("balloon-pop","v1",70),recordKey("balloon-pop","v1",100));
  assert.notEqual(recordKey("balloon-pop","v1",100),recordKey("balloon-pop","v2",100));
});
test("records remain optional if localStorage is unavailable",()=>{
  // Native unit tests don't expose browser localStorage.
  assert.equal(getBestRecord("example","v1"),null);
  const saved=saveBestRecord("example","v1",{score:100,combo:4,maxCombo:4,
    successes:4,misses:0,accuracy:100,processed:4},100);
  assert.equal(saved.isNew,true);
  assert.equal(saved.record?.score,100);
  assert.equal(getBestRecord("example","v1")?.score,100);
});
