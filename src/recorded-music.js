// A single recorded bed. Files are decoded lazily; the game keeps its own score.
export class RecordedMusic {
  constructor(ctx, destination, tracks, fetchFile = url => globalThis.fetch(url)) {
    this.ctx=ctx; this.tracks=tracks; this.fetchFile=fetchFile;
    this.id=tracks[0]?.id || ''; this.cache=new Map(); this.loads=new Map(); this.errors=new Set();
    this.wanted=false; this.offset=0; this.voice=null; this.state='idle';
    this.bus=ctx.createGain(); this.bus.gain.value=0; this.bus.connect(destination);
  }
  select(id) {
    if(id!=='' && !this.tracks.some(t=>t.id===id)) return false;
    if(this.id===id) return true;
    this.stop(); this.id=id; this.offset=0; this.state='idle'; return true;
  }
  load() {
    const track=this.tracks.find(t=>t.id===this.id);
    if(!track || this.loads.has(track.id) || this.errors.has(track.id)) return;
    this.state='loading';
    const pending=(async()=>{
      try {
        const response=await this.fetchFile(track.url);
        if(!response.ok) throw Error('Audio unavailable');
        const buffer=await this.ctx.decodeAudioData(await response.arrayBuffer());
        // Short sample fades remove clicks at the loop seam, with no pitch shift.
        const edge=Math.min(Math.floor(buffer.sampleRate*.65),Math.floor(buffer.length/4));
        for(let channel=0;channel<buffer.numberOfChannels;channel++){
          const data=buffer.getChannelData(channel);
          for(let i=0;i<edge;i++){const envelope=Math.sin(i/edge*Math.PI/2)**2;data[i]*=envelope;data[data.length-1-i]*=envelope;}
        }
        this.cache.set(track.id,buffer);
        if(this.id===track.id){this.state='ready';if(this.wanted)this.start();}
      } catch(error) { this.errors.add(track.id); if(this.id===track.id){this.state='error';this.lastError=String(error?.message || error);} }
      finally {this.loads.delete(track.id);}
    })();
    this.loads.set(track.id,pending);
  }
  start() {
    const buffer=this.cache.get(this.id);
    if(this.voice || !buffer || !this.wanted || this.ctx.state!=='running') return;
    const now=this.ctx.currentTime, source=this.ctx.createBufferSource(), gain=this.ctx.createGain();
    source.buffer=buffer; source.loop=true; source.playbackRate.value=1;
    gain.gain.setValueAtTime(0,now); gain.gain.linearRampToValueAtTime(1,now+.45);
    source.connect(gain); gain.connect(this.bus);
    source.onended=()=>{source.disconnect();gain.disconnect();};
    const offset=this.offset%buffer.duration;
    this.voice={source,gain,started:now,offset,duration:buffer.duration};
    source.start(now,offset); this.state='playing';
  }
  stop() {
    if(!this.voice) return;
    const voice=this.voice, now=this.ctx.currentTime;
    this.offset=(voice.offset+now-voice.started)%voice.duration;
    voice.gain.gain.cancelScheduledValues(now);
    // Catch an in-progress entrance instead of jumping its gain up to one.
    voice.gain.gain.setValueAtTime(Math.min(1,Math.max(0,(now-voice.started)/.45)),now);
    voice.gain.gain.linearRampToValueAtTime(0,now+.25);
    voice.source.stop(now+.28); this.voice=null; this.state='paused';
  }
  update(active, volume) {
    this.wanted=!!active && !!this.id && volume>0;
    const target=this.wanted ? Math.max(0,Math.min(1,volume))*.42 : 0;
    if(target!==this.target){this.target=target;this.bus.gain.setTargetAtTime(target,this.ctx.currentTime,.12);}
    if(!this.wanted){this.stop();return;}
    if(this.cache.has(this.id))this.start();else this.load();
  }
  get failed(){return this.errors.has(this.id);}
  get name(){return this.tracks.find(t=>t.id===this.id)?.name || '';}
}
