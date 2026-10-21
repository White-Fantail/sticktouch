import type {BodyRound} from "./game";
import {SWITCHES,LIMBS,POSE_WALLS,BRAIN_TASKS,OPPOSITES,YOGA_NAMES,
  TEACHER_TASKS,PLATES,LOCKS} from "./game";

const COLORS=["#77e4ff","#ffc878","#b7eea7","#dba8ff"];
const symbol=["✋","✋","🦶","🦶"];
function disk(ctx:CanvasRenderingContext2D,x:number,y:number,r:number,fill:string,stroke="#fff",line=3){
  ctx.beginPath();ctx.arc(x,y,r,0,2*Math.PI);ctx.fillStyle=fill;ctx.fill();
  ctx.strokeStyle=stroke;ctx.lineWidth=line;ctx.stroke();
}
function text(ctx:CanvasRenderingContext2D,s:string,x:number,y:number,size=17,color="#fff"){
  ctx.fillStyle=color;ctx.font="700 "+size+"px system-ui";
  ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(s,x,y);
}
function panel(ctx:CanvasRenderingContext2D,title:string,sub:string,w:number,h:number){
  const width=Math.min(w-20,610),y=Math.max(52,h*.10);
  ctx.beginPath();ctx.roundRect((w-width)/2,y,width,69,14);
  ctx.fillStyle="rgba(4,20,37,.89)";ctx.fill();
  text(ctx,title,w/2,y+24,Math.max(15,Math.min(23,w*.035)));
  text(ctx,sub,w/2,y+50,Math.max(11,Math.min(14,w*.023)),"#b8e5ed");
}
function bar(ctx:CanvasRenderingContext2D,w:number,h:number,progress:number,color="#8df2d5"){
  const length=Math.min(330,w*.64),x=(w-length)/2,y=h*.87;
  ctx.fillStyle="#182b45";ctx.beginPath();ctx.roundRect(x,y,length,10,5);ctx.fill();
  ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,length*Math.max(0,Math.min(1,progress)),10,5);ctx.fill();
}
function target(ctx:CanvasRenderingContext2D,w:number,h:number,
  at:{x:number;y:number},color:string,label:string,active=true,radius=.073){
  const s=Math.min(w,h),x=at.x*w,y=at.y*h;
  ctx.globalAlpha=active?1:.34;
  ctx.shadowColor=color;ctx.shadowBlur=active?16:0;
  disk(ctx,x,y,radius*s,active?"#123350":"#16273b",color,active?4:2);
  ctx.shadowBlur=0;text(ctx,label,x,y,Math.max(13,s*.046),color);
  ctx.globalAlpha=1;
}
const POSE_NAMES:Record<string,string>={
  "t-pose":"비행기","arms-up":"만세","star":"큰 별",
  "squat":"앉기","one-arm-up":"한 손 위","hands-hips":"허리에 손"
};
function figure(ctx:CanvasRenderingContext2D,shape:string,x:number,y:number,size:number){
  const shapes:Record<string,[number,number,number,number]>={
    "t-pose":[-1,0,1,0],"arms-up":[-.63,-1,.63,-1],"star":[-1,-.9,1,-.9],
    "squat":[-.55,.65,.55,.65],"one-arm-up":[-.7,-1,.7,.55],
    "hands-hips":[-.36,.5,.36,.5]
  };
  const p=shapes[shape]??shapes["t-pose"];
  ctx.save();ctx.translate(x,y);ctx.strokeStyle="#d4fbfb";ctx.lineWidth=6;
  ctx.lineCap="round";ctx.shadowBlur=9;ctx.shadowColor="#74ffde";
  const line=(a:number,b:number,c:number,d:number)=>{ctx.beginPath();ctx.moveTo(a*size,b*size);
    ctx.lineTo(c*size,d*size);ctx.stroke();};
  ctx.beginPath();ctx.arc(0,-.76*size,size*.22,0,2*Math.PI);ctx.stroke();
  line(0,-.48,0,.62);line(-.17,-.34,p[0],p[1]);line(.17,-.34,p[2],p[3]);
  const spread=shape==="star"?.85:shape==="squat"?.60:.38;
  line(0,.62,-spread,shape==="squat"?.85:1.5);
  line(0,.62,spread,shape==="squat"?.85:1.5);
  ctx.restore();
}
function warning(ctx:CanvasRenderingContext2D,w:number,h:number,message:string,hot:boolean){
  const y=h*.74;
  ctx.fillStyle=hot?"rgba(251,60,93,.22)":"rgba(255,187,87,.13)";
  ctx.fillRect(0,y-30,w,70);
  text(ctx,message,w/2,y,Math.min(22,Math.max(15,w*.032)),hot?"#ff8d9f":"#ffe2a1");
}
export function paintBodyScene(ctx:CanvasRenderingContext2D,r:BodyRound,w:number,h:number){
  const s=Math.min(w,h);
  ctx.save();ctx.textAlign="center";ctx.textBaseline="middle";
  switch(r.kind){
    case "bomb-defusal":{
      const seq=[0,2,1,3,1,0,3,2];
      const index=seq[(r.stage*3+r.index)%seq.length];
      panel(ctx,"💣 폭탄 해체반 · "+(r.stage+1)+"번째 폭탄",
        "순서대로 신체 부위로 누르세요 · "+(r.index+1)+"/4 · 남은 "+Math.max(0,3.4-r.phase).toFixed(1)+"초",w,h);
      ctx.strokeStyle="#ec9ba4";ctx.lineWidth=4;
      ctx.beginPath();ctx.roundRect(w*.09,h*.25,w*.82,h*.69,18);ctx.stroke();
      SWITCHES.forEach((p,i)=>target(ctx,w,h,p,COLORS[i],symbol[i],i===index));
      text(ctx,["왼손","오른손","왼발","오른발"][index]+"을 해당 스위치로!",w*.5,h*.68,17);
      bar(ctx,w,h,r.index/4,"#9df4bd");break;
    }
    case "human-tetris":{
      const shape=POSE_WALLS[r.stage%POSE_WALLS.length];
      panel(ctx,"🧱 휴먼 테트리스 · WALL "+(r.stage+1),
        "다가오는 벽의 모양을 온몸으로 만들어요",w,h);
      const progress=Math.min(1,r.phase/3.1),grow=.60+progress*.34;
      ctx.fillStyle=r.completed?"rgba(88,232,163,.13)":"rgba(99,147,233,.23)";
      ctx.strokeStyle=r.completed?"#80f7b6":"#88b5ff";ctx.lineWidth=8;
      ctx.beginPath();ctx.roundRect(w*(1-grow)/2,h*(1-grow)/2,w*grow,h*grow,20);ctx.fill();ctx.stroke();
      figure(ctx,shape,w*.5,h*.48,s*.18);
      text(ctx,r.completed?"✓ 통과!":POSE_NAMES[shape],w*.5,h*.77,22,
        r.completed?"#8dffd1":"#e7f9ff");
      bar(ctx,w,h,progress,r.completed?"#8dffd1":"#efbb7a");break;
    }
    case "left-right-brain":{
      panel(ctx,"🧠 좌뇌 우뇌 · 동시에 다른 동작!",
        "왼쪽과 오른쪽 손의 서로 다른 지시를 맞춰요",w,h);
      const words=BRAIN_TASKS[r.stage%4].split(" · ");
      for(let i=0;i<2;i++){
        const x=i===0?.27:.73;
        ctx.fillStyle=i===0?"rgba(83,209,255,.22)":"rgba(255,171,106,.22)";
        ctx.beginPath();ctx.roundRect(w*(i===0?.07:.53),h*.29,w*.4,h*.47,16);ctx.fill();
        text(ctx,i===0?"LEFT":"RIGHT",w*x,h*.40,16,COLORS[i]);
        text(ctx,words[i]??"",w*x,h*.54,Math.max(14,s*.04));
      }
      text(ctx,r.completed?"✓ 두뇌 동기화":"양손을 동시에 맞춰 0.4초 유지!",w*.5,h*.79,16);
      bar(ctx,w,h,r.hold/.42);break;
    }
    case "ninja-training":{
      const at={x:r.stage%2===0?.23:.77,y:r.stage%3===0?.40:.52};
      const mode=r.stage%3;
      panel(ctx,"🥷 닌자 트레이닝","첫 2초에 표창을 터치하고 다음 장애물을 피하세요",w,h);
      if(r.phase<2){
        target(ctx,w,h,at,"#ffe07d","✦",!r.completed,.11);
        text(ctx,r.stage%2===0?"왼손으로 공격!":"오른손으로 공격!",w*.5,h*.69,18);
      }else{
        const cmd=["앉아서 피하세요!","왼쪽으로 기울여요!","오른쪽으로 기울여요!"][mode];
        ctx.fillStyle="rgba(255,95,104,.3)";
        ctx.fillRect(mode===0?0:mode===1?w*.56:0,
          mode===0?h*.30:0,mode===0?w: w*.44,mode===0?h*.1:h);
        warning(ctx,w,h,cmd,!r.waveScored);
      }
      bar(ctx,w,h,r.phase/3.2,r.waveScored?"#83f4c4":"#ffc77d");break;
    }
    case "volcano-escape":{
      const lava=r.stage%2===0,progress=Math.min(1,r.phase/2.8);
      ctx.fillStyle=lava?"rgba(249,89,47,.26)":"rgba(121,72,132,.23)";
      ctx.fillRect(0,h*(.96-.46*progress),w,h*.5);
      panel(ctx,"🌋 화산 탈출 · WAVE "+(r.stage+1),
        lava?"발을 실제로 들어 점프해 용암을 피하세요":"화산재가 내려와요 · 무릎을 굽혀 숙이세요",w,h);
      text(ctx,r.waveScored?"✓ 회피 성공!":lava?"⬆ 점프!":"⬇ 숙이기!",
        w*.5,h*.66,27,r.waveScored?"#9dffce":"#ffcd9a");
      bar(ctx,w,h,progress,"#fc9f73");break;
    }
    case "trick-teacher":{
      const honest=r.stage%3!==2,cmd=TEACHER_TASKS[r.stage%TEACHER_TASKS.length];
      panel(ctx,"👨‍🏫 선생님을 속여라",
        "초록색이면 따라하고 빨간색이면 허리에 손을 올리세요",w,h);
      ctx.fillStyle=honest?"rgba(93,232,155,.28)":"rgba(245,104,121,.28)";
      ctx.beginPath();ctx.roundRect(w*.16,h*.30,w*.68,h*.36,20);ctx.fill();
      text(ctx,honest?"✅ 선생님 말씀!":"🚫 속임수!",w*.5,h*.40,26,
        honest?"#a9ffd2":"#ffb2b5");
      text(ctx,honest?cmd:"속지 마세요 · 허리에 손!",w*.5,h*.56,23);
      text(ctx,r.completed?"성공!":"자세를 바꿔 잠깐 유지하세요",w*.5,h*.77,17);
      bar(ctx,w,h,r.hold/.42);break;
    }
    case "do-opposite":{
      panel(ctx,"↔ 반대로 해!","글씨 그대로가 아니라 반대 동작을 해야 해요",w,h);
      text(ctx,"화면의 지시",w*.5,h*.32,17,"#cad8e8");
      text(ctx,OPPOSITES[r.stage%4],w*.5,h*.48,32,"#ffda83");
      text(ctx,"⚡ 반대로 움직여요!",w*.5,h*.67,20,"#91f3d5");
      text(ctx,r.completed?"✓ 정답":"",w*.5,h*.77,22);
      bar(ctx,w,h,r.hold/.38);break;
    }
    case "weird-yoga":{
      panel(ctx,"🧘 이상한 요가 · POSE "+(r.stage+1),
        "정확한 자세를 1초 이상 안정적으로 유지하세요",w,h);
      const name=YOGA_NAMES[r.stage%5];
      ctx.fillStyle="rgba(153,118,238,.19)";ctx.beginPath();
      ctx.roundRect(w*.12,h*.27,w*.76,h*.53,18);ctx.fill();
      text(ctx,name,w*.5,h*.43,Math.max(19,s*.052),"#eac6ff");
      const descriptions=[
        "두 팔 위 · 왼발 들어 올리기","두 팔 위 · 오른발 들어 올리기",
        "양팔 옆으로 · 다리 넓게","무릎 굽히고 팔 위로",
        "한 손은 몸 가까이 · 한 손은 바깥쪽"
      ];
      text(ctx,descriptions[r.stage%5],w*.5,h*.60,17);
      text(ctx,r.completed?"✓ 완벽해요!":"흔들리면 유지 시간이 초기화돼요",w*.5,h*.74,15);
      bar(ctx,w,h,r.hold/1.05);break;
    }
    case "balance-tower":{
      const lean=[-1,1,0,-1,1][r.stage%5];
      panel(ctx,"🏗️ 밸런스 타워 · "+r.stage+"층",
        "상체를 살짝 움직여 목표 위치에서 균형을 유지하세요",w,h);
      const at={x:.5+lean*.20,y:.43};
      target(ctx,w,h,at,"#a1f5f1",lean===-1?"◀":lean===1?"▶":"●",true,.11);
      for(let i=0;i<Math.min(8,r.stage);i++){
        const x=.44+(i%2)*.04;
        ctx.fillStyle=i%2?"#99c8f4":"#f5cf96";
        ctx.fillRect(w*x,h*(.79-i*.049),w*.12,h*.037);
      }
      text(ctx,r.completed?"✓ 블록 쌓기 성공!":"몸을 "+(lean===-1?"왼쪽":lean===1?"오른쪽":"중앙")+"으로 기울여요",
        w*.5,h*.72,18);
      bar(ctx,w,h,r.hold/1.05);break;
    }
    case "perfect-symmetry":{
      const level=r.stage%3,labels=["두 팔 위로","두 팔 옆으로","두 팔 아래로"];
      panel(ctx,"🪞 완벽한 대칭 · "+(r.stage+1)+"단계",
        "양팔 높이와 벌림을 좌우 거울처럼 동일하게 맞추세요",w,h);
      const yy=[.29,.48,.70][level];
      ctx.strokeStyle="#adfaff";ctx.setLineDash([8,7]);ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(w*.5,h*.25);ctx.lineTo(w*.5,h*.82);ctx.stroke();ctx.setLineDash([]);
      for(const x of [.26,.74])target(ctx,w,h,{x,y:yy},COLORS[level],"✋",true,.089);
      text(ctx,r.completed?"✓ PERFECT":labels[level],w*.5,h*.78,20);
      bar(ctx,w,h,r.hold/.92);break;
    }
    case "intruder-alarm":{
      const side=r.stage%2,plate=PLATES[side],lock=LOCKS[1-side];
      panel(ctx,"🚨 침입자 경보 · LOCK "+(r.stage+1),
        "발로 바닥 스위치를 밟아 유지하면서 반대쪽 손으로 해제!",w,h);
      target(ctx,w,h,plate,r.plateReady?"#8bffd8":"#ffce89",side===0?"왼발":"오른발",true,.092);
      target(ctx,w,h,lock,r.hold>=.48?"#8bffd8":"#b1b9c5",
        side===0?"오른손":"왼손",r.hold>=.48,.082);
      ctx.strokeStyle="#ffb9a4";ctx.lineWidth=3;ctx.setLineDash([6,8]);
      ctx.beginPath();ctx.moveTo(plate.x*w,plate.y*h);ctx.lineTo(lock.x*w,lock.y*h);ctx.stroke();ctx.setLineDash([]);
      text(ctx,!r.plateReady?"발을 밖에서 스위치로 이동하세요":
        r.hold<.48?"발을 유지하세요":"발 유지 + 손으로 자물쇠 터치!",
        w*.5,h*.71,17);
      bar(ctx,w,h,r.hold/.48);break;
    }
  }
  ctx.restore();
}
