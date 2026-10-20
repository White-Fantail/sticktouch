import type {GameFeedback} from "./game-feel";
export type EffectsQuality="full"|"light"|"off";
type Particle={x:number;y:number;vx:number;vy:number;age:number;life:number;radius:number;color:string};
type Popup={x:number;y:number;age:number;life:number;text:string;color:string};
export class EffectManager {
  private particles:Particle[]=[];
  private popups:Popup[]=[];
  private comboFlash=0;
  private comboText="";
  reset(){this.particles=[];this.popups=[];this.comboFlash=0;this.comboText="";}
  emit(feedback:GameFeedback, quality:EffectsQuality){
    const pos=feedback.position;
    if(feedback.milestone && quality!=="off"){
      this.comboFlash=0.9;this.comboText=feedback.combo+" COMBO!";
    }
    if(!pos)return;
    if(feedback.points>0){
      this.popups.push({x:pos.x,y:pos.y,age:0,life:0.85,text:"+"+feedback.points,
        color:feedback.milestone?"#ffe389":"#e6fffb"});
      if(this.popups.length>16)this.popups.shift();
    }
    if(quality==="off"||feedback.points<=0)return;
    const count=quality==="full"?(feedback.milestone?25:13):5;
    const color=feedback.color??"#8ff6e3";
    for(let i=0;i<count;i++){
      const angle=Math.PI*2*i/count;
      const speed=65+(i%5)*32;
      this.particles.push({x:pos.x,y:pos.y,vx:Math.cos(angle)*speed,
        vy:Math.sin(angle)*speed-26,age:0,life:0.35+(i%5)*0.1,
        radius:2+(i%3),color:i%4===0?"#fff2bd":color});
    }
    if(this.particles.length>180)this.particles.splice(0,this.particles.length-180);
  }
  update(dt:number){
    const step=Math.min(0.08,Math.max(0,dt));
    this.particles=this.particles.filter(p=>(p.age+=step)<p.life);
    for(const p of this.particles){p.x+=p.vx*step;p.y+=p.vy*step;p.vy+=95*step;}
    this.popups=this.popups.filter(p=>(p.age+=step)<p.life);
    this.comboFlash=Math.max(0,this.comboFlash-step);
  }
  draw(ctx:CanvasRenderingContext2D,width:number,height:number,quality:EffectsQuality){
    ctx.save();
    if(quality!=="off"){
      for(const p of this.particles){
        ctx.globalAlpha=Math.max(0,1-p.age/p.life);
        ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.radius,0,Math.PI*2);ctx.fill();
      }
    }
    ctx.textAlign="center";ctx.textBaseline="middle";ctx.font="900 23px system-ui";
    for(const p of this.popups){
      ctx.globalAlpha=Math.min(1,(p.life-p.age)*2.8);
      ctx.fillStyle="#081626";ctx.fillText(p.text,p.x+1,p.y-27-p.age*45+2);
      ctx.fillStyle=p.color;ctx.fillText(p.text,p.x,p.y-27-p.age*45);
    }
    if(this.comboFlash>0&&quality!=="off"){
      const alpha=Math.min(1,this.comboFlash*1.5);
      ctx.globalAlpha=alpha;
      ctx.fillStyle="rgba(255,216,116,.08)";
      ctx.fillRect(0,0,width,height);
      ctx.fillStyle="#fff2a7";ctx.font="900 "+Math.min(37,width/11)+"px system-ui";
      ctx.fillText(this.comboText,width/2,height*0.24);
    }
    ctx.restore();
  }
}
