"""Aplica os textos do post 7 sobre as imagens geradas sem texto.

Uso:
    python3 aplicar_texto.py ENTRADA SAIDA [--ajustes ajustes.json]

ENTRADA: pasta com p1..p6 (.png/.jpg/.webp), em qualquer tamanho.
         Página que faltar vira um fundo vermelho com grão (serve de prévia).
SAIDA:   pasta onde saem p1.png..p6.png em 1080x1350 e uma folha de contato.
ajustes: opcional; muda a posição de um fragmento sem mexer no código, ex.:
         {"p2": {"não tem nome:": [0.30, 0.52]}}   (x, y em fração da página)
"""
import argparse
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

W, H = 1080, 1350
VERMELHO = (0xA3, 0x26, 0x1A)
BRANCO = (255, 255, 255)
FONTE = Path(__file__).parent / "fontes" / "jost-latin-500-normal.woff"
MARGEM = 0.08  # margem lateral, em fração da largura

CORPO = 34   # ~2,5% da altura
CAPA = 46    # capa um pouco maior

# (texto, lado, y)  lado: L = esquerda, R = direita, C = centro; y = topo do texto
PAGINAS = {
    "p1": (CAPA, [
        ("você", "L", 0.13), ("já sofreu", "R", 0.21), ("tudo", "C", 0.30),
        ("o que", "L", 0.39), ("ainda não", "R", 0.47), ("aconteceu", "L", 0.60),
    ]),
    "p2": (CORPO, [
        ("o futuro", "L", 0.10), ("é um bom endereço", "R", 0.16),
        ("para o que", "C", 0.23), ("não tem nome:", "L", 0.52),
        ("fica aberto", "R", 0.60), ("e não desmente", "L", 0.80),
        ("ninguém", "C", 0.87),
    ]),
    "p3": (CORPO, [
        ("ninguém sofre antes", "L", 0.10), ("por acaso.", "R", 0.16),
        ("é uma oferenda:", "C", 0.40), ("se doer", "L", 0.56),
        ("agora,", "R", 0.63), ("talvez", "L", 0.80), ("não aconteça", "C", 0.87),
    ]),
    "p4": (CORPO, [
        ("o pior,", "L", 0.14), ("pelo menos,", "R", 0.22), ("tem forma", "C", 0.80),
    ]),
    "p5": (CORPO, [
        ("o tratamento", "L", 0.10), ("não cancela", "R", 0.16),
        ("o futuro.", "C", 0.47), ("devolve a ele", "L", 0.78),
        ("a única coisa", "R", 0.82), ("que era sua:", "L", 0.86),
        ("não ter acontecido", "C", 0.91),
    ]),
}
ASSINATURA = [("roberth milani", 52, 0.47), ("crm-pe 39702 · médico", 30, 0.53)]


def cortar_4x5(img):
    img = img.convert("RGB")
    w, h = img.size
    if w / h > W / H:  # larga demais: corta laterais
        nw = round(h * W / H)
        img = img.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
    else:              # alta demais: corta em cima e embaixo
        nh = round(w * H / W)
        img = img.crop((0, (h - nh) // 2, w, (h - nh) // 2 + nh))
    return img.resize((W, H), Image.LANCZOS)


def fundo_vermelho():
    rng = np.random.default_rng(7)
    grao = rng.normal(0, 7, (H, W, 1))
    arr = np.clip(np.array(VERMELHO, float) + grao, 0, 255).astype("uint8")
    return Image.fromarray(arr)


def abrir(entrada, nome):
    for ext in (".png", ".jpg", ".jpeg", ".webp"):
        p = entrada / f"{nome}{ext}"
        if p.exists():
            return cortar_4x5(Image.open(p))
    print(f"  {nome}: imagem não encontrada, usando fundo de prévia")
    return fundo_vermelho()


def escrever(draw, texto, fonte, x, y, ancora):
    draw.text((x, y), texto, font=fonte, fill=BRANCO, anchor=ancora)


def montar(img, tamanho, frags, ajustes):
    d = ImageDraw.Draw(img)
    f = ImageFont.truetype(str(FONTE), tamanho)
    ultimo = -1.0
    for texto, lado, y in frags:
        if texto in ajustes:
            x_frac, y = ajustes[texto]
            x, ancora = x_frac * W, "la"
        elif lado == "L":
            x, ancora = MARGEM * W, "la"
        elif lado == "R":
            x, ancora = (1 - MARGEM) * W, "ra"
        else:
            x, ancora = W / 2, "ma"
        if y <= ultimo:
            print(f"  aviso: '{texto}' não está abaixo do fragmento anterior")
        ultimo = y
        escrever(d, texto, f, x, y * H, ancora)
    return img


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("entrada", type=Path)
    ap.add_argument("saida", type=Path)
    ap.add_argument("--ajustes", type=Path)
    a = ap.parse_args()
    ajustes = json.loads(a.ajustes.read_text()) if a.ajustes else {}
    a.saida.mkdir(parents=True, exist_ok=True)

    prontas = []
    for nome, (tam, frags) in PAGINAS.items():
        img = montar(abrir(a.entrada, nome), tam, frags, ajustes.get(nome, {}))
        img.save(a.saida / f"{nome}.png")
        prontas.append(img)

    img = abrir(a.entrada, "p6")
    d = ImageDraw.Draw(img)
    for texto, tam, y in ASSINATURA:
        escrever(d, texto, ImageFont.truetype(str(FONTE), tam), W / 2, y * H, "ma")
    img.save(a.saida / "p6.png")
    prontas.append(img)

    # folha de contato 3x2 para conferir a sequência
    t = 0.3
    tw, th = int(W * t), int(H * t)
    folha = Image.new("RGB", (tw * 3 + 40, th * 2 + 30), (30, 30, 30))
    for i, p in enumerate(prontas):
        folha.paste(p.resize((tw, th)), (10 + (i % 3) * (tw + 10), 10 + (i // 3) * (th + 10)))
    folha.save(a.saida / "folha_contato.png")
    print(f"ok: {a.saida}")


if __name__ == "__main__":
    sys.exit(main())
