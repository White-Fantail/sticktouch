/** Shared, deterministic scoring layer. Game modules emit events, not UI or audio calls. */
export type GameEventType = "hit"|"collect"|"perfect"|"good"|"miss"|"damage"|"bonus";
export type FeedbackPosition = {x:number; y:number};
export type GameEvent = {
  id:string; type:GameEventType; targetId?:string; time?:number;
  basePoints?:number; position?:FeedbackPosition; color?:string;
  bodyPart?:string;
};
export type GameFeelProfile = {
  basePoints:number;
  comboTiers:readonly {at:number; multiplier:number}[];
};
export const DEFAULT_FEEL_PROFILE:GameFeelProfile = {
  basePoints:10,
  comboTiers:[{at:1,multiplier:1},{at:5,multiplier:1.2},
    {at:10,multiplier:1.5},{at:20,multiplier:2}]
};
export type GameFeedback = GameEvent & {
  points:number; score:number; combo:number; multiplier:number; milestone:boolean;
};
export type GameStats = {
  score:number; combo:number; maxCombo:number; successes:number; misses:number;
  accuracy:number; processed:number;
};
const successTypes:readonly GameEventType[]=["hit","collect","perfect","good"];
function positiveNumber(value:number|undefined, fallback:number) {
  return value !== undefined && Number.isFinite(value) ? Math.max(0,value) : fallback;
}
export function comboMultiplier(combo:number, profile:GameFeelProfile=DEFAULT_FEEL_PROFILE) {
  return profile.comboTiers.reduce((factor,tier)=>combo>=tier.at?tier.multiplier:factor,1);
}
export class GameFeelSession {
  private ids=new Set<string>();
  private targets=new Set<string>();
  private currentScore=0;
  private currentCombo=0;
  private peakCombo=0;
  private hitCount=0;
  private missCount=0;
  private readonly profile:GameFeelProfile;
  constructor(profile:GameFeelProfile=DEFAULT_FEEL_PROFILE) {this.profile=profile;}
  dispatch(event:GameEvent):GameFeedback|null {
    if(!event.id || this.ids.has(event.id))return null;
    const success=successTypes.includes(event.type);
    if(success && event.targetId && this.targets.has(event.targetId))return null;
    this.ids.add(event.id);
    if(success && event.targetId)this.targets.add(event.targetId);
    let points=0, milestone=false;
    if(success){
      this.currentCombo++;
      this.peakCombo=Math.max(this.peakCombo,this.currentCombo);
      this.hitCount++;
      milestone=this.profile.comboTiers.some(t=>t.at>1&&t.at===this.currentCombo);
      points=Math.round(positiveNumber(event.basePoints,this.profile.basePoints)*comboMultiplier(this.currentCombo,this.profile));
    }else if(event.type==="bonus"){
      points=Math.round(positiveNumber(event.basePoints,this.profile.basePoints));
    }else{
      this.missCount++;
      this.currentCombo=0;
    }
    this.currentScore+=points;
    return {...event,points,score:this.currentScore,combo:this.currentCombo,
      multiplier:comboMultiplier(this.currentCombo,this.profile),milestone};
  }
  get stats():GameStats {
    const attempts=this.hitCount+this.missCount;
    return {score:this.currentScore,combo:this.currentCombo,maxCombo:this.peakCombo,
      successes:this.hitCount,misses:this.missCount,
      accuracy:attempts?Math.round(this.hitCount/attempts*100):0,processed:this.ids.size};
  }
  reset(){
    this.ids.clear();this.targets.clear();this.currentScore=0;this.currentCombo=0;
    this.peakCombo=0;this.hitCount=0;this.missCount=0;
  }
}
