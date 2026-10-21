import type {Point} from "../../core.ts";
import type {SportRound,SportBall,SportPin} from "./game.ts";

const clamp=(v:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,v));
function label(ctx:CanvasRenderingContext2D,t:string,x:number,y:number,size:number,color="#f5fbff"){
  ctx.fillStyle=color;ctx.font="700 "+size+"px system-ui";
  ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(t,x,y);
}
function banner(ctx:CanvasRenderingContext2D,w:number,h:number,title:string,sub:string){
  const bw=Math.min(w-16,560),y=Math.max(53,h*.11);
  ctx.fillStyle="rgba(6,24,45,.88)";
  ctx.beginPath();ctx.roundRect((w-bw)/2,y,bw,65,12);ctx.fill();
  label(ctx,title,w/2,y+23,Math.min(21,Math.max(15,w*.035)));
  label(ctx,sub,w/2,y+46,Math.min(13,Math.max(10,w*.025)),"#a9e8ed");
}
function ring(ctx:CanvasRenderingContext2D,x:number,y:number,r:number,color:string,fill="rgba(9,34,56,.38)"){
  ctx.beginPath();ctx.arc(x,y,r,0,2*Math.PI);
  ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle=color;ctx.lineWidth=3;ctx.stroke();
}
function line(ctx:CanvasRenderingContext2D,ax:number,ay:number,bx:number,by:number,color:string,lw=3){
  ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);
  ctx.strokeStyle=color;ctx.lineWidth=lw;ctx.stroke();
}
function ball(ctx:CanvasRenderingContext2D,b:SportBall,w:number,h:number,symbol:string,color:string){
  const x=b.x*w,y=b.y*h,r=b.r*Math.min(w,h);
  ctx.save();ctx.shadowColor=color;ctx.shadowBlur=17;
  ring(ctx,x,y,r,color,"rgba(8,26,45,.70)");
  ctx.shadowBlur=0;
  label(ctx,symbol,x,y,Math.max(16,r*1.55));ctx.restore();
}
function pin(ctx:CanvasRenderingContext2D,p:SportPin,w:number,h:number){
  const x=p.x*w,y=p.y*h,s=Math.min(w,h);
  ctx.save();ctx.translate(x,y);ctx.rotate(p.down?.85:0);
  ctx.shadowBlur=9;ctx.shadowColor="#fff3c2";
  ctx.fillStyle=p.down?"#ffb7aa":"#f5f4e7";
  ctx.beginPath();ctx.roundRect(-s*.014,-s*.028,s*.028,s*.058,s*.012);ctx.fill();
  ctx.fillStyle="#ef5e74";ctx.fillRect(-s*.014,-s*.009,s*.028,s*.009);
  ctx.restore();
}
export function paintSportScene(ctx:CanvasRenderingContext2D,r:SportRound,w:number,h:number,points:readonly Point[]){
  const s=Math.min(w,h);
  ctx.save();
  switch(r.kind){
    case "super-goalkeeper":{
      banner(ctx,w,h,"🥅 슈퍼 골키퍼 · "+r.stage+"세이브",
        "손이나 발을 움직여 날아오는 공을 막으세요");
      // Goal mouth and approaching ball trail.
      ctx.fillStyle="rgba(91,210,255,.11)";
      ctx.fillRect(w*.13,h*.82,w*.74,h*.13);
      ctx.strokeStyle="#c8faff";ctx.lineWidth=5;
      ctx.beginPath();ctx.moveTo(w*.13,h*.95);ctx.lineTo(w*.13,h*.82);
      ctx.lineTo(w*.87,h*.82);ctx.lineTo(w*.87,h*.95);ctx.stroke();
      ctx.strokeStyle="rgba(219,248,255,.25)";ctx.lineWidth=1;
      for(let i=1;i<=7;i++)line(ctx,w*(.13+.74*i/8),h*.83,w*(.13+.74*i/8),h*.95,"#d9f8ff33",1);
      for(const b of r.balls){
        line(ctx,b.x*w-b.vx*w*.15,b.y*h-b.vy*h*.15,b.x*w,b.y*h,"#bce9ff77",4);
        ball(ctx,b,w,h,"⚽","#baf4ff");
      }
      break;
    }
    case "air-pingpong":{
      banner(ctx,w,h,"🏓 에어 핑퐁 · "+r.stage+"랠리",
        "손바닥을 움직여 공을 치고 위쪽 상대에게 돌려보내세요");
      ctx.fillStyle="rgba(31,109,151,.13)";ctx.fillRect(w*.075,h*.2,w*.85,h*.66);
      ctx.setLineDash([6,8]);line(ctx,w*.075,h*.51,w*.925,h*.51,"#d5faff9a",2);
      ctx.setLineDash([]);line(ctx,w*.23,h*.13,w*.77,h*.13,"#ffa685",8);
      label(ctx,"AI",w*.5,h*.15,13,"#ffcab4");
      for(const p of points.filter(p=>p.part==="leftHand"||p.part==="rightHand")){
        ring(ctx,p.x,p.y,Math.max(20,p.radius*1.6),"#87ffce","rgba(42,246,175,.15)");
      }
      for(const b of r.balls)ball(ctx,b,w,h,"●","#fbf7d1");
      break;
    }
    case "motion-bowling":{
      banner(ctx,w,h,"🎳 모션 볼링 · "+r.stage+"번째 투구",
        "손을 아래에서 위로 스윙해 공을 굴리세요");
      ctx.fillStyle="rgba(187,130,76,.27)";
      ctx.beginPath();ctx.moveTo(w*.29,h*.16);ctx.lineTo(w*.71,h*.16);
      ctx.lineTo(w*.94,h*.98);ctx.lineTo(w*.06,h*.98);ctx.closePath();ctx.fill();
      line(ctx,w*.29,h*.16,w*.06,h*.98,"#ffd6a0",3);
      line(ctx,w*.71,h*.16,w*.94,h*.98,"#ffd6a0",3);
      for(const p of r.pins)pin(ctx,p,w,h);
      if(!r.balls.length){
        label(ctx,"↟ 손을 위로 빠르게 스윙!",w*.5,h*.81,18,"#ffe2a4");
      }
      for(const b of r.balls)ball(ctx,b,w,h,"●","#ffdb93");
      label(ctx,"핀 "+r.pins.filter(p=>p.down).length+" / 10",w*.5,h*.91,15);
      break;
    }
    case "zero-g-basketball":{
      banner(ctx,w,h,"🏀 무중력 농구 · "+r.stage+"번째 슛",
        "손을 골대 방향으로 위로 휘둘러 공을 던지세요");
      for(let i=0;i<11;i++){
        const x=(i*97%89)/100*w,y=(i*43%81)/100*h;
        ring(ctx,x,y,1.1,"rgba(185,220,255,.6)","rgba(185,220,255,.5)");
      }
      ctx.strokeStyle="#b6dfff";ctx.lineWidth=4;
      ctx.strokeRect(w*.856,h*.24,w*.014,h*.22);
      line(ctx,w*.735,h*.39,w*.855,h*.39,"#ffb774",5);
      for(let i=0;i<5;i++)line(ctx,w*(.74+i*.024),h*.40,
        w*(.752+i*.017),h*.48,"#f2f1ecaa",1.5);
      label(ctx,"GOAL",w*.79,h*.29,15,"#c9faff");
      for(const b of r.balls)ball(ctx,b,w,h,"🏀","#ffc081");
      if(!r.balls.length)label(ctx,"↗ 손을 빠르게 들어 올려 슛!",w*.50,h*.78,17,"#e2ffcd");
      break;
    }
    case "fishing-master":{
      banner(ctx,w,h,"🎣 피싱 마스터 · "+r.stage+"번째 캐스팅",
        "손을 휘둘러 던지고 물고기가 물면 손을 위로 당기세요");
      const ocean=ctx.createLinearGradient(0,h*.63,0,h);
      ocean.addColorStop(0,"rgba(38,151,192,.30)");
      ocean.addColorStop(1,"rgba(11,78,155,.6)");
      ctx.fillStyle=ocean;ctx.fillRect(0,h*.63,w,h*.37);
      for(let i=0;i<16;i++){
        const x=(i*.091+r.phase*.021)%1*w;
        line(ctx,x,h*.63+Math.sin(i*.8+r.phase)*3,x+s*.026,h*.63+Math.sin(i*.8+r.phase)*3,
          "#8be7fe",1.5);
      }
      for(const f of r.fish){
        const x=f.x*w,y=f.y*h;
        label(ctx,f.vx<0?"🐟":"🐠",x,y,Math.min(35,Math.max(22,s*.069)));
      }
      if(r.hook){
        const p=points.find(p=>p.part==="leftHand"||p.part==="rightHand");
        if(p)line(ctx,p.x,p.y,r.hook.x*w,r.hook.y*h,"#e8f7ffce",1.6);
        ring(ctx,r.hook.x*w,r.hook.y*h,s*.019,
          r.hooked!==null?"#f9f28c":"#e5ebf3");
        if(r.hooked!==null)label(ctx,"⬆ 위로 당기세요!",w*.5,h*.54,17,"#ffe6a9");
      }else label(ctx,"↗ 손을 휘둘러 낚싯줄을 던지세요",w*.5,h*.55,16);
      break;
    }
    case "i-am-gravity":{
      banner(ctx,w,h,"🪐 내가 중력이다",
        "왼손을 움직이면 끌어당기고 · 오른손은 밀어내요");
      const gx=w*.78,gy=h*.21;
      ctx.save();ctx.shadowColor="#a8a0ff";ctx.shadowBlur=26;
      ring(ctx,gx,gy,s*.065,"#e8b9ff","rgba(137,80,255,.35)");
      label(ctx,"◎",gx,gy,Math.max(24,s*.10),"#f9dbff");ctx.restore();
      for(const b of r.balls){
        line(ctx,(b.x-b.vx*.10)*w,(b.y-b.vy*.10)*h,b.x*w,b.y*h,"#aedcff66",2);
        ball(ctx,b,w,h,b.charged?"✦":"●",b.charged?"#a7f7df":"#9ad7ff");
      }
      for(const p of points.filter(p=>p.part==="leftHand"||p.part==="rightHand")){
        const attract=p.part==="leftHand";
        ctx.setLineDash([4,7]);ring(ctx,p.x,p.y,s*.14,
          attract?"#8bfdd2":"#ffabcb","rgba(4,24,38,.03)");ctx.setLineDash([]);
        label(ctx,attract?"＋":"−",p.x,p.y-s*.16,21,attract?"#9affdc":"#ffbec9");
      }
      break;
    }
  }
  ctx.restore();
}
