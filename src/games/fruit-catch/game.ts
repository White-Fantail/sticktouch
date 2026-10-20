import type {GameEvent} from "../../engine/game-feel";

export type Fruit = {id:number; x:number; y:number; radius:number; speed:number; kind:"apple"|"orange"|"berry"|"bomb"};
export type FruitRound = {
  playing:boolean; paused:boolean; score:number; time:number;
  spawning:number; seq:number; fruits:Fruit[]; basketX:number; hasControl:boolean;
};
export const FRUIT_DURATION_SECONDS=60;

/** The entire camera image stays visible in this smaller, bottom-center inset. */
export function fruitCameraBox(width:number,height:number) {
  const w=Math.min(width*0.85,height*0.88);
  const h=height*0.28;
  return {x:(width-w)/2,y:height-h-7,width:w,height:h};
}
export function fruitCatchY(height:number) {return height*0.67;}
export function createFruitRound(seconds=FRUIT_DURATION_SECONDS):FruitRound {
  return {playing:false,paused:false,score:0,time:seconds,spawning:0.72,seq:0,
    fruits:[],basketX:0,hasControl:false};
}
/** inputX is the normalized horizontal position of one or both tracked palms.
 * Null means tracking was lost: do not advance time or punish the player. */
export function stepFruitRound(round:FruitRound,delta:number,width:number,height:number,inputX:number|null,
  rand:()=>number=Math.random):{finished:boolean;events:GameEvent[]} {
  if(!round.playing||round.paused)return {finished:false,events:[]};
  round.hasControl=inputX!==null&&Number.isFinite(inputX);
  if(!round.hasControl)return {finished:false,events:[]};
  const dt=Math.max(0,Math.min(0.08,delta));
  const line=fruitCatchY(height);
  const basketRadius=Math.max(24,Math.min(76,width*0.105));
  round.basketX=Math.max(basketRadius,Math.min(width-basketRadius,(inputX as number)*width));
  round.time=Math.max(0,round.time-dt);
  round.spawning+=dt;
  const interval=Math.max(0.68,1.15-(60-round.time)*0.004);
  if(round.spawning>=interval&&round.time>0) {
    round.spawning-=interval;
    const radius=Math.max(12,Math.min(25,width*0.035));
    const raw=rand();
    const kind:Fruit["kind"]=round.time<45&&raw<0.17?"bomb":raw<0.44?"apple":raw<0.73?"orange":"berry";
    round.fruits.push({id:++round.seq,kind,
      x:radius+rand()*Math.max(0,width-2*radius),y:-radius,
      radius,speed:Math.max(105,height*0.32)+(60-round.time)*0.75+rand()*25});
  }
  const events:GameEvent[]=[];
  const rest:Fruit[]=[];
  for(const fruit of round.fruits){
    fruit.y+=fruit.speed*dt;
    if(fruit.y+fruit.radius<line){rest.push(fruit);continue;}
    const caught=Math.abs(fruit.x-round.basketX)<=basketRadius+fruit.radius*0.55;
    if(caught){
      events.push({id:"fruit:"+fruit.id,type:fruit.kind==="bomb"?"damage":"collect",
        targetId:String(fruit.id),basePoints:fruit.kind==="berry"?15:10,
        position:{x:fruit.x,y:line},color:fruit.kind==="bomb"?"#ff7979":"#ffe092"});
    }else if(fruit.kind!=="bomb"){
      events.push({id:"fruit:miss:"+fruit.id,type:"miss",targetId:String(fruit.id),
        position:{x:fruit.x,y:line}});
    }
  }
  round.fruits=rest;
  if(round.time<=0)round.playing=false;
  return {finished:round.time<=0,events};
}
