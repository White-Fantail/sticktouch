import React, { useCallback, useEffect, useRef, useState } from "react";
import { FilesetResolver, HandLandmarker, PoseLandmarker } from "@mediapipe/tasks-vision";
import { matchHandPalms } from "../hands";
import {getHitpoints, smoothHitpoints, type Landmark, type Point, type Viewport} from "../core";
import {type DisplayMode, type CameraSide} from "../settings/settings";
import {useSettings} from "../settings/SettingsContext";
import {Link} from "../app/navigation";
import {type GameDefinition} from "../games/registry";
import {paint} from "../engine/renderer";
import {createBalloonRound,stepBalloonRound,type BalloonRound} from "../games/balloon-pop/game";


type Phase = "idle" | "loading" | "ready" | "error";
const MODEL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
const HAND_MODEL = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
const WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1/wasm";
const ROUND_SECONDS = 60;
const INITIAL_MESSAGE = "카메라를 시작하면 몸의 움직임을 실시간으로 인식합니다.";

export function GameStage({game}: {game: GameDefinition}) {
  const {settings,update}=useSettings();
  const {mode,rings,hitbox,side,preciseHands,diagnostics}=settings;
  const [paused,setPaused]=useState(false);
  const [fullscreen,setFullscreen]=useState(false);
  const panelRef=useRef<HTMLDivElement>(null);
  const [phase,setPhase]=useState<Phase>("idle");
  const [message,setMessage]=useState(INITIAL_MESSAGE);
  const [handModelStatus,setHandModelStatus]=useState<"pending"|"ready"|"fallback">("pending");
  const [palmTracking,setPalmTracking]=useState(false);
  const [handSources,setHandSources]=useState<{left:"hand"|"pose"|"none";right:"hand"|"pose"|"none"}>({left:"none",right:"none"});
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
  const handTrackerRef=useRef<HandLandmarker|null>(null);
  const animationRef=useRef<number>(0);
  const sessionRef=useRef(0);
  const settingsRef=useRef({mode,rings,hitbox,side,preciseHands});
  const gameRef=useRef<BalloonRound>(createBalloonRound(ROUND_SECONDS));
  const posesRef=useRef<Landmark[]|undefined>(undefined);
  const handsRef=useRef<Landmark[][]>([]);
  const smoothRef=useRef<Point[]>([]);
  const mountedRef=useRef(true);
  settingsRef.current={mode,rings,hitbox,side,preciseHands};

  const stop = useCallback(()=>{
    sessionRef.current++;
    cancelAnimationFrame(animationRef.current);
    for(const track of streamRef.current?.getTracks()??[])track.stop();
    streamRef.current=null;
    const video=videoRef.current;if(video){video.pause();video.srcObject=null;}
    trackerRef.current?.close();trackerRef.current=null;
    handTrackerRef.current?.close();handTrackerRef.current=null;
    handsRef.current=[];smoothRef.current=[];posesRef.current=undefined;
    gameRef.current.playing=false;gameRef.current.paused=false;gameRef.current.balls=[];
    if(mountedRef.current){setPhase("idle");setDetected(false);setPlaying(false);setPalmTracking(false);setHandModelStatus("pending");setHandSources({left:"none",right:"none"});}
  },[]);
  useEffect(()=>{mountedRef.current=true;return()=>{mountedRef.current=false;stop();};},[stop]);

  const start = async (facing:CameraSide=side)=>{
    stop();
    const token=sessionRef.current;
    if(!window.isSecureContext){setPhase("error");setMessage("카메라는 HTTPS 또는 localhost에서만 실행할 수 있어요.");return;}
    if(!navigator.mediaDevices?.getUserMedia){setPhase("error");setMessage("이 브라우저는 카메라 접근을 지원하지 않습니다.");return;}
    setPhase("loading");setMessage("카메라를 연결하고 인식 모델을 준비하는 중…");
    let stream:MediaStream|null=null;let detector:PoseLandmarker|null=null;
    let handDetector:HandLandmarker|null=null;
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
      trackerRef.current=detector;
      // Hand tracking is optional: a model/network/GPU failure must not break Pose.
      try {
        try {
          handDetector=await HandLandmarker.createFromOptions(vision,{
            baseOptions:{modelAssetPath:HAND_MODEL,delegate:"GPU"},
            runningMode:"VIDEO",numHands:2,minHandDetectionConfidence:0.55,
            minHandPresenceConfidence:0.55,minTrackingConfidence:0.5
          });
        } catch {
          handDetector=await HandLandmarker.createFromOptions(vision,{
            baseOptions:{modelAssetPath:HAND_MODEL,delegate:"CPU"},
            runningMode:"VIDEO",numHands:2,minHandDetectionConfidence:0.55,
            minHandPresenceConfidence:0.55,minTrackingConfidence:0.5
          });
        }
      } catch(error) {
        console.warn("Hand model unavailable, using Pose palm estimate",error);
      }
      if(token!==sessionRef.current){handDetector?.close();detector.close();return;}
      handTrackerRef.current=handDetector;
      setHandModelStatus(handDetector?"ready":"fallback");
      setPhase("ready");setMessage("카메라 연결됨 · 화면에 몸이 보이도록 서 주세요.");
      let last=performance.now(),lastPoseInference=0,lastHandInference=0,lastVideoTime=-1;
      let lastHandSample=0,lastDetected=false,lastPalm=false,lastHud=0,lastSourceKey="none/none";
      let handInterval=160;
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
        const s=settingsRef.current;
        if(!document.hidden && video.readyState>=HTMLMediaElement.HAVE_CURRENT_DATA &&
          video.currentTime!==lastVideoTime) {
          let didInfer=false;
          if(now-lastPoseInference>=95) {
            lastPoseInference=now;didInfer=true;
            try{posesRef.current=detector!.detectForVideo(video,now).landmarks[0] as Landmark[]|undefined;}
            catch(err){console.warn("Pose tracking frame failed",err);posesRef.current=undefined;}
          }
          // Independently throttle hand detection to keep low-end phones responsive.
          if(s.preciseHands && handDetector && now-lastHandInference>=handInterval) {
            lastHandInference=now;didInfer=true;
            const began=performance.now();
            try{
              handsRef.current=handDetector.detectForVideo(video,now).landmarks as Landmark[][];
              lastHandSample=now;
              const cost=performance.now()-began;
              handInterval=cost>70?Math.min(450,handInterval+50):Math.max(150,handInterval-8);
            }catch(err){
              console.warn("Hand tracking failed; continuing with Pose palm estimates",err);
              handsRef.current=[];handDetector.close();handDetector=null;
              handTrackerRef.current=null;setHandModelStatus("fallback");
            }
          }
          if(didInfer)lastVideoTime=video.currentTime;
        }
        const v:Viewport={width,height,videoWidth:video.videoWidth,videoHeight:video.videoHeight,mirror:s.side==="user"};
        const anchors=s.preciseHands && handDetector && now-lastHandSample<350
          ?matchHandPalms(posesRef.current,handsRef.current):{};
        const palm=!!(anchors.left||anchors.right);
        if(palm!==lastPalm){lastPalm=palm;setPalmTracking(palm);}
        const raw=getHitpoints(posesRef.current,v,s.hitbox,anchors);
        const points=smoothHitpoints(raw,smoothRef.current,dt);
        smoothRef.current=points;
        const left=points.find(p=>p.part==="leftHand")?.source??"none";
        const right=points.find(p=>p.part==="rightHand")?.source??"none";
        const sourceKey=left+"/"+right;
        if(sourceKey!==lastSourceKey){lastSourceKey=sourceKey;setHandSources({left,right});}
        const found=points.length>0;
        if(found!==lastDetected){lastDetected=found;setDetected(found);}
        const g=gameRef.current;
        if(g.playing && !g.paused && !document.hidden){
          const result=stepBalloonRound(g,dt,width,height,points);
          if(result.hits>0)setScore(g.score);
          if(now-lastHud>=130){lastHud=now;setTimeLeft(Math.ceil(g.time));}
          if(result.finished){setPlaying(false);setFinished(true);setTimeLeft(0);}
        }
        paint(ctx,video,posesRef.current,g.balls,points,v,s.mode,s.rings);
      };
      animationRef.current=requestAnimationFrame(tick);
    }catch(error){
      detector?.close();
      handDetector?.close();
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
    if(phase!=="ready" || !detected)return;
    const g=gameRef.current;
    Object.assign(g,createBalloonRound(ROUND_SECONDS));
    g.playing=true;setPaused(false);
    setScore(0);setTimeLeft(ROUND_SECONDS);setFinished(false);setPlaying(true);
  };
  const end=()=>{
    gameRef.current.playing=false;gameRef.current.paused=false;gameRef.current.balls=[];setPaused(false);
    setPlaying(false);setFinished(false);setTimeLeft(ROUND_SECONDS);
  };
  const toggleCamera=async()=>{
    const next=side==="user"?"environment":"user";end();update({side:next});await start(next);
  };
  const togglePause=()=>{
    const g=gameRef.current;
    if(!g.playing)return;
    g.paused=!g.paused;setPaused(g.paused);
  };
  const toggleFullscreen=async()=>{
    try{
      if(document.fullscreenElement)await document.exitFullscreen();
      else await panelRef.current?.requestFullscreen();
    }catch(error){console.warn("Fullscreen unavailable",error);}
  };
  useEffect(()=>{
    const handleVisibility=()=>{
      if(document.hidden && gameRef.current.playing){
        gameRef.current.paused=true;setPaused(true);
      }
    };
    const handleFullscreen=()=>setFullscreen(!!document.fullscreenElement);
    document.addEventListener("visibilitychange",handleVisibility);
    document.addEventListener("fullscreenchange",handleFullscreen);
    return()=>{document.removeEventListener("visibilitychange",handleVisibility);
      document.removeEventListener("fullscreenchange",handleFullscreen);};
  },[]);
  return <main className="play-shell">
    <div className="play-topbar">
      <Link to="/games" className="play-exit" aria-label="게임 탐색으로 돌아가기"><span>←</span> {game.title}</Link>
      <div className="play-top-actions">
        <Link to="/settings" title="설정 페이지로 이동하면 카메라와 게임이 종료됩니다.">⚙ 설정</Link>
        {phase==="ready" && <button type="button" onClick={()=>void toggleCamera()} title="카메라 전환">↻ 카메라</button>}
        <button type="button" onClick={()=>void toggleFullscreen()}>{fullscreen?"⤢ 전체 화면 종료":"⛶ 전체 화면"}</button>
      </div>
    </div>
    <div className="play-stage-panel" ref={panelRef}>
      <div className="stage-top"><span className="live-indicator">
        <b className={phase==="ready"?"on":""}/>
        {phase==="ready"?(detected?(palmTracking&&preciseHands?"관절 + 손바닥 추적 중":"관절 추적 중"):"카메라 연결됨"):phase==="loading"?"준비 중":"카메라 꺼짐"}
        </span><span>{game.title} · {game.duration}</span></div>
      <div className="stage play-stage" ref={wrapRef}>
        <video ref={videoRef} className="source-video" playsInline muted aria-hidden="true"/>
        <canvas ref={canvasRef} aria-label="카메라 영상과 움직임을 이용한 게임 화면"/>
        {phase!=="ready" && <div className="stage-message"><div className="person-emoji">◎</div>
          <strong>{phase==="loading"?"모션 인식 준비 중":"카메라를 켜고 움직여 보세요"}</strong>
          <p>{message}</p>
          {phase!=="loading"&&<button className="primary large" type="button" onClick={()=>void start()}>카메라 시작하기 <span>↗</span></button>}
        </div>}
        {phase==="ready" && !detected && <div className="detection-hint">몸이 화면에 충분히 보이도록 카메라를 조정해 주세요.</div>}
        {phase==="ready" && <div className="hud"><span><small>SCORE</small><b>{String(score).padStart(3,"0")}</b></span>
          <span><small>TIME</small><b>{timeLeft}s</b></span></div>}
        {phase==="ready" && playing && paused && <div className="paused-overlay">
          <strong>일시정지</strong><p>준비되면 게임을 계속하세요.</p>
          <button className="primary" onClick={togglePause}>▶ 계속하기</button></div>}
        {phase==="ready" && finished && <div className="result"><strong>게임 종료!</strong>
          <p>최종 점수 {score}점</p>
          <button className="primary" type="button" onClick={begin} disabled={!detected}>다시 하기 ↻</button>
          <Link className="secondary" to="/games">다른 게임 보기 →</Link></div>}
      </div>
      <div className="play-stage-bottom">
        <span>{phase==="ready"?(detected?"손·발·머리의 터치 영역으로 풍선을 터뜨려요":"몸 전체가 보이도록 한 걸음 물러서세요"):message}</span>
        <div className="actions">{phase==="ready" && <>
          {playing ? <>
            <button className="secondary" onClick={togglePause}>{paused?"▶ 계속":"Ⅱ 일시정지"}</button>
            <button className="secondary" onClick={end}>■ 종료</button>
          </> : <button className="primary" disabled={!detected} onClick={begin}>▶ {finished?"다시 시작":"게임 시작"}</button>}
          <button className="secondary" onClick={stop}>카메라 끄기</button>
        </>}</div>
      </div>
      <div className="play-mode-picker" aria-label="화면 표시 모드 빠른 변경">
        <span className="eyebrow">DISPLAY</span>
        {([["camera","실제 영상"],["both","영상 + 스틱맨"],["stickman","스틱맨만"]] as [DisplayMode,string][]).map(([value,label])=>
          <button type="button" key={value} aria-pressed={mode===value} className={mode===value?"active":""} onClick={()=>update({mode:value})}>{label}</button>)}
      </div>
      {diagnostics && <div className="play-diagnostics" role="status">
        <span>손바닥 정밀 추적: {preciseHands?"ON":"OFF"}</span>
        <span>Hand 모델: {handModelStatus==="pending"?"준비 전":handModelStatus==="ready"?"준비됨":"Pose 폴백"}</span>
        <span>왼손 <em>{handSources.left.toUpperCase()}</em></span><span>오른손 <em>{handSources.right.toUpperCase()}</em></span>
      </div>}
    </div>
    <div className="play-footer-hint">안전을 위해 주변 공간을 확보해 주세요 · 카메라 영상은 저장되지 않습니다.</div>
  </main>;
}
