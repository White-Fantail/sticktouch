import {useState} from "react";
import {useSettings} from "../settings/SettingsContext";
import {type DisplayMode} from "../settings/settings";
type Tab = "display" | "camera" | "game" | "advanced";
const TABS: {id: Tab; name:string}[] = [
  {id:"display",name:"화면 / 표시"},{id:"camera",name:"카메라 / 인식"},
  {id:"game",name:"게임 기본값"},{id:"advanced",name:"고급 / 진단"}
];
export function SettingsPage() {
  const {settings,update,reset} = useSettings();
  const [tab,setTab] = useState<Tab>("display");
  return <main className="site-container settings-page">
    <div className="page-intro"><span className="kicker">PREFERENCES</span><h1>설정</h1>
      <p>한 번 설정하면 이 브라우저에서 다음 게임에도 적용돼요. 변경 사항은 자동 저장됩니다.</p></div>
    <div className="settings-layout">
      <nav className="settings-nav" aria-label="설정 항목">{TABS.map(item =>
        <button key={item.id} className={tab===item.id?"active":""} aria-current={tab===item.id?"page":undefined} onClick={()=>setTab(item.id)}>{item.name}<span>›</span></button>)}</nav>
      <section className="settings-content" aria-label={TABS.find(item=>item.id===tab)?.name}>
        {tab==="display" && <>
          <h2>화면 / 표시</h2><p className="panel-description">카메라와 스틱맨을 어떤 방식으로 볼지 선택하세요.</p>
          <div className="setting-group"><label>화면 표시 모드</label>
            <div className="mode-options">{([
              ["camera","▣","실제 영상"],["both","♧","영상 + 스틱맨"],["stickman","♙","스틱맨만"]
            ] as [DisplayMode,string,string][]).map(([id,icon,label])=>
              <button key={id} type="button" className={settings.mode===id?"selected":""} aria-pressed={settings.mode===id} onClick={()=>update({mode:id})}><span>{icon}</span>{label}</button>)}</div></div>
          <div className="setting-group"><div className="setting-line"><label htmlFor="rings">터치 포인트 원 표시</label>
            <input type="checkbox" id="rings" checked={settings.rings} onChange={e=>update({rings:e.target.checked})}/></div>
            <p>표시만 끌 수 있으며 실제 충돌 판정에는 영향을 주지 않아요.</p></div>
          <div className="setting-group"><div className="setting-line"><label htmlFor="hitbox">터치 판정 크기</label><output htmlFor="hitbox">{settings.hitbox}%</output></div>
            <input id="hitbox" className="slider" type="range" min="50" max="200" step="10" value={settings.hitbox} onChange={e=>update({hitbox:Number(e.target.value)})}/>
            <div className="range-label"><span>정밀 50%</span><span>넉넉 200%</span></div>
            <div className="presets">{[70,100,150].map(value=><button key={value} type="button" className={settings.hitbox===value?"active":""} onClick={()=>update({hitbox:value})}>{value}%</button>)}</div>
            <p>목표물을 맞히기는 쉬워져도 회피 게임에서는 불리해질 수 있어요.</p></div>
        </>}
        {tab==="camera" && <>
          <h2>카메라 / 인식</h2><p className="panel-description">카메라는 게임에 들어가서 직접 시작할 때만 켜집니다.</p>
          <div className="setting-group"><label>기본 카메라</label>
            <div className="mode-options">{(["user","environment"] as const).map(id=><button key={id} type="button" className={settings.side===id?"selected":""} aria-pressed={settings.side===id} onClick={()=>update({side:id})}>{id==="user"?"전면 / 내장 카메라":"후면 카메라"}</button>)}</div>
            <p>웹캠만 있는 PC에서는 브라우저가 사용할 수 있는 카메라로 자동 전환할 수 있어요.</p></div>
          <div className="setting-group"><div className="setting-line"><label htmlFor="preciseHands">손바닥 정밀 추적</label>
            <input type="checkbox" id="preciseHands" checked={settings.preciseHands} onChange={e=>update({preciseHands:e.target.checked})}/></div>
            <p>ON은 Hand 모델을 우선 사용하며, OFF에서도 Pose가 손바닥 위치를 추정해요.</p></div>
          <div className="tip"><b>안전 안내</b><p>게임 전 주변 장애물을 치우고 몸이 화면에 충분히 보이도록 서 주세요. 모바일에서는 가로 화면을 권장해요.</p></div>
        </>}
        {tab==="game" && <>
          <h2>게임 기본값</h2><p className="panel-description">게임 시작 전에 30초(짧게), 45초(기본), 60초(길게) 중 선택할 수 있어요. 게임마다 권장 시간이 자동으로 선택됩니다.</p>
          <div className="setting-group"><label>게임 진행</label><p>대부분의 게임은 45초를 권장하고, 빠른 반응 게임은 30초, 중력 미로·별자리 제작자는 60초를 권장해요. 마지막 15초는 속도 상승 + 점수 2배 피버 타임입니다.</p></div>
          <div className="setting-group">
            <div className="setting-line"><label htmlFor="musicEnabled">배경음악</label>
              <input type="checkbox" id="musicEnabled" checked={settings.musicEnabled}
                onChange={e=>update({musicEnabled:e.target.checked})}/></div>
            <div className="setting-line audio-slider-label">
              <label htmlFor="musicVolume">배경음악 볼륨</label><output htmlFor="musicVolume">{settings.musicVolume}%</output>
            </div>
            <input id="musicVolume" className="slider" type="range" min="0" max="100" step="5"
              disabled={!settings.musicEnabled} value={settings.musicVolume}
              onChange={e=>update({musicVolume:Number(e.target.value)})}/>
          </div>
          <div className="setting-group">
            <div className="setting-line"><label htmlFor="sfxEnabled">게임 효과음</label>
              <input type="checkbox" id="sfxEnabled" checked={settings.sfxEnabled}
                onChange={e=>update({sfxEnabled:e.target.checked})}/></div>
            <div className="setting-line audio-slider-label">
              <label htmlFor="sfxVolume">효과음 볼륨</label><output htmlFor="sfxVolume">{settings.sfxVolume}%</output>
            </div>
            <input id="sfxVolume" className="slider" type="range" min="0" max="100" step="5"
              disabled={!settings.sfxEnabled} value={settings.sfxVolume}
              onChange={e=>update({sfxVolume:Number(e.target.value)})}/>
            <p>브라우저 자동재생 정책에 따라 게임 시작 버튼을 누른 다음 음악이 재생돼요.</p>
          </div>
          <div className="setting-group"><label>시각 효과 품질</label>
            <div className="mode-options">{([
              ["full","풍부하게"],["light","가볍게"],["off","최소"]
            ] as const).map(([quality,label])=>
              <button type="button" key={quality} className={settings.effectsQuality===quality?"selected":""}
                aria-pressed={settings.effectsQuality===quality}
                onClick={()=>update({effectsQuality:quality})}>{label}</button>)}</div>
            <p>저사양 모바일 기기는 가볍게 모드를 추천합니다. 최소에서도 점수 안내는 유지돼요.</p>
          </div>
          <div className="setting-group"><button type="button" className="secondary" onClick={()=>{if(window.confirm("StickTouch 설정을 기본값으로 복원할까요?")) reset();}}>모든 설정 기본값으로 복원</button></div>
        </>}
        {tab==="advanced" && <>
          <h2>고급 / 진단</h2><p className="panel-description">추적 정확도를 비교하거나 문제를 확인할 때만 사용하세요.</p>
          <div className="setting-group"><div className="setting-line"><label htmlFor="diagnostics">추적 입력 진단 표시</label>
            <input type="checkbox" id="diagnostics" checked={settings.diagnostics} onChange={e=>update({diagnostics:e.target.checked})}/></div>
            <p>게임 중 ⚙ 간편 설정을 열면 왼손과 오른손의 실제 앵커 출처(HAND / POSE)를 볼 수 있어요. 플레이 화면 아래에는 표시하지 않습니다.</p></div>
          <div className="tip"><b>참고</b><p>Hand 모델을 꺼도 Pose 기반 손바닥 추정은 동작하므로 터치 원이 손바닥에 나타나는 것이 정상이에요.</p></div>
        </>}
      </section>
    </div>
  </main>;
}
