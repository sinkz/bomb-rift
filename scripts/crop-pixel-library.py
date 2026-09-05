"""Split the user-approved sprite sheets; preserve RGBA and audit every cell."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import json, hashlib, zipfile
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
LIB = ROOT / 'public/pixel-library'
catalog = json.loads((LIB/'catalog.json').read_text(encoding='utf-8'))
(LIB/'icons').mkdir(exist_ok=True)
(LIB/'contacts').mkdir(exist_ok=True)
report = []
fontpath = Path('C:/Windows/Fonts/consola.ttf')
font = ImageFont.truetype(str(fontpath), 15) if fontpath.exists() else ImageFont.load_default()

def cutout_background(sheet, enclosed=False, force=False, hole_min=90, protect_face=False):
    """Cut out the sprites from a generated light neutral backdrop without repainting.

    The user explicitly authorized cutting the generated sheets into assets.
    Retain enclosed ivory highlights; neutral checker regions connected to the
    exterior, and enclosed regions containing the same checker colors, are cut out.
    Original sheets remain untouched.
    """
    if sheet.getchannel('A').getextrema()[0] < 255 and not force:
        return sheet
    rgb=np.asarray(sheet)[:,:,:3].astype(np.int16)
    neutral=(rgb.min(axis=2)>=218)&((rgb.max(axis=2)-rgb.min(axis=2))<=13)
    h,w=neutral.shape
    existing=np.asarray(sheet.getchannel('A'))
    neutral &= existing>0
    remaining=bytearray(neutral.tobytes())
    alpha=existing.copy()
    flat=alpha.ravel(); brightness=rgb.mean(axis=2).ravel()
    for seed in range(w*h):
        if not remaining[seed]:continue
        stack=[seed];component=[];remaining[seed]=0;edge=False
        while stack:
            p=stack.pop();component.append(p);y,x=divmod(p,w)
            if x==0 or y==0 or x==w-1 or y==h-1:edge=True
            if x and remaining[p-1]:remaining[p-1]=0;stack.append(p-1)
            if x<w-1 and remaining[p+1]:remaining[p+1]=0;stack.append(p+1)
            if y and remaining[p-w]:remaining[p-w]=0;stack.append(p-w)
            if y<h-1 and remaining[p+w]:remaining[p+w]=0;stack.append(p+w)
        values=brightness[component]
        # Broad, almost-white regions with repeated light/dark squares are holes.
        checker=len(component)>hole_min and np.quantile(values,.15)<247 and np.quantile(values,.85)>251 and values.mean()>240
        if checker and protect_face and len(component)<500:
            cy,cx=divmod(component[len(component)//2],w)
            if .3*w<cx<.7*w and cy<.4*h:checker=False
        if edge or (enclosed and checker):flat[component]=0
    # Remove the one-pixel pale fringe left by the generated light backdrop.
    sheet.putalpha(Image.fromarray(alpha) if force else Image.fromarray(alpha).filter(ImageFilter.MinFilter(3)))
    return sheet

def find_seams(counts,total,parts):
    seams=[0]
    for boundary in range(1,parts):
        ideal=round(boundary*total/parts);radius=round(total/parts*.45)
        lo,hi=max(0,ideal-radius),min(total,ideal+radius)
        values=counts[lo:hi]
        candidates=np.where(values==values.min())[0]+lo
        runs=np.split(candidates,np.where(np.diff(candidates)>1)[0]+1)
        centers=[int((run[0]+run[-1])/2) for run in runs]
        seams.append(min(centers,key=lambda p:abs(p-ideal)))
    return seams+[total]

def split(path, items, cols, rows, batch):
    if not path.exists():
        print('PENDING', batch)
        return
    sheet = cutout_background(Image.open(path).convert('RGBA'))
    w,h=sheet.size
    sheet_alpha=np.asarray(sheet.getchannel('A'))
    initial_y=find_seams((sheet_alpha>24).sum(axis=1),h,rows)
    contact=Image.new('RGB',(1200,rows*310),'#18121f')
    draw=ImageDraw.Draw(contact)
    for n,item in enumerate(items):
        col,row=n%cols,n//cols
        horizontal=find_seams((sheet_alpha[initial_y[row]:initial_y[row+1]]>24).sum(axis=0),w,cols)
        left,right=horizontal[col],horizontal[col+1]
        seams=find_seams((sheet_alpha[:,left:right]>24).sum(axis=1),h,rows)
        box=(left,seams[row],right,seams[row+1])
        cell=sheet.crop(box)
        holes={'relic-magnet','talent-dash','talent-magnet','gear-compass','gear-salvager','gear-guardian-charm','enemy-oracle','resource-scrap','resource-cores','ui-Trophy','ui-LockKeyhole','ui-Infinity','ui-Crosshair','ui-empty-diamond','part-compass'}
        if item['id'] in holes or item['id'].startswith(('guardian-','map-')):
            cell=cutout_background(cell,enclosed=True,force=True,protect_face=item['id'].startswith('guardian-'))
        alpha=cell.getchannel('A')
        bbox=alpha.point(lambda a:255 if a>24 else 0).getbbox()
        if not bbox: raise RuntimeError('Empty cell '+item['id'])
        # Crop padding only, retaining the complete alpha bounding box including particles.
        crop=cell.crop(alpha.getbbox())
        canvas=Image.new('RGBA',(384,384),(0,0,0,0))
        crop.thumbnail((346,346),Image.Resampling.NEAREST)
        canvas.alpha_composite(crop,((384-crop.width)//2,(384-crop.height)//2))
        canvas.save(LIB/'icons'/f"{item['id']}.png", optimize=True)
        cell_w,cell_h=cell.size
        boundary=min(bbox[0],bbox[1],cell_w-bbox[2],cell_h-bbox[3])
        entry={'id':item['id'],'sheet':str(path.relative_to(LIB)) if path.is_relative_to(LIB) else str(path.relative_to(ROOT/'public')),'cell':n,'sourceSize':[w,h],'cellBox':box,'bbox':bbox,'boundaryMargin':boundary,'transparent':alpha.getextrema()[0]==0,'size':[384,384]}
        report.append(entry)
        # Labelled contact sheets are review aids, not in-game artwork.
        thumb=canvas.resize((250,250),Image.Resampling.NEAREST)
        x,y=col*(1200//cols)+(1200//cols-250)//2,row*310+12
        contact.paste(thumb,(x,y),thumb)
        draw.text((col*(1200//cols)+12,y+263),item['id'],font=font,fill='#e0cbea')
        draw.line((col*(1200//cols),y+291,(col+1)*(1200//cols),y+291),fill='#48364f')
    contact.save(LIB/'contacts'/f'{batch}.jpg',quality=92)
    print(batch, len(items), 'sprites', sheet.size)

split(ROOT/'public/icon-lab/skills-pixel-v1.png',[{'id':'approved-capacity'},{'id':'approved-magnet'},{'id':'approved-speed'}],3,1,'approved')
for b in catalog['batches']:
    split(LIB/'sheets'/f"{b['id']}.png",b['items'],b['columns'],b['rows'],b['id'])
split(LIB/'sheets/corrections-ui.png',[{'id':'ui-Minimize'},{'id':'ui-RotateCcw'}],2,1,'corrections-ui')
expected={Path(r['new']).name for r in catalog['items']}
present={p.name for p in (LIB/'icons').glob('*.png')}
baseline=json.loads((LIB/'game-baseline.json').read_text())
changed=[p for p,digest in baseline.items() if hashlib.sha256((ROOT/p).read_bytes()).hexdigest()!=digest]
audit={'entries':len(catalog['items']),'expectedAssets':len(expected),'readyAssets':len(expected&present),'missing':sorted(expected-present),'sourceChanged':changed,'cells':report}
(LIB/'audit.json').write_text(json.dumps(audit,indent=2),encoding='utf-8')
if not audit['missing']:
    with zipfile.ZipFile(LIB/'bomb-rift-pixel-art.zip','w',zipfile.ZIP_DEFLATED) as z:
        for folder in ['icons','sheets','contacts']:
            for p in (LIB/folder).glob('*'): z.write(p,str(p.relative_to(LIB)))
        for f in ['catalog.json','prompts.json','audit.json','README.md']:
            if (LIB/f).exists():z.write(LIB/f,f)
print(json.dumps({k:v for k,v in audit.items() if k!='cells'},ensure_ascii=False))
