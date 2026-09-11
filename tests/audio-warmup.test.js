import test from 'node:test';
import assert from 'node:assert/strict';
import { RecordedMusic } from '../src/recorded-music.js';

const tracks = [{ id: 'violet', url: 'violet.mp3', name: 'Violet' }];
function setup() {
  let requests = 0;
  const sources = [], sample = new Float32Array(1200).fill(.8);
  const param = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, setTargetAtTime() {}, cancelScheduledValues() {} });
  const ctx = { currentTime: 0, state: 'running', createGain: () => ({ gain: param(), connect() {}, disconnect() {} }),
    decodeAudioData: async () => ({ duration: 120, length: sample.length, sampleRate: 10, numberOfChannels: 1, getChannelData: () => sample }),
    createBufferSource() { const source = { playbackRate: { value: 1 }, connect() {}, disconnect() {}, start(at, offset) { this.started = { at, offset }; }, stop(at) { this.stopped = at; } }; sources.push(source); return source; } };
  const music = new RecordedMusic(ctx, {}, tracks, async () => { requests++; return { ok: true, arrayBuffer: async () => new ArrayBuffer(1) }; });
  return { music, sources, get requests() { return requests; } };
}

test('warming the refuge track before the first gesture makes playback start without a second fetch', async () => {
  const warm = setup();
  // The page primes the decoder while the context is still suspended and nothing wants audio.
  warm.music.load();
  await warm.music.loads.get('violet');
  assert.equal(warm.requests, 1);
  assert.equal(warm.music.state, 'ready');
  assert.equal(warm.sources.length, 0, 'a warm-up must not start a voice on its own');

  // The first gesture arrives: sound starts from cache, with no new download.
  warm.music.update(true, .42);
  assert.equal(warm.requests, 1);
  assert.equal(warm.music.state, 'playing');
  assert.equal(warm.sources.length, 1);
});

test('without warming, the same first gesture has to wait for the download', async () => {
  const cold = setup();
  cold.music.update(true, .42);
  assert.equal(cold.music.state, 'loading');
  assert.equal(cold.sources.length, 0, 'nothing can play until the master is decoded');
  await cold.music.loads.get('violet');
  assert.equal(cold.music.state, 'playing');
});

test('warming a track nobody selected never downloads it', async () => {
  const { music, requests } = setup();
  music.select('');
  music.load();
  assert.equal(requests, 0);
  assert.equal(music.state, 'idle');
});
