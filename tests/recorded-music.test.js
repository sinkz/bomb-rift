import test from 'node:test';
import assert from 'node:assert/strict';
import { RecordedMusic } from '../src/recorded-music.js';
import { Music, THEMES } from '../src/music.js';

const tracks=[{id:'violet',url:'violet.mp3',name:'Violet'},{id:'sentinel',url:'sentinel.mp3',name:'Sentinel'}];
function setup(fetchFile=async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)})){
  const sources=[],sample=new Float32Array(1200).fill(.8);
  const param=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},setTargetAtTime(){},cancelScheduledValues(){}});
  const ctx={currentTime:0,state:'running',createGain:()=>({gain:param(),connect(){},disconnect(){}}),
    decodeAudioData:async()=>({duration:120,length:sample.length,sampleRate:10,numberOfChannels:1,getChannelData:()=>sample}),
    createBufferSource(){const source={playbackRate:{value:1},connect(){},disconnect(){},start(at,offset){this.started={at,offset};},stop(at){this.stopped=at;}};sources.push(source);return source;}};
  return {music:new RecordedMusic(ctx,{},tracks,fetchFile),ctx,sources,sample};
}
test('recorded music loads on demand once, loops at original speed, and fades only the seams',async()=>{
  let requests=0;const {music,sources,sample}=setup(async()=>{requests++;return{ok:true,arrayBuffer:async()=>new ArrayBuffer(1)};});
  music.update(false,.42);assert.equal(requests,0);
  music.update(true,.42);music.update(true,.42);await music.loads.get('violet');
  assert.equal(requests,1);assert.equal(music.state,'playing');assert.equal(sources.length,1);assert(sources[0].loop);assert.equal(sources[0].playbackRate.value,1);
  assert.equal(sample[0],0);assert.equal(sample.at(-1),0);assert(sample[500]>.79);
  music.update(true,.2);assert.equal(sources.length,1);assert.equal(music.target,.2*.42);
});
test('leaving, hiding or muting stops playback and resumes the remembered position',async()=>{
  const {music,ctx,sources}=setup();music.update(true,.42);await music.loads.get('violet');ctx.currentTime=13;
  music.update(false,.42);assert.equal(music.voice,null);assert.equal(sources[0].stopped,13.28);
  ctx.currentTime=30;music.update(true,.42);assert.equal(sources[1].started.offset,13);
  music.update(true,0);assert.equal(music.voice,null);assert.equal(music.state,'paused');
});
test('an old download cannot start after switching tracks or entering combat',async()=>{
  const resolvers={};const {music}=setup(url=>new Promise(resolve=>resolvers[url]=resolve));
  music.update(true,.42);const first=music.loads.get('violet');music.select('sentinel');music.update(true,.42);const second=music.loads.get('sentinel');
  resolvers['violet.mp3']({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)});await first;assert.equal(music.voice,null);
  music.update(false,.42);resolvers['sentinel.mp3']({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)});await second;assert.equal(music.voice,null);
  music.update(true,.42);assert.equal(music.name,'Sentinel');assert.equal(music.state,'playing');
  music.select('');music.update(true,.42);assert.equal(music.voice,null);
});
test('load failures are reported once so the caller can use the synthesized fallback',async()=>{
  let requests=0;const {music}=setup(async()=>{requests++;throw Error('offline');});
  music.update(true,.42);await music.loads.get('violet');assert(music.failed);assert.equal(music.state,'error');
  music.update(true,.42);assert.equal(requests,1);assert(!music.select('invalid'));
});
test('the default browser fetch keeps its global receiver',async()=>{
  const original=globalThis.fetch,{ctx}=setup();let requests=0;
  try{
    globalThis.fetch=function(){assert.equal(this,globalThis);requests++;return Promise.resolve({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)});};
    const music=new RecordedMusic(ctx,{},tracks);music.update(true,.42);await music.loads.get('violet');
    assert.equal(requests,1);assert.equal(music.state,'playing');assert(!music.failed);
  }finally{globalThis.fetch=original;}
});
test('revised refuge voices stay in their chord and release before the next harmony',()=>{
  const theme=THEMES.refuge,beat=30/theme.bpm;
  for(let step=0;step<128;step++){
    const bar=Math.floor(step/8)%8,root=theme.roots[bar],third=[2,5].includes(bar)?3:4;
    const pitches=new Set([root%12,(root+third)%12,(root+7)%12]);
    const notes=[],receiver={key:'refuge',note(...args){notes.push(args);}};
    Music.prototype.schedule.call(receiver,step,step*beat,beat);
    for(const [pitch,at,duration]of notes){assert(pitches.has(pitch%12),`pitch ${pitch}, bar ${bar}`);assert(at+duration<(Math.floor(step/8)+1)*8*beat);}
  }
});
