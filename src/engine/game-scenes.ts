import type {Landmark,Point,Viewport} from "../core";
import type {DisplayMode} from "../settings/settings";
import {paint} from "./renderer";
import {fruitCameraBox,fruitCatchY} from "../games/fruit-catch/game";
import {poseTarget,POSE_HOLD_SECONDS,type PoseName} from "../games/pose-challenge/game";
import type {GameRound} from "../games/runtime";
import {paintMiniScene} from "../games/mini-arcade/scene";
import {paintAdvancedScene} from "../games/advanced-arcade/scene";
import {paintExpertScene} from "../games/expert-arcade/scene";

export function paintGameScene(ctx:CanvasRenderingContext2D,video:HTMLVideoElement,
  pose:Landmark[]|undefined,points:Point[],view:Viewport,round:GameRound,
  mode:DisplayMode,rings:boolean,width:number,height:number){
  switch(round.kind){
    case "balloon-pop":
      paint(ctx,video,pose,round.state.balls,points,view,mode,rings);return;
    case "fruit-catch":
      paintFruitScene(ctx,video,pose,points,view,round.state,mode,rings,width,height);return;
    case "pose-challenge":
      paint(ctx,video,pose,[],points,view,mode,rings);
      paintPoseGuide(ctx,round.state,width,height);return;
    case "mole-whack":case "color-match":case "star-hunt":case "meteor-dodge":case "freeze-dance":
      paint(ctx,video,pose,[],points,view,mode,rings);
      paintMiniScene(ctx,round.state,width,height);return;
    case "rhythm-pads":case "shield-guard":case "memory-sequence":case "laser-lane":case "parcel-sort":
      paint(ctx,video,pose,[],points,view,mode,rings);
      paintAdvancedScene(ctx,round.state,width,height);return;
    case "boss-raid":case "gravity-lab":case "shadow-sync":case "constellation-trace":case "dual-portals":
      paint(ctx,video,pose,[],points,view,mode,rings);
      paintExpertScene(ctx,round.state,width,height);return;
  }
}
type FruitState=Extract<GameRound,{kind:"fruit-catch"}>["state"];
function paintFruitScene(ctx:CanvasRenderingContext2D,video:HTMLVideoElement,pose:Landmark[]|undefined,
  points:Point[],view:Viewport,round:FruitState,mode:DisplayMode,rings:boolean,
  width:number,height:number){
  const sky=ctx.createLinearGradient(0,0,0,height);
  sky.addColorStop(0,"#193959");sky.addColorStop(.7,"#122a3d");sky.addColorStop(1,"#0d1829");
  ctx.fillStyle=sky;ctx.fillRect(0,0,width,height);
  const line=fruitCatchY(height),box=fruitCameraBox(width,height);
  ctx.strokeStyle="#73d8b64d";ctx.lineWidth=2;
  ctx.setLineDash([8,10]);ctx.beginPath();ctx.moveTo(0,line+7);ctx.lineTo(width,line+7);ctx.stroke();ctx.setLineDash([]);
  ctx.save();
  ctx.beginPath();ctx.roundRect(box.x-3,box.y-3,box.width+6,box.height+6,12);
  ctx.clip();ctx.translate(box.x,box.y);
  paint(ctx,video,pose,[],points,view,mode,rings);
  ctx.restore();
  ctx.strokeStyle="#78e5bc";ctx.lineWidth=3;
  ctx.beginPath();ctx.roundRect(box.x-3,box.y-3,box.width+6,box.height+6,12);ctx.stroke();
  ctx.textAlign="center";ctx.textBaseline="middle";
  ctx.font="bold 13px system-ui";ctx.fillStyle="#b6fbe5";
  ctx.fillText("CAMERA · 손으로 이동",width/2,box.y-13);
  for(const fruit of round.fruits){
    const symbol=fruit.kind==="bomb"?"💣":fruit.kind==="apple"?"🍎":fruit.kind==="orange"?"🍊":"🫐";
    ctx.shadowColor=fruit.kind==="bomb"?"#ff7070":"#f9cc74";ctx.shadowBlur=9;
    ctx.font=Math.round(fruit.radius*2.25)+"px sans-serif";
    ctx.fillText(symbol,fruit.x,fruit.y);
    ctx.shadowBlur=0;
  }
  const bx=round.basketX||width/2, r=Math.max(24,Math.min(76,width*.105));
  ctx.save();ctx.translate(bx,line+4);
  ctx.shadowColor="#ffd58a";ctx.shadowBlur=12;
  ctx.fillStyle=round.hasControl?"#dfaa61":"#9c92a1";
  ctx.strokeStyle="#ffeda9";ctx.lineWidth=3;
  ctx.beginPath();ctx.moveTo(-r,-8);ctx.lineTo(r,-8);ctx.lineTo(r*.72,24);ctx.quadraticCurveTo(0,32,-r*.72,24);ctx.closePath();
  ctx.fill();ctx.stroke();ctx.shadowBlur=0;
  ctx.beginPath();ctx.moveTo(-r,-8);ctx.lineTo(r,-8);ctx.stroke();
  ctx.restore();
  if(!round.hasControl&&round.playing&&!round.paused){
    ctx.font="bold 16px system-ui";ctx.fillStyle="#ffe7a3";ctx.fillText("✋ 손을 보여주면 계속됩니다",width/2,line-37);
  }
}
type PoseState=Extract<GameRound,{kind:"pose-challenge"}>["state"];
type XY=[number,number];
function paintPoseGuide(ctx:CanvasRenderingContext2D,round:PoseState,width:number,height:number) {
  const target=poseTarget(round);
  const w=Math.min(166,Math.max(112,width*.31)),h=Math.min(224,height*.51);
  const x=width-w-12,y=Math.max(74,height-h-12);
  ctx.save();
  ctx.fillStyle="#061d30e0";ctx.strokeStyle="#79edc5a8";ctx.lineWidth=2;
  ctx.beginPath();ctx.roundRect(x,y,w,h,13);ctx.fill();ctx.stroke();
  ctx.textAlign="center";ctx.fillStyle="#e8fff7";ctx.font="bold 14px system-ui";
  ctx.fillText(target.label,x+w/2,y+25);
  ctx.font="11px system-ui";ctx.fillStyle="#b8d5e5";
  ctx.fillText(target.instruction.slice(0,18),x+w/2,y+43);
  ctx.translate(x+w*.22,y+48);
  const gw=w*.56,gh=h*.65;
  drawGoalFigure(ctx,target.id,gw,gh);
  ctx.translate(-x-w*.22,-y-48);
  const meter=Math.min(1,round.hold/POSE_HOLD_SECONDS);
  ctx.fillStyle="#29435a";ctx.fillRect(x+13,y+h-23,w-26,8);
  ctx.fillStyle="#8ff7c7";ctx.fillRect(x+13,y+h-23,(w-26)*meter,8);
  ctx.textAlign="right";ctx.font="bold 10px system-ui";ctx.fillStyle="#bbd7e5";
  ctx.fillText(Math.max(0,Math.ceil(8-round.targetTime))+"s",x+w-11,y+h-33);
  ctx.restore();
}
function drawGoalFigure(ctx:CanvasRenderingContext2D,pose:PoseName,w:number,h:number){
  const at=(xy:XY):XY=>[xy[0]*w,xy[1]*h];
  const draw=(from:XY,to:XY)=>{
    const a=at(from),b=at(to);ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke();
  };
  ctx.strokeStyle="#a7f7e0";ctx.lineWidth=Math.max(3,w*.055);ctx.lineCap="round";ctx.lineJoin="round";
  ctx.beginPath();ctx.arc(w*.5,h*.15,w*.11,0,Math.PI*2);ctx.stroke();
  draw([.5,.26],[.5,.63]);
  const lShoulder:XY=[.39,.34],rShoulder:XY=[.61,.34];
  let lArm:XY=[.11,.72],rArm:XY=[.89,.72];
  let lLeg:XY=[.34,.98],rLeg:XY=[.66,.98];
  switch(pose){
    case "arms-up":lArm=[.18,.02];rArm=[.82,.02];break;
    case "t-pose":lArm=[.02,.34];rArm=[.98,.34];break;
    case "hands-hips":lArm=[.34,.62];rArm=[.66,.62];break;
    case "one-arm-up":lArm=[.17,.02];rArm=[.8,.76];break;
    case "star":lArm=[.03,.02];rArm=[.97,.02];lLeg=[.13,.98];rLeg=[.87,.98];break;
  }
  draw(lShoulder,lArm);draw(rShoulder,rArm);
  draw([.5,.63],lLeg);draw([.5,.63],rLeg);
}
