import type {MiniRound} from "./game";
import {MOLE_SPOTS,COLOR_HEX,COLOR_NAMES,COLOR_SPOTS} from "./game";

function panel(ctx:CanvasRenderingContext2D,width:number,height:number){
  const w=Math.min(width-20,450);
  ctx.fillStyle="rgba(8,20,40,0.70)";
  ctx.beginPath();ctx.roundRect((width-w)/2,Math.max(65,height*0.13-28),w,53,14);ctx.fill();
}
function title(ctx:CanvasRenderingContext2D,text:string,width:number,height:number,color="#fff"){
  ctx.save();panel(ctx,width,height);
  ctx.textAlign="center";ctx.textBaseline="middle";
  ctx.font="bold 20px system-ui";ctx.fillStyle=color;
  ctx.fillText(text,width/2,Math.max(65,height*0.13-28)+27);
  ctx.restore();
}
function circle(ctx:CanvasRenderingContext2D,x:number,y:number,radius:number,fill:string,outline:string){
  ctx.fillStyle=fill;ctx.strokeStyle=outline;ctx.lineWidth=3;
  ctx.beginPath();ctx.arc(x,y,radius,0,2*Math.PI);ctx.fill();ctx.stroke();
}
export function paintMiniScene(ctx:CanvasRenderingContext2D,round:MiniRound,width:number,height:number){
  const scale=Math.min(width,height);
  ctx.save();ctx.textAlign="center";ctx.textBaseline="middle";
  switch(round.kind){
    case "mole-whack":{
      title(ctx,"🐹 반짝이는 두더지를 잡아요!",width,height);
      MOLE_SPOTS.forEach((spot,i)=>{
        const x=spot.x*width,y=spot.y*height,r=scale*0.078;
        circle(ctx,x,y,r,"rgba(18,22,41,0.66)","#8b9baf");
        if(i===round.slot){
          ctx.shadowColor="#ffe28e";ctx.shadowBlur=23;
          circle(ctx,x,y,r*0.90,"#a06547","#ffdb7e");
          ctx.shadowBlur=0;ctx.font=Math.round(r*1.22)+"px sans-serif";
          ctx.fillText("🐹",x,y-2);
          ctx.lineWidth=4;ctx.strokeStyle="#fee89b";
          ctx.beginPath();ctx.arc(x,y,r+7,-Math.PI/2,
            -Math.PI/2+Math.PI*2*(1-Math.min(1,round.phaseTime/2.3)));ctx.stroke();
        }else{
          ctx.fillStyle="rgba(170,189,210,.3)";
          ctx.beginPath();ctx.ellipse(x,y+4,r*.47,r*.18,0,0,Math.PI*2);ctx.fill();
        }
      });
      break;
    }
    case "color-match":{
      title(ctx,round.slot>=0?"🎨 "+COLOR_NAMES[round.slot]+" 색을 터치!":"🎨 준비하세요!",width,height);
      COLOR_SPOTS.forEach((spot,i)=>{
        const x=spot.x*width,y=spot.y*height,r=scale*0.11;
        ctx.shadowColor=COLOR_HEX[i];ctx.shadowBlur=16;
        circle(ctx,x,y,r,COLOR_HEX[i],"rgba(255,255,255,.9)");
        ctx.shadowBlur=0;ctx.fillStyle="#17283c";ctx.font="bold "+Math.max(12,Math.round(r*.33))+"px system-ui";
        ctx.fillText(COLOR_NAMES[i],x,y);
      });
      ctx.fillStyle="rgba(13,27,43,.8)";ctx.fillRect(width*.2,height*.8,width*.6,7);
      ctx.fillStyle="#a6f8ce";ctx.fillRect(width*.2,height*.8,width*.6*Math.max(0,1-round.phaseTime/5),7);
      break;
    }
    case "star-hunt":{
      title(ctx,"⭐ 움직이는 별을 잡아요!",width,height);
      for(const star of round.items){
        const x=star.x*width,y=star.y*height,r=star.radius*scale;
        ctx.shadowColor="#ffeb95";ctx.shadowBlur=24;
        ctx.fillStyle="#ffe37e";ctx.font=Math.round(r*2.1)+"px sans-serif";
        ctx.fillText("⭐",x,y);ctx.shadowBlur=0;
        ctx.strokeStyle="#fff4b3";ctx.lineWidth=3;
        ctx.beginPath();ctx.arc(x,y,r*1.20,-Math.PI/2,
          -Math.PI/2+Math.PI*2*Math.max(0,1-star.age/3.2));ctx.stroke();
      }
      break;
    }
    case "meteor-dodge":{
      title(ctx,"☄️ 운석 소나기 · 피하거나 손으로 파괴!",width,height);
      for(const meteor of round.items){
        const x=meteor.x*width,y=meteor.y*height,r=meteor.radius*scale;
        ctx.strokeStyle="rgba(255,132,105,.45)";ctx.lineWidth=r*.65;
        ctx.lineCap="round";ctx.beginPath();
        ctx.moveTo(x-meteor.vx*width*.20,y);ctx.lineTo(x,y);ctx.stroke();
        ctx.shadowColor="#ff9856";ctx.shadowBlur=16;
        circle(ctx,x,y,r,meteor.large?"#923c64":"#ad5642","#ffe0a0");ctx.shadowBlur=0;
        if(meteor.large){
          ctx.strokeStyle="#9bf9dd";ctx.lineWidth=3;ctx.setLineDash([5,5]);
          circle(ctx,x-width*.055,y,r*.48,"rgba(24,60,70,.5)","#9bf9dd");
          circle(ctx,x+width*.055,y,r*.48,"rgba(24,60,70,.5)","#9bf9dd");
          ctx.setLineDash([]);
        }
        ctx.fillStyle="#f9aa6a";ctx.beginPath();ctx.arc(x-r*.2,y-r*.1,r*.3,0,Math.PI*2);ctx.fill();
      }
      ctx.font="bold 14px system-ui";ctx.fillStyle="#c9f6e1";
      ctx.fillText("작은 운석=한 손 · 큰 운석=양손 양옆 동시 공격",width/2,height*.90);
      break;
    }
    case "freeze-dance":{
      const green=round.green;
      ctx.fillStyle=green?"rgba(31,139,82,.26)":"rgba(188,48,53,.28)";
      ctx.fillRect(0,0,width,height);
      const x=width/2,y=height*.49,r=scale*.12;
      ctx.shadowColor=green?"#9bffc1":"#ff8d95";ctx.shadowBlur=24;
      circle(ctx,x,y,r,green?"#46d990":"#ff646f","#fff");
      ctx.shadowBlur=0;
      ctx.font="bold "+Math.round(Math.max(23,scale*.07))+"px system-ui";
      ctx.fillStyle="#fff";
      ctx.fillText(green?"BEAT · 춤춰요!":"FREEZE · 몸 전체 정지!",x,height*.28);
      ctx.font="bold "+Math.round(Math.max(15,scale*.047))+"px system-ui";
      ctx.fillText(green?"GO!":"STOP!",x,y);
      ctx.fillStyle="#e1fff1";ctx.font="14px system-ui";
      ctx.fillText(green?"음악 10박자 동안 온몸을 움직여요":"6박자 동안 머리와 손발 모두 멈춰요",x,height*.74);
      const beatPhase=round.phaseTime%3.84;
      const ratio=green?1-beatPhase/2.4:1-(beatPhase-2.4)/1.44;
      const barWidth=width*.60;
      ctx.fillStyle="rgba(17,27,43,.8)";ctx.fillRect((width-barWidth)/2,height*.82,barWidth,10);
      ctx.fillStyle=green?"#91f8b3":"#ffb2b8";
      ctx.fillRect((width-barWidth)/2,height*.82,barWidth*Math.max(0,Math.min(1,ratio)),10);
      break;
    }
  }
  ctx.restore();
}
