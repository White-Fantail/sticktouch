# StickTouch Game Feel Engine

Implementation status (2026-10-21): first shared runtime integrated into the balloon-pop game on dev. This document distinguishes current functionality from next-game expansion.

## Objective and boundaries

A game module recognizes valid actions and emits domain events. The platform controls rewards (score/combo), feedback (SFX, BGM, particles, messages), HUD, result summaries, and locally saved personal bests. No change to camera mapping, pose tracking, or hit detection is required. Audio and visuals must not block camera inference.

## Modules

- src/engine/game-feel.ts: GameFeelSession and GameEvent; duplicate event IDs and repeated success on the same target are rejected. Successful actions increase the combo, miss/damage reset it, and bonus grants points without changing combo.
- src/engine/audio.ts: Web Audio API synthesized BGM and SFX, music/SFX volume gains, start on user click, pause/resume, finish cue, and cleanup. This MVP does not bundle copyrighted background tracks.
- src/engine/effects.ts: bounded Canvas particles, floating score feedback, combo milestone banners, full/light/off quality selection.
- src/engine/records.ts: browser-local personal best indexed by game ID, ruleset version, and hitbox multiplier, including score, combo and attempts.
- src/games/balloon-pop/game.ts: pure balloon game emits hit and miss domain events while retaining hit detection in src/core.ts.
- src/components/GameStage.tsx: adapts game events to feedback, maintains common score/time/combo HUD, audio quick mute, and rich result display.
- src/settings/settings.ts and src/pages/SettingsPage.tsx: independent BGM, SFX, volume and effect quality preferences.

## GameEvent contract

Fields: id (required stable event identifier), type (hit/collect/perfect/good/miss/damage/bonus), targetId (optional object identifier for one-success-per-target), basePoints (optional), position (optional game-space 2D location), color and bodyPart (optional). GameFeelSession.dispatch yields the total score, awarded points, combo, multiplier and milestone, or null for duplicate input.

Default scores: +10 base for successful hit; 1–4 combo ×1.0, 5–9 ×1.2, 10–19 ×1.5, 20+ ×2.0. Profiles are configurable per game. No tracking loss should be scored as a miss; only an explicit game-rule failure creates the miss event. The balloon game emits a miss when an object actually leaves the playfield. Any scoreboard recording future competitive comparisons should account for hitbox/assist settings.

## Lifecycle

1. User starts the camera (no audio unlock).
2. User clicks Game Start; reset score/effects; create or resume Web Audio, start musical sequence, play start cue.
3. Each game tick gathers semantic game events and dispatches them once, updates score/combo/UI, queues SFX/particles. Renderer composites effects over camera, stickman and objects.
4. Pause or backgrounding freezes the timer and suppresses new BGM scheduling. Resume continues.
5. End of round stops music, plays completion cue, updates local personal best and renders result stats.
6. Restart resets transient event dedupe and game state; camera shutdown disposes audio/tracking.

## Verification

Unit tests: tests/game-feel.test.ts, tests/balloon-round.test.ts, tests/settings.test.ts, tests/records.test.ts. Run npm run check, npm run test, npm run build. On actual iOS Safari, Android Chrome and desktop browsers verify audio unlock, quick mute, tab pause/resume, sustained FPS, lifecycle cleanup, and Canvas performance at each effects quality level.

## Future development

Move balloon-specific round state fully behind a GameModule interface when implementing other games. Add profile registration to the game registry, score-rule versioning, game-specific licensed BGM and sounds, mission HUD, accessibility/reduced-motion options, and adaptive particle budgets. These improvements are not implemented in the initial integration.

## Development policy

Only commit feature work to dev. Do not merge to main without user request; strict fast-forward only.
