import {BONES,coverRect,mapPoint,type Balloon,type Landmark,type Point,type Viewport} from "../core";
import {type DisplayMode} from "../settings/settings";

export function paint(ctx: CanvasRenderingContext2D, video: HTMLVideoElement, pose: Landmark[] | undefined,
  balls: Balloon[], points: Point[], view: Viewport, mode: DisplayMode, showRings: boolean) {
  const {width,height,mirror}=view;
  ctx.clearRect(0,0,width,height);
  ctx.fillStyle="#121a32"; ctx.fillRect(0,0,width,height);
  if(mode !== "stickman" && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    const r=coverRect(view);
    ctx.save();
    if(mirror){ctx.translate(width,0); ctx.scale(-1,1);}
    // Drawing the unmirrored rectangle inside a flipped canvas matches mapPoint().
    const drawX = mirror ? width-r.x-r.width : r.x;
    ctx.drawImage(video,drawX,r.y,r.width,r.height);
    ctx.restore();
    ctx.fillStyle="rgba(9,14,30,0.2)";ctx.fillRect(0,0,width,height);
  } else if(mode==="stickman") {
    const gradient=ctx.createLinearGradient(0,0,width,height);
    gradient.addColorStop(0,"#142b43");gradient.addColorStop(1,"#2a1943");
    ctx.fillStyle=gradient;ctx.fillRect(0,0,width,height);
    ctx.strokeStyle="rgba(181,211,255,0.07)";ctx.lineWidth=1;
    for(let x=0;x<width;x+=48){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,height);ctx.stroke();}
    for(let y=0;y<height;y+=48){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(width,y);ctx.stroke();}
  }
  if (pose && mode!=="camera") {
    ctx.lineCap="round";ctx.lineJoin="round";ctx.strokeStyle="#abf5e9";ctx.lineWidth=Math.max(3,width/230);
    for(const [a,b] of BONES) {
      const p=pose[a],q=pose[b];
      if(!p || !q || (p.visibility??1)<0.5 || (q.visibility??1)<0.5)continue;
      if(p.x<0||p.x>1||p.y<0||p.y>1||q.x<0||q.x>1||q.y<0||q.y>1)continue;
      const A=mapPoint(p.x,p.y,view),B=mapPoint(q.x,q.y,view);
      ctx.beginPath();ctx.moveTo(A.x,A.y);ctx.lineTo(B.x,B.y);ctx.stroke();
    }
    for(const p of points) {
      ctx.fillStyle="#e1fcff";ctx.beginPath();ctx.arc(p.x,p.y,5,0,Math.PI*2);ctx.fill();
    }
  }
  for(const b of balls) {
    ctx.shadowColor=b.color;ctx.shadowBlur=24;ctx.fillStyle=b.color;
    ctx.beginPath();ctx.arc(b.x,b.y,b.radius,0,Math.PI*2);ctx.fill();
    ctx.shadowBlur=0;ctx.strokeStyle="rgba(255,255,255,.75)";ctx.lineWidth=2;ctx.stroke();
    ctx.fillStyle="rgba(255,255,255,.6)";ctx.beginPath();
    ctx.arc(b.x-b.radius*0.25,b.y-b.radius*0.25,b.radius*0.2,0,Math.PI*2);ctx.fill();
  }
  if(showRings) for(const p of points){
    // Cyan means actual Hand Landmarker input; amber means Pose-based palm estimate.
    const poseHand=(p.part==="leftHand" || p.part==="rightHand") && p.source==="pose";
    ctx.fillStyle=poseHand?"rgba(255,189,82,0.12)":"rgba(59,238,190,0.12)";
    ctx.strokeStyle=poseHand?"rgba(255,189,82,.95)":"rgba(88,255,202,.95)";
    ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,p.radius,0,Math.PI*2);ctx.fill();ctx.stroke();
  }
}
