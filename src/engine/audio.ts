import type {GameEventType} from "./game-feel";
export type AudioPreferences={
  musicEnabled:boolean; sfxEnabled:boolean; musicVolume:number; sfxVolume:number;
};
type MusicTheme="pop"|"fruit"|"rhythm";
const notes={pop:[0,4,7,12,7,4,2,7],fruit:[0,2,4,7,9,7,4,2],rhythm:[0,0,7,5,0,3,7,10]};
export class AudioManager {
  private context:AudioContext|null=null;
  private musicGain:GainNode|null=null;
  private fxGain:GainNode|null=null;
  private playing=false;
  private mutedByPause=false;
  private nextNote=0;
  private noteIndex=0;
  private theme:MusicTheme="pop";
  private prefs:AudioPreferences={musicEnabled:true,sfxEnabled:true,musicVolume:35,sfxVolume:65};
  setPreferences(next:AudioPreferences){
    this.prefs=next;
    if(this.musicGain)this.musicGain.gain.value=next.musicEnabled?next.musicVolume/100*0.18:0;
    if(this.fxGain)this.fxGain.gain.value=next.sfxEnabled?next.sfxVolume/100*0.35:0;
  }
  /** Called synchronously from the user pressing Start so autoplay restrictions are respected. */
  start(theme:MusicTheme="pop"){
    try{
      const AudioCtor=window.AudioContext;
      if(!AudioCtor)return;
      if(!this.context || this.context.state==="closed"){
        this.context=new AudioCtor();
        this.musicGain=this.context.createGain();this.musicGain.connect(this.context.destination);
        this.fxGain=this.context.createGain();this.fxGain.connect(this.context.destination);
      }
      void this.context.resume().catch(()=>{/* Browser may defer audio until another gesture. */});
      this.theme=theme;this.playing=true;this.mutedByPause=false;this.nextNote=0;this.noteIndex=0;
      this.setPreferences(this.prefs);
    }catch{/* Audio is optional and must never block play. */}
  }
  pause(){this.mutedByPause=true;}
  resume(){
    this.mutedByPause=false;this.nextNote=0;
    if(this.context&&this.context.state==="suspended")void this.context.resume().catch(()=>{});
  }
  stopMusic(){this.playing=false;this.nextNote=0;}
  update(){
    const ctx=this.context;
    if(!ctx||ctx.state!=="running"||!this.playing||this.mutedByPause||!this.prefs.musicEnabled)return;
    const beatLength=this.theme==="rhythm"?0.25:0.3;
    if(!this.nextNote)this.nextNote=ctx.currentTime+0.035;
    // Only schedule a short horizon, limiting unnecessary audio work.
    let scheduled=0;
    while(this.nextNote<ctx.currentTime+0.10 && scheduled++<3){
      const sequence=notes[this.theme];
      const offset=sequence[this.noteIndex%sequence.length];
      const root=this.theme==="fruit"?220:196;
      if(this.noteIndex%2===0)this.tone(root*Math.pow(2,offset/12),this.nextNote,0.13,
        "triangle",this.musicGain,0.4);
      if(this.noteIndex%4===0)this.tone(root/2,this.nextNote,0.19,"sine",this.musicGain,0.32);
      this.noteIndex++;this.nextNote+=beatLength;
    }
  }
  cue(type:GameEventType|"milestone"|"start"|"finish"){
    const ctx=this.context;
    if(!ctx||ctx.state!=="running"||this.mutedByPause||!this.prefs.sfxEnabled)return;
    const t=ctx.currentTime;
    if(type==="hit"||type==="collect"||type==="perfect"||type==="good"){
      this.tone(type==="collect"?740:520,t,0.07,"triangle",this.fxGain,0.8);
      this.tone(type==="perfect"?1120:790,t+0.045,0.08,"sine",this.fxGain,0.45);
    }else if(type==="milestone"){
      [660,830,990].forEach((frequency,i)=>this.tone(frequency,t+i*.075,.16,"triangle",this.fxGain,0.7));
    }else if(type==="finish"){
      [784,587,392].forEach((frequency,i)=>this.tone(frequency,t+i*.13,.17,"triangle",this.fxGain,0.65));
    }else if(type==="start"){
      [440,554,659].forEach((frequency,i)=>this.tone(frequency,t+i*.075,.12,"triangle",this.fxGain,0.6));
    }else if(type==="miss"||type==="damage"){
      this.tone(180,t,.12,"sawtooth",this.fxGain,.45);
    }else if(type==="bonus"){
      this.tone(880,t,.15,"sine",this.fxGain,.6);
    }
  }
  private tone(frequency:number,start:number,duration:number,shape:OscillatorType,
    output:GainNode|null,volume:number){
    const ctx=this.context;if(!ctx||!output)return;
    const osc=ctx.createOscillator(),gain=ctx.createGain();
    osc.type=shape;osc.frequency.value=frequency;
    gain.gain.setValueAtTime(0.0001,start);
    gain.gain.exponentialRampToValueAtTime(Math.max(.0002,volume*.35),start+.012);
    gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
    osc.connect(gain);gain.connect(output);osc.start(start);osc.stop(start+duration+.015);
    osc.onended=()=>{osc.disconnect();gain.disconnect();};
  }
  destroy(){
    this.stopMusic();
    const previous=this.context;
    this.context=null;this.musicGain=null;this.fxGain=null;
    if(previous&&previous.state!=="closed")void previous.close().catch(()=>{});
  }
}
