import type {BodyPart, Point} from "../../core.ts";
import {TouchEntries} from "../../engine/touch-entry.ts";
import type {GameEvent} from "../../engine/game-feel";
import {ROUND_DURATION_SECONDS} from "../../engine/round-tempo.ts";

/** 2D camera-game physics. Positions and velocities are viewport fractions,
 * not MediaPipe z/depth measurements. dt is in seconds. */
export type SportGameId =
  | "super-goalkeeper" | "air-pingpong" | "motion-bowling"
  | "zero-g-basketball" | "fishing-master" | "i-am-gravity";
export const SPORT_GAME_IDS:readonly SportGameId[]=[
  "super-goalkeeper","air-pingpong","motion-bowling",
  "zero-g-basketball","fishing-master","i-am-gravity"
];
export type SportBall={id:number;x:number;y:number;vx:number;vy:number;r:number;age:number;charged?:boolean};
export type SportPin={x:number;y:number;vx:number;vy:number;down:boolean};
export type SportFish={id:number;x:number;y:number;vx:number};
type HandSample={x:number;y:number};
export type SportRound={
  kind:SportGameId;playing:boolean;paused:boolean;score:number;time:number;
  seq:number;stage:number;phase:number;cooldown:number;balls:SportBall[];
  pins:SportPin[];fish:SportFish[];hook:SportBall|null;hooked:number|null;
  hands:Partial<Record<BodyPart,HandSample>>;moved:Partial<Record<BodyPart,{dx:number;dy:number;speed:number}>>;
  touches:TouchEntries;
};
const clamp=(x:number,min:number,max:number)=>Math.max(min,Math.min(max,x));
const random=(lo:number,hi:number,rand:()=>number)=>lo+(hi-lo)*rand();
const circle=(b:SportBall,w:number,h:number)=>({x:b.x*w,y:b.y*h,radius:b.r*Math.min(w,h)});
const partNames:readonly BodyPart[]=["leftHand","rightHand","leftFoot","rightFoot"];
const handsOnly:readonly BodyPart[]=["leftHand","rightHand"];
const event=(r:SportRound,type:GameEvent["type"],tag:string,b:SportBall,w:number,h:number,
  basePoints=0,part?:string):GameEvent=>({
    id:"sport:"+r.kind+":"+tag+":"+(++r.seq),type,basePoints,
    position:{x:b.x*w,y:b.y*h},bodyPart:part
  });
function newBall(r:SportRound,x:number,y:number,vx:number,vy:number,size=.038):SportBall{
  return {id:++r.seq,x,y,vx,vy,r:size,age:0};
}
function newGoalShot(r:SportRound,rand:()=>number):SportBall{
  const x=random(.16,.84,rand),aim=random(.20,.80,rand);
  return newBall(r,x,.10,(aim-x)*.38,.36+rand()*.15,.04);
}
function newPongBall(r:SportRound,rand:()=>number):SportBall{
  return newBall(r,random(.25,.75,rand),.15,random(-.18,.18,rand),.32,.031);
}
export function bowlingPins():SportPin[]{
  const pins:SportPin[]=[];
  for(let row=0;row<4;row++)for(let col=0;col<=row;col++)
    pins.push({x:.5+(col-row/2)*.062,y:.22+row*.057,vx:0,vy:0,down:false});
  return pins;
}
function newFish(r:SportRound,rand:()=>number):SportFish[]{
  return Array.from({length:4},(_,i)=>({
    id:++r.seq,x:random(.18,.85,rand),
    y:.69+i*.061,vx:(i%2===0?1:-1)*random(.075,.18,rand)
  }));
}
function newPlanets(r:SportRound,rand:()=>number):SportBall[]{
  return Array.from({length:3},(_,i)=>({
    ...newBall(r,random(.16,.67,rand),random(.36,.78,rand),
      random(-.10,.10,rand),random(-.09,.09,rand),.032+i*.005),charged:false
  }));
}
export function createSportRound(kind:SportGameId,seconds=ROUND_DURATION_SECONDS,
  rand:()=>number=Math.random):SportRound{
  const r:SportRound={kind,playing:false,paused:false,score:0,time:seconds,
    seq:0,stage:0,phase:0,cooldown:0,balls:[],pins:[],fish:[],hook:null,
    hooked:null,hands:{},moved:{},touches:new TouchEntries()};
  if(kind==="super-goalkeeper")r.balls=[newGoalShot(r,rand)];
  if(kind==="air-pingpong")r.balls=[newPongBall(r,rand)];
  if(kind==="motion-bowling")r.pins=bowlingPins();
  if(kind==="fishing-master")r.fish=newFish(r,rand);
  if(kind==="i-am-gravity")r.balls=newPlanets(r,rand);
  return r;
}
/** Only real tracked displacement can activate a swat/throw/force.
 * A moving object striking a stationary body part must not score. */
export function trackSportMotion(r:SportRound,points:readonly Point[],dt:number,w:number,h:number){
  const next:SportRound["hands"]={},moved:SportRound["moved"]={};
  for(const p of points){
    if(!Number.isFinite(p.x)||!Number.isFinite(p.y))continue;
    const before=r.hands[p.part];
    if(before){
      const dx=(p.x-before.x)/w,dy=(p.y-before.y)/h;
      const pixels=Math.hypot(p.x-before.x,p.y-before.y);
      if(pixels>=Math.max(3.5,Math.min(w,h)*.007))
        moved[p.part]={dx,dy,speed:pixels/Math.max(.016,dt)};
    }
    next[p.part]={x:p.x,y:p.y};
  }
  r.hands=next;r.moved=moved;
}
function swipe(r:SportRound,points:readonly Point[],parts:readonly BodyPart[],
  minPixelsPerSecond=70):Point|undefined {
  return points.find(p=>parts.includes(p.part) &&
    (r.moved[p.part]?.speed??0)>=minPixelsPerSecond);
}
function resetRoundObject(r:SportRound){
  r.phase=0;r.cooldown=.45;r.touches.reset();
}
function reflectWalls(b:SportBall,dt:number){
  b.x+=b.vx*dt;b.y+=b.vy*dt;b.age+=dt;
  if(b.x<.055){b.x=.055;b.vx=Math.abs(b.vx)*.86;}
  if(b.x>.945){b.x=.945;b.vx=-Math.abs(b.vx)*.86;}
}
function hitMovingHand(r:SportRound,b:SportBall,points:Point[],w:number,h:number,
  parts:readonly BodyPart[]):Point|undefined{
  const touched=r.touches.contact("sport:"+b.id,points,circle(b,w,h),w,h,parts);
  return touched&&r.moved[touched.part]?touched:undefined;
}
export function stepSportRound(r:SportRound,delta:number,w:number,h:number,
  points:Point[],speed=1,rand:()=>number=Math.random):{finished:boolean;events:GameEvent[]} {
  if(!r.playing||r.paused)return {finished:false,events:[]};
  const hasPart=(part:BodyPart)=>points.some(p=>p.part===part);
  const tracked=r.kind==="super-goalkeeper"
    ?partNames.some(part=>hasPart(part))
    :r.kind==="i-am-gravity"
      ?hasPart("leftHand")&&hasPart("rightHand")
      :handsOnly.some(part=>hasPart(part));
  if(!Number.isFinite(w)||!Number.isFinite(h)||w<=0||h<=0||!tracked){
    r.hands={};r.moved={};r.touches.reset();return {finished:false,events:[]};
  }
  const dt=clamp(Number.isFinite(delta)?delta:0,0,.08);
  if(r.time<=0)return {finished:false,events:[]};
  r.time=Math.max(0,r.time-dt);
  const sim=dt*speed,events:GameEvent[]=[];
  r.phase+=sim;r.cooldown=Math.max(0,r.cooldown-sim);
  trackSportMotion(r,points,dt,w,h);
  switch(r.kind){
    case "super-goalkeeper":{
      if(!r.balls.length&&r.cooldown<=0)r.balls=[newGoalShot(r,rand)];
      for(const b of [...r.balls]){
        reflectWalls(b,sim);
        const glove=hitMovingHand(r,b,points,w,h,partNames);
        if(glove){
          events.push(event(r,"hit","save-"+b.id,b,w,h,22,glove.part));
          r.stage++;
          r.balls=[];resetRoundObject(r);
        }else if(b.y>.96){
          events.push(event(r,"miss","goal-"+b.id,b,w,h));
          r.balls=[];resetRoundObject(r);
        }
      }
      break;
    }
    case "air-pingpong":{
      if(!r.balls.length&&r.cooldown<=0)r.balls=[newPongBall(r,rand)];
      const b=r.balls[0];if(!b)break;
      reflectWalls(b,sim);
      if(b.y<.13&&b.vy<0){
        b.y=.13;b.vy=Math.abs(b.vy)*1.08;
        b.vx=clamp(b.vx+random(-.12,.12,rand),-.48,.48);
      }
      const p=b.vy>0?hitMovingHand(r,b,points,w,h,handsOnly):undefined;
      if(p){
        const motion=r.moved[p.part]!;
        b.y=clamp(b.y,.12,.88);
        b.vy=-clamp(Math.abs(b.vy)*1.035,.34,.77);
        b.vx=clamp(b.vx*.4+motion.dx/Math.max(dt,.016)*.17,-.62,.62);
        events.push(event(r,"hit","rally-"+r.stage++,b,w,h,16,p.part));
        r.touches.reset();
      }else if(b.y>.96){
        events.push(event(r,"miss","out-"+b.id,b,w,h));
        r.balls=[];resetRoundObject(r);
      }
      break;
    }
    case "motion-bowling":{
      if(!r.balls.length&&r.cooldown<=0){
        const p=swipe(r,points,handsOnly,100);
        if(p&&r.moved[p.part]!.dy<-.014 && p.y>h*.36){
          const motion=r.moved[p.part]!;
          r.balls=[newBall(r,clamp(p.x/w,.13,.87),.84,
            clamp(motion.dx/Math.max(dt,.016)*.11,-.35,.35),-.72,.038)];
          r.phase=0;r.stage++;
        }
      }
      const b=r.balls[0];
      if(b){
        reflectWalls(b,sim);
        b.vx*=Math.pow(.99,sim*60);
        for(const pin of r.pins){
          if(pin.down)continue;
          const distance=Math.hypot((b.x-pin.x)*w,(b.y-pin.y)*h);
          if(distance<(b.r+.025)*Math.min(w,h)){
            pin.down=true;pin.vx=b.vx+random(-.28,.28,rand);
            pin.vy=-random(.16,.32,rand);
            events.push(event(r,"hit","pin-"+r.stage+"-"+r.pins.indexOf(pin),b,w,h,12));
          }
        }
        // Pin-to-pin chain reaction, with damping and a visible scatter.
        for(const fallen of r.pins.filter(pin=>pin.down)){
          fallen.x+=fallen.vx*sim;fallen.y+=fallen.vy*sim;
          fallen.vx*=Math.pow(.96,sim*60);fallen.vy*=Math.pow(.96,sim*60);
          for(const pin of r.pins){
            if(pin.down||pin===fallen)continue;
            if(Math.hypot((fallen.x-pin.x)*w,(fallen.y-pin.y)*h)<.049*Math.min(w,h)){
              pin.down=true;pin.vx=fallen.vx+random(-.11,.11,rand);
              pin.vy=fallen.vy-random(.08,.16,rand);
              events.push(event(r,"hit","chain-"+r.stage+"-"+r.pins.indexOf(pin),b,w,h,12));
            }
          }
        }
        if(r.phase>3.0||b.y<-.08){
          const hits=r.pins.filter(pin=>pin.down).length;
          if(hits===10)events.push(event(r,"bonus","strike-"+r.stage,b,w,h,40));
          if(!hits)events.push(event(r,"miss","gutter-"+r.stage,b,w,h));
          r.balls=[];r.pins=bowlingPins();resetRoundObject(r);
        }
      }
      break;
    }
    case "zero-g-basketball":{
      if(!r.balls.length&&r.cooldown<=0){
        const p=swipe(r,points,handsOnly,95),move=p&&r.moved[p.part];
        if(p&&move&&move.dy<-.013&&p.y>h*.36){
          // A diagonal upward swish launches the ball; reduced gravity curves its path.
          r.balls=[newBall(r,clamp(p.x/w,.10,.9),clamp(p.y/h,.30,.86),
            clamp(move.dx/Math.max(dt,.016)*.20,-.95,.95),
            clamp(move.dy/Math.max(dt,.016)*.25,-1.05,-.34),.034)];
          r.stage++;r.phase=0;
        }
      }
      const b=r.balls[0];
      if(b){
        const previousY=b.y;
        b.vy+=.30*sim;reflectWalls(b,sim);
        if(b.y<.13){b.y=.13;b.vy=Math.abs(b.vy)*.78;}
        // Backboard and rim take some energy from the shot.
        if(b.x>.855&&b.y>.22&&b.y<.46&&b.vx>0)b.vx=-Math.abs(b.vx)*.72;
        for(const rimX of [.735,.855]){
          const dx=(b.x-rimX)*w,dy=(b.y-.39)*h;
          if(Math.hypot(dx,dy)<(b.r+.014)*Math.min(w,h) && b.vy>0){
            b.vx+=(dx<0?-.09:.09);b.vy=-Math.abs(b.vy)*.62;
          }
        }
        if(previousY<=.40&&b.y>.40&&b.vy>0&&b.x>.750&&b.x<.84){
          events.push(event(r,"perfect","basket-"+r.stage,b,w,h,35));
          r.balls=[];resetRoundObject(r);
        }else if(b.y>1.05||b.age>4.8){
          events.push(event(r,"miss","shot-"+r.stage,b,w,h));
          r.balls=[];resetRoundObject(r);
        }
      }
      break;
    }
    case "fishing-master":{
      for(const f of r.fish){
        f.x+=f.vx*sim;
        if(f.x<.09||f.x>.91){f.x=clamp(f.x,.09,.91);f.vx*=-1;}
      }
      if(!r.hook&&r.cooldown<=0){
        const p=swipe(r,points,handsOnly,105),motion=p&&r.moved[p.part];
        if(p&&motion&&p.y<h*.75&&(Math.abs(motion.dx)>.014||motion.dy<-.012)){
          r.hook=newBall(r,clamp(p.x/w,.10,.9),clamp(p.y/h,.18,.72),
            clamp(motion.dx/Math.max(dt,.016)*.22,-.58,.58),.15,.018);
          r.hooked=null;r.stage++;
        }
      }
      const hook=r.hook;
      if(hook){
        hook.vy+=.44*sim;
        reflectWalls(hook,sim);
        if(hook.y>.63){
          hook.vx*=Math.pow(.955,sim*60);
          hook.vy=clamp(hook.vy,-.65,.20);
        }
        const fish=r.fish.find(f=>f.id===r.hooked);
        if(r.hooked===null){
          const bite=r.fish.find(f=>Math.hypot((f.x-hook.x)*w,(f.y-hook.y)*h)
            <.063*Math.min(w,h));
          if(bite){r.hooked=bite.id;hook.vx=0;hook.vy=0;hook.y=bite.y;}
        }else if(fish){
          hook.x=fish.x;
          const up=swipe(r,points,handsOnly,60);
          if(up&&r.moved[up.part]!.dy<-.008)hook.y-=.40*sim;
          fish.y=hook.y;
          if(hook.y<.57){
            events.push(event(r,"collect","fish-"+fish.id,hook,w,h,26,up?.part));
            r.fish=r.fish.filter(f=>f.id!==fish.id);
            r.fish.push({id:++r.seq,x:random(.15,.85,rand),
              y:random(.72,.88,rand),vx:random(.08,.16,rand)*(rand()<.5?-1:1)});
            r.hook=null;r.hooked=null;resetRoundObject(r);
          }
        }
        if(r.hook&&(hook.age>6||hook.y>1.02)){
          events.push(event(r,"miss","empty-hook-"+r.stage,hook,w,h));
          r.hook=null;r.hooked=null;resetRoundObject(r);
        }
      }
      break;
    }
    case "i-am-gravity":{
      const goal={x:.78,y:.21,r:.065};
      for(const b of r.balls){
        for(const p of points.filter(p=>handsOnly.includes(p.part))){
          const motion=r.moved[p.part];
          if(!motion)continue;
          const dx=p.x/w-b.x,dy=p.y/h-b.y;
          const dist=Math.max(.075,Math.hypot(dx,dy)),polarity=p.part==="leftHand"?1:-1;
          const acceleration=clamp(.040/(dist*dist),0,1.2)*polarity;
          b.vx+=dx/dist*acceleration*sim;
          b.vy+=dy/dist*acceleration*sim;
          b.charged=true;
        }
        b.vx=clamp(b.vx,-.75,.75);b.vy=clamp(b.vy,-.75,.75);
        b.vx*=Math.pow(.994,sim*60);b.vy*=Math.pow(.994,sim*60);
        reflectWalls(b,sim);
        if(b.y<.11){b.y=.11;b.vy=Math.abs(b.vy)*.72;}
        if(b.y>.91){b.y=.91;b.vy=-Math.abs(b.vy)*.72;}
        if(b.charged&&Math.hypot((b.x-goal.x)*w,(b.y-goal.y)*h)<
           (b.r+goal.r)*Math.min(w,h)){
          events.push(event(r,"collect","planet-"+b.id,b,w,h,30));
          Object.assign(b,newBall(r,random(.13,.55,rand),random(.45,.82,rand),
            random(-.07,.07,rand),random(-.08,.08,rand),b.r),{charged:false});
        }
      }
      break;
    }
  }
  if(r.time<=0)r.playing=false;
  return {finished:r.time<=0,events};
}
