import type {ExpertRound,Spot} from "./game";
import {MAZE_WALLS,TRACE_PATTERNS,TRACE_DIRECTIONS,TRACE_PARTS,TRACE_PART_LABEL,shadowTargets,portalTargets} from "./game";

const palette=["#79eedc","#ffdc86","#c5a4ff","#ff9aa2","#8dc9ff"];
function circle(ctx:CanvasRenderingContext2D,p:Spot,w:number,h:number,r:number,fill:string,stroke="#fff"){
  ctx.beginPath();ctx.arc(p.x*w,p.y*h,r*Math.min(w,h),0,Math.PI*2);
  ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle=stroke;ctx.lineWidth=3;ctx.stroke();
}
function caption(ctx:CanvasRenderingContext2D,title:string,sub:string,w:number,h:number){
  const y=Math.max(60,h*.13-28),pw=Math.min(w-20,520);
  ctx.fillStyle="rgba(10,21,41,.82)";ctx.beginPath();
  ctx.roundRect((w-pw)/2,y,pw,60,13);ctx.fill();
  ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillStyle="#fff";
  ctx.font="bold "+Math.max(15,Math.min(21,w*.031))+"px system-ui";
  ctx.fillText(title,w/2,y+22,pw-12);
  ctx.font="12px system-ui";ctx.fillStyle="#c1e7ee";
  ctx.fillText(sub,w/2,y+45,pw-12);
}
function text(ctx:CanvasRenderingContext2D,s:string,x:number,y:number,size=16,color="#fff"){
  ctx.fillStyle=color;ctx.font="bold "+size+"px system-ui";
  ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(s,x,y);
}
export function paintExpertScene(ctx:CanvasRenderingContext2D,r:ExpertRound,w:number,h:number){
  const s=Math.min(w,h);
  ctx.save();
  switch(r.kind){
    case "boss-raid":{
      const b=r.boss,open=b.age>=.78&&b.age<1.95;
      const danger=b.age>=1.36&&b.age<2.12;
      if(danger){
        ctx.fillStyle="rgba(255,72,100,.32)";
        ctx.fillRect(b.attackSide===0?0:w*.5,h*.63,w*.5,h*.37);
      }else if(b.age<1.36){
        ctx.fillStyle="rgba(255,180,91,.13)";
        ctx.fillRect(b.attackSide===0?0:w*.5,h*.63,w*.5,h*.37);
      }
      const boss={x:.5,y:.37};
      ctx.shadowColor="#ff798b";ctx.shadowBlur=20;
      circle(ctx,boss,w,h,.155,"#5f254c","#ff9aa9");ctx.shadowBlur=0;
      text(ctx,"👾",w*.5,h*.37,Math.round(s*.145));
      if(open&&!b.hit){
        ctx.shadowColor="#ffea94";ctx.shadowBlur=22;
        circle(ctx,b.weak,w,h,.072,"#f4c94b","#fff1c5");ctx.shadowBlur=0;
        text(ctx,"✦",b.weak.x*w,b.weak.y*h,Math.max(16,s*.06));
      }else if(!open&&b.age<.78){
        circle(ctx,b.weak,w,h,.072,"#fff0a733","#ffdf8b");
      }
      caption(ctx,"👾 보스 레이드 · STAGE "+b.stage,
        "황금 약점을 터치하고, 예고된 붉은 공격을 피하세요",w,h);
      const pw=w*.40;
      ctx.fillStyle="#27344e";ctx.fillRect(w*.3,h*.82,pw,12);
      ctx.fillStyle="#ff8f9c";ctx.fillRect(w*.3,h*.82,pw*(b.health/(4+Math.min(3,b.stage-1))),12);
      text(ctx,"BOSS HP "+b.health,w*.5,h*.87,13,"#ffe4bd");
      break;
    }
    case "gravity-lab":{
      const m=r.maze,goal=m.level%2===1?{x:.86,y:.26}:{x:.16,y:.78};
      ctx.fillStyle="rgba(5,24,38,.60)";ctx.fillRect(w*.07,h*.18,w*.86,h*.72);
      ctx.strokeStyle="#86e0e0";ctx.lineWidth=4;
      ctx.strokeRect(w*.07,h*.18,w*.86,h*.72);
      for(const rect of MAZE_WALLS){
        ctx.fillStyle="#6084a8";ctx.fillRect(rect.x*w,rect.y*h,rect.w*w,rect.h*h);
      }
      const hazard={x:.47+Math.sin(m.hazardTime*1.2)*.11,y:.5};
      circle(ctx,hazard,w,h,.045,"#fc7281","#ffd9de");
      circle(ctx,goal,w,h,.068,"#53d5a0","#d7fff1");
      text(ctx,"★",goal.x*w,goal.y*h,Math.max(18,s*.052));
      ctx.shadowColor="#9ce7ff";ctx.shadowBlur=15;
      circle(ctx,m.ball,w,h,.032,"#d6f5ff","#fff");ctx.shadowBlur=0;
      caption(ctx,"🧲 중력 미로 · LEVEL "+m.level,
        "양손 기울여 좌우 ↔ · 함께 올리고 내려 상하 ↕",w,h);
      const xArrow=m.input.x>.14?"→":m.input.x<-.14?"←":"·";
      const yArrow=m.input.y>.14?"↓":m.input.y<-.14?"↑":"·";
      text(ctx,"조작 "+xArrow+" "+yArrow,w*.5,h*.95,Math.max(12,s*.03),"#a5f5ed");
      break;
    }
    case "shadow-sync":{
      const g=r.shadow;
      const t=g.phase==="echo"?g.age:Math.min(g.age,2);
      const spots=shadowTargets(t,g.seed);
      spots.forEach((p,i)=>{
        ctx.setLineDash([8,5]);ctx.lineWidth=4;
        circle(ctx,p,w,h,.082,"rgba(109,224,252,.15)",palette[i]);
        ctx.setLineDash([]);
        text(ctx,i===0?"1":"2",p.x*w,p.y*h,Math.max(18,s*.046));
      });
      caption(ctx,"🪞 그림자 싱크 · LEVEL "+g.level,
        g.phase==="watch"?"움직이는 그림자 두 개를 관찰해요":g.phase==="echo"?
          "양손으로 목표를 동시에 따라가며 유지해요":"성공! 다음 그림자를 준비해요",w,h);
      ctx.fillStyle="#20354c";ctx.fillRect(w*.25,h*.88,w*.5,11);
      ctx.fillStyle="#8cf8d1";ctx.fillRect(w*.25,h*.88,w*.5*Math.min(1,g.hold/.64),11);
      break;
    }
    case "constellation-trace":{
      const t=r.trace,nodes=TRACE_PATTERNS[t.pattern],parts=TRACE_PARTS[t.pattern];
      ctx.lineJoin="round";ctx.lineCap="round";
      ctx.strokeStyle="#c6f0ff77";ctx.lineWidth=4;
      ctx.setLineDash([6,10]);ctx.beginPath();
      nodes.forEach((p,i)=>{if(!i)ctx.moveTo(p.x*w,p.y*h);else ctx.lineTo(p.x*w,p.y*h);});
      ctx.stroke();ctx.setLineDash([]);
      if(t.index>1){
        ctx.strokeStyle="#7dffe0";ctx.lineWidth=7;ctx.beginPath();
        nodes.slice(0,t.index).forEach((p,i)=>{if(!i)ctx.moveTo(p.x*w,p.y*h);else ctx.lineTo(p.x*w,p.y*h);});ctx.stroke();
      }
      nodes.forEach((p,i)=>{
        const active=i===t.index;
        ctx.shadowBlur=active?19:0;ctx.shadowColor="#fff2a4";
        circle(ctx,p,w,h,.066,active?"#f9dd73":i<t.index?"#50ccae":"#395171",
          active?"#fff4cd":"#b6d2e0");
        ctx.shadowBlur=0;text(ctx,String(i+1),p.x*w,p.y*h,Math.max(15,s*.044),
          active?"#273746":"#ffffff");
        text(ctx,TRACE_PART_LABEL[parts[i]],p.x*w,p.y*h+s*.099,
          Math.max(11,s*.023),active?"#fff2a4":"#c2e8ed");
      });
      caption(ctx,"🌌 별자리 제작자 · LEVEL "+t.level+" "+TRACE_DIRECTIONS[t.pattern],
        "별 "+(t.index+1)+" · "+TRACE_PART_LABEL[parts[t.index]]+"으로 터치하세요",w,h);
      text(ctx,"진행 "+t.index+" / "+nodes.length,w*.5,h*.91,15,"#fff0b2");
      break;
    }
    case "dual-portals":{
      const p=r.portal,spots=portalTargets(p.age,p.stage);
      ctx.strokeStyle="#e0a4ff88";ctx.lineWidth=4;
      ctx.beginPath();ctx.moveTo(spots[0].x*w,spots[0].y*h);
      ctx.lineTo(spots[1].x*w,spots[1].y*h);ctx.stroke();
      spots.forEach((spot,i)=>{
        ctx.shadowColor=palette[i+1];ctx.shadowBlur=24;
        circle(ctx,spot,w,h,.090,"rgba(62,28,100,.65)",palette[i+1]);
        circle(ctx,spot,w,h,.056,"rgba(30,70,113,.50)",palette[i+1]);
        ctx.shadowBlur=0;
        text(ctx,i===0?"A":"B",spot.x*w,spot.y*h,Math.max(17,s*.055));
      });
      if(p.hold>0)circle(ctx,{x:.5,y:.45},w,h,.045,"#ffffa7","#fff");
      caption(ctx,"🌀 듀얼 포털 · STAGE "+p.stage,
        p.rest>0?"전송 완료! 다음 포털이 움직입니다":"양손으로 움직이는 두 포털을 동시에 유지하세요",w,h);
      ctx.fillStyle="#26384f";ctx.fillRect(w*.23,h*.86,w*.54,12);
      ctx.fillStyle="#aaf8ce";ctx.fillRect(w*.23,h*.86,w*.54*Math.min(1,p.hold/1.02),12);
      break;
    }
  }
  ctx.restore();
}
