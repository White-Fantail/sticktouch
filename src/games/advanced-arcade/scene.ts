import type {AdvancedRound} from "./game";
import {BEAT_SPOTS,MEMORY_SPOTS,SORT_BINS,SORT_COLORS} from "./game";

const COLORS=["#64d7ff","#ffca72","#d3a7ff","#8cf0b4"];
const scaleOf=(w:number,h:number)=>Math.min(w,h);
function disk(ctx:CanvasRenderingContext2D,x:number,y:number,r:number,fill:string,stroke="#fff",line=3){
  ctx.fillStyle=fill;ctx.strokeStyle=stroke;ctx.lineWidth=line;
  ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.stroke();
}
function caption(ctx:CanvasRenderingContext2D,text:string,w:number,h:number){
  const width=Math.min(w-24,Math.max(180,w*.79)),y=Math.max(66,h*.13-25);
  ctx.fillStyle="rgba(8,23,40,.83)";
  ctx.beginPath();ctx.roundRect((w-width)/2,y,width,48,12);ctx.fill();
  ctx.font="bold "+Math.max(13,Math.min(19,w*.031))+"px system-ui";
  ctx.fillStyle="#f2fcff";ctx.textAlign="center";ctx.textBaseline="middle";
  ctx.fillText(text,w/2,y+24,width-12);
}
function small(ctx:CanvasRenderingContext2D,text:string,x:number,y:number,color="#fff"){
  ctx.font="bold 13px system-ui";ctx.fillStyle=color;ctx.textAlign="center";
  ctx.fillText(text,x,y);
}
export function paintAdvancedScene(ctx:CanvasRenderingContext2D,round:AdvancedRound,w:number,h:number){
  const s=scaleOf(w,h);
  ctx.save();ctx.textAlign="center";ctx.textBaseline="middle";
  switch(round.kind){
    case "rhythm-pads":{
      caption(ctx,"🥁 박자에 맞춰 패드를 터치!",w,h);
      ctx.fillStyle="rgba(7,26,48,.36)";ctx.fillRect(w*.04,h*.23,w*.92,h*.62);
      ctx.strokeStyle="rgba(190,235,255,.25)";ctx.lineWidth=1;
      for(const x of BEAT_SPOTS){
        ctx.beginPath();ctx.moveTo(x.x*w,h*.23);ctx.lineTo(x.x*w,h*.84);ctx.stroke();
      }
      for(let i=0;i<BEAT_SPOTS.length;i++){
        const p=BEAT_SPOTS[i],r=s*.075;
        ctx.shadowBlur=15;ctx.shadowColor=COLORS[i];
        disk(ctx,p.x*w,p.y*h,r,COLORS[i]+"88",COLORS[i],3);
        ctx.shadowBlur=0;
        small(ctx,String(i+1),p.x*w,p.y*h,"#fff");
      }
      for(const note of round.notes){
        const p=BEAT_SPOTS[note.lane],y=(.18+.58*note.age/1.24)*h;
        const ready=Math.abs(note.age-1.24)<.28;
        ctx.shadowBlur=ready?22:10;ctx.shadowColor=COLORS[note.lane];
        disk(ctx,p.x*w,y,s*.045,COLORS[note.lane],"#fff",2);
        ctx.shadowBlur=0;
      }
      ctx.strokeStyle="#f4f2b8";ctx.lineWidth=3;
      ctx.beginPath();ctx.moveTo(w*.06,h*.76);ctx.lineTo(w*.94,h*.76);ctx.stroke();
      small(ctx,"원 안에 노트가 닿는 순간, 손을 패드로!",w*.5,h*.91,"#e2ffec");
      break;
    }
    case "shield-guard":{
      caption(ctx,"🛡️ 중앙 코어를 지켜라!",w,h);
      const x=w*.5,y=h*.51;
      ctx.strokeStyle="rgba(99,245,230,.35)";ctx.lineWidth=2;
      for(const radius of [.19,.30]){
        ctx.beginPath();ctx.arc(x,y,s*radius,0,Math.PI*2);ctx.stroke();
      }
      ctx.shadowColor="#7df5e6";ctx.shadowBlur=22;
      disk(ctx,x,y,s*.097,"#1b888c","#b9fff2",4);
      ctx.shadowBlur=0;
      ctx.font=Math.max(29,s*.10)+"px sans-serif";ctx.fillText("🔋",x,y);
      for(const b of round.bolts){
        const bx=b.x*w,by=b.y*h;
        ctx.strokeStyle="rgba(255,154,128,.58)";ctx.lineWidth=Math.max(3,s*.012);
        ctx.beginPath();ctx.moveTo(bx-b.vx*w*.16,by-b.vy*h*.16);ctx.lineTo(bx,by);ctx.stroke();
        ctx.shadowBlur=12;ctx.shadowColor="#ffc28d";
        disk(ctx,bx,by,s*.052,"#ff8b65","#ffebc7",2);
        ctx.shadowBlur=0;
      }
      small(ctx,"손으로 에너지 구슬을 막고 코어를 보호하세요",w*.5,h*.90,"#d3ffea");
      break;
    }
    case "memory-sequence":{
      const phase=round.memoryPhase;
      const label=phase==="watch"?"👀 깜빡이는 순서를 기억!":
        phase==="input"?"🧠 본 순서대로 누르세요!":
        round.memoryCorrect?"✨ 성공! 다음 단계":"🔄 다시 기억해 보세요";
      caption(ctx,label,w,h);
      MEMORY_SPOTS.forEach((spot,i)=>{
        const r=s*.09,lit=round.memoryLit===i;
        ctx.shadowColor=COLORS[i];ctx.shadowBlur=lit?34:8;
        disk(ctx,spot.x*w,spot.y*h,r,lit?COLORS[i]:COLORS[i]+"88",
          lit?"#fffad2":"#dce7f0",lit?6:2);
        ctx.shadowBlur=0;
        small(ctx,String(i+1),spot.x*w,spot.y*h,lit?"#163446":"#fff");
      });
      const progress=phase==="input"?round.memoryIndex:0;
      small(ctx,"길이 "+round.sequence.length+" · 맞힌 순서 "+progress+
        " / "+round.sequence.length,w*.5,h*.87,"#f9e9a2");
      if(phase==="input"){
        const meter=Math.max(0,1-round.phaseTime/5.5);
        ctx.fillStyle="#25374c";ctx.fillRect(w*.23,h*.91,w*.54,7);
        ctx.fillStyle="#90f0ce";ctx.fillRect(w*.23,h*.91,w*.54*meter,7);
      }
      break;
    }
    case "laser-lane":{
      caption(ctx,"⚡ 레이저 사이의 안전 통로로!",w,h);
      const beam=round.laser;
      if(beam){
        const active=beam.age>=.8;
        const y=active?(.16+Math.min(1,(beam.age-.8)/2.35)*.69)*h:h*.16;
        const left=(beam.gap-.155)*w,right=(beam.gap+.155)*w;
        ctx.fillStyle=active?"rgba(253,91,116,.12)":"rgba(255,192,96,.12)";
        ctx.fillRect(0,y-12,left,24);ctx.fillRect(right,y-12,w-right,24);
        ctx.strokeStyle=active?"#ff5f82":"#ffc47b";
        ctx.shadowColor=active?"#ff456a":"#ffcf89";
        ctx.shadowBlur=active?20:7;
        ctx.lineWidth=active?Math.max(10,s*.026):4;
        ctx.setLineDash(active?[]:[13,9]);
        ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(left,y);
        ctx.moveTo(right,y);ctx.lineTo(w,y);ctx.stroke();
        ctx.setLineDash([]);ctx.shadowBlur=0;
        ctx.strokeStyle="#91f8ce";ctx.lineWidth=3;
        ctx.beginPath();ctx.moveTo(left,y-10);ctx.lineTo(left,y+10);
        ctx.moveTo(right,y-10);ctx.lineTo(right,y+10);ctx.stroke();
        if(!active)small(ctx,"곧 내려옵니다! 안전한 틈으로 이동",w*.5,h*.88,"#ffe4ae");
        else small(ctx,beam.damaged?"앗! 다음 레이저를 피하세요":"손을 초록색 틈 안으로!",w*.5,h*.91,"#dcffe9");
      }else small(ctx,"다음 레이저 준비 중",w*.5,h*.88,"#d9ffe9");
      break;
    }
    case "parcel-sort":{
      caption(ctx,"📦 같은 색의 배송함으로 옮겨요!",w,h);
      SORT_BINS.forEach((bin,i)=>{
        const bx=bin.x*w,by=bin.y*h,r=s*.105;
        ctx.fillStyle="#122840dd";ctx.strokeStyle=SORT_COLORS[i];ctx.lineWidth=4;
        ctx.beginPath();ctx.roundRect(bx-r,by-r*.63,r*2,r*1.26,10);ctx.fill();ctx.stroke();
        ctx.font=Math.round(Math.max(19,r*.68))+"px sans-serif";
        ctx.fillText(["🔵","🟡","🟣"][i],bx,by);
      });
      const parcel=round.parcel;
      if(parcel){
        const px=parcel.x*w,py=parcel.y*h,r=s*.074;
        ctx.shadowColor=SORT_COLORS[parcel.kind];ctx.shadowBlur=20;
        ctx.fillStyle=SORT_COLORS[parcel.kind];ctx.strokeStyle="#fff";ctx.lineWidth=3;
        ctx.beginPath();ctx.roundRect(px-r,py-r,r*2,r*2,9);ctx.fill();ctx.stroke();
        ctx.shadowBlur=0;
        ctx.font=Math.round(Math.max(18,r*.88))+"px sans-serif";
        ctx.fillText(parcel.heldBy?"📦":"✋",px,py);
        if(parcel.heldBy)small(ctx,"운반 중",px,py+r+18,"#c6ffdd");
        else small(ctx,parcel.armed?"손을 상자에 넣어 집으세요":"손을 잠깐 떼고 시작!",w*.5,h*.90,"#dcffe9");
      }else small(ctx,"다음 상자 준비 중…",w*.5,h*.90,"#dcffe9");
      break;
    }
  }
  ctx.restore();
}
