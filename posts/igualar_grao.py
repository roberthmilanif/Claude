"""Iguala o grão do fundo vermelho entre páginas.

Uso:
    python3 igualar_grao.py --ref REF1.png REF2.png ... --alvo ALVO1.png ... --saida PASTA

Mede o grão (ruído fino) só no fundo, longe do metal e do texto, nas páginas de
referência, e acrescenta ruído do mesmo tamanho de grão às páginas-alvo que
tiverem menos. Não mexe no metal nem no texto. Páginas com grão igual ou maior
ficam como estão.
"""
import argparse
import sys
from pathlib import Path

import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from realcar_metal import mascaras  # noqa: E402


def medir(rgb):
    mm, mt = mascaras(rgb)
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15))
    livre = cv2.dilate(((mm > 0.01) | (mt > 0.01)).astype(np.uint8), k) == 0
    f = rgb.astype(np.float32)
    d = f - cv2.GaussianBlur(f, (0, 0), 6)
    par = livre[:, :-1] & livre[:, 1:]
    corr = np.corrcoef(d[:, :-1, 1][par], d[:, 1:, 1][par])[0, 1]
    return d[livre].std(axis=0), corr, mm, mt


def ruido_com_correlacao(forma, corr, semente):
    rng = np.random.default_rng(semente)
    base = rng.standard_normal(forma).astype(np.float32)
    melhor = None
    for sig in (0.0, 0.4, 0.5, 0.6, 0.7, 0.8, 1.0):
        n = cv2.GaussianBlur(base, (0, 0), sig) if sig > 0 else base
        c = np.corrcoef(n[:, :-1].ravel(), n[:, 1:].ravel())[0, 1]
        if melhor is None or abs(c - corr) < abs(melhor[0] - corr):
            melhor = (c, n / n.std())
    return melhor[1]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ref", nargs="+", type=Path, required=True)
    ap.add_argument("--alvo", nargs="+", type=Path, required=True)
    ap.add_argument("--saida", type=Path, required=True)
    a = ap.parse_args()
    a.saida.mkdir(parents=True, exist_ok=True)
    refs = [medir(cv2.cvtColor(cv2.imread(str(p)), cv2.COLOR_BGR2RGB))[:2] for p in a.ref]
    alvo_std = np.mean([r[0] for r in refs], axis=0)
    alvo_corr = float(np.mean([r[1] for r in refs]))
    print(f"referência: grão {alvo_std.round(2)} correlação {alvo_corr:.2f}")
    for i, p in enumerate(a.alvo):
        rgb = cv2.cvtColor(cv2.imread(str(p)), cv2.COLOR_BGR2RGB)
        std, corr, mm, mt = medir(rgb)
        falta = np.sqrt(np.clip(alvo_std ** 2 - std ** 2, 0, None))
        n = ruido_com_correlacao(rgb.shape[:2], alvo_corr, 39702 + i)
        k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        peca = cv2.dilate(((mm > 0.01) | (mt > 0.01)).astype(np.uint8), k)
        m = cv2.GaussianBlur((1 - peca).astype(np.float32), (0, 0), 1.2)[..., None]
        out = np.clip(rgb.astype(np.float32) + n[..., None] * falta[None, None, :] * m + 0.5, 0, 255).astype(np.uint8)
        depois = medir(out)[0]
        cv2.imwrite(str(a.saida / p.name), cv2.cvtColor(out, cv2.COLOR_RGB2BGR), [cv2.IMWRITE_PNG_COMPRESSION, 6])
        print(f"{p.name}: grão {std.round(2)} -> {depois.round(2)}")


if __name__ == "__main__":
    main()
