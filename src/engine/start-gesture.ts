import type {Landmark} from "../core.ts";
/** Raise both hands above the shoulders briefly to start/restart a camera game. */
export const START_GESTURE_HOLD_SECONDS=0.9;
export type StartGestureState={hold:number;armed:boolean};
export function createStartGesture(armed=true):StartGestureState{return {hold:0,armed};}
export function resetStartGesture(state:StartGestureState,requireRelease=true){
  state.hold=0;state.armed=!requireRelease;
}
function reliable(p:Landmark|undefined):p is Landmark {
  return !!p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=1&&
    p.y>=0&&p.y<=1&&(p.visibility??1)>=.5&&(p.presence??1)>=.5;
}
/** Camera-normalized landmarks; independent of mirroring, hitbox scale and display mode. */
export function raisedHandsGesture(pose:readonly Landmark[]|undefined):boolean {
  if(!pose)return false;
  const ls=pose[11],rs=pose[12],lw=pose[15],rw=pose[16];
  if(![ls,rs,lw,rw].every(reliable))return false;
  // Use the higher shoulder as a conservative reference; allow normal arm lengths.
  const threshold=Math.min(ls.y,rs.y)-.035;
  return lw.y<threshold&&rw.y<threshold;
}
export function stepStartGesture(state:StartGestureState,
  pose:readonly Landmark[]|undefined,delta:number):{progress:number;triggered:boolean;needsRelease:boolean} {
  const raised=raisedHandsGesture(pose);
  if(!raised){
    state.hold=0;state.armed=true;
    return {progress:0,triggered:false,needsRelease:false};
  }
  if(!state.armed)return {progress:0,triggered:false,needsRelease:true};
  state.hold=Math.min(START_GESTURE_HOLD_SECONDS,
    state.hold+Math.max(0,Math.min(.08,Number.isFinite(delta)?delta:0)));
  const triggered=state.hold>=START_GESTURE_HOLD_SECONDS;
  if(triggered){state.armed=false;state.hold=0;}
  return {progress:triggered?1:state.hold/START_GESTURE_HOLD_SECONDS,
    triggered,needsRelease:triggered};
}
