"""Assa sprites de particula no Blender, headless.

Todos saem em BRANCO com alpha trabalhado: a cor entra em runtime, multiplicada
pelo material aditivo. E por isso que um mesmo sprite serve pra lava e pra gelo.
"""
import bpy, os, sys, math

ARGS = sys.argv[sys.argv.index('--') + 1:]
OUT = ARGS[0]
SIZE = 256
os.makedirs(OUT, exist_ok=True)


def scene_setup(size=SIZE):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scn = bpy.context.scene
    scn.render.engine = 'CYCLES'
    scn.cycles.device = 'CPU'
    scn.cycles.samples = 48
    scn.cycles.use_denoising = False
    scn.render.film_transparent = True
    scn.render.resolution_x = scn.render.resolution_y = size
    scn.render.resolution_percentage = 100
    scn.render.image_settings.file_format = 'PNG'
    scn.render.image_settings.color_mode = 'RGBA'
    scn.render.image_settings.color_depth = '8'
    # Standard, nao AgX: emissao 1.0 tem de sair branco 255, sem tone mapping.
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
    """Acucar sintatico pra montar node tree sem 40 linhas de nt.links.new."""

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
        self.nt.links.new(a.outputs[out] if isinstance(out, str) else a.outputs[out],
                          b.inputs[inp] if isinstance(inp, str) else b.inputs[inp])

    def math(self, op, a=None, b=None, out_of=None, socket='Value', clamp=False):
        node = self.n('ShaderNodeMath', operation=op, use_clamp=clamp)
        if out_of is not None:
            self.link(out_of, socket, node, 0)
        elif a is not None:
            node.inputs[0].default_value = a
        if b is not None:
            node.inputs[1].default_value = b
        return node

    def radius(self):
        """Distancia do centro no plano, em [0, ~1.41]."""
        geo = self.n('ShaderNodeNewGeometry')
        sep = self.n('ShaderNodeSeparateXYZ')
        self.link(geo, 'Position', sep, 'Vector')
        flat = self.n('ShaderNodeCombineXYZ')
        self.link(sep, 'X', flat, 'X')
        self.link(sep, 'Y', flat, 'Y')
        length = self.n('ShaderNodeVectorMath', operation='LENGTH')
        self.link(flat, 'Vector', length, 0)
        return length, sep, flat

    def finish(self, alpha_node, alpha_socket='Value', emission=1.0):
        """Transparent x Emission misturados pelo alpha. Branco puro."""
        emit = self.n('ShaderNodeEmission')
        emit.inputs['Color'].default_value = (1, 1, 1, 1)
        emit.inputs['Strength'].default_value = emission
        transp = self.n('ShaderNodeBsdfTransparent')
        mix = self.n('ShaderNodeMixShader')
        self.link(alpha_node, alpha_socket, mix, 'Fac')
        self.nt.links.new(transp.outputs['BSDF'], mix.inputs[1])
        self.nt.links.new(emit.outputs['Emission'], mix.inputs[2])
        out = self.n('ShaderNodeOutputMaterial')
        self.link(mix, 'Shader', out, 'Surface')


def build(name, fn, size=SIZE, frames=1):
    plane = scene_setup(size)
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    plane.data.materials.append(mat)
    t = Tree(mat)
    w_input = fn(t)
    scn = bpy.context.scene
    for f in range(frames):
        if w_input is not None and frames > 1:
            w_input.inputs['W'].default_value = f * 0.55
        path = os.path.join(OUT, name if frames == 1 else f'{name}_{f:02d}')
        scn.render.filepath = path
        bpy.ops.render.render(write_still=True)
        print(f'  -> {os.path.basename(path)}.png')


# ---------------------------------------------------------------- os sprites

def glow(t):
    """Nucleo quente com queda suave. E o substituto direto do octaedro solido."""
    r, _, _ = t.radius()
    fall = t.n('ShaderNodeMapRange', interpolation_type='SMOOTHSTEP',
               in_From_Min=0.0, in_From_Max=1.0, in_To_Min=1.0, in_To_Max=0.0)
    t.link(r, 'Value', fall, 'Value')
    sharp = t.math('POWER', out_of=fall, socket='Result', b=2.1, clamp=True)
    core = t.math('POWER', out_of=fall, socket='Result', b=9.0, clamp=True)
    total = t.math('ADD', out_of=sharp, clamp=True)
    t.link(core, 'Value', total, 1)
    t.finish(total)
    return None


def spark(t):
    """Risco alongado: mesma queda radial, mas o eixo Y comprimido 6x."""
    geo = t.n('ShaderNodeNewGeometry')
    sep = t.n('ShaderNodeSeparateXYZ')
    t.link(geo, 'Position', sep, 'Vector')
    stretch = t.math('MULTIPLY', out_of=sep, socket='Y', b=6.0)
    comb = t.n('ShaderNodeCombineXYZ')
    t.link(sep, 'X', comb, 'X')
    t.link(stretch, 'Value', comb, 'Y')
    length = t.n('ShaderNodeVectorMath', operation='LENGTH')
    t.link(comb, 'Vector', length, 0)
    fall = t.n('ShaderNodeMapRange', interpolation_type='SMOOTHSTEP',
               in_From_Min=0.0, in_From_Max=0.95, in_To_Min=1.0, in_To_Max=0.0)
    t.link(length, 'Value', fall, 'Value')
    sharp = t.math('POWER', out_of=fall, socket='Result', b=1.6, clamp=True)
    t.finish(sharp)
    return None


def smoke(t):
    """Nuvem: ruido 4D mascarado por queda radial. O W anima o flipbook."""
    noise = t.n('ShaderNodeTexNoise', noise_dimensions='4D',
                in_Scale=3.4, in_Detail=6.0, in_Roughness=0.62)
    r, _, _ = t.radius()
    mask = t.n('ShaderNodeMapRange', interpolation_type='SMOOTHSTEP',
               in_From_Min=0.12, in_From_Max=0.92, in_To_Min=1.0, in_To_Max=0.0)
    t.link(r, 'Value', mask, 'Value')
    # ruido vira contraste antes de virar alpha
    lift = t.n('ShaderNodeMapRange', interpolation_type='SMOOTHSTEP',
               in_From_Min=0.34, in_From_Max=0.72, in_To_Min=0.0, in_To_Max=1.0)
    t.link(noise, 'Fac', lift, 'Value')
    mul = t.math('MULTIPLY', out_of=lift, socket='Result', clamp=True)
    t.link(mask, 'Result', mul, 1)
    t.finish(mul)
    return noise


def ember(t):
    """Brasa: celulas voronoi pequenas recortadas por mascara radial."""
    vor = t.n('ShaderNodeTexVoronoi', feature='F1', in_Scale=9.0, in_Randomness=1.0)
    inv = t.n('ShaderNodeMapRange', interpolation_type='SMOOTHSTEP',
              in_From_Min=0.0, in_From_Max=0.42, in_To_Min=1.0, in_To_Max=0.0)
    t.link(vor, 'Distance', inv, 'Value')
    r, _, _ = t.radius()
    mask = t.n('ShaderNodeMapRange', interpolation_type='SMOOTHSTEP',
               in_From_Min=0.2, in_From_Max=0.85, in_To_Min=1.0, in_To_Max=0.0)
    t.link(r, 'Value', mask, 'Value')
    mul = t.math('MULTIPLY', out_of=inv, socket='Result', clamp=True)
    t.link(mask, 'Result', mul, 1)
    t.finish(mul)
    return None


def crack(t):
    """Trinca: voronoi 'distancia ate a borda' vira linha fina. Pro gelo."""
    vor = t.n('ShaderNodeTexVoronoi', feature='DISTANCE_TO_EDGE',
              in_Scale=5.2, in_Randomness=0.9)
    line = t.n('ShaderNodeMapRange', interpolation_type='SMOOTHSTEP',
               in_From_Min=0.0, in_From_Max=0.055, in_To_Min=1.0, in_To_Max=0.0)
    t.link(vor, 'Distance', line, 'Value')
    r, _, _ = t.radius()
    mask = t.n('ShaderNodeMapRange', interpolation_type='SMOOTHSTEP',
               in_From_Min=0.25, in_From_Max=0.98, in_To_Min=1.0, in_To_Max=0.0)
    t.link(r, 'Value', mask, 'Value')
    mul = t.math('MULTIPLY', out_of=line, socket='Result', clamp=True)
    t.link(mask, 'Result', mul, 1)
    t.finish(mul)
    return None


def ring(t):
    """Onda de choque: gaussiana em torno de r=0.72, macia dos dois lados."""
    r, _, _ = t.radius()
    off = t.math('SUBTRACT', out_of=r, b=0.72)
    norm = t.math('DIVIDE', out_of=off, b=0.16)
    sq = t.math('POWER', out_of=norm, b=2.0)
    neg = t.math('MULTIPLY', out_of=sq, b=-1.0)
    gauss = t.math('POWER', a=math.e, b=None)
    gauss.inputs[0].default_value = math.e
    t.link(neg, 'Value', gauss, 1)
    t.finish(gauss)
    return None


def flame(t):
    """Lingua de fogo: gota deformada por ruido, mais quente embaixo."""
    geo = t.n('ShaderNodeNewGeometry')
    sep = t.n('ShaderNodeSeparateXYZ')
    t.link(geo, 'Position', sep, 'Vector')
    # afina no topo: escala X cresce conforme Y sobe
    up = t.n('ShaderNodeMapRange', in_From_Min=-1.0, in_From_Max=1.0, in_To_Min=1.0, in_To_Max=3.4)
    t.link(sep, 'Y', up, 'Value')
    taper = t.math('MULTIPLY', out_of=sep, socket='X')
    t.link(up, 'Result', taper, 1)
    comb = t.n('ShaderNodeCombineXYZ')
    t.link(taper, 'Value', comb, 'X')
    t.link(sep, 'Y', comb, 'Y')
    length = t.n('ShaderNodeVectorMath', operation='LENGTH')
    t.link(comb, 'Vector', length, 0)
    noise = t.n('ShaderNodeTexNoise', noise_dimensions='4D', in_Scale=4.6, in_Detail=5.0)
    wob = t.math('MULTIPLY', out_of=noise, socket='Fac', b=0.45)
    total = t.math('ADD', out_of=length)
    t.link(wob, 'Value', total, 1)
    fall = t.n('ShaderNodeMapRange', interpolation_type='SMOOTHSTEP',
               in_From_Min=0.3, in_From_Max=1.05, in_To_Min=1.0, in_To_Max=0.0)
    t.link(total, 'Value', fall, 'Value')
    t.finish(fall, 'Result')
    return noise


def bolt(t):
    """Projetil: cabeca quente e redonda com rastro afinando. Diferente do
    'spark', que e simetrico -- este tem FRENTE, e por isso serve para dizer
    para onde a coisa esta indo."""
    geo = t.n('ShaderNodeNewGeometry')
    sep = t.n('ShaderNodeSeparateXYZ')
    t.link(geo, 'Position', sep, 'Vector')
    # A cauda vive em Y negativo: comprime la e deixa a cabeca redonda.
    cauda = t.n('ShaderNodeMapRange', interpolation_type='SMOOTHSTEP',
                in_From_Min=-1.0, in_From_Max=0.35, in_To_Min=3.6, in_To_Max=1.0)
    t.link(sep, 'Y', cauda, 'Value')
    largura = t.math('MULTIPLY', out_of=sep, socket='X')
    t.link(cauda, 'Result', largura, 1)
    comb = t.n('ShaderNodeCombineXYZ')
    t.link(largura, 'Value', comb, 'X')
    t.link(sep, 'Y', comb, 'Y')
    dist = t.n('ShaderNodeVectorMath', operation='LENGTH')
    t.link(comb, 'Vector', dist, 0)
    queda = t.n('ShaderNodeMapRange', interpolation_type='SMOOTHSTEP',
                in_From_Min=0.08, in_From_Max=0.9, in_To_Min=1.0, in_To_Max=0.0)
    t.link(dist, 'Value', queda, 'Value')
    nucleo = t.math('POWER', out_of=queda, socket='Result', b=6.0, clamp=True)
    total = t.math('ADD', out_of=queda, socket='Result', clamp=True)
    t.link(nucleo, 'Value', total, 1)
    t.finish(total)
    return None


SPRITES = [
    ('glow', glow, 1), ('spark', spark, 1), ('ember', ember, 1),
    ('crack', crack, 1), ('ring', ring, 1), ('flame', flame, 1),
    ('smoke', smoke, 1), ('bolt', bolt, 1),
]

for name, fn, frames in SPRITES:
    print(f'[bake] {name}')
    build(name, fn, frames=frames)

# Flipbook: 16 quadros de fumaca evoluindo, pra virar atlas 4x4 no ffmpeg.
print('[bake] smoke flipbook 16 quadros')
build('fb_smoke', smoke, size=128, frames=16)

print('OK')
