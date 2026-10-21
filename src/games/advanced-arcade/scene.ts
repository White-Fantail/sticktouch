import type {AdvancedRound} from "./game";
import {BEAT_SPOTS,BEAT_PARTS,SORT_BINS,SORT_COLORS} from "./game";
import {POSE_SEQUENCE,type PoseName} from "../pose-challenge/game";

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
function silhouette(ctx:CanvasRenderingContext2D,kind:PoseName,x:number,y:number,size:number){
  const poses:{[K in PoseName]:{left:[number,number];right:[number,number];feet:[number,number][]}}={
    "arms-up":{left:[-.4,-.9],right:[.4,-.9],feet:[[-.2,1],[.2,1]]},
    "t-pose":{left:[-1,-.15],right:[1,-.15],feet:[[-.2,1],[.2,1]]},
    "hands-hips":{left:[-.27,.35],right:[.27,.35],feet:[[-.2,1],[.2,1]]},
    "one-arm-up":{left:[-.5,-.9],right:[.6,.45],feet:[[-.2,1],[.2,1]]},
    "star":{left:[-.9,-.85],right:[.9,-.85],feet:[[-.75,1],[.75,1]]},
    "squat":{left:[-.4,.3],right:[.4,.3],feet:[[-.7,.65],[.7,.65]]}
  };
  const p=poses[kind];
  ctx.save();ctx.translate(x,y);ctx.scale(size,size);
  ctx.strokeStyle="#a9ffe3";ctx.lineWidth=.085;ctx.lineCap="round";
  ctx.beginPath();ctx.arc(0,-.55,.20,0,Math.PI*2);ctx.stroke();
  const line=(ax:number,ay:number,bx:number,by:number)=>{
    ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);ctx.stroke();
  };
  line(0,-.33,0,.45);
  line(-.19,-.21,...p.left);line(.19,-.21,...p.right);
  for(const foot of p.feet)line(0,.45,...foot);
  ctx.restore();
}
export function paintAdvancedScene(ctx:CanvasRenderingContext2D,round:AdvancedRound,w:number,h:number){
  const s=scaleOf(w,h);
  ctx.save();ctx.textAlign="center";ctx.textBaseline="middle";
  switch(round.kind){
    case "rhythm-pads":{
      caption(ctx,"🥁 바디 비트 · 손과 발 네 레인!",w,h);
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
        small(ctx,["왼손","오른손","왼발","오른발"][i],p.x*w,p.y*h,"#fff");
      }
      for(const note of round.notes){
        const p=BEAT_SPOTS[note.lane],y=(.18+(p.y-.18)*note.age/1.24)*h;
        const ready=Math.abs(note.age-1.24)<.28;
        ctx.shadowBlur=ready?22:10;ctx.shadowColor=COLORS[note.lane];
        disk(ctx,p.x*w,y,s*.045,COLORS[note.lane],"#fff",2);
        ctx.shadowBlur=0;
      }
      ctx.strokeStyle="#f4f2b8";ctx.lineWidth=3;
      for(const spot of BEAT_SPOTS){
        ctx.beginPath();ctx.moveTo(spot.x*w-s*.08,spot.y*h);ctx.lineTo(spot.x*w+s*.08,spot.y*h);ctx.stroke();
      }
      small(ctx,"위: 양손 · 아래: 양발 · 각 부위로 정확하게!",w*.5,h*.92,"#e2ffec");
      break;
    }
    case "shield-guard":{
      caption(ctx,"🛡️ 매직 실드 · 팔뚝 각도를 맞춰 반사!",w,h);
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
        disk(ctx,bx,by,s*.052,b.reflected?"#78ffe2":"#ff8b65","#ffebc7",2);
        ctx.shadowBlur=0;
      }
      for(const a of round.shieldArms){
        ctx.save();ctx.translate(a.x*w,a.y*h);ctx.rotate(a.angle);
        ctx.shadowColor="#78fbe5";ctx.shadowBlur=19;
        ctx.strokeStyle="#8bf3ee";ctx.lineWidth=Math.max(8,s*.025);
        ctx.lineCap="round";ctx.beginPath();ctx.moveTo(-s*.12,0);ctx.lineTo(s*.12,0);ctx.stroke();
        ctx.restore();
      }
      small(ctx,"탄환의 진행 방향과 팔뚝을 직각으로 유지하세요",w*.5,h*.90,"#d3ffea");
      break;
    }
    case "memory-sequence":{
      const phase=round.memoryPhase,lit=round.memoryLit;
      caption(ctx,phase==="watch"?"🧠 몸으로 암호 풀기 · 자세를 외우세요!":
        phase==="input"?"🧠 암호 입력 · 본 자세를 순서대로 재현!":
        round.memoryCorrect?"✨ 암호 해제!":"🔄 다음 암호 준비 중",w,h);
      if(phase==="watch"&&lit>=0){
        const pose=POSE_SEQUENCE[lit];
        ctx.fillStyle="#092739bf";ctx.beginPath();
        ctx.roundRect(w*.31,h*.28,w*.38,h*.45,16);ctx.fill();
        silhouette(ctx,pose.id,w*.5,h*.53,s*.17);
        small(ctx,pose.label,w*.5,h*.73,"#fdeda4");
      }else if(phase==="input"){
        silhouette(ctx,"arms-up",w*.5,h*.53,s*.14);
        small(ctx,"기억한 자세를 0.4초 유지하세요",w*.5,h*.73,"#b7fff0");
      }
      const count=round.sequence.length,unit=Math.min(w*.14,55);
      for(let i=0;i<count;i++){
        const x=w*.5+(i-(count-1)/2)*(unit+5);
        disk(ctx,x,h*.83,unit*.40,i<round.memoryIndex?"#4abf9e":"#283e5b",
          i===round.memoryIndex&&phase==="input"?"#fff4a8":"#8dabbd",2);
        small(ctx,i<round.memoryIndex?"✓":String(i+1),x,h*.83,"#fff");
      }
      small(ctx,phase==="watch"?"표시된 전신 동작을 기억하세요":
        "진행 "+round.memoryIndex+" / "+count,w*.5,h*.93,"#f9e9a2");
      break;
    }
    case "laser-lane":{
      const beam=round.laser;
      caption(ctx,"⚡ 레이저 탈출 · 몸 전체로 피하세요!",w,h);
      if(beam){
        const active=beam.age>=.8;
        const vertical=beam.mode!=="high";
        const x=beam.gap*w,y=h*.35;
        ctx.strokeStyle=active?"#ff527f":"#ffd084";
        ctx.lineWidth=active?Math.max(11,s*.034):4;
        ctx.shadowColor=ctx.strokeStyle;ctx.shadowBlur=active?22:8;
        ctx.setLineDash(active?[]:[13,8]);
        ctx.beginPath();
        if(vertical){ctx.moveTo(x,h*.13);ctx.lineTo(x,h*.91);}
        else{ctx.moveTo(0,y);ctx.lineTo(w,y);}
        ctx.stroke();ctx.setLineDash([]);ctx.shadowBlur=0;
        small(ctx,beam.damaged?"충돌! 다음 레이저에서 재도전":
          vertical?(beam.gap<.5?"몸을 오른쪽으로 기울이세요":"몸을 왼쪽으로 기울이세요"):
          "무릎을 굽혀 레이저 아래로 숙이세요",
          w*.5,h*.88,active?"#d9ffeb":"#ffe4a6");
      }else small(ctx,"다음 레이저 방향을 확인하세요",w*.5,h*.88,"#d9ffe9");
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
