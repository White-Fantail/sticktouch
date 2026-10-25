/** Canvas scenes for the two motion games; preview and solo renderer stay unchanged. */
import {mapPoint,type Viewport} from "../../core.ts";
import type {PlayerFrame,PlayerId} from "../../tracking/multiplayer.ts";
import type {DuoRound} from "./game.ts";
const COLORS:Record<PlayerId,string>={p1:"#7ef3d7",p2:"#ffabdf"};
const ids:readonly PlayerId[]=["p1","p2"];
function text(ctx:CanvasRenderingContext2D,str:string,x:number,y:number,size:number,color="#fff"){
 ctx.font="800 "+size+"px system-ui";ctx.textAlign="center";ctx.textBaseline="middle";
 ctx.lineWidth=3;ctx.strokeStyle="#09162a";ctx.strokeText(str,x,y);ctx.fillStyle=color;ctx.fillText(str,x,y);
}
function panel(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,color:string){
 ctx.fillStyle="#091c35e9";ctx.strokeStyle=color;ctx.lineWidth=2;
 ctx.beginPath();ctx.roundRect(x,y,w,h,10);ctx.fill();ctx.stroke();
}
export function paintRedLightScene(ctx:CanvasRenderingContext2D,r:DuoRound,v:Viewport){
 const w=v.width,h=v.height,s=r.redLight;
 const start=Math.max(38,w*.09),end=w-Math.max(70,w*.14);
 const top=Math.max(37,h*.10),gap=Math.max(37,Math.min(66,h*.13));
 ctx.save();panel(ctx,start-26,top-27,end-start+99,gap*2+65,s.phase==="stop"?"#ff6e88":"#70f6ce");
 text(ctx,s.phase==="go"?"🟢 움직이세요!":"🔴 멈추세요!",w*.45,top-9,Math.max(12,Math.min(22,w*.037)),
  s.phase==="go"?"#a0ffe0":"#ffb1bc");
 text(ctx,s.remaining.toFixed(1)+"초",end+28,top-9,Math.max(12,Math.min(17,w*.028)));
 ids.forEach((id,i)=>{
   const p=s.players[id],y=top+22+gap*i,x=start+(end-start)*p.progress;
   ctx.lineCap="round";ctx.lineWidth=6;ctx.strokeStyle="#69849f";
   ctx.beginPath();ctx.moveTo(start,y);ctx.lineTo(end,y);ctx.stroke();
   ctx.strokeStyle=COLORS[id];ctx.beginPath();ctx.moveTo(start,y);ctx.lineTo(x,y);ctx.stroke();
   ctx.fillStyle=p.flash>0?"#ff627f":COLORS[id];ctx.beginPath();ctx.arc(x,y,11,0,Math.PI*2);ctx.fill();
   text(ctx,id.toUpperCase(),start-5,y-15,11,COLORS[id]);
   text(ctx,p.flash>0?"❌":p.progress>=1?"🏁":"🏃",x,y-19,Math.max(17,Math.min(25,w*.04)));
   if(p.flash>0)text(ctx,"걸렸다! 출발점!",w*.5,y,Math.max(13,Math.min(19,w*.036)),"#ffb6c1");
   text(ctx,Math.round(p.progress*100)+"%",end+29,y,12,COLORS[id]);
 });
 text(ctx,"🤖",end+4,top+gap*2+12,Math.max(19,Math.min(30,w*.05)));
 ctx.restore();
}
function point(p:PlayerFrame,i:number,v:Viewport){
 const pt=p.pose?.[i];if(!pt||!Number.isFinite(pt.x)||!Number.isFinite(pt.y)||
   (pt.visibility??1)<.5||(pt.presence??1)<.5)return null;
 return mapPoint(pt.x,pt.y,v);
}
export function paintRopeScene(ctx:CanvasRenderingContext2D,r:DuoRound,
 players:readonly [PlayerFrame,PlayerFrame],v:Viewport){
 const w=v.width,h=v.height,u=Math.min(w,h);
 ctx.save();
 ids.forEach((id,i)=>{
   const p=r.rope.players[id],f=players[i],l=point(f,15,v),rr=point(f,16,v);
   const hip1=point(f,23,v),hip2=point(f,24,v);
   const x=hip1&&hip2?(hip1.x+hip2.x)/2:w*(i===0?.25:.75);
   const y=hip1&&hip2?(hip1.y+hip2.y)/2:h*.52;
   if(l&&rr){
     const bend=Math.cos(p.phase)>0?y+u*.38:y-u*.34;
     ctx.strokeStyle=COLORS[id];ctx.lineWidth=Math.max(3,u*.007);
     ctx.shadowColor=COLORS[id];ctx.shadowBlur=17;ctx.lineCap="round";
     ctx.beginPath();ctx.moveTo(l.x,l.y);
     ctx.bezierCurveTo(x-u*.22,bend,x+u*.22,bend,rr.x,rr.y);ctx.stroke();
     ctx.shadowBlur=0;ctx.fillStyle="#fff4c2";
     for(const tip of [l,rr]){ctx.beginPath();ctx.arc(tip.x,tip.y,5,0,Math.PI*2);ctx.fill();}
   }
   const bx=w*(i===0?.21:.79),by=h*.07;
   panel(ctx,bx-67,by,134,54,COLORS[id]);
   text(ctx,id.toUpperCase()+" · "+p.count+"회",bx,by+27,Math.max(15,Math.min(21,w*.035)),COLORS[id]);
   if(p.airborne)text(ctx,"JUMP!",x,y-u*.23,Math.max(16,w*.03),"#fff2a6");
 });
 text(ctx,"손 회전 + 점프 = 1회",w*.5,h*.91,Math.max(14,Math.min(22,w*.032)));
 ctx.restore();
}
