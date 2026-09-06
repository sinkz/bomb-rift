"""Six original guardians, built in isolated Blender scenes from the pixel references.

Rigid armor uses one skinned mesh. Foot targets use two-bone IK; planted feet
stay at ground height through the walk cycle. The exporter bakes constraints.
Run build('briarok') etc. inside Blender, then render(name).
"""
import os, math, bpy, struct, json, re, contextlib, io
from math import sin, cos, pi
from mathutils import Vector
exec(compile(open(os.path.join(os.path.dirname(__file__), 'guardians-blender.py'), encoding='utf-8').read(), 'guardians-blender.py', 'exec'))
LEGS=[]

def palette(prefix, colors, glow=0, metal=0):
    return [material(prefix+str(i), c, glow, metal) for i,c in enumerate(colors.split())]

def begin(name):
    global LEGS
    LEGS=[]
    return new_scene(name)

def spike(name, start, end, radius, mats, bone='torso'):
    return tube(name,[start,Vector(start).lerp(Vector(end),.55),end],[radius,radius*.65,.004],mats,bone,6)

def ring(name, center, rx, rz, thickness, mats, bone='torso', segments=16):
    x,y,z=center
    return tube(name,[(x+rx*cos(i*2*pi/segments),y,z+rz*sin(i*2*pi/segments)) for i in range(segments+1)],[thickness]*(segments+1),mats,bone,6)

def limb(side, hip, knee, ankle, mats, style='stone', width=.25):
    upper='upper.'+side; lower='lower.'+side; foot='foot.'+side
    LEGS.append((side,Vector(hip),Vector(knee),Vector(ankle)))
    if style=='machine':
        tube('Upper strut '+side,[hip,knee],[width*.72,width*.65],mats,upper,6)
        tube('Lower strut '+side,[knee,ankle],[width*.62,width*.28],mats,lower,6)
    else:
        tube('Attached upper limb '+side,[hip,Vector(hip).lerp(Vector(knee),.65),knee],[width,width*1.05,width*.75],mats,upper,7)
        tube('Attached lower limb '+side,[knee,Vector(knee).lerp(Vector(ankle),.55),ankle],[width*.8,width*.7,width*.63],mats,lower,7)
    rock('Connected knee '+side,knee,(width*.88,)*3,mats,lower,1)
    rock('Ankle joint '+side,ankle,(width*.65,)*3,mats,foot,1)
    return upper,lower,foot

def vulkar():
    s=begin('Vulkar · the living furnace')
    coal=palette('volcanic armor','292634 433b42 625052 171824');gold=palette('furnace brass','bc702b e4a745 7d3e26',metal=.5)
    lava=palette('molten heart','ff6817 ffbb3b da3316',2);dark=palette('furnace cavity','120b13')
    rock('Broad furnace body',(0,.05,1.48),(.89,.58,.9),coal)
    box('Furnace hip',(0,.05,.69),(1.02,.67,.32),coal,'root',.12)
    for sign in [-1,1]:
        side='L' if sign<0 else 'R';arm='arm.'+side
        _,_,foot=limb(side,(sign*.44,0,.88),(sign*.48,-.10,.47),(sign*.51,0,.19),coal,width=.25)
        box('Broad iron boot '+side,(sign*.51,-.16,.15),(.59,.67,.30),coal,foot,.09)
        box('Glowing boot seam '+side,(sign*.51,-.508,.12),(.39,.018,.035),lava,foot,0)
        rock('Overlapping shoulder '+side,(sign*.95,0,2.02),(.48,.44,.43),coal,arm)
        ring('Copper pauldron rim '+side,(sign*.96,-.28,2.05),.34,.25,.055,gold,arm)
        tube('Arm '+side,[(sign*.99,.02,1.95),(sign*1.16,-.02,1.43),(sign*1.22,-.08,.94)],[.26,.27,.31],coal,arm)
        rock('Massive fist '+side,(sign*1.23,-.11,.88),(.35,.35,.35),coal,arm)
        for i in range(3):box('Fist knuckle '+side+str(i),(sign*1.23+(i-1)*.18,-.40,.89),(.15,.15,.20),coal,arm,.03)
        rock('Folded thumb '+side,(sign*.94,-.23,.98),(.17,.19,.22),coal,arm,1)
        tube('Arm lava fissure '+side,[(sign*1.05,-.255,1.67),(sign*1.13,-.31,1.52),(sign*1.04,-.32,1.42),(sign*1.21,-.38,1.20)],[.025]*4,lava,arm,5)
        tube('Swept golden horn '+side,[(sign*.41,.0,2.72),(sign*.75,.01,2.87),(sign*.91,.04,3.12),(sign*.90,.04,3.32),(sign*.70,.02,3.58)],[.22,.23,.18,.12,.003],gold,'head',8)
        tube('Torso fracture '+side,[(sign*.46,-.41,2.15),(sign*.64,-.50,1.99),(sign*.58,-.55,1.81)],[.035]*3,lava)
    rock('Armored helm',(0,0,2.57),(.54,.44,.50),coal,'head')
    plate('Dark face',[(-.42,2.72),(.42,2.72),(.33,2.36),(-.33,2.36)],-.46,.035,dark,'head')
    for sign in [-1,1]:
        plate('Burning eye '+str(sign),[(sign*.34,2.64),(sign*.09,2.57),(sign*.12,2.51),(sign*.30,2.53)],-.51,.02,lava,'head')
    box('Heavy furnace brow',(0,-.49,2.75),(.78,.11,.11),gold,'head',.02)
    box('Face center',(0,-.52,2.40),(.12,.12,.36),coal,'head',.02)
    rock('Furnace dark socket',(0,-.51,1.47),(.59,.16,.64),dark)
    rock('Incandescent furnace interior',(0,-.643,1.45),(.44,.055,.49),lava)
    ring('Forged furnace rim',(0,-.68,1.45),.51,.58,.085,gold)
    for i in range(-2,3):
        height=.91 if abs(i)<2 else .72
        box('Iron furnace grill '+str(i),(i*.17,-.738,1.45),(.08,.09,height),coal,bevel=.015)
    box('Grill crossbar',(0,-.795,1.40),(.91,.07,.075),gold,bevel=.01)
    for i in range(4):spike('Back obsidian ridge '+str(i),(0,.55,1.23+i*.27),(0,.91,1.44+i*.28),.17,coal)
    return s

def nyxara():
    s=begin('Nyxara · the antler queen')
    cloth=palette('abyss velvet','124453 226879 2d8b93 153141');edge=palette('silk edge','54b7ba 8bded6 367a8a')
    ivory=palette('ancient ivory','e3e4d4 a4c7c7 f5f3db');dark=palette('veil void','0c1b31');cyan=palette('abyss gem','61e4ed b3fff3 239bcd',1.3);gold=palette('queen gold','b38a48 edcf85',metal=.4)
    # Gown is a continuous cone of alternating cloth panels, with overlapping hem.
    for i in range(12):
        a=i*2*pi/12;b=(i+1)*2*pi/12
        points=[(.37*cos(a),.02+.29*sin(a),1.66),(.37*cos(b),.02+.29*sin(b),1.66),(.83*cos(b),.02+.61*sin(b),.15+(.06 if i%2 else 0)),(.83*cos(a),.02+.61*sin(a),.15+(.06 if i%2 else 0))]
        mesh=bpy.data.meshes.new('Gown panel');mesh.from_pydata(points,[],[(0,1,2,3)]);mesh.update();o=bpy.data.objects.new('Continuous gown panel',mesh);s.collection.objects.link(o);finish(o,'Gown fold '+str(i),[cloth[i%len(cloth)]])
        tube('Hem embroidery '+str(i),[points[3],points[2]],[.021,.021],edge)
    rock('Fitted torso',(0,.02,1.98),(.39,.29,.46),cloth)
    plate('Front long tabard',[(-.28,1.78),(.28,1.78),(.33,.41),(0,.20),(-.33,.41)],-.46,.035,[cloth[0]])
    for sign in [-1,1]:tube('Tabard embroidery '+str(sign),[(sign*.28,-.50,1.78),(sign*.32,-.50,.45),(0,-.50,.22)],[.018]*3,gold)
    ring('Belt',(0,-.08,1.70),.38,.11,.039,gold)
    rock('Chest crystal',(0,-.292,2.04),(.14,.08,.23),cyan,detail=1)
    rock('Dark hood',(0,.08,2.62),(.47,.37,.53),cloth,'head')
    rock('Ivory mask',(0,-.242,2.63),(.33,.15,.36),ivory,'head')
    for sign in [-1,1]:
        side='L' if sign<0 else 'R';arm='arm.'+side
        plate('Slanted mask eye '+side,[(sign*.23,2.72),(sign*.05,2.65),(sign*.10,2.59),(sign*.22,2.64)],-.406,.02,dark,'head')
        tube('Crown antler '+side,[(sign*.30,.01,2.81),(sign*.59,.02,3.0),(sign*.76,.02,3.31),(sign*.62,.03,3.60),(sign*.69,.03,3.88)],[.12,.115,.08,.05,.004],ivory,'head',6)
        tube('Outer antler tine '+side,[(sign*.62,.02,3.07),(sign*.99,.03,3.26),(sign*1.02,.04,3.52)],[.072,.045,.003],ivory,'head',6)
        spike('Antler inner tine '+side,(sign*.75,.02,3.29),(sign*.46,.02,3.49),.055,ivory,'head')
        rock('Shoulder '+side,(sign*.44,.04,2.15),(.25,.30,.26),cloth,arm)
        tube('Long attached sleeve '+side,[(sign*.45,.02,2.12),(sign*.65,-.01,1.87),(sign*.77,-.06,1.58)],[.23,.23,.27],cloth,arm)
        tube('Sleeve ivory cuff '+side,[(sign*.77,-.06,1.58),(sign*.80,-.10,1.51)],[.27,.23],ivory,arm)
        rock('Connected hand '+side,(sign*.80,-.12,1.44),(.105,.13,.18),ivory,arm)
        for j in range(3):tube('Curled finger '+side+str(j),[(sign*.81+(j-1)*.048,-.20,1.46),(sign*.81+(j-1)*.048,-.235,1.36),(sign*.81+(j-1)*.048,-.185,1.31)],[.031]*3,ivory,arm,5)
        rock('Attached thumb '+side,(sign*.72,-.16,1.44),(.052,.082,.09),ivory,arm,1)
    spike('Crown center',(0,-.12,2.95),(0,-.10,3.55),.125,ivory,'head')
    rock('Crown jewel',(0,-.225,3.15),(.084,.044,.15),cyan,'head',1)
    # Staff sits inside the left fingers; crystal is cradled by three prongs.
    tube('Held staff shaft',[(-.81,-.18,.12),(-.81,-.18,2.66)],[.035,.046],gold,'arm.L',8)
    rock('Staff socket',(-.81,-.18,2.55),(.13,.13,.15),gold,'arm.L',1)
    rock('Staff main crystal',(-.81,-.18,2.88),(.18,.17,.33),cyan,'arm.L',1)
    for i in range(3):
        a=i*2*pi/3;spike('Staff attached prong '+str(i),(-.81,-.18,2.53),(-.81+.20*cos(a),-.18+.20*sin(a),2.93),.044,ivory,'arm.L')
    return s

def briarok():
    s=begin('Briarok · the carnivorous sovereign')
    bark=palette('root bark','43342f 645043 2d282d 847056');moss=palette('old moss','30432a 58723a 87954b');petal=palette('carnivorous petal','7d1534 bd2850 e65b67 4d152d');amber=palette('flower throat','c97725 f1bb58 75401e');dark=palette('mouth abyss','170e16');tooth=palette('wood fang','efd4a2 ad8951')
    rock('Hunched root body',(0,.45,1.43),(.95,1.15,.96),bark)
    for sign in [-1,1]:
        for i,y in enumerate([-.48,1.12]):
            side=('L' if sign<0 else 'R')+str(i)
            hip=(sign*.72,y,1.46 if i==0 else 1.24);knee=(sign*1.10,y-.19,.71);ankle=(sign*1.13,y-.47,.21)
            upper,lower,foot=limb(side,hip,knee,ankle,bark,width=.35 if i==0 else .27)
            rock('Root paw '+side,(sign*1.13,y-.56,.17),(.42,.45,.18),bark,foot)
            for j in range(3):
                x=sign*1.13+(j-1)*.22
                spike('Root claw '+side+str(j),(x,y-.82,.20),(x+sign*.06,y-1.02,.045),.083,tooth,foot)
                mid=(knee[0]+(j-1)*.12,knee[1]-.27,knee[2])
                tube('Upper root tendon '+side+str(j),[(hip[0]+(j-1)*.14,hip[1]-.15,hip[2]),((hip[0]+knee[0])*.5+(j-1)*.13,hip[1]-.31,(hip[2]+knee[2])*.5),mid],[.065,.075,.066],moss,upper,6)
                tube('Lower root tendon '+side+str(j),[mid,(ankle[0]+(j-1)*.10,ankle[1]-.1,ankle[2])],[.066,.04],moss,lower,6)
            for j in range(4):rock('Moss knuckle '+side+str(j),(knee[0]+RNG.uniform(-.2,.2),knee[1]-.26,knee[2]+RNG.uniform(-.12,.23)),(.14,.13,.11),moss,lower,1)
    rock('Attached flower base',(0,-.56,1.72),(.84,.36,.84),moss,'head')
    rock('Dark flower throat',(0,-.865,1.71),(.54,.08,.55),dark,'head')
    ring('Amber mouth collar',(0,-.88,1.71),.54,.55,.09,amber,'head',16)
    # Two irregular, overlapping rings of pointed fleshy petals.
    for layer,count in [(0,12),(1,10)]:
        for i in range(count):
            a=i*2*pi/count+layer*.19;length=(1.16 if layer==0 else .94)*(1+RNG.uniform(-.08,.08));base=.46
            x,z=cos(a),sin(a);perp=(-z,x)
            outline=[(x*base+perp[0]*.13,1.71+z*base+perp[1]*.13),(x*.78+perp[0]*.20,1.71+z*.78+perp[1]*.20),(x*length,1.71+z*length),(x*.78-perp[0]*.16,1.71+z*.78-perp[1]*.16),(x*base-perp[0]*.13,1.71+z*base-perp[1]*.13)]
            plate('Pointed petal '+str(layer)+' '+str(i),outline,-.80-layer*.08,.13,[petal[(i+layer)%len(petal)]],'head')
            tube('Petal golden vein '+str(layer)+' '+str(i),[(x*.57,-.95-layer*.035,1.71+z*.57),(x*.78,-.95-layer*.035,1.71+z*.78),(x*(length-.05),-.84-layer*.035,1.71+z*(length-.05))],[.016,.022,.003],amber,'head',5)
    for i in range(14):
        a=i*2*pi/14
        spike('Inward mouth fang '+str(i),(.50*cos(a),-.995,1.71+.51*sin(a)),(.34*cos(a+.11),-1.04,1.71+.34*sin(a+.11)),.07,tooth,'head')
    for i in range(22):
        x=RNG.uniform(-.75,.75);y=RNG.uniform(.05,1.30);z=2.03+RNG.uniform(-.04,.20)
        rock('Back moss mound '+str(i),(x,y,z),(.29,.30,.16),moss,detail=1)
    for sign in [-1,1]:
        tube('Attached twisting back vine '+str(sign),[(sign*.52,.72,1.87),(sign*.69,.83,2.49),(sign*.60,.75,2.83),(sign*.83,.71,3.15),(sign*.91,.70,3.13)],[.16,.14,.1,.05,.008],moss)
        for j in range(3):spike('Vine thorn '+str(sign)+str(j),(sign*.69,.80,2.25+j*.2),(sign*(.85+j*.05),.76,2.39+j*.2),.09,tooth)
    for x,y,z in [(-.40,.87,2.47),(.53,1.04,2.34)]:
        tube('Attached seedpod stalk',[(x,y,2.00),(x,y,z)],[.12,.1],moss)
        rock('Crimson seedpod',(x,y,z),(.24,.24,.26),petal)
        ring('Seedpod amber lip',(x,y-.18,z+.08),.15,.16,.038,amber)
        rock('Seedpod opening',(x,y-.216,z+.08),(.12,.032,.11),dark,detail=1)
    # Long curled bark ridges cover the volume instead of a plain golem shell.
    warm=palette('twisted living wood','60412a 946340 3c2c24');green=palette('dense leaf moss','314923 647638 80964a')
    for i in range(30):
        a=i*2*pi/30;points=[]
        for j in range(7):
            theta=.22+j*.36;twist=a+.16*sin(theta*3+i)
            points.append((.95*sin(theta)*cos(twist),.45+1.15*sin(theta)*sin(twist),1.43+.97*cos(theta)))
        tube('Spiral bark ridge '+str(i),points,[.055,.065,.075,.072,.065,.055,.025],warm)
    for i in range(35):
        a=RNG.uniform(0,2*pi);theta=RNG.uniform(.25,1.55)
        p=(.96*sin(theta)*cos(a),.45+1.16*sin(theta)*sin(a),1.43+.98*cos(theta))
        rock('Clinging moss clump '+str(i),p,(.17,.17,.13),green,detail=1)
    return s

def fulgra():
    s=begin('Fulgra · the storm reactor')
    iron=palette('storm iron','28313f 465266 18222d 6f7b89',metal=.55);copper=palette('aged copper','a05c31 d59452 643b2c',metal=.6);cyan=palette('reactor cyan','22cbe9 8bffff 186b9b',1.5);amber=palette('reactor eye','f6b934 ffeb7c 9b4d18',1.3);dark=palette('mechanical socket','080e1a')
    rock('Six-legged armored chassis',(0,.1,1.24),(.89,1.04,.57),iron)
    rock('Reactor chamber rim',(0,.30,1.72),(.70,.73,.25),copper)
    rock('Reactor protected glass',(0,.30,1.90),(.54,.57,.37),cyan)
    for i in range(8):
        a=i*2*pi/8
        tube('Reactor cage '+str(i),[(.68*cos(a),.3+.68*sin(a),1.72),(.50*cos(a),.3+.50*sin(a),2.06),(.22*cos(a),.3+.22*sin(a),2.23)],[.05,.047,.042],iron)
    box('Dorsal copper spine',(0,.4,2.17),(.20,1.25,.13),copper,bevel=.035)
    rock('Front eye armor',(0,-.79,1.29),(.47,.27,.44),iron,'head')
    ring('Amber eye gasket',(0,-1.00,1.29),.31,.31,.08,copper,'head')
    rock('Eye recess',(0,-1.075,1.29),(.28,.09,.28),dark,'head')
    rock('Single amber reactor eye',(0,-1.15,1.29),(.215,.047,.22),amber,'head')
    plate('Eye slit',[(-.03,1.47),(.065,1.33),(.024,1.12),(-.049,1.29)],-1.204,.008,dark,'head')
    for sign in [-1,1]:
        for i,y in enumerate([-.65,.22,1.0]):
            side=('L' if sign<0 else 'R')+str(i);spread=[1.35,1.67,1.39][i];footy=[-1.20,.0,1.44][i]
            hip=(sign*.67,y,1.31);knee=(sign*spread,y-.06,1.40);ankle=(sign*(spread+.21),footy,.13)
            upper,lower,foot=limb(side,hip,knee,ankle,iron,'machine',.20)
            rock('Copper articulated knee '+side,knee,(.23,.23,.23),copper,lower,1)
            rock('Copper shoulder joint '+side,hip,(.23,.23,.23),copper,upper,1)
            tube('Calf bright circuit '+side,[(knee[0]+sign*.08,knee[1]-.10,knee[2]-.03),(ankle[0]+sign*.06,ankle[1]-.08,ankle[2]+.15)],[.018,.018],copper,lower,5)
            spike('Grounded needle foot '+side,(ankle[0],ankle[1],.23),(ankle[0],ankle[1]-.07,0),.087,copper,foot)
            for fraction in [.12,.82]:
                p=Vector(knee).lerp(Vector(ankle),fraction);rock('Copper joint collar '+side+str(fraction),p,(.16,.14,.08),copper,lower,1)
            rock('Cyan joint indicator '+side,(hip[0],hip[1]-.2,hip[2]),(.061,.04,.061),cyan,upper,1)
        x=sign*.59
        box('Attached tesla pedestal '+str(sign),(x,.88,1.83),(.41,.47,.5),iron,bevel=.075)
        tube('Attached lightning rod '+str(sign),[(x,.88,1.98),(x,.88,2.62),(x,.88,3.13)],[.13,.09,.012],copper,sides=8)
        for z in [2.2,2.42,2.64]:rock('Insulator collar '+str(sign)+str(z),(x,.88,z),(.19,.19,.07),copper,detail=1)
        spike('Tesla glowing tip '+str(sign),(x,.88,2.84),(x,.88,3.13),.028,cyan)
        tube('Connected front mandible '+str(sign),[(sign*.27,-.8,1.02),(sign*.32,-1.10,.81),(sign*.17,-1.24,.67)],[.11,.09,.01],copper,'head')
    for i in range(12):
        a=i*2*pi/12
        rock('Chassis rim bolt '+str(i),(.80*cos(a),.1+.94*sin(a),1.55),(.065,.065,.055),copper,detail=1)
    return s

def nivor():
    s=begin('Nivor · the walking citadel')
    ice=palette('glacier armor','7d9ecc b9d4ed 4d70ac d9ebfa');fur=palette('ice bear fur','6482a9 9eb6d1 415873');dark=palette('bear obsidian','101a32 253a5b');cyan=palette('frozen heart','24bdda 99f6ff 327da6',1.2);violet=palette('citadel window','b34eea f0b8ff',1.4)
    rock('Great bear body',(0,.50,1.48),(.93,1.37,.99),fur)
    rock('Bear neck',(0,-.46,1.76),(.74,.61,.69),fur)
    for sign in [-1,1]:
        for i,y in enumerate([-.54,1.21]):
            side=('L' if sign<0 else 'R')+str(i);hip=(sign*.66,y,1.45);knee=(sign*.90,y-.08,.74);ankle=(sign*.95,y-.22,.22)
            upper,lower,foot=limb(side,hip,knee,ankle,fur,width=.38 if i==0 else .30)
            rock('Bear paw '+side,(sign*.95,y-.42,.19),(.43,.46,.20),fur,foot)
            for j in range(4):
                x=sign*.95+(j-1.5)*.17
                spike('Obsidian claw '+side+str(j),(x,y-.73,.21),(x,y-.90,.045),.065,dark,foot)
            for j in range(4):
                p=Vector(knee).lerp(Vector(ankle),j/5)
                rock('Overlapping foreleg plate '+side+str(j),(p.x,p.y-.23,p.z+.05),(.30,.17,.19),ice,lower,1)
                spike('Foreleg ice blade '+side+str(j),(p.x+sign*.2,p.y,p.z+.04),(p.x+sign*.44,p.y+.15,p.z+.42),.14,ice,lower)
    rock('Bear skull',(0,-.92,1.97),(.59,.54,.52),fur,'head')
    rock('Bear muzzle',(0,-1.33,1.80),(.36,.30,.25),fur,'head')
    rock('Obsidian nose',(0,-1.57,1.86),(.20,.08,.13),dark,'head',1)
    rock('Roaring mouth',(0,-1.47,1.57),(.29,.12,.22),dark,'head')
    for sign in [-1,1]:
        rock('Round ear '+str(sign),(sign*.43,-.73,2.34),(.18,.13,.21),fur,'head')
        rock('Ear hollow '+str(sign),(sign*.43,-.853,2.34),(.10,.024,.12),dark,'head',1)
        plate('Recessed angry eye '+str(sign),[(sign*.47,2.18),(sign*.20,2.06),(sign*.25,1.99),(sign*.43,2.04)],-1.342,.04,dark,'head')
        plate('Glacier eye slit '+str(sign),[(sign*.41,2.105),(sign*.24,2.055),(sign*.28,2.025),(sign*.39,2.055)],-1.389,.014,cyan,'head')
        tube('Heavy slanted brow '+str(sign),[(sign*.48,-1.35,2.20),(sign*.18,-1.38,2.10)],[.085,.06],ice,'head',5)
        spike('Great upper fang '+str(sign),(sign*.22,-1.57,1.72),(sign*.20,-1.58,1.36),.068,ice,'head')
        for j in range(3):
            spike('Cheek fur blade '+str(sign)+str(j),(sign*(.38+j*.05),-1.02,1.93-j*.17),(sign*(.64+j*.05),-1.13,1.57-j*.13),.17,ice,'head')
    for x in [-.11,0,.11]:spike('Lower tooth '+str(x),(x,-1.575,1.41),(x,-1.575,1.50),.03,ice,'head')
    for i in range(5):
        x=(i-2)*.17;spike('Forehead ice armor '+str(i),(x,-1.13,2.18),(x,-1.02,2.57-abs(x)*.6),.20,ice,'head')
    rock('Diamond chest core',(0,-1.02,1.12),(.33,.11,.39),cyan,detail=1)
    # Connected, overlapping plates form a roof under every castle tower.
    for row in range(6):
        y=-.23+row*.29
        for col in [-1,0,1]:
            x=col*.42;z=2.22+.20*(1-abs(col))+.12*sin(row*pi/5)
            rock('Overlapping glacier roof '+str(row)+str(col),(x,y,z),(.33,.30,.18),ice,detail=1)
    for i,(x,y,h) in enumerate([(-.72,.22,.70),(.72,.22,.70),(-.60,.84,1.02),(.60,.84,1.02),(-.34,1.33,1.10),(.34,1.33,.95),(0,1.25,1.43)]):
        z=2.07
        box('Citadel tower '+str(i),(x,y,z+h*.5),(.30,.33,h),ice,bevel=.035)
        tube('Pyramidal tower roof '+str(i),[(x,y,z+h-.02),(x,y,z+h+.30)],[.25,.001],ice,sides=4)
        box('Violet lancet window '+str(i),(x,y-.17,z+h*.62),(.067,.015,.23),violet,bevel=.012)
        box('Tower belt '+str(i),(x,y,z+h*.32),(.35,.37,.08),ice,bevel=.015)
    for sign in [-1,1]:
        for j in range(5):spike('Connected citadel flank shard '+str(sign)+str(j),(sign*.71,.02+j*.29,1.90),(sign*1.00,.09+j*.29,2.65+j*.08),.20,ice)
    rock('Short bear tail',(0,1.87,1.31),(.22,.28,.24),fur)
    return s

def morthos_with_ik():
    global LEGS, PARTS
    s=morthos();LEGS=[];updated=[]
    for sign,side in [(-1,'L'),(1,'R')]:LEGS.append((side,Vector((sign*.4,0,.95)),Vector((sign*.41,-.08,.48)),Vector((sign*.43,0,.15))))
    for o,bone in PARTS:
        if bone.startswith('leg.'):
            side=bone.split('.')[1]
            bone=('foot.' if 'boot' in o.name.lower() else 'lower.' if 'Knee' in o.name else 'upper.')+side
        updated.append((o,bone))
    PARTS=updated
    return s

def rig_character(s,name):
    bpy.ops.object.select_all(action='DESELECT')
    data=bpy.data.armatures.new(name+' skeleton');rig=bpy.data.objects.new(name,data);s.collection.objects.link(rig);rig.select_set(True);bpy.context.view_layer.objects.active=rig
    bpy.ops.object.mode_set(mode='EDIT')
    definitions=[('root',(0,0,1),(0,0,1.3),None),('torso',(0,0,1.3),(0,0,2.1),'root'),('head',(0,-.3,2.0 if name in ['nivor','briarok'] else 2.4),(0,-.3,2.6),'torso'),('arm.L',(-.7,0,2.1),(-.7,0,1.4),'torso'),('arm.R',(.7,0,2.1),(.7,0,1.4),'torso')]
    for side,hip,knee,ankle in LEGS:
        definitions.extend([('upper.'+side,hip,knee,'root'),('lower.'+side,knee,ankle,'upper.'+side),('foot.'+side,ankle,ankle+Vector((0,0,.2)),'lower.'+side),('target.'+side,ankle,ankle+Vector((0,0,.2)),None)])
    for key,head,tail,parent in definitions:
        b=data.edit_bones.new(key);b.head=head;b.tail=tail
        if parent:b.parent=data.edit_bones[parent]
        if key.startswith('target.'):b.use_deform=False
    bpy.ops.object.mode_set(mode='OBJECT');rig.select_set(False)
    for o,bone in PARTS:
        vg=o.vertex_groups.new(name=bone);vg.add(list(range(len(o.data.vertices))),1,'REPLACE');o.select_set(True)
    bpy.context.view_layer.objects.active=PARTS[0][0];bpy.ops.object.join();body=bpy.context.object;body.name=name+' unified sculpture';mod=body.modifiers.new('Rigid armor skin','ARMATURE');mod.object=rig;body.parent=rig
    for side,hip,knee,ankle in LEGS:
        ik=rig.pose.bones['lower.'+side].constraints.new('IK');ik.target=rig;ik.subtarget='target.'+side;ik.chain_count=2;ik.use_stretch=False
        orient=rig.pose.bones['foot.'+side].constraints.new('COPY_ROTATION');orient.target=rig;orient.subtarget='target.'+side
    for b in rig.pose.bones:b.rotation_mode='XYZ'
    rig.animation_data_create();actions={}
    attack={'morthos':'BellSlam','vulkar':'FurnaceBurst','nyxara':'VoidCast','briarok':'RootBloom','fulgra':'Discharge','nivor':'GlacierSlam'}[name]
    for label,end in {'Idle':72,'Walk':40,'Windup':30,attack:36,'Hurt':14,'Stagger':60,'Spawn':54,'Death':60}.items():
        action=bpy.data.actions.new(label);rig.animation_data.action=action;actions[label]=action
        for frame in range(1,end+2):
            t=(frame-1)/end;p=rig.pose.bones
            for b in p:b.location=(0,0,0);b.rotation_euler=(0,0,0);b.scale=(1,1,1)
            if label=='Idle':p['torso'].rotation_euler.x=.012*sin(t*2*pi);p['head'].rotation_euler.y=.018*sin(t*2*pi)
            elif label=='Walk':
                for i,(side,hip,knee,ankle) in enumerate(LEGS):
                    # Tripod gait for six legs; diagonal pairs for four.
                    phase=(t+([0,.5,.0,.5,0,.5][i] if len(LEGS)==6 else [0,.5,.5,0][i%4]))%1
                    lift=max(0,sin(phase*2*pi))*.14;stride=.14*cos(phase*2*pi)
                    b=p['target.'+side];b.location=b.bone.matrix_local.to_3x3().inverted()@Vector((0,stride,lift))
                p['torso'].rotation_euler.z=.02*sin(t*2*pi)
                p['arm.L'].rotation_euler.x=.13*sin(t*2*pi);p['arm.R'].rotation_euler.x=-.13*sin(t*2*pi)
                if name=='nyxara':p['root'].location.y=.035*sin(t*2*pi)
            elif label=='Windup':
                p['torso'].rotation_euler.x=-.16*t;p['head'].rotation_euler.x=-.20*t
                for key in ['arm.L','arm.R']:p[key].rotation_euler.x=-.90*t
            elif label==attack:
                a=max(0,1-t/.30);p['torso'].rotation_euler.x=-.16*a+.12*sin(pi*t);p['head'].rotation_euler.x=-.20*a+.16*sin(pi*t)
                for key in ['arm.L','arm.R']:p[key].rotation_euler.x=-.90*a
                if name=='fulgra':p['torso'].rotation_euler.z=.055*sin(t*16*pi)*(1-t)
            elif label=='Hurt':p['torso'].rotation_euler.x=-.12*sin(t*pi)
            elif label=='Stagger':p['torso'].rotation_euler.x=.11;p['head'].rotation_euler.z=.09*sin(t*4*pi)
            elif label=='Spawn':p['torso'].rotation_euler.x=.2*(1-t);p['head'].rotation_euler.x=-.24*sin(t*pi)
            elif label=='Death':
                p['root'].location.y=-.47*min(1,t*1.5);p['torso'].rotation_euler.x=.40*min(1,t*1.5);p['head'].rotation_euler.x=.36*min(1,t*1.5)
            for b in p:b.keyframe_insert('location',frame=frame);b.keyframe_insert('rotation_euler',frame=frame)
        rig.animation_data.action=None;track=rig.animation_data.nla_tracks.new();track.name=label;track.strips.new(label,1,action);track.mute=True
    rig.animation_data.action=actions['Idle'];s.frame_set(1)
    bpy.ops.object.select_all(action='DESELECT');body.select_set(True);rig.select_set(True);bpy.context.view_layer.objects.active=rig
    with contextlib.redirect_stdout(io.StringIO()):
        bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,name+'.glb'),export_format='GLB',use_selection=True,use_active_scene=True,export_animations=True,export_animation_mode='ACTIONS',export_anim_single_armature=False,export_force_sampling=True,export_materials='EXPORT',export_cameras=False,export_lights=False)
    normalize_clips(name)
    return rig,actions

def normalize_clips(name):
    path=os.path.join(OUT,name+'.glb');raw=open(path,'rb').read();size=struct.unpack_from('<I',raw,12)[0];data=json.loads(raw[20:20+size])
    for clip in data.get('animations',[]):clip['name']=re.sub(r'\.\d+$','',clip['name'])
    if len(data.get('animations',[]))!=8:raise ValueError('Expected exactly eight guardian clips')
    content=json.dumps(data,separators=(',',':')).encode();content+=b' '*((-len(content))%4);tail=raw[20+size:]
    with open(path,'wb') as f:f.write(struct.pack('<III',0x46546c67,2,20+len(content)+len(tail))+struct.pack('<II',len(content),0x4e4f534a)+content+tail)

def build(name):
    s=morthos_with_ik() if name=='morthos' else globals()[name]();rig,actions=rig_character(s,name)
    if name!='morthos':studio(s,center=(0,.2,1.7),span=5.1)
    s['guardian_name']=name;bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,name+'-review.blend'));print(name,'ready',len(PARTS),'parts',len(LEGS),'IK legs',len(actions),'clips')
    return s

def render(name,angle='three-quarter'):
    s=bpy.context.scene;s.frame_set(1);s.camera.data.ortho_scale=5.0
    render_view(s,name,angle)
