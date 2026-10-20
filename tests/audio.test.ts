import test from "node:test";
import assert from "node:assert/strict";
import {AudioManager,volumeToGain} from "../src/engine/audio.ts";

class FakeParam {
  value=1;
  targets:number[]=[];
  setTargetAtTime(value:number){this.value=value;this.targets.push(value);}
  setValueAtTime(value:number){this.value=value;this.targets.push(value);}
  exponentialRampToValueAtTime(value:number){this.value=value;}
  cancelScheduledValues(){}
}
class FakeGain {
  gain=new FakeParam();
  connect(){}
  disconnect(){}
}
class FakeOscillator {
  frequency={value:0};
  type="sine";
  onended: (()=>void)|null=null;
  connect(){}
  disconnect(){}
  start(){}
  stop(){}
}
class FakeAudioContext {
  static latest:FakeAudioContext;
  currentTime=1;
  state="running";
  destination={};
  gains:FakeGain[]=[];
  oscillators:FakeOscillator[]=[];
  constructor(){FakeAudioContext.latest=this;}
  createGain(){const result=new FakeGain();this.gains.push(result);return result;}
  createOscillator(){const result=new FakeOscillator();this.oscillators.push(result);return result;}
  resume(){return Promise.resolve();}
  close(){this.state="closed";return Promise.resolve();}
}
test("audio channel gain changes immediately with shared user preferences",()=>{
  const before=Object.getOwnPropertyDescriptor(globalThis,"window");
  Object.defineProperty(globalThis,"window",{
    value:{AudioContext:FakeAudioContext},configurable:true
  });
  try{
    const audio=new AudioManager();
    audio.setPreferences({musicEnabled:true,sfxEnabled:true,musicVolume:35,sfxVolume:65});
    audio.start("pop");
    const ctx=FakeAudioContext.latest;
    assert.equal(ctx.gains[0].gain.value,volumeToGain(35,"music"));
    assert.equal(ctx.gains[1].gain.value,volumeToGain(65,"sfx"));
    audio.setPreferences({musicEnabled:true,sfxEnabled:true,musicVolume:95,sfxVolume:15});
    assert.equal(ctx.gains[0].gain.value,volumeToGain(95,"music"));
    assert.equal(ctx.gains[1].gain.value,volumeToGain(15,"sfx"));
    audio.pause();
    assert.equal(ctx.gains[0].gain.value,0);
    // A preview should work during settings pause without restarting the BGM.
    audio.previewMusic("pop");
    assert.ok(ctx.gains[2].gain.targets.includes(volumeToGain(95,"music")));
    const beforePreview=ctx.oscillators.length;
    audio.previewSfx();
    assert.ok(ctx.oscillators.length>beforePreview);
    audio.resume();
    assert.equal(ctx.gains[0].gain.value,volumeToGain(95,"music"));
    audio.setPreferences({musicEnabled:false,sfxEnabled:false,musicVolume:95,sfxVolume:15});
    assert.equal(ctx.gains[0].gain.value,0);
    assert.equal(ctx.gains[1].gain.value,0);
    audio.destroy();
    assert.equal(ctx.state,"closed");
  }finally{
    if(before)Object.defineProperty(globalThis,"window",before);
    else Reflect.deleteProperty(globalThis,"window");
  }
});
