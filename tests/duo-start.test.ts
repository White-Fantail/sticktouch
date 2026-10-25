import test from "node:test";
import assert from "node:assert/strict";
import {updateQueuedDuoStart} from "../src/engine/duo-start.ts";

test("click stays queued even when the second player moves toward the start button",()=>{
  let gate=updateQueuedDuoStart(null,true,false,1000);
  assert.deepEqual(gate,{visibleSince:null,ready:false});
  gate=updateQueuedDuoStart(gate.visibleSince,true,true,1200);
  assert.equal(gate.ready,false);
  gate=updateQueuedDuoStart(gate.visibleSince,true,false,1300);
  assert.deepEqual(gate,{visibleSince:null,ready:false});
  gate=updateQueuedDuoStart(gate.visibleSince,true,true,1500);
  assert.equal(gate.ready,false);
  gate=updateQueuedDuoStart(gate.visibleSince,true,true,1800);
  assert.equal(gate.ready,false);
  gate=updateQueuedDuoStart(gate.visibleSince,true,true,1850);
  assert.equal(gate.ready,true);
});
test("a canceled or stale start never continues an earlier stable timer",()=>{
  let gate=updateQueuedDuoStart(null,true,true,10);
  gate=updateQueuedDuoStart(gate.visibleSince,false,true,500);
  assert.deepEqual(gate,{visibleSince:null,ready:false});
  gate=updateQueuedDuoStart(gate.visibleSince,true,true,600);
  assert.equal(gate.ready,false);
});
