import type {GameStats} from "./game-feel";
export type GameRecord = {
  gameId:string; ruleset:string; score:number; maxCombo:number; successes:number;
  misses:number; accuracy:number; playedAt:string; hitbox:number;
};
const KEY="sticktouch:records:v1";
/** Private browsing fallback; never sent to a server. */
let sessionRecords:Record<string,GameRecord>={};
export function recordKey(gameId:string,ruleset:string,hitbox=100){return gameId+"@"+ruleset+"#hitbox-"+hitbox;}
function load():Record<string,GameRecord>{
  try{
    const raw=localStorage.getItem(KEY);
    const data=raw?JSON.parse(raw):{};
    return {...sessionRecords,...(data&&typeof data==="object"&&!Array.isArray(data)?data:{})};
  }catch{return {...sessionRecords};}
}
export function getBestRecord(gameId:string,ruleset="v1",hitbox=100):GameRecord|null{
  const r=load()[recordKey(gameId,ruleset,hitbox)];
  return r&&typeof r.score==="number"&&Number.isFinite(r.score)?r:null;
}
export function saveBestRecord(gameId:string,ruleset:string,stats:GameStats,hitbox:number):
  {record:GameRecord|null;isNew:boolean}{
  const previous=getBestRecord(gameId,ruleset,hitbox);
  if(stats.score<=0|| (previous&&previous.score>=stats.score))return {record:previous,isNew:false};
  const record:GameRecord={gameId,ruleset,score:stats.score,maxCombo:stats.maxCombo,
    successes:stats.successes,misses:stats.misses,accuracy:stats.accuracy,
    playedAt:new Date().toISOString(),hitbox};
  sessionRecords[recordKey(gameId,ruleset,hitbox)]=record;
  try{localStorage.setItem(KEY,JSON.stringify({...load(),[recordKey(gameId,ruleset,hitbox)]:record}));}
  catch{/* In-memory game results remain available when storage is disabled. */}
  return {record,isNew:true};
}
