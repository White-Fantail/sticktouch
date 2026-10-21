import {BONES,mapPoint,type Viewport} from "../core.ts";
import type {DisplayMode} from "../settings/settings.ts";
import {paint} from "../engine/renderer.ts";
import type {PlayerFrame,PlayerId} from "./multiplayer.ts";

const COLORS:Record<PlayerId,string>={p1:"#7ef3d7",p2:"#ffabdf"};
/** Preview-only overlay. Existing solo game renderer is not changed. */
export function paintTwoPlayerPreview(ctx:CanvasRenderingContext2D,video:HTMLVideoElement,
  players:readonly PlayerFrame[],view:Viewport,mode:DisplayMode,rings:boolean){
  paint(ctx,video,undefined,[],[],view,mode,false);
  ctx.save();
  for(const player of players){
    if(!player.pose)continue;
    const color=COLORS[player.id];
    ctx.lineCap="round";ctx.lineJoin="round";ctx.strokeStyle=color;
    ctx.lineWidth=Math.max(3,view.width/220);
    for(const [a,b] of BONES){
      const p=player.pose[a],q=player.pose[b];
      if(!p||!q||(p.visibility??1)<.5||(q.visibility??1)<.5)continue;
      if(!Number.isFinite(p.x)||!Number.isFinite(q.x))continue;
      const start=mapPoint(p.x,p.y,view),end=mapPoint(q.x,q.y,view);
      ctx.beginPath();ctx.moveTo(start.x,start.y);ctx.lineTo(end.x,end.y);ctx.stroke();
    }
    if(rings)for(const point of player.points){
      ctx.beginPath();ctx.arc(point.x,point.y,point.radius,0,Math.PI*2);
      ctx.fillStyle=player.id==="p1"?"#7ef3d723":"#ffabdf23";
      ctx.strokeStyle=point.source==="pose"?"#ffc16f":color;
      ctx.lineWidth=2;ctx.fill();ctx.stroke();
    }
    const nose=player.pose[0],shoulderA=player.pose[11],shoulderB=player.pose[12];
    const anchor=nose??(shoulderA&&shoulderB?{x:(shoulderA.x+shoulderB.x)/2,y:(shoulderA.y+shoulderB.y)/2}:undefined);
    if(anchor&&Number.isFinite(anchor.x)&&Number.isFinite(anchor.y)){
      const at=mapPoint(anchor.x,anchor.y,view);
      const label=player.id==="p1"?"P1":"P2";
      const y=Math.max(23,at.y-35);
      ctx.fillStyle="#102036e8";ctx.strokeStyle=color;ctx.lineWidth=2;
      ctx.beginPath();ctx.roundRect(at.x-23,y-18,46,27,9);ctx.fill();ctx.stroke();
      ctx.font="bold 14px system-ui";ctx.textAlign="center";ctx.textBaseline="middle";
      ctx.fillStyle=color;ctx.fillText(label,at.x,y-4);
    }
  }
  ctx.restore();
}
