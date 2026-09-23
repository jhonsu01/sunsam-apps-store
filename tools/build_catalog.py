"""Genera docs/apps.json a partir de catalog/source.json.

Para cada APK calcula tamaño, SHA-256, huella del certificado de firma, paquete,
versión y minSdk leyendo el archivo local. Los binarios con "tag" se sirven desde
los releases de este repo; los que traen "url" apuntan al release público original.

Uso:
    python tools/build_catalog.py --apks <carpeta_apks> [--win <carpeta_instaladores>]
Requiere aapt2 y apksigner (Android build-tools) en PATH o en ANDROID_HOME.
"""
import argparse, hashlib, json, os, pathlib, re, shutil, subprocess, sys
from datetime import date

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / 'catalog' / 'source.json'
OUT = ROOT / 'docs' / 'apps.json'


def tool(name):
    found = shutil.which(name) or shutil.which(name + '.bat') or shutil.which(name + '.exe')
    if found:
        return found
    bt = pathlib.Path(os.environ.get('ANDROID_HOME', r'E:\Dev\Android\Sdk')) / 'build-tools'
    for v in sorted(bt.iterdir(), reverse=True):
        for ext in ('.exe', '.bat', ''):
            if (v / (name + ext)).exists():
                return str(v / (name + ext))
    sys.exit(f'No encuentro {name}')


AAPT2, APKSIGNER = tool('aapt2'), tool('apksigner')


def sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def apk_info(path):
    badging = subprocess.run([AAPT2, 'dump', 'badging', str(path)], capture_output=True, text=True, encoding='utf-8', errors='replace').stdout
    pkg = re.search(r"package: name='([^']+)' versionCode='(\d+)' versionName='([^']+)'", badging)
    sdk = re.search(r"minSdkVersion:'(\d+)'", badging)
    certs = subprocess.run([APKSIGNER, 'verify', '--print-certs', str(path)], capture_output=True, text=True, shell=APKSIGNER.endswith('.bat')).stdout
    cert = re.search(r'Signer #1 certificate SHA-256 digest: ([0-9a-f]+)', certs)
    return {
        'package': pkg.group(1), 'versionCode': int(pkg.group(2)), 'versionName': pkg.group(3),
        'minSdk': int(sdk.group(1)) if sdk else None,
        'size': path.stat().st_size, 'sha256': sha256(path),
        'certSha256': cert.group(1) if cert else None,
    }


def resolve_apk(entry, apks, base):
    path = apks / entry['file']
    if not path.exists():
        sys.exit(f'Falta el APK local {path}')
    out = {k: v for k, v in entry.items() if k not in ('tag',)}
    out.update(apk_info(path))
    out['url'] = entry.get('url') or f"{base}/{entry['tag']}/{entry['file']}"
    return out


def resolve_file(entry, win, base):
    out = {k: v for k, v in entry.items() if k not in ('tag',)}
    if 'tag' in entry:
        out['url'] = f"{base}/{entry['tag']}/{entry['file']}"
        path = win / entry['file'] if win else None
        if path and path.exists():
            out['size'] = path.stat().st_size
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--apks', required=True, type=pathlib.Path)
    ap.add_argument('--win', type=pathlib.Path)
    args = ap.parse_args()

    src = json.loads(SRC.read_text(encoding='utf-8'))
    base = src['store']['binaries']
    apps = []
    for app in src['apps']:
        a = dict(app)
        a['android'] = resolve_apk(app['android'], args.apks, base)
        if 'extraApks' in app:
            a['extraApks'] = [resolve_apk(e, args.apks, base) for e in app['extraApks']]
        for key in ('windows', 'linux'):
            if key in app:
                a[key] = resolve_file(app[key], args.win, base)
        if 'windowsExtra' in app:
            a['windowsExtra'] = [resolve_file(e, args.win, base) for e in app['windowsExtra']]
        a['openSource'] = 'repo' in app
        apps.append(a)
        print(f"  {a['id']:<22} {a['android']['package']:<32} {a['android']['versionName']}")

    catalog = {
        'schema': 1,
        'generated': date.today().isoformat(),
        'store': src['store'],
        'categories': src['categories'],
        'apps': apps,
    }
    store_apk = ROOT / 'store-release.json'
    if store_apk.exists():
        catalog['store']['client'] = json.loads(store_apk.read_text(encoding='utf-8'))
    OUT.write_text(json.dumps(catalog, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'OK -> {OUT} ({len(apps)} apps)')


if __name__ == '__main__':
    main()
