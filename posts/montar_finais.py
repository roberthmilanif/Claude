"""Monta as páginas finais 1080x1350 a partir das imagens geradas.

Uso:
    python3 montar_finais.py SELECAO.json SAIDA [--vermelho A3261A]

SELECAO.json: {"p1": "caminho.png", ..., "p6": "caminho.png"}
- Imagens 2:3 (1024x1536) são recortadas para 4:5 com deslocamento que
  mantém todo o conteúdo (figuras, estrelas, texto) dentro do quadro.
- Imagens já em 4:5 só são redimensionadas.
- --vermelho: corrige o fundo para a cor dada (hex), preservando o grão e
  sem tocar nas figuras, estrelas e texto.
Sai: p1..p6.png em SAIDA e folha_contato.png.
"""
import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image

W, H = 1080, 1350


def fundo(a):
    """cor mediana das bordas (o vermelho chapado)."""
    b = np.concatenate([a[:20].reshape(-1, 3), a[-20:].reshape(-1, 3), a[:, :20].reshape(-1, 3), a[:, -20:].reshape(-1, 3)])
    return np.median(b, axis=0)


def recortar_4x5(im):
    a = np.asarray(im.convert("RGB"), float)
    h, w, _ = a.shape
    alvo = round(w * H / W)
    if alvo >= h:  # já é 4:5 (ou mais largo): recorta laterais se preciso
        nw = round(h * W / H)
        x0 = (w - nw) // 2
        return im.crop((x0, 0, x0 + nw, h))
    bg = fundo(a)
    m = np.sqrt(((a - bg) ** 2).sum(axis=2)) > 70
    linhas = np.where(m.any(axis=1))[0]
    if len(linhas):
        r0, r1 = int(linhas[0]), int(linhas[-1])
        centro = (r0 + r1) / 2
        y0 = int(round(centro - alvo / 2))
        y0 = max(min(y0, r0 - 24), r1 + 24 - alvo)  # garante conteúdo dentro, com folga
    else:
        y0 = (h - alvo) // 2
    y0 = max(0, min(y0, h - alvo))
    return im.crop((0, y0, w, y0 + alvo))


def corrigir_vermelho(im, hexcor):
    alvo = np.array([int(hexcor[i:i + 2], 16) for i in (0, 2, 4)], float)
    a = np.asarray(im.convert("RGB"), float)
    bg = fundo(a)
    d = np.sqrt(((a - bg) ** 2).sum(axis=2))
    peso = np.clip(1 - (d - 40) / 40, 0, 1)[..., None]  # 1 até 40 de distância, 0 a partir de 80
    out = a + (alvo - bg) * peso
    return Image.fromarray(np.clip(out, 0, 255).astype("uint8"))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("selecao", type=Path)
    ap.add_argument("saida", type=Path)
    ap.add_argument("--vermelho", default=None, help="hex sem #, ex.: A3261A")
    a = ap.parse_args()
    sel = json.loads(a.selecao.read_text())
    a.saida.mkdir(parents=True, exist_ok=True)
    prontas = []
    for p in ["p1", "p2", "p3", "p4", "p5", "p6"]:
        im = Image.open(sel[p]).convert("RGB")
        im = recortar_4x5(im)
        if a.vermelho:
            im = corrigir_vermelho(im, a.vermelho.lstrip("#"))
        im = im.resize((W, H), Image.LANCZOS)
        im.save(a.saida / f"{p}.png")
        prontas.append(im)
        print(p, "<-", Path(sel[p]).name)
    t = 0.3
    tw, th = int(W * t), int(H * t)
    folha = Image.new("RGB", (tw * 3 + 40, th * 2 + 30), (30, 30, 30))
    for i, im in enumerate(prontas):
        folha.paste(im.resize((tw, th)), (10 + (i % 3) * (tw + 10), 10 + (i // 3) * (th + 10)))
    folha.save(a.saida / "folha_contato.png")
    print("ok:", a.saida)


if __name__ == "__main__":
    main()
