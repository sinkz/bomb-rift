"""Assa as duas camadas da fenda que engole o guardiao.

Sao DUAS texturas porque a fenda faz duas coisas opostas ao mesmo tempo: o miolo
TIRA luz (mistura normal, cor quase preta) e os filamentos SOMAM luz (aditivo,
cor do mundo). Uma textura branca-com-alpha nao consegue ser as duas.

  rift-core.png  mascara do buraco -- solida no centro, com a borda mordida
  rift-glow.png  os filamentos em espiral e o anel de boca

Uso:
  blender -b --python blender/bake_rift.py -- "<caminho absoluto de saida>"
"""
import bpy, os, sys, math

OUT = sys.argv[sys.argv.index('--') + 1]
SIZE = 512
os.makedirs(OUT, exist_ok=True)


def scene_setup():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scn = bpy.context.scene
    scn.render.engine = 'CYCLES'
    scn.cycles.device = 'CPU'
    scn.cycles.samples = 64
    scn.cycles.use_denoising = False
    scn.render.film_transparent = True
    scn.render.resolution_x = scn.render.resolution_y = SIZE
    scn.render.image_settings.file_format = 'PNG'
    scn.render.image_settings.color_mode = 'RGBA'
    scn.view_settings.view_transform = 'Standard'
    scn.view_settings.look = 'None'

    cam_data = bpy.data.cameras.new('cam')
    cam_data.type = 'ORTHO'
    cam_data.ortho_scale = 2.0
    cam = bpy.data.objects.new('cam', cam_data)
    cam.location = (0, 0, 4)
    bpy.context.collection.objects.link(cam)
    scn.camera = cam

    bpy.ops.mesh.primitive_plane_add(size=2, location=(0, 0, 0))
    return bpy.context.active_object


class Tree:
    def __init__(self, mat):
        self.nt = mat.node_tree
        self.nt.nodes.clear()

    def n(self, kind, **props):
        node = self.nt.nodes.new(kind)
        for k, v in props.items():
            if k.startswith('in_'):
                node.inputs[k[3:].replace('_', ' ')].default_value = v
            else:
                setattr(node, k, v)
        return node

    def link(self, a, out, b, inp):
        self.nt.links.new(a.outputs[out], b.inputs[inp])

    def math(self, op, out_of=None, socket='Value', a=None, b=None, clamp=False):
        node = self.n('ShaderNodeMath', operation=op, use_clamp=clamp)
        if out_of is not None:
            self.link(out_of, socket, node, 0)
        elif a is not None:
            node.inputs[0].default_value = a
        if b is not None:
            node.inputs[1].default_value = b
        return node

    def coords(self):
        """Posicao no plano: x, y e o raio a partir do centro."""
        geo = self.n('ShaderNodeNewGeometry')
        sep = self.n('ShaderNodeSeparateXYZ')
        self.link(geo, 'Position', sep, 'Vector')
        flat = self.n('ShaderNodeCombineXYZ')
        self.link(sep, 'X', flat, 'X')
        self.link(sep, 'Y', flat, 'Y')
        raio = self.n('ShaderNodeVectorMath', operation='LENGTH')
        self.link(flat, 'Vector', raio, 0)
        return sep, flat, raio

    def finish(self, alpha_node, alpha_socket='Value'):
        emit = self.n('ShaderNodeEmission')
        emit.inputs['Color'].default_value = (1, 1, 1, 1)
        transp = self.n('ShaderNodeBsdfTransparent')
        mix = self.n('ShaderNodeMixShader')
        self.link(alpha_node, alpha_socket, mix, 'Fac')
        self.nt.links.new(transp.outputs['BSDF'], mix.inputs[1])
        self.nt.links.new(emit.outputs['Emission'], mix.inputs[2])
        out = self.n('ShaderNodeOutputMaterial')
        self.link(mix, 'Shader', out, 'Surface')


def build(nome, fn):
    plane = scene_setup()
    mat = bpy.data.materials.new(nome)
    mat.use_nodes = True
    plane.data.materials.append(mat)
    fn(Tree(mat))
    bpy.context.scene.render.filepath = os.path.join(OUT, nome)
    bpy.ops.render.render(write_still=True)
    print('  -> %s.png' % nome)


def core(t):
    """O buraco. Solido no meio, com a borda mordida por ruido -- uma fenda nao
    tem circunferencia perfeita, tem beirada rasgada."""
    sep, flat, raio = t.coords()
    # Ruido no angulo morde a borda de forma irregular.
    ruido = t.n('ShaderNodeTexNoise', in_Scale=3.2, in_Detail=4.0)
    t.link(flat, 'Vector', ruido, 'Vector')
    morde = t.math('MULTIPLY', out_of=ruido, socket='Fac', b=0.16)
    borda = t.math('ADD', out_of=raio, socket='Value')
    t.link(morde, 'Value', borda, 1)
    queda = t.n('ShaderNodeMapRange', interpolation_type='SMOOTHSTEP',
                in_From_Min=0.38, in_From_Max=0.58, in_To_Min=1.0, in_To_Max=0.0)
    t.link(borda, 'Value', queda, 'Value')
    t.finish(queda, 'Result')


def glow(t):
    """Os filamentos. Aneis distorcidos girando para dentro, mais fortes na boca
    do buraco e apagando no centro -- o miolo tem de ficar escuro."""
    sep, flat, raio = t.coords()
    onda = t.n('ShaderNodeTexWave', wave_type='RINGS', rings_direction='SPHERICAL',
               in_Scale=2.6, in_Distortion=7.0, in_Detail=3.0, in_Detail_Scale=1.4)
    t.link(flat, 'Vector', onda, 'Vector')
    fios = t.n('ShaderNodeMapRange', interpolation_type='SMOOTHSTEP',
               in_From_Min=0.35, in_From_Max=0.95, in_To_Min=0.0, in_To_Max=1.0)
    t.link(onda, 'Fac', fios, 'Value')

    # Faixa radial: nada no miolo, forte na boca, apagando para fora.
    dentro = t.n('ShaderNodeMapRange', interpolation_type='SMOOTHSTEP',
                 in_From_Min=0.30, in_From_Max=0.55, in_To_Min=0.0, in_To_Max=1.0)
    t.link(raio, 'Value', dentro, 'Value')
    fora = t.n('ShaderNodeMapRange', interpolation_type='SMOOTHSTEP',
               in_From_Min=0.72, in_From_Max=1.0, in_To_Min=1.0, in_To_Max=0.0)
    t.link(raio, 'Value', fora, 'Value')
    faixa = t.math('MULTIPLY', out_of=dentro, socket='Result', clamp=True)
    t.link(fora, 'Result', faixa, 1)

    corpo = t.math('MULTIPLY', out_of=fios, socket='Result', clamp=True)
    t.link(faixa, 'Value', corpo, 1)

    # A boca: um anel nitido bem na beirada do buraco, para o contorno existir
    # mesmo onde os filamentos nao passam.
    off = t.math('SUBTRACT', out_of=raio, socket='Value', b=0.52)
    norm = t.math('DIVIDE', out_of=off, b=0.075)
    sq = t.math('POWER', out_of=norm, b=2.0)
    neg = t.math('MULTIPLY', out_of=sq, b=-1.0)
    boca = t.math('POWER', a=math.e)
    t.link(neg, 'Value', boca, 1)

    total = t.math('ADD', out_of=corpo, clamp=True)
    t.link(boca, 'Value', total, 1)
    t.finish(total)


print('[fenda] core')
build('rift-core', core)
print('[fenda] glow')
build('rift-glow', glow)
print('OK')
