import {useCallback,useEffect,useRef,useState} from "react";
import type {HandLandmarker,PoseLandmarker} from "@mediapipe/tasks-vision";
import {Link} from "../app/navigation";
import {useSettings} from "../settings/SettingsContext";
import {type Landmark,type Viewport} from "../core";
import {loadCameraModels} from "../tracking/models";
import {buildTwoPlayerFrames,createTwoPlayerState,type PlayerFrame} from "../tracking/multiplayer";
import {paintTwoPlayerPreview} from "../tracking/multiplayer-renderer";

type Phase="idle"|"loading"|"ready"|"error";
type Status={p1:boolean;p2:boolean;fps:number;hands:"hand"|"pose"};
const EMPTY:Status={p1:false,p2:false,fps:0,hands:"pose"};
const FALLBACK="두 사람이 모두 보이도록 카메라 앞에 나란히 서 주세요.";

export function TwoPlayerPage(){
  const {settings}=useSettings();
  const {mode,rings,hitbox,preciseHands,side}=settings;
  const settingsRef=useRef({mode,rings,hitbox,preciseHands,side});
  settingsRef.current={mode,rings,hitbox,preciseHands,side};
  const [phase,setPhase]=useState<Phase>("idle");
  const [message,setMessage]=useState(FALLBACK);
  const [status,setStatus]=useState<Status>(EMPTY);
  const videoRef=useRef<HTMLVideoElement>(null);
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const stageRef=useRef<HTMLDivElement>(null);
  const streamRef=useRef<MediaStream|null>(null);
  const poseRef=useRef<PoseLandmarker|null>(null);
  const handRef=useRef<HandLandmarker|null>(null);
  const frameRef=useRef(0);
  const tokenRef=useRef(0);
  const identitiesRef=useRef(createTwoPlayerState());

  const stop=useCallback((notify=true)=>{
    tokenRef.current++;
    cancelAnimationFrame(frameRef.current);
    streamRef.current?.getTracks().forEach(track=>track.stop());
    streamRef.current=null;
    const video=videoRef.current;
    if(video){video.pause();video.srcObject=null;}
    poseRef.current?.close();poseRef.current=null;
    handRef.current?.close();handRef.current=null;
    identitiesRef.current=createTwoPlayerState();
    if(notify){setPhase("idle");setStatus(EMPTY);setMessage(FALLBACK);}
  },[]);
  useEffect(()=>()=>stop(false),[stop]);

  const start=async()=>{
    stop();
    if(!window.isSecureContext){setPhase("error");setMessage("HTTPS 또는 localhost 환경에서 카메라를 사용할 수 있어요.");return;}
    if(!navigator.mediaDevices?.getUserMedia){setPhase("error");setMessage("이 브라우저는 카메라를 지원하지 않아요.");return;}
    const token=tokenRef.current;
    setPhase("loading");setMessage("2인용 인식 모델을 준비하고 있어요.");
    try{
      let stream:MediaStream;
      try{
        stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{
          facingMode:{ideal:settingsRef.current.side},
          width:{ideal:1280},height:{ideal:720},frameRate:{ideal:30,max:30}
        }});
      }catch(error){
        if(error instanceof DOMException&&(error.name==="OverconstrainedError"||error.name==="NotFoundError"))
          stream=await navigator.mediaDevices.getUserMedia({audio:false,video:true});
        else throw error;
      }
      if(token!==tokenRef.current){stream.getTracks().forEach(t=>t.stop());return;}
      streamRef.current=stream;
      const video=videoRef.current;
      if(!video)throw Error("Camera preview unavailable");
      video.srcObject=stream;video.muted=true;video.playsInline=true;
      await video.play();
      if(token!==tokenRef.current)return;
      const models=await loadCameraModels(2);
      if(token!==tokenRef.current){models.pose.close();models.hand?.close();return;}
      poseRef.current=models.pose;handRef.current=models.hand;
      setPhase("ready");setMessage(FALLBACK);
      let lastTick=performance.now(),lastPoseAt=0,lastHandAt=0,lastVideoTime=-1;
      let hands:Landmark[][]=[],players:readonly PlayerFrame[]=[];
      let handInterval=170,reportAt=0,poseFrames=0,measuredFps=0,frameWindowStart=lastTick;
      const tick=(now:number)=>{
        if(token!==tokenRef.current)return;
        frameRef.current=requestAnimationFrame(tick);
        const box=stageRef.current,canvas=canvasRef.current,video=videoRef.current;
        if(!box||!canvas||!video||document.hidden)return;
        const dt=Math.min(.08,Math.max(0,(now-lastTick)/1000));lastTick=now;
        const {width,height}=box.getBoundingClientRect();
        if(width<1||height<1)return;
        const dpr=Math.min(2,window.devicePixelRatio||1);
        const pw=Math.round(width*dpr),ph=Math.round(height*dpr);
        if(canvas.width!==pw||canvas.height!==ph){canvas.width=pw;canvas.height=ph;}
        const ctx=canvas.getContext("2d");if(!ctx)return;
        ctx.setTransform(dpr,0,0,dpr,0,0);
        const options=settingsRef.current;
        const viewport:Viewport={width,height,videoWidth:video.videoWidth,videoHeight:video.videoHeight,
          mirror:options.side==="user",fit:"contain"};
        if(video.readyState>=HTMLMediaElement.HAVE_CURRENT_DATA&&video.currentTime!==lastVideoTime){
          let inferred=false;
          if(now-lastPoseAt>=105){
            lastPoseAt=now;inferred=true;
            try{
              const poses=models.pose.detectForVideo(video,now).landmarks as Landmark[][];
              const recentHands=options.preciseHands && now-lastHandAt<=380?hands:[];
              players=buildTwoPlayerFrames(identitiesRef.current,poses,recentHands,now,viewport,
                options.hitbox,options.preciseHands,dt);
              poseFrames++;
            }catch(error){
              console.warn("Two-player pose tracking failed",error);
              players=buildTwoPlayerFrames(identitiesRef.current,[],[],now,viewport,options.hitbox,false,dt);
            }
          }
          if(options.preciseHands&&handRef.current&&now-lastHandAt>=handInterval){
            inferred=true;
            const began=performance.now();
            try{
              hands=handRef.current.detectForVideo(video,now).landmarks as Landmark[][];
              lastHandAt=now;
              handInterval=performance.now()-began>80?Math.min(480,handInterval+50):Math.max(155,handInterval-8);
            }catch(error){
              console.warn("Two-player hand tracking failed",error);
              handRef.current.close();handRef.current=null;hands=[];
            }
          }
          if(inferred)lastVideoTime=video.currentTime;
        }
        paintTwoPlayerPreview(ctx,video,players,viewport,options.mode,options.rings);
        if(now-frameWindowStart>1200){
          measuredFps=Math.round(poseFrames*1000/(now-frameWindowStart));
          poseFrames=0;frameWindowStart=now;
        }
        if(now-reportAt>280){
          reportAt=now;
          setStatus({p1:!!players[0]?.visible,p2:!!players[1]?.visible,
            fps:measuredFps,hands:options.preciseHands&&!!handRef.current?"hand":"pose"});
        }
      };
      frameRef.current=requestAnimationFrame(tick);
    }catch(error){
      if(token!==tokenRef.current)return;
      const name=error instanceof DOMException?error.name:"";
      stop();
      setPhase("error");
      setMessage(name==="NotAllowedError"||name==="PermissionDeniedError"
        ?"카메라 권한이 거부됐어요. 브라우저에서 권한을 허용해 주세요."
        :name==="NotFoundError"?"카메라를 찾을 수 없어요."
        :"카메라 또는 두 사람 인식 모델을 시작하지 못했어요. 연결 상태를 확인해 주세요.");
      console.error("Two-player setup failed",error);
    }
  };
  const ready=phase==="ready"&&status.p1&&status.p2;
  return <main className="site-container duo-page">
    <div className="page-intro"><span className="kicker">MULTIPLAYER FOUNDATION</span>
      <h1>2인 인식 준비</h1>
      <p>카메라 한 대로 두 사람의 움직임을 독립적으로 추적하는 테스트 화면이에요. 기존 게임은 계속 1인용으로 실행됩니다.</p>
    </div>
    <section className="duo-layout">
      <div className="duo-stage-wrap">
        <div className="duo-stage-top">
          <strong>2인 카메라 미리보기</strong>
          <span aria-live="polite">{phase==="ready"?(ready?"● 2명 인식 완료":"● 인식 중"):phase==="loading"?"모델 로딩 중":"카메라 꺼짐"}</span>
        </div>
        <div className="duo-stage" ref={stageRef}>
          <video className="source-video" ref={videoRef} autoPlay muted playsInline aria-hidden="true"/>
          <canvas ref={canvasRef} aria-label="P1 청록색, P2 분홍색 전신 관절과 터치 포인트 미리보기"/>
          {(phase==="idle"||phase==="loading"||phase==="error")&&
            <div className="duo-stage-prompt"><strong>{phase==="error"?"카메라 오류":phase==="loading"?"두 사람 추적 준비 중":"두 명이 함께 서 주세요"}</strong>
              <p>{message}</p>{phase!=="loading"&&<button className="primary" type="button" onClick={()=>void start()}>📷 2인 인식 시작</button>}</div>}
        </div>
        <div className="duo-controls">
          <p>{phase==="ready"?(ready?"P1과 P2가 모두 감지됐어요. 이제 2인용 게임을 추가할 기반이 준비됐어요.":FALLBACK):"카메라 영상은 이 기기에서만 처리됩니다."}</p>
          <div className="actions">
            {phase==="ready"&&<><button type="button" className="secondary" onClick={()=>{identitiesRef.current=createTwoPlayerState();setStatus(EMPTY);}}>P1/P2 다시 지정</button>
              <button type="button" className="secondary" onClick={()=>stop()}>카메라 끄기</button></>}
            <Link className="secondary" to="/games">1인용 게임 보기</Link>
          </div>
        </div>
      </div>
      <aside className="duo-help">
        <h2>플레이어 인식 상태</h2>
        <div className={"duo-person p1"+(status.p1&&phase==="ready"?" detected":"")}><b>P1 · 청록색</b><span>{phase==="ready"&&status.p1?"인식됨":"대기 중"}</span></div>
        <div className={"duo-person p2"+(status.p2&&phase==="ready"?" detected":"")}><b>P2 · 분홍색</b><span>{phase==="ready"&&status.p2?"인식됨":"대기 중"}</span></div>
        <p className="duo-instructions">처음에는 화면 기준 왼쪽 사람이 P1, 오른쪽 사람이 P2야. 초기 인식 후에는 가능한 한 사람별 위치와 이동 방향으로 구분해.</p>
        <p className="duo-instructions">머리부터 발까지 화면에 보이게 서고, 가능하면 서로 한 걸음 떨어져 있어 줘. 겹치거나 화면 밖으로 나가면 인식이 끊길 수 있어.</p>
        <div className="duo-diagnostics"><strong>추적 진단</strong><span>Pose 최대 2명 · Hand 최대 4개</span>
          <span>전신 추정 속도: {status.fps?status.fps+" FPS":"—"}</span>
          <span>손 좌표: {status.hands==="hand"?"Hand 우선 / Pose 대체":"Pose 추정"} </span></div>
        <Link to="/settings" className="secondary duo-settings-link">⚙ 화면·카메라 설정</Link>
      </aside>
    </section>
    <p className="duo-footnote">이 페이지는 플레이어 인식·구분 검증용입니다. 실제 게임은 게임 탐색의 2인 협동·대결 카테고리에서 선택하세요. 교차 동작과 모바일 성능은 실기기 확인이 필요해요.</p>
  </main>;
}
