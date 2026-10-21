import type {Landmark,Point,Viewport} from "../../core.ts";
import {BONES} from "../../core.ts";
import type {CreativeRound} from "./game.ts";
import {CHARADES,DRUM_PADS,DRUM_PATTERN,MUSIC_NOTES,ORCHESTRA,SHADOW_STORY,
  ZOMBIE_POSES,storyJoint} from "./game.ts";

const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));
function ink(ctx:CanvasRenderingContext2D,text:string,x:number,y:number,size:number,
  color="#f2fbff"){
  ctx.fillStyle=color;ctx.font="700 "+Math.round(size)+"px system-ui";
  ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(text,x,y);
}
function panel(ctx:CanvasRenderingContext2D,w:number,h:number,title:string,tip:string){
  const bw=Math.min(w-18,620),y=Math.max(56,h*.085);
  ctx.fillStyle="rgba(4,18,40,.88)";ctx.strokeStyle="#8ce2e866";ctx.lineWidth=1.5;
  ctx.beginPath();ctx.roundRect((w-bw)/2,y,bw,70,12);ctx.fill();ctx.stroke();
  ink(ctx,title,w*.5,y+22,clamp(w*.037,15,23));
  ink(ctx,tip,w*.5,y+49,clamp(w*.022,10,14),"#b6dce7");
}
function ring(ctx:CanvasRenderingContext2D,x:number,y:number,r:number,color:string,lit=true){
  ctx.save();
  ctx.shadowColor=color;ctx.shadowBlur=lit?15:0;
  ctx.beginPath();ctx.arc(x,y,r,0,2*Math.PI);
  ctx.fillStyle=lit?"rgba(10,34,58,.88)":"rgba(5,23,43,.46)";ctx.fill();
  ctx.strokeStyle=color;ctx.lineWidth=lit?4:2;ctx.stroke();ctx.restore();
}
function progress(ctx:CanvasRenderingContext2D,w:number,h:number,v:number,color="#9beede"){
  const len=Math.min(330,w*.62),x=(w-len)/2,y=h*.91;
  ctx.fillStyle="#173148";ctx.beginPath();ctx.roundRect(x,y,len,9,5);ctx.fill();
  ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,len*clamp(v,0,1),9,5);ctx.fill();
}
function poseFigure(ctx:CanvasRenderingContext2D,x:number,y:number,s:number,kind:string,
  fill="#adf2ff"){
  const arms:Record<string,[number,number,number,number]>={
    "t-pose":[-1,0,1,0],"arms-up":[-.7,-.9,.7,-.9],
    "hands-hips":[-.35,.45,.35,.45],"one-arm-up":[-.7,-.9,.7,.60],
    "star":[-1,-.85,1,-.85],"squat":[-.65,.50,.65,.50]
  };
  const a=arms[kind]||arms["t-pose"];
  ctx.save();ctx.translate(x,y);
  ctx.strokeStyle=fill;ctx.lineCap="round";ctx.lineJoin="round";ctx.lineWidth=Math.max(4,s*.13);
  const line=(ax:number,ay:number,bx:number,by:number)=>{
    ctx.beginPath();ctx.moveTo(ax*s,ay*s);ctx.lineTo(bx*s,by*s);ctx.stroke();
  };
  ctx.beginPath();ctx.arc(0,-1.13*s,.25*s,0,Math.PI*2);ctx.stroke();
  line(0,-.8,0,.7);line(-.12,-.62,a[0],a[1]);line(.12,-.62,a[2],a[3]);
  line(0,.7,kind==="star"?-.83:-.48,kind==="squat"?1.02:1.70);
  line(0,.7,kind==="star"?.83:.48,kind==="squat"?1.02:1.70);
  ctx.restore();
}
function guideCard(ctx:CanvasRenderingContext2D,w:number,h:number,icon:string,
  label:string,shape:string,success:boolean,sub:string){
  const bw=Math.min(w*.40,235),bh=Math.min(h*.46,280),x=w-bw-12,y=h*.28;
  ctx.fillStyle="rgba(3,20,37,.89)";ctx.strokeStyle=success?"#9cffe1":"#92ccff";
  ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(x,y,bw,bh,16);ctx.fill();ctx.stroke();
  ink(ctx,icon+" "+label,x+bw/2,y+27,clamp(bw*.095,13,20));
  poseFigure(ctx,x+bw*.5,y+bh*.46,Math.min(bw,bh)*.15,shape,
    success?"#99ffc9":"#aee9ff");
  ink(ctx,success?"✓ GOOD!":sub,x+bw*.5,y+bh-20,clamp(bw*.07,11,15),
    success?"#9cffe1":"#d0dcf0");
}
function backdrop(ctx:CanvasRenderingContext2D,w:number,h:number,a:string,b:string){
  const g=ctx.createLinearGradient(0,0,0,h);
  g.addColorStop(0,a);g.addColorStop(1,b);ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
}
function ground(ctx:CanvasRenderingContext2D,w:number,h:number){
  ctx.fillStyle="rgba(4,9,29,.56)";ctx.fillRect(0,h*.88,w,h*.12);
  ctx.strokeStyle="#abc5ec55";ctx.lineWidth=2;ctx.beginPath();
  ctx.moveTo(0,h*.88);ctx.lineTo(w,h*.88);ctx.stroke();
}
/** Overlay visuals never change input coordinates or collision rules. */
export function paintCreativeScene(ctx:CanvasRenderingContext2D,r:CreativeRound,
  w:number,h:number,points:readonly Point[],pose:readonly Landmark[]|undefined,view:Viewport){
  const s=Math.min(w,h);
  ctx.save();
  switch(r.kind){
    case "air-drummer":{
      const active=DRUM_PATTERN[r.stage%DRUM_PATTERN.length];
      panel(ctx,w,h,"🥁 에어 드러머 · BEAT "+(r.stage+1),
        "깜빡이는 악기를 지정된 손·발로 새로 터치하세요");
      ctx.strokeStyle="#83c4d933";ctx.lineWidth=2;
      for(let i=0;i<6;i++){ctx.beginPath();ctx.moveTo(w*.08,h*(.28+i*.115));
        ctx.lineTo(w*.92,h*(.28+i*.115));ctx.stroke();}
      DRUM_PADS.forEach((pad,i)=>{
        const lit=i===active,rad=s*(lit?.085:.074);
        ring(ctx,pad.x*w,pad.y*h,rad,lit?"#ffe28e":"#7ca8c1",lit);
        ink(ctx,i<2?"🥁":i===2?"👟":"🔔",pad.x*w,pad.y*h-rad*.19,rad*.62);
        ink(ctx,pad.name,pad.x*w,pad.y*h+rad*.65,clamp(s*.028,12,17),
          lit?"#ffedb6":"#bcd2e7");
      });
      ink(ctx,r.completed?"✓ PERFECT!":"NOW · "+DRUM_PADS[active].name,
        w*.5,h*.63,clamp(s*.06,17,27),r.completed?"#8cfaca":"#ffdc91");
      progress(ctx,w,h,r.phase/1.10,r.completed?"#89ffd1":"#ffd584");break;
    }
    case "music-maker":{
      panel(ctx,w,h,"🎼 뮤직 메이커 · "+r.stage+" NOTES",
        "가운데 줄을 손으로 좌우 가로질러 연주 · 손 높이로 음을 선택!");
      ctx.fillStyle="rgba(4,16,38,.56)";
      ctx.beginPath();ctx.roundRect(w*.38,h*.20,w*.24,h*.67,14);ctx.fill();
      const noteLabels=["도","레","미","솔","라","높은 도"];
      MUSIC_NOTES.forEach((_,i)=>{
        const y=h*(.88-(i+.5)*.71/MUSIC_NOTES.length);
        ctx.strokeStyle=r.lastNote===i&&r.stage?"#fff5b8":"#9cd8e780";
        ctx.lineWidth=r.lastNote===i&&r.stage?5:2;
        ctx.beginPath();ctx.moveTo(w*.34,y);ctx.lineTo(w*.66,y);ctx.stroke();
        ink(ctx,noteLabels[i],w*.68,y,clamp(s*.033,12,18),"#e3f0ff");
      });
      ctx.strokeStyle="#ffce89";ctx.lineWidth=7;ctx.setLineDash([14,8]);
      ctx.beginPath();ctx.moveTo(w*.5,h*.19);ctx.lineTo(w*.5,h*.87);ctx.stroke();ctx.setLineDash([]);
      ink(ctx,"← SWIPE →",w*.5,h*.80,clamp(s*.040,13,22),"#ffe19c");
      ink(ctx,r.notes.slice(-7).map(i=>noteLabels[i]).join("  ♪  ")||"음표를 만들어 보세요",
        w*.5,h*.94,clamp(s*.026,11,16),"#bcf1e2");
      break;
    }
    case "body-painter":{
      // Body-based painting is real drawing, not a simulated sparkle around a target.
      backdrop(ctx,w,h,"rgba(13,34,68,.20)","rgba(20,15,55,.36)");
      ctx.strokeStyle="#ffffff1c";ctx.lineWidth=1;
      for(let x=.1;x<1;x+=.1){ctx.beginPath();ctx.moveTo(x*w,h*.18);
        ctx.lineTo(x*w,h*.96);ctx.stroke();}
      for(let y=.2;y<1;y+=.1){ctx.beginPath();ctx.moveTo(w*.04,y*h);
        ctx.lineTo(w*.96,y*h);ctx.stroke();}
      ctx.save();ctx.lineCap="round";ctx.lineJoin="round";ctx.lineWidth=clamp(s*.018,5,15);
      for(const segment of r.strokes){
        ctx.strokeStyle=segment.color;ctx.shadowColor=segment.color;ctx.shadowBlur=10;
        ctx.beginPath();ctx.moveTo(segment.x1*w,segment.y1*h);
        ctx.lineTo(segment.x2*w,segment.y2*h);ctx.stroke();
      }
      ctx.restore();
      panel(ctx,w,h,"🎨 바디 페인터 · "+r.strokes.length+" STROKES",
        "왼손=하늘색 · 오른손=분홍색 · 허공을 움직여 그림을 그려요");
      ink(ctx,"양손을 움직여 캔버스를 채워요",w*.5,h*.94,clamp(s*.029,12,17),"#c9e7fa");
      break;
    }
    case "zombie-dance-battle":{
      const target=ZOMBIE_POSES[(r.stage*5+Math.floor(r.stage/3))%ZOMBIE_POSES.length];
      const names:Record<string,string>={"t-pose":"좀비 팔","arms-up":"으악!","hands-hips":"좀비 대장",
        "one-arm-up":"한 팔 좀비","star":"폭주 좀비","squat":"기어가는 좀비"};
      panel(ctx,w,h,"🧟 좀비 댄스 배틀 · ROUND "+(r.stage+1),
        "좀비의 동작을 보고 이전 자세에서 바꿔 따라하세요");
      ctx.save();ctx.globalAlpha=.3;poseFigure(ctx,w*.22,h*.58,s*.13,target,"#99ffae");ctx.restore();
      guideCard(ctx,w,h,"🧟",names[target],target,r.completed,"따라 해요!");
      ink(ctx,r.completed?"좀비 제압!":"BEAT · "+Math.ceil((2.35-r.phase)/.35),
        w*.33,h*.72,clamp(s*.042,15,22),r.completed?"#aaffd4":"#dbf7c2");
      progress(ctx,w,h,r.phase/2.35,r.completed?"#aafbd4":"#9ad8a4");
      break;
    }
    case "body-charades":{
      const cue=CHARADES[r.stage%CHARADES.length];
      panel(ctx,w,h,"🎬 몸으로 말해요 · "+(r.stage+1)+"번째 제시어",
        "제시어를 몸짓으로 표현하고 자세를 잠깐 유지하세요");
      ink(ctx,cue.icon,w*.29,h*.43,clamp(s*.19,48,112));
      ink(ctx,cue.name,w*.29,h*.61,clamp(s*.053,18,29),"#ffdfa4");
      guideCard(ctx,w,h,"🎭",cue.name,cue.pose,r.completed,"몸으로 표현");
      ink(ctx,cue.guide,w*.5,h*.82,clamp(s*.028,11,17),"#e3f8e9");
      progress(ctx,w,h,r.phase/3.50,r.completed?"#8ee6c0":"#fcd59c");
      break;
    }
    case "human-orchestra":{
      const part=ORCHESTRA[(r.stage*3)%ORCHESTRA.length];
      panel(ctx,w,h,"🎻 휴먼 오케스트라 · NOTE "+(r.stage+1),
        "지휘자의 박자에 맞춰 새 자세를 만들면 악기가 연주돼요");
      const colors=["#b8e6ff","#ffe1a7","#e4c2ff","#baffc7","#ffd2dc"];
      for(let i=0;i<5;i++){
        const at=ORCHESTRA[(i*3)%5];
        const x=w*(.12+i*.19),y=h*.81;
        ring(ctx,x,y,s*.041,i===r.stage%5?colors[i]:"#7097b0",i===r.stage%5);
        ink(ctx,at.icon,x,y,clamp(s*.042,13,24));
      }
      guideCard(ctx,w,h,part.icon,part.name,part.pose,r.completed,"연주하세요!");
      ink(ctx,r.completed?"♪ "+part.name+" 연주 성공!":"NEXT → "+part.name,
        w*.34,h*.65,clamp(s*.037,15,22),r.completed?"#bbffdd":"#ffe1b6");
      progress(ctx,w,h,r.phase/2.15,r.completed?"#99f9d5":"#a7c4f8");
      break;
    }
    case "shadow-theater":{
      const chapter=SHADOW_STORY[r.stage%SHADOW_STORY.length];
      // On-screen darkened silhouette, with a local theater curtain and a moving story.
      backdrop(ctx,w,h,"rgba(30,24,72,.38)","rgba(7,16,40,.65)");
      ctx.fillStyle="rgba(255,228,166,.24)";ctx.beginPath();
      ctx.ellipse(w*.5,h*.48,w*.32,h*.33,0,0,Math.PI*2);ctx.fill();
      ground(ctx,w,h);
      ctx.fillStyle="rgba(95,16,52,.78)";
      ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(w*.17,0);ctx.lineTo(w*.09,h*.88);
      ctx.lineTo(0,h*.92);ctx.closePath();ctx.fill();
      ctx.beginPath();ctx.moveTo(w,0);ctx.lineTo(w*.83,0);ctx.lineTo(w*.91,h*.88);
      ctx.lineTo(w,h*.92);ctx.closePath();ctx.fill();
      if(pose){
        ctx.save();ctx.strokeStyle="#07101e";ctx.lineWidth=clamp(s*.026,7,19);
        ctx.lineCap="round";ctx.lineJoin="round";ctx.shadowColor="#000";ctx.shadowBlur=8;
        for(const [a,b] of BONES){
          const p=storyJoint(pose,a,view),q=storyJoint(pose,b,view);
          if(!p||!q)continue;ctx.beginPath();ctx.moveTo(p.x*w,p.y*h);ctx.lineTo(q.x*w,q.y*h);ctx.stroke();
        }
        const head=storyJoint(pose,0,view);
        if(head){ctx.beginPath();ctx.arc(head.x*w,head.y*h,s*.05,0,Math.PI*2);
          ctx.fillStyle="#07101e";ctx.fill();}
        ctx.restore();
      }
      panel(ctx,w,h,"🎭 그림자 극장 · ACT "+(r.stage%6+1)+"/6",
        chapter.title+" · "+chapter.caption);
      guideCard(ctx,w,h,chapter.icon,chapter.title,chapter.pose,r.completed,"실루엣 포즈");
      ink(ctx,r.completed?"장면 완성!":"빛을 등지고 포즈를 만들어요",
        w*.32,h*.79,clamp(s*.029,11,18),"#ffdfab");
      progress(ctx,w,h,r.phase/3.30,r.completed?"#b4fbcf":"#d6b8ef");
      break;
    }
  }
  ctx.restore();
}
