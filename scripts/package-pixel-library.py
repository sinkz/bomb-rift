from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,zipfile

root=Path(__file__).resolve().parents[1]
lib=root/'public/pixel-library'
catalog=json.loads((lib/'catalog.json').read_text(encoding='utf-8'))
unique=list(dict.fromkeys(row['new'] for row in catalog['items']))
font=ImageFont.truetype('C:/Windows/Fonts/consola.ttf',14)
for start in range(0,len(unique),12):
    final=Image.new('RGB',(1200,930),'#18121f');draw=ImageDraw.Draw(final)
    for n,path in enumerate(unique[start:start+12]):
        icon=Image.open(root/'public'/path).convert('RGBA').resize((248,248),Image.Resampling.NEAREST)
        col,row=n%4,n//4
        final.paste(icon,(col*300+26,row*310+12),icon)
        draw.text((col*300+12,row*310+275),Path(path).stem,font=font,fill='#decde8')
    final.save(lib/'contacts'/f'final-{start//12+1:02}.jpg',quality=94)

audit=json.loads((lib/'audit.json').read_text())
assert audit['missing']==[] and audit['sourceChanged']==[]
assert len(unique)==147
for path in unique:
    image=Image.open(root/'public'/path)
    assert image.mode=='RGBA' and image.size==(384,384),path
    alpha=image.getchannel('A')
    assert alpha.getextrema()==(0,255),path
    bbox=alpha.getbbox()
    assert bbox and all([bbox[0]>=15,bbox[1]>=15,bbox[2]<=369,bbox[3]<=369]),path

with zipfile.ZipFile(lib/'bomb-rift-pixel-art.zip','w',zipfile.ZIP_DEFLATED) as z:
    for folder in ['icons','sheets','contacts']:
        for p in (lib/folder).glob('*'):z.write(p,str(p.relative_to(lib)))
    for name in ['catalog.json','prompts.json','audit.json','coverage.json','generation-log.json','browser-qa.json','README.md']:
        p=lib/name
        if p.exists():z.write(p,name)
with zipfile.ZipFile(lib/'bomb-rift-pixel-art.zip') as z:
    assert z.testzip() is None
    assert sum(n.startswith('icons/') for n in z.namelist())==147
print(json.dumps({'icons':147,'size':[384,384],'alpha':'0..255 in every PNG','padding':'15px minimum','zipBytes':(lib/'bomb-rift-pixel-art.zip').stat().st_size}))
