# Whole-body response & movement games

These 11 original StickTouch concepts are implemented in src/games/body-arcade/game.ts
and have canvas overlays in src/games/body-arcade/scene.ts.

| No. | ID | Name | Gameplay |
| --- | --- | --- | --- |
| 04 | bomb-defusal | 폭탄 해체반 | Hands and feet press indicated switches in order |
| 11 | human-tetris | 휴먼 테트리스 | Change and hold silhouette before incoming wall |
| 14 | left-right-brain | 좌뇌 우뇌 | Execute separate simultaneous left/right arm commands |
| 24 | ninja-training | 닌자 트레이닝 | Strike target, then dodge by crouching or leaning |
| 25 | volcano-escape | 화산 탈출 | Jump over lava and squat under falling ash |
| 26 | trick-teacher | 선생님을 속여라 | Follow genuine instructions, reject false ones |
| 27 | do-opposite | 반대로 해! | Perform the opposite arm commands |
| 28 | weird-yoga | 이상한 요가 | Sustain five distinct yoga-like poses |
| 31 | balance-tower | 밸런스 타워 | Lean and stabilize to stack blocks |
| 33 | perfect-symmetry | 완벽한 대칭 | Mirror both arms and sustain equal positions |
| 35 | intruder-alarm | 침입자 경보 | Hold foot switch while opposite hand opens lock |

## Architecture and interaction guarantees

- All games are listed as available in the shared registry. The recommended round is 60 seconds, with existing 30/45/60 duration options available.
- The existing webcam-based skeleton tracker, rendering modes, gesture countdown, GameFeel event system, effects, audio, pause, replay and score sharing are reused without new dependencies.
- A complete visible full-body skeleton is required. Loss of landmark confidence or user pause freezes both timer and game simulation.
- Touch targets follow shared TouchEntries outside-to-inside rules; overlap on spawn never counts. Static poses must first be unmatched, then held in a correct new position.
- All scoring is reported through unique platform GameEvent IDs and is handled centrally rather than modifying score inside a game.
- Fast finale speed follows the shared round-tempo module.
- Logic has deterministic unit coverage in tests/body-arcade.test.ts. Actual phone and webcam movement testing remains necessary for physical calibration.

## Manual acceptance checklist

Check all 11 games on desktop and mobile with head, arms, knees and feet in frame; start while overlapping a target, move out and back in, complete a challenge, perform a wrong gesture, test pause/resume, and briefly leave camera view. For volcano jump detection, keep enough vertical camera framing to show feet leaving the ground; avoid slippery floors.
