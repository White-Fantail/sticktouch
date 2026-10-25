import {useCallback,useEffect,useRef,useState} from "react";
import type {HandLandmarker,PoseLandmarker} from "@mediapipe/tasks-vision";
import {Link} from "../app/navigation";
import type {Landmark,Viewport} from "../core";
import {useSettings} from "../settings/SettingsContext";
import type {GameDefinition} from "../games/registry";
import {loadCameraModels} from "../tracking/models";
import {buildTwoPlayerFrames,createTwoPlayerState,playerTrackingStatus,
  type PlayerFrame,type PlayerTrackingStatus} from "../tracking/multiplayer";
import {paintTwoPlayerPreview} from "../tracking/multiplayer-renderer";
import {createDuoRound,isDuoGame,isVersus,stepDuoRound} from "../games/duo-arcade/game";
import {paintDuoScene} from "../games/duo-arcade/scene";
import {raisedHandsGesture} from "../engine/start-gesture";
import {AudioManager} from "../engine/audio";
import {EffectManager} from "../engine/effects";
import {GameFeelSession,type GameStats} from "../engine/game-feel";
import {FINAL_RUSH_SECONDS,COUNT_IN_SECONDS,ROUND_DURATIONS,
  scoreMultiplier,rulesetForDuration,type RoundDuration} from "../engine/round-tempo";
import {updateQueuedDuoStart} from "../engine/duo-start";
import {getBestRecord,saveBestRecord} from "../engine/records";
import {ShareButton} from "./ShareButton";

type Phase="idle"|"loading"|"ready"|"error";
type DuoStatus={p1:PlayerTrackingStatus;p2:PlayerTrackingStatus};
const EMPTY: DuoStatus={p1:"lost",p2:"lost"};
const INFO:Record<string,string>={
 "co-op-power-plant":"각자의 색상 스위치 밖에서 손을 넣어 동시에 0.7초 유지하세요. 다음 스위치는 새로운 위치에 나와요.",
 "shadow-sword":"공격자는 중앙 원으로 손을 휘둘러요. 방어자는 자신의 손을 어깨 위로 들어 공격을 막아요. 실제 상대방을 치지 마세요!",
 "mirror-challenge":"리더가 팔로 자유롭게 포즈를 만들면 다른 사람이 거울처럼 좌우를 반대로 따라 해요. 성공하면 역할이 바뀌어요.",
 "human-pingpong":"각자 손의 높이로 자기 쪽 패들을 움직여 공을 받아치세요. 공이 패들을 지나가면 상대가 1점!",
 "combine-robot":"P1은 몸을 좌우로 이동해서 로봇의 위치를 맞추고, P2는 손을 올려 실드를 켭니다. 에너지를 받고 빨간 위험물은 피해요."
};
export function DuoGameStage({game}:{game:GameDefinition}){
  if(!isDuoGame(game.id))throw Error("Not a two-player game: "+game.id);
  const id=game.id;
  const versus=isVersus(id);
  const {settings,update}=useSettings();
  const optionsRef=useRef(settings);
  optionsRef.current=settings;
  const [phase,setPhase]=useState<Phase>("idle");
  const [message,setMessage]=useState("두 사람 모두 카메라에 보이도록 서 주세요.");
  const [status,setStatus]=useState<DuoStatus>(EMPTY);
  const [duration,setDuration]=useState<RoundDuration>(game.recommendedSeconds);
  const durationRef=useRef(duration);durationRef.current=duration;
  const [playing,setPlaying]=useState(false);
  const [paused,setPaused]=useState(false);
  const [countdown,setCountdown]=useState(0);
  const [time,setTime]=useState<number>(game.recommendedSeconds);
  const [teamScore,setTeamScore]=useState(0);
  const [scores,setScores]=useState({p1:0,p2:0});
  const [combo,setCombo]=useState(0);
  const [finished,setFinished]=useState(false);
  const [stats,setStats]=useState<GameStats|null>(null);
  const [newBest,setNewBest]=useState(false);
  const [best,setBest]=useState(0);
  const [showSettings,setShowSettings]=useState(false);
  const [fullscreen,setFullscreen]=useState(false);
  const [gestureProgress,setGestureProgress]=useState(0);
  const [queued,setQueued]=useState(false);
  const queuedRef=useRef(false),finishedRef=useRef(false);
  const mounted=useRef(true);
  const videoRef=useRef<HTMLVideoElement>(null),canvasRef=useRef<HTMLCanvasElement>(null);
  const wrapRef=useRef<HTMLDivElement>(null),panelRef=useRef<HTMLDivElement>(null);
  const streamRef=useRef<MediaStream|null>(null);
  const poseRef=useRef<PoseLandmarker|null>(null);
  const handRef=useRef<HandLandmarker|null>(null);
  const tokenRef=useRef(0),frameRef=useRef(0);
  const identitiesRef=useRef(createTwoPlayerState());
  const playersRef=useRef<readonly [PlayerFrame,PlayerFrame]|null>(null);
  const roundRef=useRef(createDuoRound(id,game.recommendedSeconds));
  const feelRef=useRef(new GameFeelSession(game.feedback.scoreProfile));
  const audioRef=useRef(new AudioManager());
  const effectsRef=useRef(new EffectManager());
  const countdownRef=useRef(0);
  const settingsOpenRef=useRef(false);
  const quickMutedRef=useRef(false);
  const lastVisibleRef=useRef(0);
  useEffect(()=>{setBest(getBestRecord(id,"duo-"+rulesetForDuration(duration),settings.hitbox)?.score??0);},
    [id,duration,settings.hitbox]);
  useEffect(()=>{
    audioRef.current.setPreferences({musicEnabled:settings.musicEnabled&&!quickMutedRef.current,
      sfxEnabled:settings.sfxEnabled&&!quickMutedRef.current,musicVolume:settings.musicVolume,
      sfxVolume:settings.sfxVolume});
  },[settings.musicEnabled,settings.sfxEnabled,settings.musicVolume,settings.sfxVolume]);
  const stop=useCallback((notify=true)=>{
    tokenRef.current++;cancelAnimationFrame(frameRef.current);
    streamRef.current?.getTracks().forEach(t=>t.stop());streamRef.current=null;
    const video=videoRef.current;if(video){video.pause();video.srcObject=null;}
    poseRef.current?.close();poseRef.current=null;handRef.current?.close();handRef.current=null;
    identitiesRef.current=createTwoPlayerState();playersRef.current=null;
    roundRef.current.playing=false;audioRef.current.destroy();effectsRef.current.reset();
    countdownRef.current=0;queuedRef.current=false;finishedRef.current=false;
    if(notify&&mounted.current){
      setPhase("idle");setStatus(EMPTY);setPlaying(false);setPaused(false);
      setCountdown(0);setFinished(false);setQueued(false);setShowSettings(false);
    }
  },[]);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;stop(false);};},[stop]);

  const resetRound=()=>{
    roundRef.current=createDuoRound(id,durationRef.current);
    feelRef.current.reset();effectsRef.current.reset();
    setTime(durationRef.current);setTeamScore(0);setScores({p1:0,p2:0});
    setCombo(0);finishedRef.current=false;setFinished(false);setStats(null);setNewBest(false);
  };
  const begin=()=>{
    if(!playersRef.current?.every(p=>p.visible)||settingsOpenRef.current)return;
    resetRound();roundRef.current.playing=true;
    countdownRef.current=0;setCountdown(0);setGestureProgress(0);
    audioRef.current.start(game.feedback.musicTheme);audioRef.current.cue("start");
    setPlaying(true);setPaused(false);
  };
  const startCountdown=()=>{
    if(roundRef.current.playing||countdownRef.current>0||!playersRef.current?.every(p=>p.visible))return;
    queuedRef.current=false;setQueued(false);
    resetRound();countdownRef.current=COUNT_IN_SECONDS;setCountdown(COUNT_IN_SECONDS);
    audioRef.current.cue("countdown");
  };
  // Clicking while near the monitor queues the start. The countdown begins
  // only after both players return to the camera and are really detected.
  const queueStart=()=>{
    if(roundRef.current.playing||countdownRef.current>0)return;
    if(finishedRef.current){audioRef.current.stopMusic();resetRound();}
    queuedRef.current=true;setQueued(true);
  };
  const cancelQueued=()=>{queuedRef.current=false;setQueued(false);};
  const startCamera=async()=>{
    stop();
    audioRef.current.unlock();
    if(!window.isSecureContext){setPhase("error");setMessage("카메라 접근은 HTTPS 또는 localhost가 필요해요.");return;}
    if(!navigator.mediaDevices?.getUserMedia){setPhase("error");setMessage("현재 브라우저에서 카메라를 사용할 수 없어요.");return;}
    const token=tokenRef.current;
    setPhase("loading");setMessage("두 사람의 전신·손 추적 모델을 준비하고 있어요.");
    try{
      let stream:MediaStream;
      try{stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{
        facingMode:{ideal:optionsRef.current.side},width:{ideal:1280},height:{ideal:720},
        frameRate:{ideal:30,max:30}
      }});}catch(error){
        if(error instanceof DOMException&&(error.name==="OverconstrainedError"||error.name==="NotFoundError"))
          stream=await navigator.mediaDevices.getUserMedia({audio:false,video:true});
        else throw error;
      }
      if(token!==tokenRef.current){stream.getTracks().forEach(t=>t.stop());return;}
      streamRef.current=stream;
      const video=videoRef.current;if(!video)throw Error("Video element missing");
      video.srcObject=stream;video.muted=true;video.playsInline=true;
      await video.play();
      if(token!==tokenRef.current)return;
      const models=await loadCameraModels(2);
      if(token!==tokenRef.current){models.pose.close();models.hand?.close();return;}
      poseRef.current=models.pose;handRef.current=models.hand;
      setPhase("ready");
      let last=performance.now(),lastPose=0,lastHand=0,lastVideo=-1,lastHandSample=0;
      let handInterval=155,handLandmarks:Landmark[][]=[],lastHud=0,lastCountdownSecond=0;
      let gestureHold=0,gestureLatched=false,readySince:number|null=null;
      const tick=(now:number)=>{
        if(token!==tokenRef.current)return;
        frameRef.current=requestAnimationFrame(tick);
        const canvas=canvasRef.current,wrap=wrapRef.current,video=videoRef.current;
        if(!canvas||!wrap||!video)return;
        const dt=Math.max(0,Math.min(.08,(now-last)/1000));last=now;
        const box=wrap.getBoundingClientRect(),w=Math.max(1,box.width),h=Math.max(1,box.height);
        const dpr=Math.min(2,window.devicePixelRatio||1);
        if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){
          canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
        }
        const ctx=canvas.getContext("2d");if(!ctx)return;
        ctx.setTransform(dpr,0,0,dpr,0,0);
        const opts=optionsRef.current;
        const viewport:Viewport={width:w,height:h,videoWidth:video.videoWidth,
          videoHeight:video.videoHeight,mirror:opts.side==="user",fit:"contain"};
        if(!document.hidden&&video.readyState>=HTMLMediaElement.HAVE_CURRENT_DATA&&video.currentTime!==lastVideo){
          let inferred=false;
          if(now-lastPose>=105){
            lastPose=now;inferred=true;
            try{
              const poses=models.pose.detectForVideo(video,now).landmarks as Landmark[][];
              const palms=opts.preciseHands&&now-lastHandSample<380?handLandmarks:[];
              playersRef.current=buildTwoPlayerFrames(identitiesRef.current,poses,palms,now,viewport,
                opts.hitbox,opts.preciseHands,dt);
              lastVisibleRef.current=now;
            }catch(error){
              console.warn("Duo pose frame failed",error);
              playersRef.current=buildTwoPlayerFrames(identitiesRef.current,[],[],now,viewport,
                opts.hitbox,false,dt);
            }
          }
          if(opts.preciseHands&&handRef.current&&now-lastHand>=handInterval){
            lastHand=now;inferred=true;
            const began=performance.now();
            try{
              handLandmarks=handRef.current.detectForVideo(video,now).landmarks as Landmark[][];
              lastHandSample=now;
              handInterval=performance.now()-began>75?Math.min(500,handInterval+45):Math.max(150,handInterval-7);
            }catch(error){
              console.warn("Duo hand frame failed",error);
              handRef.current.close();handRef.current=null;handLandmarks=[];
            }
          }
          if(inferred)lastVideo=video.currentTime;
        }
        if(now-lastVisibleRef.current>450)playersRef.current=null;
        const frames=playersRef.current;
        // Old video frames are not live player input: block ghost gestures,
        // premature starts and scoring if video capture/inference stalls.
        const freshPose=now-lastVisibleRef.current<=220;
        const both=freshPose&&!!frames?.every(p=>p.visible);
        const fallback:readonly [PlayerFrame,PlayerFrame]=frames??[
          {id:"p1",pose:undefined,points:[],visible:false,handSources:{left:"none",right:"none"}},
          {id:"p2",pose:undefined,points:[],visible:false,handSources:{left:"none",right:"none"}}
        ];
        paintTwoPlayerPreview(ctx,video,fallback,viewport,opts.mode,opts.rings);
        paintDuoScene(ctx,roundRef.current,fallback,viewport);
        if(now-lastHud>180){
          lastHud=now;setStatus({
            p1:playerTrackingStatus(identitiesRef.current,"p1",now,freshPose&&!!frames?.[0]?.visible),
            p2:playerTrackingStatus(identitiesRef.current,"p2",now,freshPose&&!!frames?.[1]?.visible)
          });
        }
        const r=roundRef.current;
        const canRun=both&&!document.hidden&&!settingsOpenRef.current;
        if(!r.playing){
          // A queued click survives absence; do not start from stale pose data.
          const gate=updateQueuedDuoStart(readySince,queuedRef.current,canRun,now);
          readySince=gate.visibleSince;
          if(gate.ready&&countdownRef.current===0){
            startCountdown();readySince=null;
          }
          const raised=canRun&&frames!.every(p=>raisedHandsGesture(p.pose));
          if(!raised||queuedRef.current){gestureHold=0;gestureLatched=false;}
          else if(!gestureLatched&&countdownRef.current===0&&!finishedRef.current){
            gestureHold=Math.min(1,gestureHold+dt);
            if(gestureHold>=.9){gestureLatched=true;gestureHold=0;startCountdown();}
          }
          if(now-lastHud>120)setGestureProgress(Math.round(gestureHold/.9*100));
          if(countdownRef.current>0&&canRun){
            const before=Math.ceil(countdownRef.current);
            countdownRef.current=Math.max(0,countdownRef.current-dt);
            if(before!==Math.ceil(countdownRef.current)){
              setCountdown(Math.ceil(countdownRef.current));
              if(countdownRef.current>0)audioRef.current.cue("countdown");
            }
            if(countdownRef.current<=0){begin();gestureHold=0;}
          }
        }
        if(r.playing&&!r.paused&&!document.hidden&&!settingsOpenRef.current){
          if(!both){
            stepDuoRound(r,0,fallback,viewport);
            audioRef.current.setFinalRush(false);
          }else{
            const result=stepDuoRound(r,dt,frames!,viewport);
            for(const event of result.events){
              const feedback=feelRef.current.dispatch(event,scoreMultiplier(r.time));
              if(!feedback)continue;
              effectsRef.current.emit(feedback,opts.effectsQuality);
              audioRef.current.cue(feedback.milestone?"milestone":feedback.type);
            }
            audioRef.current.setFinalRush(r.time>0&&r.time<=FINAL_RUSH_SECONDS);
            audioRef.current.update();
            if(now-lastHud<110 || result.events.length || result.finished){
              const s=feelRef.current.stats;
              setTeamScore(s.score);setCombo(s.combo);
              setScores({...r.scores});setTime(Math.ceil(r.time));
              const sec=Math.ceil(r.time);
              if(sec!==lastCountdownSecond&&sec>0&&(sec===10||sec<=5)){
                lastCountdownSecond=sec;audioRef.current.cue("countdown");
              }
            }
            if(result.finished){
              audioRef.current.stopMusic();audioRef.current.cue("finish");
              const stats=feelRef.current.stats;
              if(!versus){
                const record=saveBestRecord(id,"duo-"+rulesetForDuration(durationRef.current),stats,opts.hitbox);
                setNewBest(record.isNew);setBest(record.record?.score??0);
              }
              finishedRef.current=true;
              setStats(stats);setPlaying(false);setFinished(true);setTime(0);
            }
          }
        }
        if(!r.paused&&!settingsOpenRef.current)effectsRef.current.update(dt);
        effectsRef.current.draw(ctx,w,h,opts.effectsQuality);
      };
      frameRef.current=requestAnimationFrame(tick);
    }catch(error){
      if(token!==tokenRef.current)return;
      const name=error instanceof DOMException?error.name:"";
      stop();setPhase("error");
      setMessage(name==="NotAllowedError"||name==="PermissionDeniedError"
        ?"카메라 권한을 확인해 주세요."
        :name==="NotFoundError"?"카메라를 찾을 수 없어요."
        :"2인용 카메라 모델 연결에 실패했어요. 인터넷 연결과 브라우저 지원을 확인해 주세요.");
      console.error(error);
    }
  };
  const togglePause=()=>{
    const r=roundRef.current;
    if(!r.playing)return;
    r.paused=!r.paused;setPaused(r.paused);
    if(r.paused)audioRef.current.pause();else audioRef.current.resume();
  };
  const openSettings=()=>{
    if(settingsOpenRef.current)return;
    settingsOpenRef.current=true;setShowSettings(true);
    if(roundRef.current.playing&&!roundRef.current.paused){
      roundRef.current.paused=true;setPaused(true);audioRef.current.pause();
    }
  };
  const closeSettings=()=>{
    settingsOpenRef.current=false;setShowSettings(false);
    // Preserve explicit pause: settings never forcibly resumes the game.
  };
  const restart=()=>{
    roundRef.current.playing=false;audioRef.current.stopMusic();setPlaying(false);
    resetRound();queueStart();
  };
  const toggleFullscreen=async()=>{
    try{if(document.fullscreenElement)await document.exitFullscreen();
      else await panelRef.current?.requestFullscreen();
      setFullscreen(!!document.fullscreenElement);
    }catch{setFullscreen(false);}
  };
  const all=phase==="ready"&&status.p1==="live"&&status.p2==="live";
  const r=roundRef.current;
  const results=versus?r.scores.p1===r.scores.p2?"무승부":(r.scores.p1>r.scores.p2?"P1 승리!":"P2 승리!"):"팀 점수 "+teamScore;
  return <main className="site-container duo-game-page">
    <div className="duo-game-heading"><Link to="/games" className="secondary">← 게임 목록</Link>
      <div><span className="kicker">2 PLAYER {versus?"VERSUS":"CO-OP"}</span><h1>{game.emoji} {game.title}</h1></div>
      <Link to="/players" className="secondary">2인 인식 테스트</Link></div>
    <div className="duo-game-panel" ref={panelRef}>
      <div className="duo-game-bar">
        <span className="duo-status"><b className={status.p1==="live"?"on":status.p1==="recovering"?"recovering":""}>● P1</b><b className={status.p2==="live"?"on":status.p2==="recovering"?"recovering":""}>● P2</b></span>
        <div className="duo-scorebar">
          {versus?<><strong>P1 {scores.p1}</strong><strong>P2 {scores.p2}</strong></>:<strong>TEAM {teamScore.toLocaleString()}</strong>}
          <strong>{time}초</strong>{combo>1&&<strong>{combo} COMBO</strong>}
        </div>
      </div>
      <div className="duo-game-stage" ref={wrapRef}>
        <video ref={videoRef} className="source-video" autoPlay playsInline muted aria-hidden="true"/>
        <canvas ref={canvasRef} aria-label="두 플레이어의 실시간 게임 화면"/>
        {phase!=="ready"&&<div className="duo-stage-prompt">
          <strong>{phase==="loading"?"2인용 모델 로딩 중":phase==="error"?"카메라 오류":"2인용 게임 준비"}</strong>
          <p>{phase==="idle"?INFO[id]:message}</p>
          {phase!=="loading"&&<button type="button" className="primary" onClick={()=>void startCamera()}>📷 카메라 시작</button>}
        </div>}
        {phase==="ready"&&!all&&<div className="duo-game-notice">{queued?"게임 시작 대기 중 · 두 사람이 돌아오면 자동으로 시작해요":"두 사람이 모두 카메라에 보여야 게임이 진행돼요 · 추적이 끊기면 시간이 멈춰요"}</div>}
        {phase==="ready"&&!playing&&!finished&&countdown===0&&
          <div className="duo-game-start"><strong>{queued?"시작 대기 중 · 두 사람 모두 돌아오면 카운트다운":"둘 다 양손을 어깨 위로 1초! 또는 버튼으로 예약"}</strong>
            {!queued&&<div className="duo-start-meter"><i style={{width:gestureProgress+"%"}}/></div>}
            <button type="button" className="primary" onClick={queued?cancelQueued:queueStart}>{queued?"시작 예약 취소":"두 사람 게임 시작"}</button>
          </div>}
        {countdown>0&&<div className={"duo-countdown"+(!all?" waiting":"")}>{all?countdown:"두 사람을 기다리는 중"}</div>}
        {playing&&time<=FINAL_RUSH_SECONDS&&time>0&&<div className="duo-rush">LAST {FINAL_RUSH_SECONDS} · 2× SCORE</div>}
        {finished&&<div className="duo-game-result">
          <strong>{results}</strong><p>{versus?`P1 ${scores.p1} : P2 ${scores.p2}`:
            `최대 콤보 ${stats?.maxCombo??0} · 성공 ${stats?.successes??0}`}</p>
          {newBest&&<p>🏆 새로운 최고 기록!</p>}
          <div><button type="button" className="primary" onClick={restart}>다시 플레이</button>
            <ShareButton game={game} className="secondary"/></div>
          </div>}
        {showSettings&&<div className="duo-settings-scrim"><section className="duo-settings-dialog" aria-label="게임 간편 설정">
          <h2>⚙ 간편 설정</h2><p>게임은 일시정지 상태로 유지돼요. 변경 사항은 기본 설정에도 저장됩니다.</p>
          <label><span>배경음악 {settings.musicVolume}%</span>
            <input type="range" min="0" max="100" step="5" value={settings.musicVolume} onChange={e=>update({musicVolume:Number(e.target.value)})}/></label>
          <label><span>효과음 {settings.sfxVolume}%</span>
            <input type="range" min="0" max="100" step="5" value={settings.sfxVolume} onChange={e=>update({sfxVolume:Number(e.target.value)})}/></label>
          <label><span>스틱맨 표시</span><select value={settings.mode} onChange={e=>update({mode:e.target.value as typeof settings.mode})}>
            <option value="camera">카메라만</option><option value="both">영상 + 스틱맨</option><option value="stickman">스틱맨만</option></select></label>
          <button type="button" className="primary" onClick={closeSettings}>게임으로 돌아가기</button>
        </section></div>}
      </div>
      <div className="duo-game-actions">
        <p>{playing?r.message:INFO[id]}</p>
        <div className="actions">
          {!playing&&!finished&&phase==="ready"&&<div className="duo-duration" role="group" aria-label="게임 시간">
            {ROUND_DURATIONS.map(n=><button type="button" key={n} disabled={countdown>0}
              className={duration===n?"active":""} aria-pressed={duration===n}
              onClick={()=>{setDuration(n);setTime(n);}}>{n}초</button>)}</div>}
          {playing&&<button type="button" className="secondary" onClick={togglePause}>{paused?"▶ 재개":"Ⅱ 일시정지"}</button>}
          {phase==="ready"&&<button type="button" className="secondary" onClick={openSettings}>⚙ 설정</button>}
          <button type="button" className="secondary" onClick={()=>void toggleFullscreen()}>{fullscreen?"전체화면 종료":"⛶ 전체화면"}</button>
          {phase==="ready"&&<button type="button" className="secondary" onClick={()=>stop()}>카메라 끄기</button>}
        </div>
      </div>
    </div>
    <p className="duo-game-safety">서로 충분히 떨어져서 플레이하고 다른 사람을 손으로 치거나 밀지 마세요. 조명이 충분한 장소에서 전신이 카메라에 보이게 해 주세요.</p>
  </main>;
}
