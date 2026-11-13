"""Regenera la tabla «Catálogo» del README a partir de docs/apps.json.

Escribe entre los marcadores <!-- catalogo:inicio --> y <!-- catalogo:fin -->.
Uso: python tools/readme_catalog.py   (ejecutar después de build_catalog.py)
"""
import json, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent.parent
README = ROOT / 'README.md'
START, END = '<!-- catalogo:inicio -->', '<!-- catalogo:fin -->'
SITE = 'https://jhonsu01.github.io/sunsam-apps-store/#/app/'


def platforms(a):
    p = ['Android']
    if a.get('windows') or a.get('msStoreUrl'):
        p.append('Windows')
    if a.get('linux'):
        p.append('Linux')
    return ' · '.join(p)


def versions(a):
    if a.get('playOnly'):
        return '—'
    v = [a['android']['versionName']]
    if a.get('windows') and a['windows'].get('version') not in v:
        v.append(f"{a['windows']['version']} (Windows)")
    return ' · '.join(v)


def download(a):
    if a.get('playOnly'):
        stores = ['[Google Play](%s)' % a['playUrl']]
        if a.get('msStoreUrl') and not a.get('windows'):
            stores.append('[Microsoft Store](%s)' % a['msStoreUrl'])
        return 'Solo tiendas: ' + ' · '.join(stores)
    kinds = ['APK']
    if a.get('windows'):
        kinds.append('Windows')
    if a.get('linux'):
        kinds.append('Linux')
    return 'Directa (' + ' · '.join(kinds) + ')'


def status(a):
    s = []
    if a.get('playUrl') and not a.get('playOnly'):
        s.append('[Google Play](%s)' % a['playUrl'])
    if a.get('msStoreUrl') and not (a.get('playOnly') and not a.get('windows')):
        s.append('[Microsoft Store](%s)' % a['msStoreUrl'])
    s.append('[código abierto](%s)' % a['repo'] if a.get('repo') else 'código privado')
    return ' · '.join(s)


def table(catalog):
    rows = ['| App | Versión | Plataformas | Descarga | Tiendas y código |', '| --- | --- | --- | --- | --- |']
    for a in catalog['apps']:
        rows.append(f"| [{a['name']}]({SITE}{a['id']}) | {versions(a)} | {platforms(a)} | {download(a)} | {status(a)} |")
    return '\n'.join(rows)


def main():
    catalog = json.loads((ROOT / 'docs' / 'apps.json').read_text(encoding='utf-8'))
    s = README.read_text(encoding='utf-8')
    block = f"{START}\n_Generado desde `docs/apps.json` el {catalog['generated']} con `tools/readme_catalog.py`._\n\n{table(catalog)}\n{END}"
    if START in s:
        s = re.sub(re.escape(START) + r'.*?' + re.escape(END), lambda _: block, s, flags=re.S)
    else:
        # primera vez: sustituye la tabla escrita a mano bajo «## Catálogo»
        s = re.sub(r'(## Catálogo\n\n)\| App .*?\n(?=\n## )', lambda m: m.group(1) + block + '\n', s, flags=re.S)
    README.write_text(s, encoding='utf-8')
    print(f"README: {len(catalog['apps'])} apps")


if __name__ == '__main__':
    main()
