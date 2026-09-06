// Complete front/back sprites; the original activity poses stay intact.
const walkURL = new URL('./assets/faisca-front-back.png', import.meta.url).href;
const activitiesURL = new URL('./assets/faisca-sprites.png', import.meta.url).href;
const lifeURL = new URL('./assets/faisca-refuge-life.png', import.meta.url).href;
const TAU = Math.PI * 2;
const smooth = t => t * t * (3 - 2 * t);

export const STROLL_DURATION = 52;
export const ACTIVITY_LABELS = { idle: 'Uma pausa', walk: 'Passeando', water: 'Regando as flores', rest: 'Descansando com a bomba', birds: 'Brincando com passarinhos', read: 'Lendo um livro', sleep: 'Tirando uma soneca' };
export function sampleStroll(time) {
  const t = ((time % STROLL_DURATION) + STROLL_DURATION) % STROLL_DURATION;
  const alternate = Math.floor(time / STROLL_DURATION) % 2 === 1;
  const pause = (pose, start, duration, thought, garden = false) => ({ x: garden ? 48 : 60, y: garden ? 70 : 59, pose, facing: 'front', thought, progress: garden ? 1 : 2, localTime: t - start, duration });
  if (t < 7) {
    const u = smooth(t / 7);
    return { x: 60 - 12 * u, y: 59 + 11 * u, pose: 'walk', facing: 'front', thought: 'Minhas flores!', progress: u };
  }
  if (t < 12) return pause('water', 7, 5, alternate ? 'Uma gotinha para cada uma.' : 'Cresce, pequena.', true);
  if (t < 20) return pause('birds', 12, 8, alternate ? 'Trouxe sementes para vocês.' : 'Ei, pequenino. Pode vir!', true);
  if (t < 27) {
    const u = smooth((t - 20) / 7);
    return { x: 48 + 12 * u, y: 70 - 11 * u, pose: 'walk', facing: 'back', thought: 'Tudo pronto para outra?', progress: 1 + u };
  }
  if (t < 31) return pause('rest', 27, 4, 'Hoje você fica quietinha.');
  if (t < 39) return pause(alternate ? 'sleep' : 'read', 31, 8, alternate ? 'Só vou fechar os olhos...' : 'Só mais um capítulo.');
  if (t < 48) return pause(alternate ? 'read' : 'sleep', 39, 9, alternate ? 'Como fazer amigos na fenda...' : 'Sonhando com dias sem chefes.');
  return pause('idle', 48, 4, 'Pronto para mais uma aventura.');
}

function isolateCell(image, index) {
  const size = 444, tile = document.createElement('canvas');
  tile.width = tile.height = size;
  const ctx = tile.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(image, index % 4 * image.width / 4, Math.floor(index / 4) * image.height / 2, image.width / 4, image.height / 2, 0, 0, size, size);
  const pixels = ctx.getImageData(0, 0, size, size), data = pixels.data;
  // The generator supplied a pale preview matte. Key only the neutral area
  // connected to the tile edges; enclosed ivory helmet/glove pixels survive.
  const queue = new Int32Array(size * size), seen = new Uint8Array(size * size);
  let read = 0, write = 0;
  const visit = n => {
    if (seen[n]) return; seen[n] = 1;
    const i = n * 4, lo = Math.min(data[i], data[i + 1], data[i + 2]), hi = Math.max(data[i], data[i + 1], data[i + 2]);
    if (data[i + 3] === 0 || (lo > 193 && hi - lo < 23)) { data[i + 3] = 0; queue[write++] = n; }
  };
  for (let i = 0; i < size; i++) { visit(i); visit((size - 1) * size + i); visit(i * size); visit(i * size + size - 1); }
  while (read < write) { const n = queue[read++], x = n % size; if (x) visit(n - 1); if (x < size - 1) visit(n + 1); if (n >= size) visit(n - size); if (n < size * (size - 1)) visit(n + size); }
  ctx.putImageData(pixels, 0, 0);
  let x0 = size, y0 = size, x1 = 0, y1 = 0;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (data[(y * size + x) * 4 + 3]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  return { image: tile, x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

export class HeroWalk {
  constructor(canvas) {
    this.canvas = canvas; canvas.width = canvas.height = 128;
    this.ctx = canvas.getContext('2d'); this.ctx.imageSmoothingEnabled = false;
    const load = url => new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(Array.from({ length: 8 }, (_, i) => isolateCell(image, i)));
      image.onerror = reject; image.src = url;
    });
    this.ready = Promise.all([load(walkURL), load(activitiesURL), load(lifeURL)]).then(([walk, activities, life]) => {
      this.walk = walk; this.activities = activities; this.life = life;
      canvas.dataset.loaded = 'true'; this.draw();
    });
  }
  draw({ phase = 0, weight = 0, facing = 'front', pose = 'idle', time = 0, activityTime = time, duration = 8 } = {}) {
    if (!this.walk) return;
    const c = this.ctx; c.clearRect(0, 0, 128, 128);
    const walking = pose === 'walk' && weight > .055;
    const back = facing === 'back';
    const step = Math.floor((((phase / TAU) % 1 + 1) % 1) * 4);
    let sheet = this.walk, index = (back ? 4 : 0) + (walking ? step : 3), height = 98;
    if (!walking && pose === 'water') { sheet = this.activities; index = 5 + Math.floor(time * 2.2) % 2; }
    else if (!walking && pose === 'rest') { sheet = this.activities; index = 7; height = 85; }
    else if (!walking && pose === 'read') { sheet = this.life; index = activityTime % 3.4 > 2.7 ? 3 : 2; height = 87; }
    else if (!walking && pose === 'sleep') { sheet = this.life; index = Math.floor(activityTime / 2) % 2; height = 63 + Math.sin(activityTime * 1.8) * .45; }
    else if (!walking && pose === 'birds') { sheet = this.life; index = activityTime > 2 && activityTime < duration - 1.3 ? 5 : 4; }
    else if (!walking && !back) { sheet = this.activities; index = 4; }
    const p = sheet[index], width = p.w / p.h * height;
    c.drawImage(p.image, p.x, p.y, p.w, p.h, Math.round(64 - width / 2), 108 - height, Math.round(width), height);
    if (!walking && pose === 'birds') this.drawBirds(activityTime, duration, index === 5 ? 63 : 67);
    if (!walking && pose === 'sleep') {
      // Tiny pixel Zs drift above the head; the body remains anchored to the floor.
      for (let i = 0; i < 2; i++) {
        const u = (activityTime * .3 + i * .5) % 1, x = Math.round(29 + u * 15), y = Math.round(43 - u * 20);
        c.fillStyle = `rgba(201,223,237,${Math.sin(u * Math.PI) * .8})`;
        c.fillRect(x, y, 5, 1); c.fillRect(x + 3, y + 1, 1, 1); c.fillRect(x + 2, y + 2, 1, 1); c.fillRect(x + 1, y + 3, 1, 1); c.fillRect(x, y + 4, 5, 1);
      }
    }
    this.canvas.dataset.direction = back && sheet === this.walk ? 'back' : 'front';
    this.canvas.dataset.pose = walking ? 'walk' : pose;
    this.canvas.dataset.frame = String(index);
  }

  drawBirds(t, duration, palmY) {
    const c = this.ctx, arrival = smooth(Math.min(1, t / 1.5)), departure = smooth(Math.max(0, Math.min(1, (t - duration + 1.4) / 1.4)));
    const flying = arrival < 1 || departure > 0;
    const bird = this.life[6 + (flying ? Math.floor(t * 9) % 2 : 1)];
    const x = 95 + (1 - arrival) * 24 + departure * 25;
    const y = palmY - (1 - arrival) * 30 - departure * 40;
    c.drawImage(bird.image, bird.x, bird.y, bird.w, bird.h, Math.round(x - 8), Math.round(y - 14), 18, 14);
    // A second visitor hops beside the boots and leaves with its friend.
    const hop = Math.max(0, Math.sin(t * 5)) * 3;
    const gx = 24 - (1 - arrival) * 20 - departure * 30, gy = 108 - hop - departure * 26;
    c.fillStyle = `rgba(17,20,37,${.36 * (1 - departure)})`; c.beginPath(); c.ellipse(gx + 5, 108, 6, 1.6, 0, 0, TAU); c.fill();
    c.save(); c.translate(Math.round(gx + 13), Math.round(gy - 12)); c.scale(-1, 1);
    c.drawImage(bird.image, bird.x, bird.y, bird.w, bird.h, 0, 0, 15, 12); c.restore();
  }
}
