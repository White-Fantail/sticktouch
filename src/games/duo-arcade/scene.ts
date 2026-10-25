import type {Viewport} from "../../core.ts";
import type {PlayerFrame} from "../../tracking/multiplayer.ts";
import type {DuoRound} from "./game.ts";
import {armSignature,paddleY,powerTargets} from "./game.ts";
import {paintRedLightScene,paintRopeScene} from "./motion-scenes.ts";

const COLORS={p1:"#7ef3d7",p2:"#ffabdf"} as const;
function text(ctx:CanvasRenderingContext2D,msg:string,x:number,y:number,size=17,color="#effffa"){
  ctx.font="800 "+size+"px system-ui";ctx.textAlign="center";ctx.textBaseline="middle";
  ctx.fillStyle="#08192a";ctx.fillText(msg,x+1,y+2);ctx.fillStyle=color;ctx.fillText(msg,x,y);
}
function orb(ctx:CanvasRenderingContext2D,x:number,y:number,r:number,color:string){
  ctx.save();ctx.shadowColor=color;ctx.shadowBlur=17;ctx.lineWidth=3;ctx.strokeStyle=color;
  ctx.fillStyle="#162a46de";ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore();
}
function progress(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,pct:number){
  ctx.fillStyle="#23344a";ctx.fillRect(x,y,w,8);
  ctx.fillStyle="#91ffdb";ctx.fillRect(x,y,w*Math.min(1,pct),8);
}
export function paintDuoScene(ctx:CanvasRenderingContext2D,r:DuoRound,
  players:readonly [PlayerFrame,PlayerFrame],view:Viewport){
  const w=view.width,h=view.height,u=Math.min(w,h);
  ctx.save();
  const top=Math.max(78,h*.19);
  switch(r.kind){
    case "red-light-green-light":paintRedLightScene(ctx,r,view);break;
    case "jump-rope-duel":paintRopeScene(ctx,r,players,view);break;
    case "co-op-power-plant":{
      const targets=powerTargets(r.round);
      ctx.strokeStyle="#69a5c952";ctx.lineWidth=5;
      ctx.beginPath();ctx.moveTo(targets[0].x*w,targets[0].y*h);
      ctx.lineTo(w*.5,h*.57);ctx.lineTo(targets[1].x*w,targets[1].y*h);ctx.stroke();
      orb(ctx,w*.5,h*.57,u*.06,"#ffe087");
      targets.forEach((t,i)=>{
        const color=i===0?COLORS.p1:COLORS.p2;
        orb(ctx,t.x*w,t.y*h,u*.075,color);
        text(ctx,"P"+(i+1),t.x*w,t.y*h,15,color);
      });
      progress(ctx,w*.36,h*.76,w*.28,r.hold/.7);
      text(ctx,"발전량 "+r.round+"단계",w*.5,top,18);
      break;
    }
    case "shadow-sword":{
      ctx.strokeStyle="#ffdd925c";ctx.lineWidth=2;ctx.setLineDash([8,9]);
      ctx.beginPath();ctx.arc(w*.5,h*.5,u*.12,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
      orb(ctx,w*.5,h*.5,u*.08,r.leader==="p1"?COLORS.p1:COLORS.p2);
      text(ctx,"⚔",w*.5,h*.5,Math.max(26,u*.055));
      const px=r.leader==="p1"?.24:.76;
      text(ctx,r.leader.toUpperCase()+" 공격",w*px,top,19,COLORS[r.leader]);
      text(ctx,(r.leader==="p1"?"P2":"P1")+" 방어",w*(1-(r.leader==="p1"?.24:.76)),top,19);
      progress(ctx,w*.34,h*.82,w*.32,1-r.phaseTime/3.5);
      break;
    }
    case "mirror-challenge":{
      const current=r.leader;
      text(ctx,current.toUpperCase()+" 리더",w*.28,top,17,COLORS[current]);
      text(ctx,(current==="p1"?"P2":"P1")+" 미러",w*.72,top,17,COLORS[current==="p1"?"p2":"p1"]);
      ctx.strokeStyle="#bfe4ff65";ctx.lineWidth=2;ctx.setLineDash([6,9]);
      ctx.beginPath();ctx.moveTo(w*.5,h*.25);ctx.lineTo(w*.5,h*.85);ctx.stroke();ctx.setLineDash([]);
      if(r.pattern){
        const pattern=r.pattern,fx=w*.70,fy=h*.39,span=u*.12;
        ctx.lineWidth=6;ctx.lineCap="round";ctx.strokeStyle="#f5b8fd";
        const shoulders=[{x:fx-span*.55,y:fy},{x:fx+span*.55,y:fy}];
        const left={x:fx+pattern[0]*span,y:fy+pattern[1]*span};
        const right={x:fx+pattern[2]*span,y:fy+pattern[3]*span};
        shoulders.forEach((s,i)=>{ctx.beginPath();ctx.moveTo(s.x,s.y);ctx.lineTo((i===0?left:right).x,(i===0?left:right).y);ctx.stroke();});
        progress(ctx,w*.34,h*.83,w*.32,r.hold/.55);
      }else text(ctx,"리더가 먼저 양팔 포즈!",w*.5,h*.83,14);
      break;
    }
    case "human-pingpong":{
      ctx.strokeStyle="#b9e9ff75";ctx.lineWidth=3;
      ctx.setLineDash([8,10]);ctx.beginPath();ctx.moveTo(w*.5,h*.16);ctx.lineTo(w*.5,h*.85);ctx.stroke();ctx.setLineDash([]);
      const ys=[paddleY(players[0],h),paddleY(players[1],h)];
      ys.forEach((y,i)=>{
        const x=i===0?w*.15:w*.85;
        ctx.fillStyle=COLORS[i===0?"p1":"p2"];
        ctx.fillRect(x-w*.012,(y??.5)*h-u*.1,w*.024,u*.2);
      });
      orb(ctx,r.ball.x*w,r.ball.y*h,Math.max(7,u*.019),"#ffe6a5");
      text(ctx,String(r.scores.p1),w*.34,top,26,COLORS.p1);
      text(ctx,String(r.scores.p2),w*.66,top,26,COLORS.p2);
      break;
    }
    case "combine-robot":{
      for(const item of r.robot.items){
        if(item.y<0||item.y>1)continue;
        orb(ctx,item.x*w,item.y*h,u*.034,item.kind==="charge"?"#8fffbc":"#ff7185");
        text(ctx,item.kind==="charge"?"⚡":"!",item.x*w,item.y*h,Math.max(15,u*.035));
      }
      const x=r.robot.pilotX*w,y=h*.79;
      ctx.fillStyle="#264061e9";ctx.strokeStyle="#a6f4e3";ctx.lineWidth=4;
      ctx.beginPath();ctx.roundRect(x-u*.105,y-u*.08,u*.21,u*.14,12);ctx.fill();ctx.stroke();
      orb(ctx,x,y-u*.055,u*.05,"#e7d1ff");
      ctx.lineWidth=8;ctx.strokeStyle=r.robot.shieldOn?"#87ffca":"#6e7f95";
      ctx.beginPath();ctx.moveTo(x-u*.09,y-u*.015);ctx.lineTo(x-u*.15,y-u*(r.robot.shieldOn?.18:.07));ctx.stroke();
      ctx.beginPath();ctx.moveTo(x+u*.09,y-u*.015);ctx.lineTo(x+u*.15,y-u*(r.robot.shieldOn?.18:.07));ctx.stroke();
      text(ctx,r.robot.shieldOn?"실드 ON":"실드 OFF",x,y+u*.12,15,r.robot.shieldOn?"#92ffd8":"#e1adbd");
      text(ctx,"⚡ 충전 / 빨강 회피",w*.5,top,16);
      break;
    }
  }
  ctx.restore();
}
