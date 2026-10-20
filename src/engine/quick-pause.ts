/** Separate "settings pause" from manual pause, so closing the dialog never resumes a user-paused game. */
export type PausableGame={playing:boolean;paused:boolean};
export function pauseForSettings(game:PausableGame):boolean{
  const resumeWhenClosed=game.playing&&!game.paused;
  if(game.playing)game.paused=true;
  return resumeWhenClosed;
}
export function restoreAfterSettings(game:PausableGame,resumeWhenClosed:boolean,visible:boolean):boolean{
  if(!resumeWhenClosed||!visible||!game.playing)return false;
  game.paused=false;
  return true;
}
