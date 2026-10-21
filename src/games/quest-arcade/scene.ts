import type {Landmark,Point,Viewport} from "../../core.ts";
import type {QuestRound,Vec} from "./game.ts";
import {COMMAND_BUTTONS,GARDEN_BEDS,MONSTER_PARTS,PROGRAMS,RESCUE_SITES,
  TREASURES,reflectedLaser,requiredPathPart} from "./game.ts";

const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
const xy=(v:Vec,w:number,h:number):[number,number]=>[v.x*w,v.y*h];
function text(ctx:CanvasRenderingContext2D,s:string,x:number,y:number,size:number,color="#f3fbff"){
  ctx.font="700 "+Math.round(size)+"px system-ui";ctx.textAlign="center";
  ctx.textBaseline="middle";ctx.fillStyle=color;ctx.fillText(s,x,y);
}
function line(ctx:CanvasRenderingContext2D,a:Vec,b:Vec,w:number,h:number,color:string,width=4){
  ctx.beginPath();ctx.moveTo(...xy(a,w,h));ctx.lineTo(...xy(b,w,h));
  ctx.lineWidth=width;ctx.strokeStyle=color;ctx.stroke();
}
function circle(ctx:CanvasRenderingContext2D,v:Vec,w:number,h:number,rad:number,
  stroke="#a5f8ef",fill="rgba(11,37,67,.75)"){
  ctx.beginPath();ctx.arc(...xy(v,w,h),rad*Math.min(w,h),0,2*Math.PI);
  ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle=stroke;ctx.lineWidth=3;ctx.stroke();
}
function badge(ctx:CanvasRenderingContext2D,w:number,h:number,heading:string,sub:string){
  const bw=Math.min(w-14,630),y=Math.max(52,h*.088);
  ctx.beginPath();ctx.roundRect((w-bw)/2,y,bw,65,13);
  ctx.fillStyle="rgba(5,18,38,.86)";ctx.fill();
  ctx.strokeStyle="#8de4ea77";ctx.lineWidth=1.5;ctx.stroke();
  text(ctx,heading,w*.5,y+21,clamp(w*.035,15,22));
  text(ctx,sub,w*.5,y+46,clamp(w*.022,10,14),"#b6e1e7");
}
function meter(ctx:CanvasRenderingContext2D,w:number,h:number,val:number,label:string){
  const x=w*.21,y=h*.91,bw=w*.58;
  ctx.fillStyle="#0b2642";ctx.beginPath();ctx.roundRect(x,y,bw,10,5);ctx.fill();
  ctx.fillStyle="#9df5d6";ctx.beginPath();ctx.roundRect(x,y,bw*clamp(val,0,1),10,5);ctx.fill();
  text(ctx,label,w*.5,y-14,12,"#dcfff3");
}
function trail(ctx:CanvasRenderingContext2D,points:readonly Vec[],w:number,h:number,
  color:string,width=4){
  if(points.length<2)return;
  ctx.beginPath();ctx.moveTo(...xy(points[0],w,h));
  for(const p of points.slice(1))ctx.lineTo(...xy(p,w,h));
  ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineJoin="round";ctx.lineCap="round";ctx.stroke();
}
function movingDot(ctx:CanvasRenderingContext2D,points:readonly Vec[],phase:number,w:number,h:number,
  offset:number,color:string){
  if(points.length<1)return;
  const index=clamp(Math.floor((phase-offset)/.1),0,points.length-1);
  circle(ctx,points[index],w,h,.035,color,"rgba(130,205,255,.25)");
}
function stars(ctx:CanvasRenderingContext2D,w:number,h:number){
  for(let i=0;i<33;i++){
    const x=((i*83)%97)/100*w,y=((i*37+11)%89)/100*h;
    ctx.fillStyle=i%3===0?"#ffebb6b0":"#a6dcff88";
    ctx.beginPath();ctx.arc(x,y,i%5===0?2:1,0,Math.PI*2);ctx.fill();
  }
}
export function paintQuestScene(ctx:CanvasRenderingContext2D,r:QuestRound,
  w:number,h:number,points:readonly Point[],pose:readonly Landmark[]|undefined,view:Viewport){
  const s=Math.min(w,h);
  ctx.save();
  switch(r.kind){
    case "laser-mirror":{
      badge(ctx,w,h,"🔦 레이저 미러 · "+(r.stage+1)+"단계",
        "팔뚝 거울의 각도를 조절해 빛을 목표로 반사하세요");
      const side=r.stage%2 as 0|1;
      const ray=pose?reflectedLaser(pose,view,side):null;
      const source=side===0?{x:.1,y:.26}:{x:.9,y:.26};
      const goal=side===0?{x:.87,y:.72}:{x:.13,y:.72};
      circle(ctx,source,w,h,.041,"#fff09a");
      circle(ctx,goal,w,h,.075,"#89f9d7");
      text(ctx,"🎯",...xy(goal,w,h),s*.07);
      if(ray){
        line(ctx,ray.source,ray.midpoint,w,h,"#ffe583",5);
        line(ctx,ray.midpoint,r.rayEnd,w,h,r.angle>.94?"#95ffe5":"#ff9f98",4);
        circle(ctx,ray.midpoint,w,h,.033,"#ffd4b0");
      }
      meter(ctx,w,h,Math.max(0,r.angle),"반사 정확도 "+Math.round(Math.max(0,r.angle)*100)+"%");
      break;
    }
    case "space-rescuer":{
      stars(ctx,w,h);
      badge(ctx,w,h,"🚀 우주 구조대 · 구조 "+(r.stage+1),
        r.carrying?"우주인을 태웠어요! 중앙 아래 기지로 돌아오세요":"양손으로 우주선을 움직여 고립된 우주인을 구하세요");
      const target=RESCUE_SITES[r.stage%RESCUE_SITES.length],base={x:.5,y:.84};
      circle(ctx,base,w,h,.085,"#89ffc0");text(ctx,"🏠",...xy(base,w,h),s*.068);
      if(!r.carrying){circle(ctx,target,w,h,.065,"#ffe59d");text(ctx,"🧑‍🚀",...xy(target,w,h),s*.064);}
      const hazard={x:.5+Math.sin(r.phase*1.5)*.21,y:.54};
      circle(ctx,hazard,w,h,.055,"#ff9ea4");
      text(ctx,"☄",...xy(hazard,w,h),s*.075);
      circle(ctx,r.player,w,h,.039,"#a4fdff");
      text(ctx,r.carrying?"🚀🧑‍🚀":"🚀",...xy(r.player,w,h),s*.075);
      meter(ctx,w,h,r.health/3,"우주선 실드 "+r.health+" / 3");
      break;
    }
    case "deep-sea-explorer":{
      ctx.fillStyle="rgba(4,57,100,.42)";ctx.fillRect(0,h*.23,w,h*.77);
      badge(ctx,w,h,"🌊 심해 탐험가 · "+(r.stage+1)+"번째 보물",
        r.carrying?"보물 발견! 수면의 기지로 올라오세요":"잠수함을 손으로 움직여 보물을 회수하세요");
      const target=TREASURES[r.stage%TREASURES.length],base={x:.5,y:.23};
      ctx.fillStyle="#a0f4fe99";ctx.fillRect(0,h*.20,w,2);
      circle(ctx,base,w,h,.081,"#9dffc6");
      text(ctx,"⛵",...xy(base,w,h),s*.061);
      if(!r.carrying){
        circle(ctx,target,w,h,.06,"#ffd28a");
        text(ctx,"💎",...xy(target,w,h),s*.07);
      }
      text(ctx,"🐡",w*(.5+Math.sin(r.phase*1.7)*.32),h*.62,s*.066);
      circle(ctx,r.player,w,h,.04,"#86e4ff");
      text(ctx,"🚤",...xy(r.player,w,h),s*.072);
      for(let i=0;i<12;i++){
        const x=w*((i*31)%93)/100,y=h*(.30+((i*17)%61)/100);
        circle(ctx,{x:x/w,y:y/h},w,h,.006,"#b9e6ff70","rgba(3,26,60,.1)");
      }
      meter(ctx,w,h,r.oxygen,"산소 "+Math.round(r.oxygen*100)+"%");
      break;
    }
    case "memory-ghost":{
      badge(ctx,w,h,"👻 기억의 유령 · "+(r.stage+1)+"번째 동작",
        r.phase<2.45?"오른손으로 크고 다양한 궤적을 그려 기록하세요":"잠시 뒤 나타나는 기억 궤적을 같은 손으로 다시 따라가세요");
      if(r.phase<2.45){
        trail(ctx,r.trace,w,h,"#ffcf85",5);
        meter(ctx,w,h,r.phase/2.45,"동작 녹화 · "+Math.ceil(2.45-r.phase)+"초");
      }else{
        trail(ctx,r.ghost,w,h,"#7ec9ff88",4);
        movingDot(ctx,r.ghost,r.phase,w,h,3.03,"#a9f5ff");
        meter(ctx,w,h,r.matched/Math.max(1,r.ghost.length),
          "재현 "+r.matched+" / "+r.ghost.length+" · 유령을 따라가세요");
      }
      text(ctx,"✋",w*.51,h*.78,s*.08);
      break;
    }
    case "time-bomb-pass":{
      const leftFirst=r.stage%2===0,high=r.stage%4<2;
      const y=high?.42:.68,from={x:leftFirst?.25:.75,y},to={x:leftFirst?.75:.25,y};
      badge(ctx,w,h,"💣 시한폭탄 패스 · "+(r.stage+1)+"번",
        r.step===0?(leftFirst?"왼손으로 폭탄 받기":"오른손으로 폭탄 받기"):
          (leftFirst?"오른손으로 건너편에 전달!":"왼손으로 건너편에 전달!"));
      line(ctx,from,to,w,h,"#f4b97788",4);
      circle(ctx,from,w,h,.077,r.step===0?"#ffe6a4":"#7297a2");
      circle(ctx,to,w,h,.077,r.step===1?"#ffc18b":"#7b9fad");
      text(ctx,r.step===0?"💣":"✓",...xy(from,w,h),s*.095);
      text(ctx,r.step===1?"💣":"✋",...xy(to,w,h),s*.078);
      meter(ctx,w,h,1-r.phase/3.8,"남은 폭발 시간 "+Math.max(0,(3.8-r.phase)).toFixed(1)+"초");
      break;
    }
    case "magic-garden":{
      badge(ctx,w,h,"🌱 매직 가든 · "+(r.stage+1)+"번째 식물",
        ["씨앗을 화분에 심어요","중간 높이의 물방울을 터치해 물을 줘요",
          "두 손을 내렸다가 함께 높이 들어 햇빛을 주세요"][r.step]??"꽃이 피었어요!");
      for(let i=0;i<3;i++){
        const bed={x:GARDEN_BEDS[i],y:.79};
        circle(ctx,bed,w,h,.082,i===r.stage%3?"#ffd389":"#88b89c",
          "rgba(91,57,35,.66)");
        text(ctx,i<r.grown?"🌺":i===r.stage%3&&r.step>0?"🌿":"🌱",
          ...xy({x:bed.x,y:.70},w,h),s*.085);
      }
      const x=GARDEN_BEDS[r.stage%3];
      if(r.step===0){circle(ctx,{x,y:.79},w,h,.065,"#ffe797");text(ctx,"🌰",x*w,h*.79,s*.077);}
      if(r.step===1){circle(ctx,{x,y:.49},w,h,.067,"#99dcff");text(ctx,"💧",x*w,h*.49,s*.08);}
      if(r.step===2){text(ctx,"☀️",w*.5,h*.30,s*.12);meter(ctx,w,h,r.hold/.35,"양손을 머리 위로");}
      break;
    }
    case "monster-maker":{
      const spots:readonly Vec[]=[{x:.5,y:.33},{x:.26,y:.53},{x:.74,y:.53},{x:.5,y:.78}];
      badge(ctx,w,h,"👾 몬스터 메이커 · "+(r.stage+1)+"호",
        r.step<4?MONSTER_PARTS[r.step]+"을 손으로 터치하여 조립하세요":
        r.stage%2===0?"몬스터 완성! 몸을 낮춰 공격을 피하세요":"몬스터 완성! 양팔을 들어 공격을 피하세요");
      ctx.fillStyle="rgba(85,61,110,.45)";
      ctx.beginPath();ctx.ellipse(w*.5,h*.56,s*.13,s*.15,0,0,2*Math.PI);ctx.fill();
      for(let i=0;i<4;i++){
        const p=spots[i];
        circle(ctx,p,w,h,.085,i===r.step?"#ffe4a3":i<r.pieces?"#92f9d5":"#758faa");
        text(ctx,i<r.pieces?["👹","🦾","🦾","🦵"][i]:["👹","🦾","🦾","🦵"][i],
          ...xy(p,w,h),s*.085);
      }
      if(r.step>=4){
        text(ctx,"⚡",w*.19,h*.58,s*.14);
        text(ctx,"⚡",w*.81,h*.58,s*.14);
        meter(ctx,w,h,r.hold/.4,"몬스터의 방어 동작 유지");
      }else meter(ctx,w,h,r.pieces/4,"완성된 부품 "+r.pieces+" / 4");
      break;
    }
    case "time-clone":{
      badge(ctx,w,h,"⏳ 타임 클론 · "+(r.stage+1)+"번째 협력",
        r.phase<2.2?"왼손으로 큰 움직임을 녹화하세요":
          "과거 왼손의 거울 동작을 오른손으로 재현하세요");
      const recorded=r.phase<2.2?r.trace:r.ghost;
      trail(ctx,recorded,w,h,r.phase<2.2?"#ffc89b":"#a5bdff",5);
      if(r.phase>=2.2)movingDot(ctx,r.ghost,r.phase,w,h,2.75,"#c6a8ff");
      const live=points.find(p=>p.part==="rightHand");
      if(live&&r.phase>2.2)circle(ctx,{x:live.x/w,y:live.y/h},w,h,.035,"#ffb7d9");
      meter(ctx,w,h,r.phase<2.2?r.phase/2.2:r.matched/Math.max(1,r.ghost.length),
        r.phase<2.2?"과거의 나 기록 중":"클론 협력 "+r.matched+" / "+r.ghost.length);
      break;
    }
    case "i-am-path":{
      badge(ctx,w,h,"🛤️ 내가 길이다 · "+(r.stage+1)+"번째 길",
        "지정된 부위를 움직여 길을 그리되, 장애물을 피해 목적지까지 이어 보세요");
      const names:{[key:string]:string}={
        leftHand:"왼손",rightHand:"오른손",leftFoot:"왼발",rightFoot:"오른발"
      };
      text(ctx,"사용 부위: "+names[requiredPathPart(r.stage)],w*.5,h*.24,18,"#d2ffd3");
      if(r.armed){
        const danger={x:(r.start.x+r.goal.x)/2,y:(r.start.y+r.goal.y)/2};
        circle(ctx,r.start,w,h,.043,"#a0ffcf");
        circle(ctx,danger,w,h,.055,"#ff7689");
        text(ctx,"✖",...xy(danger,w,h),s*.067);
        circle(ctx,r.goal,w,h,.086,"#ffecaa");
        text(ctx,"🏁",...xy(r.goal,w,h),s*.074);
        trail(ctx,r.drawn,w,h,"#a6ffc6",6);
        circle(ctx,r.player,w,h,.031,"#c4eaff");
        meter(ctx,w,h,r.travel/.4,"길이 "+Math.round(r.travel*100)+"% · 목표로 이동");
      }
      break;
    }
    case "body-programming":{
      badge(ctx,w,h,"🤖 몸으로 프로그래밍 · 퍼즐 "+(r.stage+1),
        r.step===0?"손으로 3개의 화살표 명령을 입력해 로봇을 움직이세요":"입력한 3개 명령을 로봇이 실행하고 있어요");
      const gx=w*.33,gy=h*.37,cw=w*.085,ch=h*.071;
      const goal=PROGRAMS[r.stage%PROGRAMS.length].reduce((p,cmd)=>({
        x:p.x+(cmd==="left"?-1:cmd==="right"?1:0),
        y:p.y+(cmd==="up"?-1:cmd==="down"?1:0)
      }),{x:1,y:2});
      for(let y=0;y<4;y++)for(let x=0;x<4;x++){
        ctx.strokeStyle="#9bc5e688";ctx.lineWidth=1.5;
        ctx.strokeRect(gx+x*cw,gy+y*ch,cw,ch);
      }
      text(ctx,"🏁",gx+(goal.x+.5)*cw,gy+(goal.y+.5)*ch,s*.055);
      if(r.robot.x>=0&&r.robot.x<4&&r.robot.y>=0&&r.robot.y<4)
        text(ctx,"🤖",gx+(r.robot.x+.5)*cw,gy+(r.robot.y+.5)*ch,s*.063);
      for(const b of COMMAND_BUTTONS){
        circle(ctx,{x:b.x,y:b.y},w,h,.061,r.step===0?"#8fe9f2":"#7185a4");
        text(ctx,b.label,b.x*w,b.y*h,s*.083);
      }
      text(ctx,"코드: "+(r.instructions.map(cmd=>({up:"↑",down:"↓",left:"←",right:"→"})[cmd]).join("  ")||"□ □ □"),
        w*.5,h*.86,clamp(w*.045,15,24),"#d6fdef");
      break;
    }
    case "move-world":{
      const titles=["기울이면 중력이 바뀐다","두 팔을 들어 얼음 다리를 만들자",
        "몸을 낮추면 파도가 생긴다"];
      badge(ctx,w,h,"🌍 움직이면 세계가 변한다",titles[r.worldMode]);
      if(r.worldMode===1){
        ctx.fillStyle=r.safe?"#97ecffae":"#2d496d88";
        ctx.fillRect(w*.39,h*.76,w*.26,h*.05);
        text(ctx,r.safe?"❄️ 얼음 다리":"🌊 물에 빠져요",w*.52,h*.72,s*.058);
      }else if(r.worldMode===2){
        ctx.strokeStyle=r.safe?"#a0fff0":"#8caacaaa";ctx.lineWidth=6;
        ctx.beginPath();ctx.moveTo(w*.1,h*.79);
        for(let i=0;i<24;i++)ctx.lineTo(w*(.1+i*.037),h*(.79+Math.sin(i*.57+r.phase*3)*.035));
        ctx.stroke();
      }else{
        text(ctx,"↶ 몸을 좌우로 기울이세요 ↷",w*.5,h*.29,clamp(w*.043,14,21));
      }
      ctx.fillStyle="#19425ba8";ctx.fillRect(0,h*.83,w,h*.08);
      circle(ctx,{x:.87,y:.54},w,h,.077,"#e5b3ff","rgba(111,47,189,.38)");
      text(ctx,"✦",w*.87,h*.54,s*.08);
      circle(ctx,r.ball,w,h,.045,"#ffdfab","rgba(255,175,93,.45)");
      line(ctx,r.ball,{x:r.ball.x-r.velocity.x*.12,y:r.ball.y-r.velocity.y*.12},
        w,h,"#ffe49b77",2);
      text(ctx,"현재 세계 "+(r.stage%3+1)+" / 3",w*.50,h*.90,13);
      break;
    }
  }
  ctx.restore();
}
