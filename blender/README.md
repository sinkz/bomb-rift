# Assar as texturas de partícula

Os sprites em `src/assets/particles/atlas.webp` são gerados por script, não
desenhados à mão. Para refazê-los:

```sh
"C:/Program Files/Blender Foundation/Blender 5.1/blender.exe" -b \
  --python blender/bake_particles.py -- "<caminho absoluto de saida>"
```

O caminho **precisa ser absoluto**: sem arquivo .blend aberto, o Blender não
resolve `./` como o diretório atual.

Saem sete PNGs 256×256 com alpha (brilho, risco, brasa, trinca, anel, chama,
fumaça) e 16 quadros de flipbook de fumaça. Depois, para montar o atlas 4×2 que
o jogo carrega:

```sh
ffmpeg -f lavfi -i "color=c=black@0.0:s=256x256:d=1,format=rgba" -frames:v 1 blank.png
ffmpeg -i glow.png -i spark.png -i ember.png -i crack.png \
       -i ring.png -i flame.png -i smoke.png -i blank.png \
  -filter_complex "[0][1][2][3][4][5][6][7]xstack=inputs=8:layout=0_0|w0_0|w0+w1_0|w0+w1+w2_0|0_h0|w0_h0|w0+w1_h0|w0+w1+w2_h0" \
  -frames:v 1 -pix_fmt rgba atlas.png
ffmpeg -i atlas.png -c:v libwebp -q:v 88 -compression_level 6 src/assets/particles/atlas.webp
```

A ordem das células do atlas está codificada em `SPRITE` no `src/particles.js`.
Se mudar a ordem aqui, mude lá também.

Os sprites saem **brancos** de propósito: a cor entra em runtime, multiplicada
no material aditivo. É por isso que o mesmo sprite serve para lava e para gelo.
