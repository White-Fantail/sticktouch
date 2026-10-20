import type {EffectsQuality} from "../engine/effects";
export type DisplayMode = "camera" | "both" | "stickman";
export type CameraSide = "user" | "environment";
export interface AppSettings {
  mode: DisplayMode;
  rings: boolean;
  preciseHands: boolean;
  hitbox: number;
  side: CameraSide;
  diagnostics: boolean;
  musicEnabled: boolean;
  sfxEnabled: boolean;
  musicVolume: number;
  sfxVolume: number;
  effectsQuality: EffectsQuality;
}
export const SETTINGS_KEY = "sticktouch:settings:v1";
export const DEFAULT_SETTINGS: AppSettings = {
  mode: "both", rings: true, preciseHands: true,
  hitbox: 100, side: "user", diagnostics: false,
  musicEnabled: true, sfxEnabled: true, musicVolume: 55, sfxVolume: 65,
  effectsQuality: "full"
};
function volume(input:unknown,fallback:number):number {
  return typeof input==="number"&&Number.isFinite(input)
    ? Math.min(100,Math.max(0,Math.round(input/5)*5)):fallback;
}
export function normalizeSettings(input: unknown): AppSettings {
  if (!input || typeof input !== "object") return {...DEFAULT_SETTINGS};
  const value = input as Record<string, unknown>;
  return {
    mode: value.mode === "camera" || value.mode === "both" || value.mode === "stickman" ? value.mode : DEFAULT_SETTINGS.mode,
    rings: typeof value.rings === "boolean" ? value.rings : DEFAULT_SETTINGS.rings,
    preciseHands: typeof value.preciseHands === "boolean" ? value.preciseHands : DEFAULT_SETTINGS.preciseHands,
    hitbox: typeof value.hitbox === "number" && Number.isFinite(value.hitbox)
      ? Math.round(Math.min(200, Math.max(50, value.hitbox)) / 10) * 10 : DEFAULT_SETTINGS.hitbox,
    side: value.side === "user" || value.side === "environment" ? value.side : DEFAULT_SETTINGS.side,
    diagnostics: typeof value.diagnostics === "boolean" ? value.diagnostics : DEFAULT_SETTINGS.diagnostics,
    musicEnabled:typeof value.musicEnabled==="boolean"?value.musicEnabled:DEFAULT_SETTINGS.musicEnabled,
    sfxEnabled:typeof value.sfxEnabled==="boolean"?value.sfxEnabled:DEFAULT_SETTINGS.sfxEnabled,
    musicVolume:volume(value.musicVolume,DEFAULT_SETTINGS.musicVolume),
    sfxVolume:volume(value.sfxVolume,DEFAULT_SETTINGS.sfxVolume),
    effectsQuality:value.effectsQuality==="full"||value.effectsQuality==="light"||value.effectsQuality==="off"
      ?value.effectsQuality:DEFAULT_SETTINGS.effectsQuality
  };
}
export function readSettings(): AppSettings {
  try { return normalizeSettings(JSON.parse(window.localStorage.getItem(SETTINGS_KEY) ?? "null")); }
  catch { return {...DEFAULT_SETTINGS}; }
}
export function saveSettings(settings: AppSettings): void {
  try { window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }
  catch { /* Private browsing or disabled storage: settings still work in memory. */ }
}
