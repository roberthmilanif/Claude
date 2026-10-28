"""Realça o metal (figuras, estrelas, pontinhos) das páginas finais.

Uso:
    python3 realcar_metal.py ENTRADA SAIDA [--forca 1.0] [--mascaras]

ENTRADA: pasta com as páginas finais (qualquer .png).
SAIDA:   pasta para as páginas realçadas (mesmos nomes).
--forca: multiplica a intensidade de todos os ajustes (0.5 = suave, 1.0 = padrão).
--mascaras: grava também a máscara de metal e de texto, para conferência.

O que faz, só dentro do metal:
- nitidez fina (covinhas, contornos) e nitidez média (relevo);
- curva de brilho: realces mais claros, meios-tons com mais contraste;
- prata mais fria e neutra (tira o reflexo morno do vermelho).
No texto: só um leve aumento de definição das bordas.
O vermelho de fundo, o grão e as sombras ficam intactos.
"""
import argparse
from pathlib import Path

import cv2
import numpy as np


def mascaras(rgb):
    """devolve (metal, texto) como float 0..1 do tamanho da imagem."""
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
    s = hsv[..., 1].astype(np.float32) / 255
    v = hsv[..., 2].astype(np.float32)
    cinza = ((s < 0.30) & (v > 60)).astype(np.uint8)
    n, rot, stats, _ = cv2.connectedComponentsWithStats(cinza, connectivity=8)
    metal = np.zeros(cinza.shape, np.uint8)
    texto = np.zeros(cinza.shape, np.uint8)
    for i in range(1, n):
        area = stats[i, cv2.CC_STAT_AREA]
        if area < 6:
            continue
        sel = rot == i
        vv = v[sel]
        branco = (vv > 235).mean()
        # letras: brancas e chapadas; metal: tons de cinza variados
        if vv.mean() > 222 and branco > 0.45 and area < 4000:
            texto[sel] = 1
        else:
            metal[sel] = 1
    # preenche os vincos escuros e reflexos dentro de cada peça, mas deixa de fora
    # o vermelho que aparece por furos e vãos (saturado como o fundo)
    contornos, _ = cv2.findContours(metal, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    cheio = np.zeros_like(metal)
    cv2.drawContours(cheio, contornos, -1, 1, thickness=cv2.FILLED)
    vermelho = s > 0.55
    metal = (cheio.astype(bool) & ~vermelho & ~texto.astype(bool)).astype(np.uint8)
    # inclui a borda do metal (mistura com o vermelho) e suaviza a transição
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    metal = cv2.dilate(metal, k, iterations=1)
    texto_d = cv2.dilate(texto, k, iterations=1)
    metal_f = cv2.GaussianBlur(metal.astype(np.float32), (0, 0), 0.8)
    texto_f = cv2.GaussianBlur(texto_d.astype(np.float32), (0, 0), 0.6)
    metal_f *= (1 - texto_f)  # nunca realçar letra como metal
    return np.clip(metal_f, 0, 1), np.clip(texto_f, 0, 1)


def realcar_metal(rgb, forca=1.0):
    lab = cv2.cvtColor(rgb.astype(np.float32) / 255, cv2.COLOR_RGB2LAB)
    L, a, b = cv2.split(lab)  # L 0..100
    # nitidez média (relevo / "clareza") e fina (covinhas, bordas)
    L = L + 0.45 * forca * (L - cv2.GaussianBlur(L, (0, 0), 6))
    L = L + 0.90 * forca * (L - cv2.GaussianBlur(L, (0, 0), 1.0))
    # curva de brilho: contraste nos meios-tons e realces mais abertos
    x = np.clip(L / 100, 0, 1)
    s_curve = x + 0.18 * forca * (x - 0.5) * (1 - np.abs(2 * x - 1))  # contraste suave
    realce = np.clip((x - 0.62) / 0.38, 0, 1)
    x2 = s_curve + 0.08 * forca * realce ** 1.5  # abre os brilhos
    # ombro suave: o brilho sobe sem estourar (mantém textura nos reflexos)
    k = 0.88
    acima = x2 > k
    x2[acima] = k + (1 - k) * np.tanh((x2[acima] - k) / (1 - k))
    L = np.clip(x2, 0, 1) * 100
    # prata fria e neutra
    a = a * (1 - 0.55 * min(forca, 1.0)) - 0.4 * forca
    b = b * (1 - 0.55 * min(forca, 1.0)) - 2.2 * forca
    out = cv2.cvtColor(cv2.merge([L, a, b]), cv2.COLOR_LAB2RGB)
    return np.clip(out * 255, 0, 255)


def realcar_texto(rgb, forca=1.0):
    f = rgb.astype(np.float32)
    borr = cv2.GaussianBlur(f, (0, 0), 0.7)
    return np.clip(f + 0.55 * forca * (f - borr), 0, 255)


def processar(caminho, saida, forca, salvar_mascaras):
    bgr = cv2.imread(str(caminho), cv2.IMREAD_COLOR)
    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
    m_metal, m_texto = mascaras(rgb)
    met = realcar_metal(rgb, forca)
    txt = realcar_texto(rgb, forca)
    base = rgb.astype(np.float32)
    out = base * (1 - m_metal[..., None]) + met * m_metal[..., None]
    out = out * (1 - m_texto[..., None]) + txt * m_texto[..., None]
    out = np.clip(out + 0.5, 0, 255).astype(np.uint8)
    cv2.imwrite(str(saida / caminho.name), cv2.cvtColor(out, cv2.COLOR_RGB2BGR), [cv2.IMWRITE_PNG_COMPRESSION, 6])
    if salvar_mascaras:
        vis = np.zeros_like(rgb)
        vis[..., 1] = (m_metal * 255).astype(np.uint8)
        vis[..., 0] = (m_texto * 255).astype(np.uint8)
        cv2.imwrite(str(saida / f"_mascara_{caminho.stem}.png"), cv2.cvtColor(vis, cv2.COLOR_RGB2BGR))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("entrada", type=Path)
    ap.add_argument("saida", type=Path)
    ap.add_argument("--forca", type=float, default=1.0)
    ap.add_argument("--mascaras", action="store_true")
    a = ap.parse_args()
    a.saida.mkdir(parents=True, exist_ok=True)
    for p in sorted(a.entrada.glob("*.png")):
        if p.name.startswith("_") or p.name.startswith("folha"):
            continue
        processar(p, a.saida, a.forca, a.mascaras)
        print("ok", p.name)


if __name__ == "__main__":
    main()
