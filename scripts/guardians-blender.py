"""Original guardian models. Run inside Blender; never modifies an existing scene."""
import bpy, math, random, os, json
from mathutils import Vector
from math import sin, cos, pi

ROOT = r'C:/Users/Diego Augusto/Documents/Codex/2026-09-04/pre/outputs/bomb-rift'
OUT = os.path.join(ROOT, 'public', 'guardian-review')
os.makedirs(OUT, exist_ok=True)
RNG = random.Random(2718)
PARTS = []
MAT = {}

def material(name, color, emission=0, metal=0):
    key = (name, color, emission, metal)
    if key in MAT: return MAT[key]
    m = bpy.data.materials.new('BR_' + name)
    srgb = tuple(int(color[i:i+2], 16) / 255 for i in (0, 2, 4))
    rgb = tuple(v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in srgb)
    m.diffuse_color = (*rgb, 1); m.use_nodes = True
    bs = m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value = (*rgb, 1)
    bs.inputs['Roughness'].default_value = .79 if not metal else .48
    bs.inputs['Metallic'].default_value = metal
    bs.inputs['Emission Color'].default_value = (*rgb, 1)
    bs.inputs['Emission Strength'].default_value = emission
    MAT[key] = m; return m

def finish(o, name, mats, bone='torso'):
    o.name = name
    for m in mats: o.data.materials.append(m)
    for face in o.data.polygons:
        face.use_smooth = False
        if len(mats) > 1: face.material_index = RNG.choices(range(len(mats)), [6] + [1]*(len(mats)-1))[0]
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    if bone: PARTS.append((o, bone))
    return o

def rock(name, xyz, scale, mats, bone='torso', detail=2):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=detail, radius=1, location=xyz)
    o=bpy.context.object; o.scale=scale
    return finish(o,name,mats,bone)

def box(name, xyz, scale, mats, bone='torso', bevel=.035):
    bpy.ops.mesh.primitive_cube_add(size=1, location=xyz)
    o=bpy.context.object; o.scale=scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        mod=o.modifiers.new('Carved edges','BEVEL'); mod.width=bevel; mod.segments=1
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return finish(o,name,mats,bone)

def tube(name, points, radii, mats, bone='torso', sides=8):
    verts=[]; faces=[]
    for i, p in enumerate(points):
        tangent=Vector(points[min(i+1,len(points)-1)])-Vector(points[max(i-1,0)])
        tangent.normalize(); u=tangent.cross(Vector((0,1,0)))
        if u.length < .01: u=tangent.cross(Vector((1,0,0)))
        u.normalize(); v=tangent.cross(u).normalized()
        for j in range(sides): verts.append(Vector(p)+(cos(j*2*pi/sides)*u+sin(j*2*pi/sides)*v)*radii[i])
    for i in range(len(points)-1):
        for j in range(sides): faces.append((i*sides+j,i*sides+(j+1)%sides,(i+1)*sides+(j+1)%sides,(i+1)*sides+j))
    faces.extend([tuple(reversed(range(sides))),tuple(range((len(points)-1)*sides,len(points)*sides))])
    mesh=bpy.data.meshes.new(name); mesh.from_pydata(verts,[],faces); mesh.update()
    o=bpy.data.objects.new(name,mesh); bpy.context.collection.objects.link(o)
    return finish(o,name,mats,bone)

def plate(name, outline, y, depth, mats, bone='torso'):
    n=len(outline); verts=[(x,yy,z) for yy in (y,y+depth) for x,z in outline]
    faces=[tuple(reversed(range(n))),tuple(range(n,n*2))]
    faces += [(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
    o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o)
    return finish(o,name,mats,bone)

def new_scene(name):
    global PARTS, RNG
    PARTS=[]; RNG=random.Random(2718)
    s=bpy.data.scenes.new('BOMB RIFT · '+name); bpy.context.window.scene=s
    s.render.engine='CYCLES'; s.cycles.samples=40; s.cycles.use_denoising=True
    s.render.resolution_x=1000;s.render.resolution_y=1100;s.render.resolution_percentage=100
    s.render.fps=30;s.world=bpy.data.worlds.new(name+' studio')
    s.world.use_nodes=True;s.world.node_tree.nodes['Background'].inputs[0].default_value=(.075,.06,.12,1)
    s.world.node_tree.nodes['Background'].inputs[1].default_value=.4
    s.view_settings.view_transform='AgX'
    return s

def studio(s, center=(0,0,1.7), span=4.8):
    floor=material('studio floor','191322')
    box('Review floor',(0,0,-.13),(200,200,.2),[floor],None,0)
    for name, xyz, power, size, color in [('Key',(-3,-4,7),700,5,(.84,.83,1)),('Fill',(4,-1,4),550,4,(.68,.80,1)),('Rim',(1,3,5),950,3,(.67,.43,1))]:
        data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size;data.color=color
        o=bpy.data.objects.new(name,data);s.collection.objects.link(o);o.location=xyz;o.rotation_euler=(Vector(center)-o.location).to_track_quat('-Z','Y').to_euler()
    data=bpy.data.cameras.new('Review camera');cam=bpy.data.objects.new('Review camera',data);s.collection.objects.link(cam)
    data.type='ORTHO';data.ortho_scale=span;cam.location=(4,-8,4.1);cam.rotation_euler=(Vector(center)-cam.location).to_track_quat('-Z','Y').to_euler();s.camera=cam

def morthos():
    s=new_scene('Mórthos pixel faithful')
    violet=[material('amethyst stone','564074'),material('stone light','786197'),material('stone dark','3b2c52'),material('stone edge','947fba')]
    gold=[material('old gold','c78b41',metal=.45),material('gold highlight','f1c878',metal=.35),material('gold shade','79502e',metal=.4)]
    dark=[material('deep cavity','110d24')]; white=[material('eye white','f6ecff',2)]
    glow=[material('rift crystal','a734ff',2.4),material('crystal light','ef9cff',2),material('crystal shade','6618bf',1)]
    rock('Massive carved torso',(0,.10,1.66),(.76,.56,.79),violet)
    rock('Stone back',(0,.37,1.72),(.64,.35,.66),violet)
    box('Hip stone',(0,.02,.88),(.98,.65,.37),violet,'root',.09)
    for sign in (-1,1):
        side='L' if sign < 0 else 'R'; leg='leg.'+side; arm='arm.'+side
        rock('Thigh '+side,(sign*.40,.02,.70),(.26,.30,.36),violet,leg)
        rock('Knee '+side,(sign*.41,-.08,.48),(.28,.32,.22),violet,leg)
        rock('Grounded boot '+side,(sign*.43,-.17,.22),(.37,.49,.24),violet,leg)
        box('Boot sole '+side,(sign*.43,-.14,.07),(.58,.70,.12),[violet[2]],leg,.025)
        box('Boot gold clasp '+side,(sign*.65,-.34,.24),(.08,.06,.15),gold,leg,.01)
        rock('Shoulder joint '+side,(sign*.79,.02,2.12),(.29,.32,.32),[violet[2]],arm)
        rock('Large round pauldron '+side,(sign*.93,-.01,2.14),(.44,.44,.40),violet,arm)
        tube('Pauldron gold rim '+side,[(sign*.55,-.28,2.02),(sign*.71,-.40,1.93),(sign*1.0,-.42,1.90),(sign*1.29,-.26,1.98)],[.052]*4,gold,arm)
        rock('Upper arm '+side,(sign*1.02,.01,1.71),(.26,.27,.30),violet,arm)
        rock('Elbow '+side,(sign*1.08,-.02,1.46),(.28,.29,.25),[violet[2]],arm)
        rock('Forearm plate '+side,(sign*1.13,-.06,1.26),(.30,.32,.30),violet,arm)
        tube('Gauntlet gold ring '+side,[(sign*1.13,-.04,1.14),(sign*1.13,-.04,1.22)],[.31,.31],gold,arm,8)
        rock('Fist palm '+side,(sign*1.15,-.08,.99),(.31,.28,.29),violet,arm)
        for i in range(3):
            rock('Connected knuckle '+side+str(i),(sign*1.15+(i-1)*.145,-.29,.99),(.11,.14,.15),violet,arm,1)
        rock('Folded thumb '+side,(sign*.89,-.18,1.05),(.14,.16,.21),violet,arm,1)
        tube('Shoulder strap '+side,[(sign*.46,-.25,2.50),(sign*.52,-.40,2.30),(sign*.59,-.47,2.12)],[.065]*3,gold)
        # Horns follow the curved stone silhouette of guardian-ruins.png.
        tube('Curved stone horn '+side,[(sign*.44,.01,2.67),(sign*.71,.04,2.83),(sign*.79,.03,3.07),(sign*.68,0,3.29),(sign*.47,-.01,3.42),(sign*.28,-.01,3.47)],[.21,.21,.18,.135,.075,.012],violet,'head')
        tube('Horn gold tip '+side,[(sign*.41,-.01,3.435),(sign*.28,-.01,3.47)],[.06,.012],gold,'head')
    rock('Helmet',(0,-.01,2.65),(.52,.43,.43),violet,'head')
    plate('Recessed visor',[(-.38,2.75),(.38,2.75),(.34,2.49),(.19,2.40),(-.19,2.40),(-.34,2.49)],-.49,.04,dark,'head')
    for sign in (-1,1):
        outline=[(sign*.28,2.67),(sign*.12,2.61),(sign*.08,2.62),(sign*.10,2.53),(sign*.24,2.53),(sign*.29,2.58)]
        plate('Angry luminous eye '+str(sign),outline,-.525,.028,white,'head')
    box('Heavy brow',(0,-.49,2.76),(.82,.12,.12),violet,'head',.025)
    box('Chin',(0,-.46,2.36),(.47,.19,.13),violet,'head',.025)
    outline=[(-.62,.97),(.62,.97),(.55,1.27),(.49,1.66),(.38,1.99),(.18,2.17),(0,2.20),(-.18,2.17),(-.38,1.99),(-.49,1.66),(-.55,1.27)]
    plate('Deep bell opening',outline,-.604,.05,dark)
    tube('Continuous gold bell rim',[(x,-.71,z) for x,z in outline+[outline[0]]],[.055]*(len(outline)+1),gold,sides=8)
    tube('Bell lower lip',[(-.66,-.67,.96),(0,-.77,.93),(.66,-.67,.96)],[.075]*3,gold)
    tube('Crystal suspension',[(0,-.67,1.91),(0,-.67,1.55)],[.026,.025],[glow[2]])
    rock('Suspended rift crystal',(0,-.70,1.44),(.155,.11,.265),glow,'torso',1)
    rock('Crystal bright facet',(-.032,-.805,1.46),(.045,.021,.13),[glow[1]],'torso',1)
    studio(s)
    return s

def render_view(s, name, angle='front'):
    s.frame_set(1)
    targets={'front':(0,-9,3.1),'three-quarter':(4,-8,4.1),'back':(4,8,3.8)}
    s.camera.location=targets[angle];s.camera.rotation_euler=(Vector((0,0,1.7))-s.camera.location).to_track_quat('-Z','Y').to_euler()
    s.render.filepath=os.path.join(OUT,name+'-'+angle+'.png');bpy.ops.render.render(write_still=True)

def rig_morthos(s):
    bpy.ops.object.select_all(action='DESELECT')
    data=bpy.data.armatures.new('Morthos skeleton'); rig=bpy.data.objects.new('Morthos',data);s.collection.objects.link(rig)
    bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
    bones=[('root',(0,0,.8),(0,0,1.1),None),('torso',(0,0,1.1),(0,0,2.2),'root'),('head',(0,0,2.35),(0,0,2.8),'torso'),('arm.L',(-.86,0,2.10),(-1.13,0,1.0),'torso'),('arm.R',(.86,0,2.10),(1.13,0,1.0),'torso'),('leg.L',(-.4,0,.95),(-.4,0,.3),'root'),('leg.R',(.4,0,.95),(.4,0,.3),'root')]
    for name,head,tail,parent in bones:
        b=data.edit_bones.new(name);b.head=head;b.tail=tail
        if parent: b.parent=data.edit_bones[parent]
    bpy.ops.object.mode_set(mode='OBJECT');rig.select_set(False)
    for o,bone in PARTS:
        vg=o.vertex_groups.new(name=bone);vg.add(list(range(len(o.data.vertices))),1,'REPLACE')
        o.select_set(True)
    bpy.context.view_layer.objects.active=PARTS[0][0];bpy.ops.object.join();body=bpy.context.object;body.name='Morthos carved armor'
    mod=body.modifiers.new('Morthos rig','ARMATURE');mod.object=rig;body.parent=rig
    for b in rig.pose.bones: b.rotation_mode='XYZ'
    rig.animation_data_create()
    durations={'Idle':60,'Walk':30,'Windup':24,'BellSlam':28,'Hurt':12,'Stagger':60,'Spawn':45,'Death':50}
    actions={}
    for name,end in durations.items():
        action=bpy.data.actions.new(name);rig.animation_data.action=action;actions[name]=action
        for frame in range(1,end+2):
            t=(frame-1)/end
            for b in rig.pose.bones: b.location=(0,0,0);b.rotation_euler=(0,0,0);b.scale=(1,1,1)
            p=rig.pose.bones
            if name=='Idle':
                p['torso'].rotation_euler.x=.013*sin(t*2*pi);p['head'].rotation_euler.y=.025*sin(t*2*pi)
            elif name=='Walk':
                wave=sin(t*2*pi)
                p['leg.L'].rotation_euler.x=.22*wave;p['leg.R'].rotation_euler.x=-.22*wave
                p['arm.L'].rotation_euler.x=-.15*wave;p['arm.R'].rotation_euler.x=.15*wave
                p['root'].location.y=.012*(1-cos(t*4*pi));p['torso'].rotation_euler.z=.025*wave
            elif name=='Windup':
                p['torso'].rotation_euler.x=-.24*t
                for key in ('arm.L','arm.R'):p[key].rotation_euler.x=-1.5*t
            elif name=='BellSlam':
                a=max(0,1-t/.23) if t<.23 else 0
                p['torso'].rotation_euler.x=-.24*a+.22*sin(min(1,t/.4)*pi)*(1-t)
                for key in ('arm.L','arm.R'):p[key].rotation_euler.x=-1.5*a
            elif name=='Hurt':p['torso'].rotation_euler.x=-.12*sin(t*pi)
            elif name=='Stagger':
                p['torso'].rotation_euler.x=.14;p['head'].rotation_euler.z=.10*sin(t*4*pi)
            elif name=='Spawn':
                p['torso'].rotation_euler.x=.25*(1-t)
                for key in ('arm.L','arm.R'):p[key].rotation_euler.x=-.8*sin(t*pi)
            elif name=='Death':
                p['root'].rotation_euler.x=-min(1,t*1.4)*1.45;p['root'].location.y=-.58*min(1,t*1.4)
            for b in p:
                b.keyframe_insert('location',frame=frame);b.keyframe_insert('rotation_euler',frame=frame)
        rig.animation_data.action=None
        track=rig.animation_data.nla_tracks.new();track.name=name;track.strips.new(name,1,action);track.mute=True
    rig.animation_data.action=actions['Idle'];s.frame_set(1)
    bpy.ops.object.select_all(action='DESELECT');body.select_set(True);rig.select_set(True);bpy.context.view_layer.objects.active=rig
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'morthos.glb'),export_format='GLB',use_selection=True,use_active_scene=True,export_animations=True,export_animation_mode='ACTIONS',export_anim_single_armature=True,export_materials='EXPORT',export_cameras=False,export_lights=False)
    return rig,actions

if __name__ == '__main__':
    SCENE=morthos()
    RIG,ACTIONS=rig_morthos(SCENE)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'morthos-review.blend'))
    print('Morthos geometry ready:',len(PARTS),'meshes')
