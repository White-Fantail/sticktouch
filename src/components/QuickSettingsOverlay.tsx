import type {KeyboardEvent} from "react";
import type {AppSettings, DisplayMode} from "../settings/settings";
import type {MusicTheme} from "../engine/audio";

type Props = {
  settings:AppSettings;
  handModelStatus:"pending"|"ready"|"fallback";
  handSources:{left:"hand"|"pose"|"none";right:"hand"|"pose"|"none"};
  update:(patch:Partial<AppSettings>)=>void;
  onClose:()=>void;
  onPreviewMusic:()=>void;
  onPreviewSfx:()=>void;
  theme:MusicTheme;
};

/** Lightweight settings modal inside the fullscreen-capable game stage. */
export function QuickSettingsOverlay({settings,update,onClose,onPreviewMusic,onPreviewSfx,handModelStatus,handSources}:Props){
  const trapFocus=(event:KeyboardEvent<HTMLDivElement>)=>{
    if(event.key!=="Tab")return;
    const controls=Array.from(event.currentTarget.querySelectorAll<HTMLElement>(
      '.quick-settings-modal button:not(:disabled),.quick-settings-modal input:not(:disabled)'
    ));
    const first=controls[0],last=controls[controls.length-1];
    if(!first||!last)return;
    if(event.shiftKey&&document.activeElement===first){
      event.preventDefault();last.focus();
    } else if(!event.shiftKey&&document.activeElement===last){
      event.preventDefault();first.focus();
    }
  };
  return <div className="quick-settings-backdrop" onKeyDown={trapFocus}>
    <section className="quick-settings-modal" role="dialog" aria-modal="true"
      aria-labelledby="quick-settings-heading" aria-describedby="quick-settings-description">
      <header className="quick-settings-header">
        <div><span className="kicker">QUICK SETTINGS</span>
          <h2 id="quick-settings-heading">⚙ 게임 설정</h2>
          <p id="quick-settings-description">게임은 일시정지 중입니다. 변경 사항은 자동 저장돼요.</p>
        </div>
        <button autoFocus type="button" className="quick-close" onClick={onClose}
          aria-label="게임 설정 닫기">✕</button>
      </header>
      <div className="quick-settings-body">
        <section className="quick-settings-section" aria-label="소리 설정">
          <h3>🔊 사운드</h3>
          <div className="quick-control-row">
            <label htmlFor="quick-music-on">배경음악</label>
            <input type="checkbox" id="quick-music-on" checked={settings.musicEnabled}
              onChange={e=>update({musicEnabled:e.target.checked})}/>
          </div>
          <div className="quick-volume-line">
            <label htmlFor="quick-music-volume">음악 크기</label>
            <output htmlFor="quick-music-volume">{settings.musicVolume}%</output>
          </div>
          <div className="quick-slider-row">
            <input type="range" id="quick-music-volume" min="0" max="100" step="5"
              disabled={!settings.musicEnabled} value={settings.musicVolume}
              onChange={e=>update({musicVolume:Number(e.target.value)})}
              onPointerUp={onPreviewMusic} onKeyUp={onPreviewMusic}/>
            <button type="button" disabled={!settings.musicEnabled||settings.musicVolume===0}
              onClick={onPreviewMusic}>▶ 들어보기</button>
          </div>
          <div className="quick-control-row">
            <label htmlFor="quick-sfx-on">효과음</label>
            <input type="checkbox" id="quick-sfx-on" checked={settings.sfxEnabled}
              onChange={e=>update({sfxEnabled:e.target.checked})}/>
          </div>
          <div className="quick-volume-line">
            <label htmlFor="quick-sfx-volume">효과음 크기</label>
            <output htmlFor="quick-sfx-volume">{settings.sfxVolume}%</output>
          </div>
          <div className="quick-slider-row">
            <input type="range" id="quick-sfx-volume" min="0" max="100" step="5"
              disabled={!settings.sfxEnabled} value={settings.sfxVolume}
              onChange={e=>update({sfxVolume:Number(e.target.value)})}
              onPointerUp={onPreviewSfx} onKeyUp={onPreviewSfx}/>
            <button type="button" disabled={!settings.sfxEnabled||settings.sfxVolume===0}
              onClick={onPreviewSfx}>▶ 들어보기</button>
          </div>
        </section>
        <section className="quick-settings-section" aria-label="화면 및 판정 설정">
          <h3>✦ 화면 / 판정</h3>
          <label className="quick-sub-label">화면 표시</label>
          <div className="quick-segmented" role="group" aria-label="화면 표시 모드">
            {([["camera","카메라"],["both","카메라 + 스틱맨"],["stickman","스틱맨"]] as
              [DisplayMode,string][]).map(([value,label])=>
              <button key={value} type="button" aria-pressed={settings.mode===value}
                className={settings.mode===value?"selected":""}
                onClick={()=>update({mode:value})}>{label}</button>)}
          </div>
          <div className="quick-control-row">
            <label htmlFor="quick-rings">터치 영역 표시</label>
            <input type="checkbox" id="quick-rings" checked={settings.rings}
              onChange={e=>update({rings:e.target.checked})}/>
          </div>
          <div className="quick-volume-line">
            <label htmlFor="quick-hitbox">터치 판정 크기</label>
            <output htmlFor="quick-hitbox">{settings.hitbox}%</output>
          </div>
          <input className="quick-full-slider" type="range" id="quick-hitbox" min="50" max="200"
            step="10" value={settings.hitbox}
            onChange={e=>update({hitbox:Number(e.target.value)})}/>
          <label className="quick-sub-label">시각 효과</label>
          <div className="quick-segmented" role="group" aria-label="시각 효과 품질">
            {([["full","풍부하게"],["light","가볍게"],["off","최소"]] as const).map(([value,label])=>
              <button type="button" key={value} aria-pressed={settings.effectsQuality===value}
                className={settings.effectsQuality===value?"selected":""}
                onClick={()=>update({effectsQuality:value})}>{label}</button>)}
          </div>
        </section>
        {settings.diagnostics && <section className="quick-diagnostics" aria-label="실시간 추적 진단">
          <h3>손 추적 진단</h3>
          <div className="quick-diagnostics-values">
            <span>정밀 추적 <b>{settings.preciseHands?"ON":"OFF"}</b></span>
            <span>Hand 모델 <b>{handModelStatus==="pending"?"준비 전":handModelStatus==="ready"?"준비됨":"Pose 폴백"}</b></span>
            <span>왼손 <b>{handSources.left.toUpperCase()}</b></span>
            <span>오른손 <b>{handSources.right.toUpperCase()}</b></span>
          </div>
        </section>}
      </div>
      <footer className="quick-settings-footer">
        <span>기존 설정 페이지와 동일하게 저장됩니다.</span>
        <button type="button" className="primary" onClick={onClose}>✓ 게임으로 돌아가기</button>
      </footer>
    </section>
  </div>;
}
