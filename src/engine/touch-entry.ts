import type {BodyPart,Point} from "../core.ts";

/** Shared gesture rule: a real body part must first be clearly outside a
 * target, then deliberately move into it. Target movement alone is not a tap.
 * Each round owns its own tracker, including when the same target reappears.
 */
export const TOUCH_PARTS:readonly BodyPart[]=[
  "leftHand","rightHand","leftFoot","rightFoot","head"
];
type Circle={x:number;y:number;radius:number};
type Entry={inside:boolean;armed:boolean;outside:{x:number;y:number}|null};
export class TouchEntries {
  private entries=new Map<string,Entry>();
  reset():void{this.entries.clear();}
  enter(key:string,point:Point|undefined,target:Circle,width:number,height:number):boolean{
    if(!point||![point.x,point.y,point.radius,target.x,target.y,target.radius,width,height]
      .every(Number.isFinite)||width<=0||height<=0){
      this.entries.delete(key);return false;
    }
    const scale=Math.min(width,height);
    const distance=Math.hypot(point.x-target.x,point.y-target.y);
    const overlapRadius=point.radius+target.radius;
    const inside=distance<=overlapRadius;
    const outside=distance>=overlapRadius+Math.max(6,scale*.012);
    let entry=this.entries.get(key);
    if(!entry){
      entry={inside,armed:outside,outside:outside?{x:point.x,y:point.y}:null};
      this.entries.set(key,entry);return false;
    }
    if(outside){
      if(!entry.armed)entry.outside={x:point.x,y:point.y};
      entry.armed=true;
    }
    const travelled=entry.outside?
      Math.hypot(point.x-entry.outside.x,point.y-entry.outside.y):0;
    const pressed=inside&&!entry.inside&&entry.armed&&
      travelled>=Math.max(10,scale*.025);
    entry.inside=inside;
    if(pressed){entry.armed=false;entry.outside=null;}
    return pressed;
  }
  contact(key:string,points:readonly Point[],target:Circle,width:number,height:number,
    parts:readonly BodyPart[]=TOUCH_PARTS):Point|undefined{
    let entered:Point|undefined;
    for(const part of parts){
      const point=points.find(p=>p.part===part);
      if(this.enter(key+":"+part,point,target,width,height)&&!entered)entered=point;
    }
    return entered;
  }
}
export const touchCircle=(spot:{x:number;y:number},radius:number,width:number,height:number):Circle=>
  ({x:spot.x*width,y:spot.y*height,radius:radius*Math.min(width,height)});
