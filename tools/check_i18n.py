"""Valida las traducciones de docs/i18n/ contra la base en español.

Comprueba en cada idioma:
  - que existan todas las claves de interfaz de es.json y con los mismos marcadores {x}
  - que cada app del catálogo tenga tagline, description y features (mismo número que en español)
  - que exista "notes" cuando la ficha en español la tiene
  - que estén todas las categorías y todas las etiquetas del catálogo (licencias, instaladores)
Sale con código 1 si falta algo. Uso: python tools/check_i18n.py
"""
import json, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
I18N = ROOT / 'docs' / 'i18n'
LANGS = ['en', 'fr', 'pt', 'zh', 'ru', 'ja', 'ko']
ph = lambda s: sorted(re.findall(r'\{(\w+)\}', s))


def catalog_labels(apps):
    out = set()
    for a in apps:
        out.add(a['license'])
        for k in ('android', 'windows', 'linux'):
            if a.get(k, {}).get('label'):
                out.add(a[k]['label'])
        for k in ('extraApks', 'windowsExtra'):
            out.update(x['label'] for x in a.get(k, []) if x.get('label'))
    out.discard('MIT')
    return out


def main():
    base = json.loads((I18N / 'es.json').read_text(encoding='utf-8'))
    cat = json.loads((ROOT / 'docs' / 'apps.json').read_text(encoding='utf-8'))
    labels = catalog_labels(cat['apps'])
    errors = 0
    for lang in LANGS:
        d = json.loads((I18N / f'{lang}.json').read_text(encoding='utf-8'))
        problems = []
        for k, v in base['ui'].items():
            if k not in d.get('ui', {}):
                problems.append(f'ui.{k} falta')
            elif ph(v) != ph(d['ui'][k]):
                problems.append(f'ui.{k} marcadores {ph(d["ui"][k])} != {ph(v)}')
        problems += [f'ui.{k} sobra' for k in d.get('ui', {}) if k not in base['ui']]
        problems += [f'categoría {k} falta' for k in cat['categories'] if k not in d.get('categories', {})]
        problems += [f'etiqueta «{l}» falta' for l in sorted(labels) if l not in d.get('labels', {})]
        for a in cat['apps']:
            tr = d.get('apps', {}).get(a['id'])
            if not tr:
                problems.append(f'app {a["id"]} falta'); continue
            for f in ('tagline', 'description'):
                if not tr.get(f):
                    problems.append(f'{a["id"]}.{f} falta')
            if len(tr.get('features', [])) != len(a['features']):
                problems.append(f'{a["id"]}.features {len(tr.get("features", []))} != {len(a["features"])}')
            if a.get('notes') and not tr.get('notes'):
                problems.append(f'{a["id"]}.notes falta')
        status = 'OK' if not problems else f'{len(problems)} problemas'
        print(f'{lang}: {status}')
        for p in problems:
            print('   -', p)
        errors += len(problems)
    sys.exit(1 if errors else 0)


if __name__ == '__main__':
    main()
