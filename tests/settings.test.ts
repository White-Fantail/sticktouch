import assert from "node:assert/strict";
import test from "node:test";
import {DEFAULT_SETTINGS, normalizeSettings} from "../src/settings/settings.ts";

test("invalid or missing settings fall back to safe defaults", () => {
  assert.deepEqual(normalizeSettings(null), DEFAULT_SETTINGS);
  assert.deepEqual(normalizeSettings({mode:"invalid", hitbox: "100", rings: "false"}), DEFAULT_SETTINGS);
});
test("settings are clamped and persisted fields remain typed", () => {
  const s = normalizeSettings({mode:"stickman",rings:false,preciseHands:false,hitbox:321,
    side:"environment",diagnostics:true});
  assert.deepEqual(s,{...DEFAULT_SETTINGS,mode:"stickman",rings:false,preciseHands:false,hitbox:200,side:"environment",diagnostics:true});
  assert.equal(normalizeSettings({hitbox:64}).hitbox, 60);
  assert.equal(normalizeSettings({hitbox:-999}).hitbox, 50);
});
test("unknown keys cannot override saved defaults", () => {
  const result = normalizeSettings({rings:false,other:"unexpected"});
  assert.equal(result.rings,false);
  assert.equal("other" in result,false);
});

test("older saved settings gain safe audio defaults, while custom settings are clamped",()=>{
  const legacy=normalizeSettings({rings:false});
  assert.equal(legacy.musicEnabled,true);
  assert.equal(legacy.sfxEnabled,true);
  assert.equal(legacy.effectsQuality,"full");
  const custom=normalizeSettings({musicEnabled:false,sfxEnabled:false,
    musicVolume:110,sfxVolume:-5,effectsQuality:"light"});
  assert.equal(custom.musicVolume,100);
  assert.equal(custom.sfxVolume,0);
  assert.equal(custom.effectsQuality,"light");
  assert.equal(custom.musicEnabled,false);
});
