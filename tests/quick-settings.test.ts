import test from "node:test";
import assert from "node:assert/strict";
import {volumeToGain} from "../src/engine/audio.ts";
import {pauseForSettings,restoreAfterSettings} from "../src/engine/quick-pause.ts";

test("music and effects volumes are independent and monotonic, with true silence at zero",()=>{
  for(const channel of ["music","sfx"] as const){
    assert.equal(volumeToGain(0,channel),0);
    assert.ok(volumeToGain(35,channel)>0);
    assert.ok(volumeToGain(65,channel)>volumeToGain(35,channel));
    assert.ok(volumeToGain(100,channel)>volumeToGain(65,channel));
    assert.equal(volumeToGain(-10,channel),0);
    assert.equal(volumeToGain(150,channel),volumeToGain(100,channel));
    assert.equal(volumeToGain(NaN,channel),0);
  }
  assert.notEqual(volumeToGain(65,"music"),volumeToGain(65,"sfx"));
});

test("opening settings pauses live gameplay; closing resumes exactly when it was playing",()=>{
  const round={playing:true,paused:false,time:32,score:70};
  const resume=pauseForSettings(round);
  assert.equal(resume,true);
  assert.equal(round.paused,true);
  assert.equal(restoreAfterSettings(round,resume,true),true);
  assert.equal(round.paused,false);
  assert.equal(round.time,32);
  assert.equal(round.score,70);
});

test("a manually paused game stays paused after closing settings",()=>{
  const round={playing:true,paused:true};
  const resume=pauseForSettings(round);
  assert.equal(resume,false);
  assert.equal(restoreAfterSettings(round,resume,true),false);
  assert.equal(round.paused,true);
});

test("settings cannot resume a finished game or a backgrounded tab",()=>{
  const finished={playing:false,paused:false};
  const resume=pauseForSettings(finished);
  assert.equal(resume,false);
  assert.equal(restoreAfterSettings(finished,resume,true),false);
  const hidden={playing:true,paused:false};
  const wasRunning=pauseForSettings(hidden);
  assert.equal(restoreAfterSettings(hidden,wasRunning,false),false);
  assert.equal(hidden.paused,true);
});
