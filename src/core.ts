/** Pure camera-to-game geometry and hit detection shared by desktop and mobile. */
export type Landmark = { x: number; y: number; visibility?: number; presence?: number };
export type BodyPart = "leftHand" | "rightHand" | "head" | "leftFoot" | "rightFoot";
export type Point = { part: BodyPart; x: number; y: number; radius: number };
export type Viewport = { width: number; height: number; videoWidth: number; videoHeight: number; mirror: boolean };
export type Balloon = { id: number; x: number; y: number; radius: number; vx: number; vy: number; color: string };
export const BONES: ReadonlyArray<readonly [number, number]> = [
  [11,12],[11,13],[13,15],[12,14],[14,16],[11,23],[12,24],[23,24],
  [23,25],[25,27],[27,31],[24,26],[26,28],[28,32]
];
export function coverRect(v: Viewport) {
  if (!(v.videoWidth > 0 && v.videoHeight > 0 && v.width > 0 && v.height > 0))
    return { x: 0, y: 0, width: v.width, height: v.height };
  const scale = Math.max(v.width / v.videoWidth, v.height / v.videoHeight);
  const width = v.videoWidth * scale, height = v.videoHeight * scale;
  return { x: (v.width - width) / 2, y: (v.height - height) / 2, width, height };
}
export function mapPoint(x: number, y: number, v: Viewport) {
  const r = coverRect(v);
  return { x: r.x + (v.mirror ? 1 - x : x) * r.width, y: r.y + y * r.height };
}
function reliable(p: Landmark | undefined): p is Landmark {
  return !!p && Number.isFinite(p.x) && Number.isFinite(p.y) &&
    p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1 &&
    (p.visibility ?? 1) >= 0.5 && (p.presence ?? 1) >= 0.5;
}
export function getHitpoints(pose: Landmark[] | undefined, v: Viewport, scalePercent: number): Point[] {
  if (!pose || !v.videoWidth || !v.videoHeight) return [];
  const leftShoulder = pose[11], rightShoulder = pose[12];
  const width = reliable(leftShoulder) && reliable(rightShoulder)
    ? Math.hypot((leftShoulder.x - rightShoulder.x) * coverRect(v).width,
                 (leftShoulder.y - rightShoulder.y) * coverRect(v).height)
    : Math.min(v.width, v.height) * 0.23;
  const radius = Math.max(12, Math.min(56, width * 0.22)) *
    Math.max(0.5, Math.min(2, scalePercent / 100));
  const entries: ReadonlyArray<readonly [BodyPart, number]> = [
    ["leftHand",15], ["rightHand",16], ["head",0], ["leftFoot",31], ["rightFoot",32]
  ];
  return entries.flatMap(([part, idx]) => {
    const p = pose[idx];
    if (!reliable(p)) return [];
    const xy = mapPoint(p.x, p.y, v);
    // Invisible/cropped landmarks must never hit objects at the edge.
    if (xy.x < 0 || xy.x > v.width || xy.y < 0 || xy.y > v.height) return [];
    return [{ part, ...xy, radius: part === "head" ? radius * 1.15 : radius }];
  });
}
export function circlesOverlap(a: { x:number;y:number;radius:number }, b: { x:number;y:number;radius:number }) {
  const dx=a.x-b.x, dy=a.y-b.y, rr=a.radius+b.radius;
  return dx*dx+dy*dy <= rr*rr;
}
export function hitBalloons(balloons: Balloon[], points: Point[], activeParts: readonly BodyPart[]) {
  const valid=points.filter(p=>activeParts.includes(p.part));
  const remaining: Balloon[] = [];
  const hits: Balloon[] = [];
  for (const balloon of balloons) {
    if (valid.some(p=>circlesOverlap(p,balloon))) hits.push(balloon);
    else remaining.push(balloon);
  }
  return { remaining, hits };
}
export function stepBalloons(balloons: Balloon[], seconds: number, width: number, height: number) {
  const dt=Math.max(0,Math.min(seconds,0.08));
  return balloons.map(b=>({...b,x:b.x+b.vx*dt,y:b.y+b.vy*dt}))
    .filter(b=>b.x>-b.radius*2 && b.x<width+b.radius*2 &&
      b.y>-b.radius*2 && b.y<height+b.radius*2);
}
export function newBalloon(id: number, width: number, height: number, rand: ()=>number = Math.random): Balloon {
  const side=Math.floor(rand()*4), radius=17+rand()*15;
  const x=side===0 ? -radius : side===1 ? width+radius : rand()*width;
  const y=side===2 ? -radius : side===3 ? height+radius : rand()*height;
  const tx=width*(0.3+0.4*rand()), ty=height*(0.25+0.5*rand());
  const distance=Math.max(1,Math.hypot(tx-x,ty-y)), speed=55+rand()*50;
  return {id,x,y,radius,vx:(tx-x)/distance*speed,vy:(ty-y)/distance*speed,
    color:["#ffbe6b","#60dbff","#ef91ff","#80f5b9"][id%4]};
}
