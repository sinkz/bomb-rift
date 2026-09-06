import {readFileSync,writeFileSync} from 'node:fs';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {AnimationMixer,Vector3,Box3} from 'three';
const results=[];
for(const name of ['morthos','vulkar','nyxara','briarok','fulgra','nivor']){
  const path=new URL(`../public/guardian-review/${name}.glb`,import.meta.url),raw=readFileSync(path);
  const metadata=JSON.parse(raw.subarray(20,20+raw.readUInt32LE(12)).toString());
  if(metadata.scenes.length!==1||metadata.meshes.length!==1||metadata.skins.length!==1)throw Error(name+': unexpected export objects');
  const gltf=await new GLTFLoader().parseAsync(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength),'');
  const clips=gltf.animations.map(a=>a.name);
  if(clips.length!==8||!['Idle','Walk','Windup','Hurt','Stagger','Spawn','Death'].every(n=>clips.includes(n)))throw Error(name+': missing/extra animations');
  const mixer=new AnimationMixer(gltf.scene),walk=gltf.animations.find(a=>a.name==='Walk');mixer.clipAction(walk).play();
  const feet=[];gltf.scene.traverse(n=>{if(n.isBone&&n.name.startsWith('foot'))feet.push(n);});
  let min=Infinity,max=0,stance=0;
  for(let i=0;i<=40;i++){
    mixer.setTime(walk.duration*i/40);gltf.scene.updateMatrixWorld(true);
    const heights=feet.map(b=>b.getWorldPosition(new Vector3()).y);
    if(heights.length){min=Math.min(min,...heights);max=Math.max(max,...heights);stance=Math.max(stance,Math.min(...heights));}
    gltf.scene.traverse(o=>{if(o.isSkinnedMesh){o.skeleton.update();for(let j=0;j<o.geometry.attributes.position.count;j++){const p=o.getVertexPosition(j,new Vector3());if(!p.toArray().every(Number.isFinite))throw Error(name+': nonfinite skin');}}});
  }
  const bounds=new Box3().setFromObject(gltf.scene),size=bounds.getSize(new Vector3());
  results.push({name,bytes:raw.length,clips,bones:metadata.skins[0].joints.length,feet:feet.length,footHeightRange:feet.length?[+min.toFixed(3),+max.toFixed(3)]:null,highestLowestFoot:feet.length?+stance.toFixed(3):null,dimensions:size.toArray().map(v=>+v.toFixed(2))});
}
writeFileSync(new URL('../public/guardian-review/validation.json',import.meta.url),JSON.stringify(results,null,2));
console.log(JSON.stringify(results,null,2));
