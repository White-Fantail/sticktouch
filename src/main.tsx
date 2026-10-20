import React, { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";
import {
  BONES, coverRect, getHitpoints, hitBalloons, mapPoint, newBalloon, stepBalloons,
  type Balloon, type Landmark, type Point, type Viewport
} from "./core";
import "./style.css";

type DisplayMode = "camera" | "both" | "stickman";
type CameraSide = "user" | "environment";
type Phase = "idle" | "loading" | "ready" | "error";
const MODEL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
const WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1/wasm";
const ROUND_SECONDS = 60;
const INITIAL_MESSAGE = "카메라를 시작하면 몸의 움직임을 실시간으로 인식합니다.";

function paint(ctx: CanvasRenderingContext2D, video: HTMLVideoElement, pose: Landmark[] | undefined,
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
    ctx.fillStyle="rgba(59,238,190,0.12)";ctx.strokeStyle="rgba(88,255,202,.95)";
    ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,p.radius,0,Math.PI*2);ctx.fill();ctx.stroke();
  }
}
function App(){
  const [phase,setPhase]=useState<Phase>("idle");
  const [message,setMessage]=useState(INITIAL_MESSAGE);
  const [mode,setMode]=useState<DisplayMode>("both");
  const [rings,setRings]=useState(true);
  const [hitbox,setHitbox]=useState(100);
  const [side,setSide]=useState<CameraSide>("user");
  const [detected,setDetected]=useState(false);
  const [playing,setPlaying]=useState(false);
  const [score,setScore]=useState(0);
  const [timeLeft,setTimeLeft]=useState(ROUND_SECONDS);
  const [finished,setFinished]=useState(false);
  const videoRef=useRef<HTMLVideoElement>(null);
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const wrapRef=useRef<HTMLDivElement>(null);
  const streamRef=useRef<MediaStream|null>(null);
  const trackerRef=useRef<PoseLandmarker|null>(null);
  const animationRef=useRef<number>(0);
  const sessionRef=useRef(0);
  const settingsRef=useRef({mode,rings,hitbox,side});
  const gameRef=useRef({playing:false,score:0,time:ROUND_SECONDS,spawning:0,seq:0,balls:[] as Balloon[]});
  const posesRef=useRef<Landmark[]|undefined>(undefined);
  const mountedRef=useRef(true);
  settingsRef.current={mode,rings,hitbox,side};

  const stop = useCallback(()=>{
    sessionRef.current++;
    cancelAnimationFrame(animationRef.current);
    for(const track of streamRef.current?.getTracks()??[])track.stop();
    streamRef.current=null;
    const video=videoRef.current;if(video){video.pause();video.srcObject=null;}
    trackerRef.current?.close();trackerRef.current=null;
    posesRef.current=undefined;gameRef.current.playing=false;
    if(mountedRef.current){setPhase("idle");setDetected(false);setPlaying(false);}
  },[]);
  useEffect(()=>{mountedRef.current=true;return()=>{mountedRef.current=false;stop();};},[stop]);

  const start = async (facing:CameraSide=side)=>{
    stop();
    const token=sessionRef.current;
    if(!window.isSecureContext){setPhase("error");setMessage("카메라는 HTTPS 또는 localhost에서만 실행할 수 있어요.");return;}
    if(!navigator.mediaDevices?.getUserMedia){setPhase("error");setMessage("이 브라우저는 카메라 접근을 지원하지 않습니다.");return;}
    setPhase("loading");setMessage("카메라를 연결하고 인식 모델을 준비하는 중…");
    let stream:MediaStream|null=null;let detector:PoseLandmarker|null=null;
    try{
      try{
        stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{
          facingMode:{ideal:facing},width:{ideal:1280},height:{ideal:720},frameRate:{ideal:30,max:30}
        }});
      }catch(e){
        // Older webcams may reject ideal constraints; retry with any camera.
        if(e instanceof DOMException && (e.name==="OverconstrainedError" || e.name==="NotFoundError"))
          stream=await navigator.mediaDevices.getUserMedia({audio:false,video:true});
        else throw e;
      }
      if(token!==sessionRef.current){stream.getTracks().forEach(t=>t.stop());return;}
      streamRef.current=stream;
      const video=videoRef.current;
      if(!video)throw Error("Video element unavailable");
      video.srcObject=stream;video.muted=true;video.playsInline=true;
      await video.play();
      const vision=await FilesetResolver.forVisionTasks(WASM);
      try{
        detector=await PoseLandmarker.createFromOptions(vision,{baseOptions:{modelAssetPath:MODEL,delegate:"GPU"},runningMode:"VIDEO",numPoses:1});
      }catch{
        detector=await PoseLandmarker.createFromOptions(vision,{baseOptions:{modelAssetPath:MODEL,delegate:"CPU"},runningMode:"VIDEO",numPoses:1});
      }
      if(token!==sessionRef.current){detector.close();return;}
      trackerRef.current=detector;setPhase("ready");setMessage("카메라 연결됨 · 화면에 몸이 보이도록 서 주세요.");
      let last=performance.now(),lastInference=0,lastVideoTime=-1,lastDetected=false,lastHud=0;
      const tick=(now:number)=>{
        if(token!==sessionRef.current)return;
        animationRef.current=requestAnimationFrame(tick);
        const canvas=canvasRef.current,container=wrapRef.current,video=videoRef.current;
        if(!canvas||!container||!video)return;
        const dt=Math.min(0.08,Math.max(0,(now-last)/1000));last=now;
        const box=container.getBoundingClientRect(),width=Math.max(1,box.width),height=Math.max(1,box.height);
        const dpr=Math.min(window.devicePixelRatio||1,2);
        const pw=Math.round(width*dpr),ph=Math.round(height*dpr);
        if(canvas.width!==pw||canvas.height!==ph){canvas.width=pw;canvas.height=ph;}
        const ctx=canvas.getContext("2d");if(!ctx)return;
        ctx.setTransform(dpr,0,0,dpr,0,0);
        if(!document.hidden && video.readyState>=HTMLMediaElement.HAVE_CURRENT_DATA &&
          video.currentTime!==lastVideoTime && now-lastInference>=85) {
          lastVideoTime=video.currentTime;lastInference=now;
          try{posesRef.current=detector!.detectForVideo(video,now).landmarks[0] as Landmark[]|undefined;}
          catch(err){console.warn("Pose tracking frame failed",err);posesRef.current=undefined;}
        }
        const s=settingsRef.current;
        const v:Viewport={width,height,videoWidth:video.videoWidth,videoHeight:video.videoHeight,mirror:s.side==="user"};
        const points=getHitpoints(posesRef.current,v,s.hitbox);
        const found=points.length>0;
        if(found!==lastDetected){lastDetected=found;setDetected(found);}
        const g=gameRef.current;
        if(g.playing && !document.hidden){
          g.time=Math.max(0,g.time-dt);
          g.spawning+=dt;
          if(g.spawning>=1.2){g.spawning=0;g.balls.push(newBalloon(++g.seq,width,height));}
          g.balls=stepBalloons(g.balls,dt,width,height);
          const hit=hitBalloons(g.balls,points,["leftHand","rightHand","leftFoot","rightFoot","head"]);
          g.balls=hit.remaining;
          if(hit.hits.length){g.score+=hit.hits.length*10;setScore(g.score);}
          if(now-lastHud>=130){lastHud=now;setTimeLeft(Math.ceil(g.time));}
          if(g.time<=0){g.playing=false;setPlaying(false);setFinished(true);setTimeLeft(0);}
        }
        paint(ctx,video,posesRef.current,g.balls,points,v,s.mode,s.rings);
      };
      animationRef.current=requestAnimationFrame(tick);
    }catch(error){
      detector?.close();
      stream?.getTracks().forEach(t=>t.stop());
      if(token!==sessionRef.current)return;
      streamRef.current=null;trackerRef.current=null;
      const name=error instanceof DOMException?error.name:"";
      setPhase("error");
      setMessage(name==="NotAllowedError"||name==="PermissionDeniedError"
        ?"카메라 권한이 거부되었어요. 브라우저의 사이트 권한에서 카메라를 허용해 주세요."
        :name==="NotFoundError"?"카메라를 찾을 수 없습니다. 연결 상태를 확인해 주세요."
        :"카메라 또는 관절 인식을 시작하지 못했어요. 네트워크 연결과 브라우저를 확인하고 다시 시도해 주세요.");
      console.error("StickTouch start failed",error);
    }
  };
  const begin=()=>{
    const g=gameRef.current;
    g.playing=true;g.score=0;g.time=ROUND_SECONDS;g.spawning=0;g.seq=0;g.balls=[];
    setScore(0);setTimeLeft(ROUND_SECONDS);setFinished(false);setPlaying(true);
  };
  const end=()=>{
    gameRef.current.playing=false;gameRef.current.balls=[];
    setPlaying(false);setFinished(false);setTimeLeft(ROUND_SECONDS);
  };
  const toggleCamera=async()=>{
    const next=side==="user"?"environment":"user";setSide(next);await start(next);
  };
  return <main className="shell">
    <header className="header"><a className="brand" href="/" aria-label="StickTouch 홈"><span className="brand-mark">✳</span> StickTouch</a><span className="eyebrow">YOUR BODY IS THE CONTROLLER</span></header>
    <section className="intro"><div><div className="kicker">MOVE • TOUCH • PLAY</div>
      <h1>몸이 곧 <em>컨트롤러.</em></h1>
      <p>카메라 앞에서 움직여 화면 속 풍선을 터뜨려 보세요. 별도의 장비도, 회원가입도 필요 없어요.</p></div>
      <div className="privacy">◉ 카메라 영상은 기기에서 처리 · 업로드/녹화하지 않음</div>
    </section>
    <section className="game-layout">
      <div className="stage-panel">
        <div className="stage-top"><span className="live-indicator"><b className={phase==="ready"?"on":""}></b>{phase==="ready"?(detected?"관절 추적 중":"카메라 연결됨"):phase==="loading"?"준비 중":"카메라 꺼짐"}</span>
        <span>풍선 터뜨리기 · 60초</span></div>
        <div className="stage" ref={wrapRef}>
          <video ref={videoRef} className="source-video" playsInline muted aria-hidden="true"/>
          <canvas ref={canvasRef} aria-label="카메라 영상과 움직임을 이용한 게임 화면"/>
          {phase!=="ready" && <div className="stage-message"><div className="person-emoji">◎</div>
            <strong>{phase==="loading"?"모션 인식 준비 중":"카메라를 켜고 움직여 보세요"}</strong>
            <p>{message}</p>
            {phase!=="loading"&&<button className="primary large" type="button" onClick={()=>void start()}>카메라 시작하기 <span>↗</span></button>}
          </div>}
          {phase==="ready" && !detected && <div className="detection-hint">사람이 화면에 충분히 보이도록 카메라를 조정해 주세요.</div>}
          {phase==="ready" && <div className="hud"><span><small>SCORE</small><b>{String(score).padStart(3,"0")}</b></span><span><small>TIME</small><b>{timeLeft}s</b></span></div>}
          {phase==="ready" && finished && <div className="result"><strong>게임 종료!</strong><p>최종 점수 {score}점</p><button className="primary" type="button" onClick={begin}>다시 하기 ↻</button></div>}
        </div>
        <div className="stage-bottom"><span>{phase==="ready"?(detected?"손·발·머리의 원으로 풍선을 터뜨려요":"몸 전체가 보이도록 한 걸음 물러서세요"):message}</span>
        <div className="actions">{phase==="ready"&&<>
          {playing?<button type="button" className="secondary" onClick={end}>■ 게임 중단</button>:<button type="button" className="primary" onClick={begin}>▶ {finished?"다시 시작":"게임 시작"}</button>}
          <button type="button" className="secondary" onClick={stop}>카메라 끄기</button>
        </>}</div></div>
      </div>
      <aside className="settings">
        <div className="settings-heading"><div><span className="kicker">CONTROL PANEL</span><h2>게임 설정</h2></div><span className="settings-icon">⚙</span></div>
        <div className="setting-group"><label>화면 표시 모드</label><div className="mode-options">
          <button type="button" className={mode==="camera"?"selected":""} aria-pressed={mode==="camera"} onClick={()=>setMode("camera")}><span>▣</span>실제 영상</button>
          <button type="button" className={mode==="both"?"selected":""} aria-pressed={mode==="both"} onClick={()=>setMode("both")}><span>♧</span>영상 + 스틱맨</button>
          <button type="button" className={mode==="stickman"?"selected":""} aria-pressed={mode==="stickman"} onClick={()=>setMode("stickman")}><span>♙</span>스틱맨만</button>
        </div></div>
        <div className="setting-group"><div className="setting-line"><label htmlFor="rings">터치 포인트 표시</label><input id="rings" type="checkbox" checked={rings} onChange={e=>setRings(e.target.checked)}/></div><p>손·발·머리의 충돌 영역을 원으로 표시해요.</p></div>
        <div className="setting-group"><div className="setting-line"><label htmlFor="size">터치 판정 크기</label><output htmlFor="size">{hitbox}%</output></div>
          <input id="size" className="slider" type="range" min="50" max="200" step="10" value={hitbox} onChange={e=>setHitbox(Number(e.target.value))}/>
          <div className="range-label"><span>정밀 50%</span><span>넉넉 200%</span></div>
          <div className="presets">{[70,100,150].map(n=><button key={n} type="button" className={hitbox===n?"active":""} onClick={()=>setHitbox(n)}>{n}%</button>)}</div>
        </div>
        <div className="setting-group"><label>카메라</label><button className="camera-switch" type="button" disabled={phase==="loading"} onClick={()=>{if(phase==="ready")void toggleCamera();else setSide(side==="user"?"environment":"user");}}>↻ {side==="user"?"전면 카메라":"후면 카메라"} 전환</button><p>모바일은 가로로 놓고 몸 전체가 보이도록 조정해 주세요.</p></div>
        <div className="tip"><b>TIP</b><p>스틱맨 화면 모드를 바꿔도 터치 판정과 점수는 그대로 유지됩니다.</p></div>
      </aside>
    </section>
    <footer>StickTouch MVP · 데스크톱 / 모바일 웹 · 초기 게임 1종 · HTTPS 또는 localhost 필요</footer>
  </main>;
}
createRoot(document.getElementById("root")!).render(<React.StrictMode><App/></React.StrictMode>);
