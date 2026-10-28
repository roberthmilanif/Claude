"""Desenha as figuras de lata do post 7 (rascunho sem gerador de imagem).

Uso: python3 figuras.py SAIDA   -> grava p1..p6.png (1080x1350, sem texto)
Depois: python3 aplicar_texto.py SAIDA FINAL
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

W, H = 1080, 1350
S = 2  # supersampling do desenho
VERMELHO = np.array([0xA3, 0x26, 0x1A], float)
RNG = np.random.default_rng(39702)

# ---------- poses (coordenadas livres; cada figura é reescalada para a sua caixa)
# chaves: cab, pes (pescoço), qua (quadril), jE/jD (joelhos), pE/pD (pés),
#         cE/cD (cotovelos), mE/mD (mãos)
DANCA = {
    "A": dict(cab=(.12, .12), pes=(.14, .19), qua=(.18, .50), jE=(.10, .70), pE=(.03, .93),
              jD=(.26, .72), pD=(.31, .95), cE=(.07, .35), mE=(.09, .52), cD=(.24, .12), mD=(.32, .07)),
    "B": dict(cab=(.43, .05), pes=(.43, .11), qua=(.45, .27), jE=(.38, .34), pE=(.33, .41),
              jD=(.53, .35), pD=(.61, .30), cE=(.37, .10), mE=(.32, .07), cD=(.51, .12), mD=(.58, .10)),
    "C": dict(cab=(.67, .09), pes=(.67, .14), qua=(.66, .35), jE=(.61, .47), pE=(.58, .60),
              jD=(.72, .47), pD=(.76, .58), cE=(.62, .13), mE=(.58, .10), cD=(.74, .17), mD=(.80, .22)),
    "D": dict(cab=(.91, .19), pes=(.88, .26), qua=(.83, .55), jE=(.75, .72), pE=(.70, .95),
              jD=(.92, .74), pD=(.98, .92), cE=(.83, .19), mE=(.80, .22), cD=(.79, .43), mD=(.67, .56)),
    "E": dict(cab=(.25, .655), pes=(.32, .68), qua=(.52, .79), jE=(.63, .76), pE=(.74, .84),
              jD=(.59, .88), pD=(.67, .98), cE=(.22, .62), mE=(.14, .57), cD=(.49, .62), mD=(.67, .56)),
}
OSSOS = [("pes", "qua"), ("qua", "jE"), ("jE", "pE"), ("qua", "jD"), ("jD", "pD"),
         ("pes", "cE"), ("cE", "mE"), ("pes", "cD"), ("cD", "mD")]


def mapa(caixa, ref=(0, 0, 1, 1)):
    """converte coords da pose (dentro de ref) para pixels supersampled da caixa."""
    x0, y0, x1, y1 = caixa
    rx0, ry0, rx1, ry1 = ref
    return lambda p: ((x0 + (p[0] - rx0) / (rx1 - rx0) * (x1 - x0)) * W * S,
                      (y0 + (p[1] - ry0) / (ry1 - ry0) * (y1 - y0)) * H * S)


def cap(d, a, b, r1, r2, nivel=255):
    """segmento afunilado (cápsula de raio r1 em a até r2 em b)."""
    (x1, y1), (x2, y2) = a, b
    dx, dy = x2 - x1, y2 - y1
    n = max(np.hypot(dx, dy), 1e-6)
    px, py = -dy / n, dx / n
    d.polygon([(x1 + px * r1, y1 + py * r1), (x2 + px * r2, y2 + py * r2),
               (x2 - px * r2, y2 - py * r2), (x1 - px * r1, y1 - py * r1)], fill=nivel)
    for (x, y), r in ((a, r1), (b, r2)):
        d.ellipse([x - r, y - r, x + r, y + r], fill=nivel)


def corpo(d, pose, f, esc, nivel=255):
    """corpo cheio, à Matisse: membros afunilados, tronco largo, cabeça oval."""
    P = {k: f(v) for k, v in pose.items()}
    e = esc
    cap(d, P["pes"], P["qua"], e * .068, e * .078, nivel)          # tronco
    for j, p_ in (("jE", "pE"), ("jD", "pD")):
        cap(d, P["qua"], P[j], e * .060, e * .040, nivel)          # coxa
        cap(d, P[j], P[p_], e * .040, e * .022, nivel)             # perna
    for c, m in (("cE", "mE"), ("cD", "mD")):
        cap(d, P["pes"], P[c], e * .034, e * .028, nivel)          # braço
        cap(d, P[c], P[m], e * .028, e * .020, nivel)              # antebraço
    c, r = P["cab"], e * .048
    d.ellipse([c[0] - r, c[1] - r * 1.15, c[0] + r, c[1] + r * 1.15], fill=nivel)


def estrela(d, cx, cy, r, pontas):
    ang0 = RNG.uniform(0, np.pi)
    pts = []
    for i in range(pontas * 2):
        rr = r * (1 if i % 2 == 0 else RNG.uniform(.40, .50)) * RNG.uniform(.88, 1.1)
        a = ang0 + i * np.pi / pontas + RNG.uniform(-.08, .08)
        pts.append((cx * W * S + rr * np.cos(a) * S, cy * H * S + rr * np.sin(a) * S))
    d.polygon(pts, fill=255)


# ---------- render de lata
def blur(a, r):
    im = Image.fromarray(np.clip(a * 255, 0, 255).astype("uint8"))
    return np.asarray(im.filter(ImageFilter.GaussianBlur(r)), float) / 255


def ruido(r, amp):
    n = RNG.normal(0, 1, (H, W))
    n = blur((n - n.min()) / (n.max() - n.min()), r)
    return (n - n.mean()) * amp


def fundo():
    return np.clip(VERMELHO + RNG.normal(0, 7, (H, W, 1)), 0, 255)


def lata(relevo_img, base=None, picote=False):
    """relevo_img: imagem L supersampled; 0 = vermelho, >0 = metal (cinza = mais baixo)."""
    rel = np.asarray(relevo_img.resize((W, H), Image.LANCZOS), float) / 255
    m = np.clip(rel * 4, 0, 1) if rel.max() > 0 else rel
    m = blur(m, 0.6)
    alt = 0.60 * blur(rel, 12) + 0.35 * blur(rel, 3) + 0.10 * rel
    alt += ruido(2.0, 0.45) * m  # martelado: covas pequenas
    alt += ruido(6, 0.35) * m
    gy, gx = np.gradient(alt * 60)
    n = np.dstack([-gx, -gy, np.ones_like(gx)])
    n /= np.linalg.norm(n, axis=2, keepdims=True)
    L = np.array([-0.45, -0.6, 0.66]); L /= np.linalg.norm(L)
    Hv = L + np.array([0, 0, 1.0]); Hv /= np.linalg.norm(Hv)
    dif = np.clip(n @ L, 0, 1)
    spec = np.clip(n @ Hv, 0, 1) ** 38
    cor = np.array([178, 180, 186.0])
    metal = cor * (0.30 + 0.80 * dif)[..., None] + 255 * 0.85 * spec[..., None]
    metal = np.clip(metal, 0, 255)
    out = fundo() if base is None else base
    # sombra curta
    sh = np.roll(np.roll(blur(m, 5), 9, 0), 6, 1)
    out = out * (1 - 0.5 * sh)[..., None]
    return out * (1 - m[..., None]) + metal * m[..., None]


def tela():
    im = Image.new("L", (W * S, H * S), 0)
    return im, ImageDraw.Draw(im)


def salvar(arr, p):
    Image.fromarray(np.clip(arr, 0, 255).astype("uint8")).save(p)


# ---------- páginas
def roda(caixa, sem="", contorno=""):
    im, d = tela()
    f = mapa(caixa)
    esc = (caixa[2] - caixa[0]) * W * S
    for k, pose in DANCA.items():
        if k != sem:
            corpo(d, pose, f, esc)
    arr = None
    if contorno:
        so, ds = tela()
        corpo(ds, DANCA[contorno], f, esc)
        borda = np.asarray(so.filter(ImageFilter.MaxFilter(31)), float) - np.asarray(so, float)
        borda = borda > 128
        yy, xx = np.mgrid[0:H * S, 0:W * S]
        pont = ((xx % 34 - 17) ** 2 + (yy % 34 - 17) ** 2) < 180  # picote
        dots = Image.fromarray(((borda & pont) * 255).astype("uint8"))
        im = Image.fromarray(np.maximum(np.asarray(im), np.asarray(dots)))
        d = ImageDraw.Draw(im)
    return im, d


def p1():
    im, d = tela()
    # só a figura da frente, sozinha, no quarto inferior direito, mão para a esquerda
    corpo(d, DANCA["E"], mapa((0.46, 0.66, 0.98, 0.94), (0.14, 0.55, 0.74, 0.98)), 0.75 * W * S)
    for x, y, r, n in ((.62, .08, 20, 5), (.90, .30, 15, 6), (.50, .12, 12, 5)):
        estrela(d, x, y, r, n)
    return im


def p2():
    im, d = roda((0.26, 0.29, 0.74, 0.71), sem="E", contorno="E")
    for x, y, r, n in ((.18, .40, 16, 6), (.85, .42, 13, 5)):
        estrela(d, x, y, r, n)
    return im


def p3():
    im, d = tela()
    X = lambda x: x * W * S
    Y = lambda y: y * H * S
    # coração
    cx, cy, r = .34, .30, .055
    d.ellipse([X(cx - r), Y(cy - r * .8), X(cx + r * .1), Y(cy + r * .1)], fill=255)
    d.ellipse([X(cx - r * .1), Y(cy - r * .8), X(cx + r), Y(cy + r * .1)], fill=255)
    d.polygon([(X(cx - r * .98), Y(cy - r * .1)), (X(cx + r * .98), Y(cy - r * .1)), (X(cx), Y(cy + r * 1.3))], fill=255)
    # cabeça de perfil sobre placa
    d.rounded_rectangle([X(.55), Y(.22), X(.72), Y(.38)], radius=30, fill=130)
    d.ellipse([X(.585), Y(.245), X(.675), Y(.335)], fill=255)
    d.polygon([(X(.672), Y(.28)), (X(.700), Y(.30)), (X(.672), Y(.31))], fill=255)
    d.rectangle([X(.605), Y(.32), X(.645), Y(.37)], fill=255)
    # par de olhos em placa
    d.rounded_rectangle([X(.27), Y(.47), X(.45), Y(.55)], radius=24, fill=130)
    for ex in (.315, .405):
        d.ellipse([X(ex - .035), Y(.495), X(ex + .035), Y(.525)], fill=255)
        d.ellipse([X(ex - .012), Y(.500), X(ex + .012), Y(.520)], fill=170)
    # estômago
    pts = [(.600, .425), (.610, .455), (.650, .470), (.685, .505), (.680, .545), (.645, .570), (.605, .560), (.585, .530)]
    rs = [.010, .014, .030, .040, .040, .034, .022, .014]
    for (p_, r1), (q_, r2) in zip(zip(pts, rs), zip(pts[1:], rs[1:])):
        cap(d, (X(p_[0]), Y(p_[1])), (X(q_[0]), Y(q_[1])), X(r1), X(r2))
    # figura ajoelhada, mãos abertas e vazias
    ajo = dict(cab=(.30, .07), pes=(.31, .19), qua=(.33, .55), jE=(.42, .90), pE=(.04, .94),
               jD=(.38, .90), pD=(.06, .90), cE=(.58, .26), mE=(.86, .24), cD=(.55, .36), mD=(.84, .38))
    corpo(d, ajo, mapa((.42, .61, .64, .85)), .50 * W * S)
    for x, y, r, n in ((.24, .64, 14, 6), (.76, .26, 12, 5)):
        estrela(d, x, y, r, n)
    return im


def p4():
    im, d = tela()
    cx, cy, r = .5 * W * S, .50 * H * S, .25 * W * S
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=255)
    d.ellipse([cx - r * .9, cy - r * .9, cx + r * .9, cy + r * .9], fill=120)
    # figura encolhida: sentada, abraçando os joelhos, cabeça baixa sobre eles
    Q = lambda x, y: (cx + x * r, cy + y * r)
    cap(d, Q(-.14, -.24), Q(-.40, .06), r * .15, r * .17)    # costas (alto)
    cap(d, Q(-.40, .06), Q(-.30, .40), r * .17, r * .18)     # costas (baixo)
    cap(d, Q(-.30, .40), Q(.28, -.16), r * .17, r * .12)     # coxa
    cap(d, Q(.28, -.16), Q(.30, .44), r * .11, r * .07)      # perna
    cap(d, Q(.30, .44), Q(.44, .48), r * .06, r * .05)       # pé
    h = Q(.04, -.40); rh = r * .17
    d.ellipse([h[0] - rh, h[1] - rh * 1.1, h[0] + rh, h[1] + rh * 1.1], fill=255)  # cabeça
    estrela(d, .84, .88, 14, 6)
    return im


def p5():
    im, d = roda((0.22, 0.25, 0.78, 0.73))
    for x, y, r, n in ((.12, .30, 14, 5), (.88, .24, 18, 6), (.15, .66, 12, 6), (.86, .70, 15, 5)):
        estrela(d, x, y, r, n)
    return im


def p6():
    im, d = tela()
    estrela(d, .18, .20, 16, 6)
    estrela(d, .82, .78, 13, 5)
    return im


def main():
    out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
    for nome, fn in (("p1", p1), ("p2", p2), ("p3", p3), ("p4", p4), ("p5", p5), ("p6", p6)):
        salvar(lata(fn()), out / f"{nome}.png")
        print(nome)


if __name__ == "__main__":
    main()
