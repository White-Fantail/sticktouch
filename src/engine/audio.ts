import type {GameEventType,GameEvent} from "./game-feel";

export type AudioPreferences = {
  musicEnabled: boolean; sfxEnabled: boolean; musicVolume: number; sfxVolume: number;
};
export type MusicTheme = "pop" | "fruit" | "rhythm";
export type AudioChannel = "music" | "sfx";
const notes: Record<MusicTheme, readonly number[]> = {
  pop:[0,4,7,12,7,4,2,7],fruit:[0,2,4,7,9,7,4,2],rhythm:[0,0,7,5,0,3,7,10]
};

/** Linear, predictable channel volumes. No hidden attenuation stacked on the slider. */
export function volumeToGain(volume:number, channel:AudioChannel):number {
  const bounded=Number.isFinite(volume)?Math.max(0,Math.min(100,volume)):0;
  return (bounded/100) * (channel==="music"?0.55:0.7);
}

export class AudioManager {
  private context:AudioContext|null=null;
  private musicGain:GainNode|null=null;
  private fxGain:GainNode|null=null;
  private previewMusicGain:GainNode|null=null;
  private playing=false;
  private mutedByPause=false;
  private finalRush=false;
  private nextNote=0;
  private noteIndex=0;
  private theme:MusicTheme="pop";
  private prefs:AudioPreferences={musicEnabled:true,sfxEnabled:true,musicVolume:55,sfxVolume:65};

  private ensureContext():AudioContext|null {
    try {
      if(this.context && this.context.state!=="closed") return this.context;
      const AudioCtor=window.AudioContext ||
        (window as Window & {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
      if(!AudioCtor)return null;
      const ctx=new AudioCtor();
      this.context=ctx;
      this.musicGain=ctx.createGain();this.musicGain.connect(ctx.destination);
      this.fxGain=ctx.createGain();this.fxGain.connect(ctx.destination);
      // Preview has a separate bus: the game remains muted while the settings dialog is open.
      this.previewMusicGain=ctx.createGain();
      this.previewMusicGain.gain.value=0;
      this.previewMusicGain.connect(ctx.destination);
      this.applyVolumes();
      return ctx;
    }catch{return null;}
  }
  private gainTo(node:GainNode|null,target:number){
    if(!node || !this.context)return;
    const param=node.gain;
    // Smooth fast changes to avoid volume-slider clicks.
    param.setTargetAtTime(target,this.context.currentTime,0.018);
  }
  private applyVolumes(){
    this.gainTo(this.musicGain,this.prefs.musicEnabled&&!this.mutedByPause
      ?volumeToGain(this.prefs.musicVolume,"music"):0);
    this.gainTo(this.fxGain,this.prefs.sfxEnabled?volumeToGain(this.prefs.sfxVolume,"sfx"):0);
  }
  setPreferences(next:AudioPreferences){
    const previous=this.prefs;
    this.prefs={...next};
    if(previous.musicEnabled!==next.musicEnabled || (previous.musicVolume===0)!==(next.musicVolume===0))
      this.nextNote=0;
    this.applyVolumes();
  }
  /** Prime browser audio during the camera permission click for later hands-free starts. */
  unlock(){const ctx=this.ensureContext();if(ctx)void ctx.resume().catch(()=>{});}
  setFinalRush(active:boolean){
    if(this.finalRush===active)return;
    this.finalRush=active;this.nextNote=0;
  }
  /** Start a primed audio session after the hands-free countdown. */
  start(theme:MusicTheme="pop"){
    const ctx=this.ensureContext();
    if(!ctx)return;
    void ctx.resume().catch(()=>{});
    this.theme=theme;this.playing=true;this.mutedByPause=false;this.finalRush=false;
    this.nextNote=0;this.noteIndex=0;this.applyVolumes();
  }
  pause(){
    this.mutedByPause=true;this.nextNote=0;
    this.applyVolumes();
  }
  resume(){
    this.mutedByPause=false;this.nextNote=0;
    const ctx=this.context;
    if(ctx&&ctx.state==="suspended")void ctx.resume().catch(()=>{});
    this.applyVolumes();
  }
  stopMusic(){
    this.playing=false;this.nextNote=0;this.finalRush=false;
    this.gainTo(this.musicGain,0);
  }
  update(){
    const ctx=this.context;
    if(!ctx||ctx.state!=="running"||!this.playing||this.mutedByPause||
      !this.prefs.musicEnabled||this.prefs.musicVolume<=0)return;
    const beatLength=(this.theme==="rhythm"?0.24:0.28)/(this.finalRush?1.22:1);
    if(!this.nextNote || this.nextNote<ctx.currentTime-0.12)this.nextNote=ctx.currentTime+0.025;
    let scheduled=0;
    while(this.nextNote<ctx.currentTime+0.13 && scheduled++<3){
      const offset=notes[this.theme][this.noteIndex%notes[this.theme].length];
      const root=this.theme==="fruit"?220:196;
      // An audible melody every beat instead of a tiny note every second beat.
      this.tone(root*Math.pow(2,offset/12),this.nextNote,beatLength*0.8,
        "triangle",this.musicGain,0.30);
      if(this.noteIndex%2===0){
        this.tone(root/2,this.nextNote,beatLength*0.86,"sine",this.musicGain,0.23);
      }
      this.noteIndex++;this.nextNote+=beatLength;
    }
  }
  /** Plays a short sample while paused. Does not resume the game or background music. */
  previewMusic(theme:MusicTheme=this.theme){
    if(!this.prefs.musicEnabled||this.prefs.musicVolume===0)return;
    const ctx=this.ensureContext(),bus=this.previewMusicGain;
    if(!ctx||!bus)return;
    void ctx.resume().catch(()=>{});
    const now=ctx.currentTime+0.025;
    bus.gain.cancelScheduledValues(now);
    bus.gain.setValueAtTime(volumeToGain(this.prefs.musicVolume,"music"),now);
    const root=theme==="fruit"?220:196;
    this.tone(root,now,0.22,"triangle",bus,0.3);
    this.tone(root*Math.pow(2,4/12),now+0.24,0.22,"triangle",bus,0.3);
    this.tone(root*Math.pow(2,7/12),now+0.48,0.22,"triangle",bus,0.3);
    bus.gain.setValueAtTime(0,now+0.74);
  }
  previewSfx(){
    if(!this.prefs.sfxEnabled||this.prefs.sfxVolume===0)return;
    const ctx=this.ensureContext();
    if(!ctx)return;
    void ctx.resume().catch(()=>{});
    this.cue("hit",true);
  }
  /** Instrument synthesis uses the same unlocked, pause-aware SFX bus.
   * No microphone input, audio recordings or third-party samples. */
  cueCreative(event:Pick<GameEvent,"instrument"|"pitch">):boolean{
    if(!event.instrument||!Number.isFinite(event.pitch))return false;
    const ctx=this.context;
    if(!ctx||ctx.state==="closed"||this.mutedByPause||
      !this.prefs.sfxEnabled||this.prefs.sfxVolume<=0)return true;
    const t=ctx.currentTime+.012,f=Math.max(65,Math.min(1600,event.pitch!));
    switch(event.instrument){
      case "drum":
        this.tone(f,t,.11,f>600?"sawtooth":"triangle",this.fxGain,.30);
        this.tone(Math.max(70,f*.50),t+.01,.15,"sine",this.fxGain,.24);
        break;
      case "keys":
        this.tone(f,t,.22,"triangle",this.fxGain,.30);
        this.tone(f*2,t+.015,.14,"sine",this.fxGain,.12);
        break;
      case "strings":
        this.tone(f,t,.32,"triangle",this.fxGain,.23);
        this.tone(f*1.5,t+.025,.26,"sine",this.fxGain,.14);
        break;
      case "brass":
        this.tone(f,t,.22,"sawtooth",this.fxGain,.17);
        this.tone(f*2,t+.035,.19,"triangle",this.fxGain,.12);
        break;
      case "paint":
        this.tone(f,t,.15,"sine",this.fxGain,.26);
        this.tone(f*1.25,t+.05,.20,"triangle",this.fxGain,.15);
        break;
    }
    return true;
  }
  cue(type:GameEventType|"milestone"|"start"|"finish"|"countdown",preview=false){
    const ctx=this.context;
    if(!ctx||ctx.state==="closed"||(!preview&&this.mutedByPause)||
      !this.prefs.sfxEnabled||this.prefs.sfxVolume<=0)return;
    const t=ctx.currentTime+0.012;
    if(type==="hit"||type==="collect"||type==="perfect"||type==="good"){
      this.tone(type==="collect"?740:520,t,0.095,"triangle",this.fxGain,0.28);
      this.tone(type==="perfect"?1120:790,t+0.047,0.11,"sine",this.fxGain,0.22);
    }else if(type==="milestone"){
      [660,830,990].forEach((frequency,i)=>this.tone(frequency,t+i*.08,.17,"triangle",this.fxGain,0.28));
    }else if(type==="countdown"){
      this.tone(740,t,.10,"sine",this.fxGain,0.24);
    }else if(type==="finish"){
      [784,587,392].forEach((frequency,i)=>this.tone(frequency,t+i*.14,.18,"triangle",this.fxGain,0.28));
    }else if(type==="start"){
      [440,554,659].forEach((frequency,i)=>this.tone(frequency,t+i*.085,.14,"triangle",this.fxGain,0.26));
    }else if(type==="miss"||type==="damage"){
      this.tone(180,t,.14,"sawtooth",this.fxGain,0.18);
    }else if(type==="bonus"){
      this.tone(880,t,.16,"sine",this.fxGain,0.24);
    }
  }
  private tone(frequency:number,start:number,duration:number,shape:OscillatorType,
    output:GainNode|null,volume:number){
    const ctx=this.context;if(!ctx||!output)return;
    const osc=ctx.createOscillator(),gain=ctx.createGain();
    osc.type=shape;osc.frequency.value=frequency;
    gain.gain.setValueAtTime(0.0001,start);
    gain.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),start+0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001,start+duration);
    osc.connect(gain);gain.connect(output);osc.start(start);osc.stop(start+duration+0.015);
    osc.onended=()=>{osc.disconnect();gain.disconnect();};
  }
  destroy(){
    this.playing=false;this.nextNote=0;this.finalRush=false;
    const previous=this.context;
    this.context=null;
    this.musicGain?.disconnect();this.fxGain?.disconnect();this.previewMusicGain?.disconnect();
    this.musicGain=null;this.fxGain=null;this.previewMusicGain=null;
    if(previous&&previous.state!=="closed")void previous.close().catch(()=>{});
  }
}
