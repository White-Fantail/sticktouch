/** One shared 30-second arcade clock; simulation tempo is independent of wall time. */
export const ROUND_DURATION_SECONDS=30;
export const FINAL_RUSH_SECONDS=10;
export const FINAL_RUSH_SPEED=1.25;
export const COUNT_IN_SECONDS=3;
/** Final rush does not accelerate the countdown. */
export function gameplaySpeed(secondsLeft:number):number {
  return secondsLeft>0 && secondsLeft<=FINAL_RUSH_SECONDS?FINAL_RUSH_SPEED:1;
}
