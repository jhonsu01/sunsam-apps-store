"""Genera la identidad "Noche Sunsam" a partir de la geometría del logo original
(cuatro marcas en cruz giradas ~9° y el triángulo indicador).

Salidas:
  docs/logo.svg                     icono vectorial (web, favicon)
  docs/img/logo-512.png             icono PWA
  docs/img/tv-banner.png            banner 1280x720 (web / referencia)
  android/app/src/main/res/drawable-xhdpi/tv_banner.png   banner Google TV 320x180
  android/app/src/main/res/drawable/ic_launcher_foreground.xml / _background.xml / _monochrome.xml
  brand/sunsam-icon-1024.png, brand/sunsam-tv-banner-1280.png

Uso: python tools/brand.py
"""
import pathlib
from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
RES = ROOT / 'android' / 'app' / 'src' / 'main' / 'res'
BRAND = ROOT / 'brand'

BG = (21, 18, 28)            # #15121c
INK = (244, 241, 247)        # #f4f1f7
ORANGE = (251, 146, 60)
TRI_STOPS = [(0, (253, 186, 116)), (.5, (244, 63, 94)), (1, (139, 92, 246))]
BAR_STOPS = [(0, (251, 146, 60)), (.55, (244, 63, 94)), (1, (124, 58, 237))]

# Geometría medida sobre SunsamLogo.png (213x231), centro de la marca en (106, 90).
TICKS = [((95.5, 3), (99.5, 25)), ((96, 156), (99, 177)), ((4, 89.5), (24.5, 83)), ((187, 77.5), (209, 71))]
TRI = [(69, 56), (170, 70), (84, 124)]
CX, CY, TICK_W = 106, 90, 8


def lerp_stops(stops, t):
    for (t0, c0), (t1, c1) in zip(stops, stops[1:]):
        if t0 <= t <= t1:
            k = (t - t0) / (t1 - t0) if t1 > t0 else 0
            return tuple(round(a + (b - a) * k) for a, b in zip(c0, c1))
    return stops[-1][1]


def diag_gradient(w, h, stops):
    small = Image.new('RGB', (64, 64))
    px = small.load()
    for y in range(64):
        for x in range(64):
            px[x, y] = lerp_stops(stops, (x + y) / 126)
    return small.resize((w, h), Image.BICUBIC)


def draw_mark(img, cx, cy, scale):
    """Dibuja la marca centrada en (cx, cy) de img (RGBA, ya sobremuestreada)."""
    d = ImageDraw.Draw(img)
    tf = lambda p: (cx + (p[0] - CX) * scale, cy + (p[1] - CY) * scale)
    w = TICK_W * scale
    for a, b in TICKS:
        a, b = tf(a), tf(b)
        d.line([a, b], fill=INK, width=round(w))
        for x, y in (a, b):
            d.ellipse((x - w / 2, y - w / 2, x + w / 2, y + w / 2), fill=INK)
    pts = [tf(p) for p in TRI]
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    box = (int(min(xs)), int(min(ys)), int(max(xs)) + 1, int(max(ys)) + 1)
    grad = diag_gradient(box[2] - box[0], box[3] - box[1], TRI_STOPS)
    mask = Image.new('L', img.size, 0)
    ImageDraw.Draw(mask).polygon(pts, fill=255)
    layer = Image.new('RGBA', img.size, (0, 0, 0, 0))
    layer.paste(grad, box[:2])
    img.paste(layer, (0, 0), mask)


def icon_png(size, radius_ratio=0.22, scale_ratio=0.0034):
    S = size * 4
    img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(img).rounded_rectangle((0, 0, S - 1, S - 1), radius=S * radius_ratio, fill=BG)
    draw_mark(img, S / 2, S / 2, S * scale_ratio)
    return img.resize((size, size), Image.LANCZOS)


def banner_png(w, h):
    S = 4
    img = Image.new('RGBA', (w * S, h * S), BG + (255,))
    bar = diag_gradient(w * S, round(h * S * 0.045), BAR_STOPS)
    img.paste(bar, (0, h * S - bar.height))
    draw_mark(img, w * S * 0.205, h * S * 0.48, h * S * 0.00265)
    d = ImageDraw.Draw(img)
    title = ImageFont.truetype(r'C:\Windows\Fonts\GOTHIC.TTF', round(h * S * 0.215))
    sub = ImageFont.truetype(r'C:\Windows\Fonts\GOTHIC.TTF', round(h * S * 0.095))
    x = w * S * 0.405
    d.text((x, h * S * 0.30), 'SUNSAM', font=title, fill=INK)
    # APPS con espaciado amplio, letra a letra
    cx = x + h * S * 0.012
    for ch in 'APPS':
        d.text((cx, h * S * 0.585), ch, font=sub, fill=ORANGE)
        cx += d.textlength(ch, font=sub) + h * S * 0.035
    return img.resize((w, h), Image.LANCZOS).convert('RGB')


def logo_svg():
    ticks = ''.join(f'M{a[0]} {a[1]} {b[0]} {b[1]}' for a, b in TICKS)
    tri = ' '.join(f'{x},{y}' for x, y in TRI)
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108">
  <defs>
    <linearGradient id="t" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fdba74"/><stop offset=".5" stop-color="#f43f5e"/><stop offset="1" stop-color="#8b5cf6"/>
    </linearGradient>
  </defs>
  <rect width="108" height="108" rx="24" fill="#15121c"/>
  <g transform="translate(54 54) scale(.36) translate(-{CX} -{CY})">
    <path d="{ticks}" fill="none" stroke="#f4f1f7" stroke-width="{TICK_W}" stroke-linecap="round"/>
    <polygon points="{tri}" fill="url(#t)"/>
  </g>
</svg>
'''


def vector_foreground(monochrome=False):
    """Primer plano del icono adaptativo. Escala 0.30: la marca cabe en la zona segura de 66dp."""
    ticks = ''.join(f'M{a[0]},{a[1]}L{b[0]},{b[1]}' for a, b in TICKS)
    tri = 'M' + 'L'.join(f'{x},{y}' for x, y in TRI) + 'Z'
    ink = '#FFFFFFFF' if monochrome else '#FFF4F1F7'
    if monochrome:
        fill = f'<path android:fillColor="#FFFFFFFF" android:pathData="{tri}" />'
    else:
        fill = f'''<path android:pathData="{tri}">
            <aapt:attr name="android:fillColor">
                <gradient android:type="linear" android:startX="69" android:startY="56" android:endX="170" android:endY="124">
                    <item android:offset="0" android:color="#FFFDBA74" />
                    <item android:offset="0.5" android:color="#FFF43F5E" />
                    <item android:offset="1" android:color="#FF8B5CF6" />
                </gradient>
            </aapt:attr>
        </path>'''
    return f'''<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:aapt="http://schemas.android.com/aapt"
    android:width="108dp" android:height="108dp" android:viewportWidth="108" android:viewportHeight="108">
    <group android:translateX="{54 - CX * 0.30:.2f}" android:translateY="{54 - CY * 0.30:.2f}" android:scaleX="0.30" android:scaleY="0.30">
        <path android:strokeColor="{ink}" android:strokeWidth="{TICK_W}" android:strokeLineCap="round" android:pathData="{ticks}" />
        {fill}
    </group>
</vector>
'''


BACKGROUND = '''<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp" android:height="108dp" android:viewportWidth="108" android:viewportHeight="108">
    <path android:fillColor="#FF15121C" android:pathData="M0,0h108v108h-108z" />
</vector>
'''


def main():
    BRAND.mkdir(exist_ok=True)
    (ROOT / 'docs' / 'logo.svg').write_text(logo_svg(), encoding='utf-8')
    icon_png(512).save(ROOT / 'docs' / 'img' / 'logo-512.png')
    icon_png(1024).save(BRAND / 'sunsam-icon-1024.png')
    banner_png(1280, 720).save(BRAND / 'sunsam-tv-banner-1280.png')
    banner_png(1280, 720).save(ROOT / 'docs' / 'img' / 'tv-banner.png')
    (RES / 'drawable-xhdpi').mkdir(exist_ok=True)
    banner_png(320, 180).save(RES / 'drawable-xhdpi' / 'tv_banner.png')
    (RES / 'drawable' / 'ic_launcher_foreground.xml').write_text(vector_foreground(), encoding='utf-8')
    (RES / 'drawable' / 'ic_launcher_monochrome.xml').write_text(vector_foreground(True), encoding='utf-8')
    (RES / 'drawable' / 'ic_launcher_background.xml').write_text(BACKGROUND, encoding='utf-8')
    print('ok')


if __name__ == '__main__':
    main()
