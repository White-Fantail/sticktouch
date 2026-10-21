/** One shared real-time arcade clock; simulation speed never consumes extra clock time. */
export const ROUND_DURATIONS=[30,45,60] as const;
export type RoundDuration=typeof ROUND_DURATIONS[number];
export const ROUND_DURATION_SECONDS:RoundDuration=45;
/** Separate legacy rulesets and each round length in personal-best records. */
export const ARCADE_RULESET_VERSION="v3-fever15-double";
export function rulesetForDuration(seconds:RoundDuration):string {
  return ARCADE_RULESET_VERSION+"-"+seconds+"s";
}
export const FINAL_RUSH_SECONDS=15;
export const FINAL_RUSH_SPEED=1.25;
export const FINAL_RUSH_SCORE_MULTIPLIER=2;
export const COUNT_IN_SECONDS=3;
/** Fever changes the simulation speed but never the remaining real time. */
export function gameplaySpeed(secondsLeft:number):number {
  return secondsLeft>0 && secondsLeft<=FINAL_RUSH_SECONDS?FINAL_RUSH_SPEED:1;
}
/** Events scored in the last frame still earn the fever multiplier. */
export function scoreMultiplier(secondsLeft:number):number {
  return secondsLeft>=0 && secondsLeft<=FINAL_RUSH_SECONDS
    ?FINAL_RUSH_SCORE_MULTIPLIER:1;
}
