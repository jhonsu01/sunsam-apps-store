<div align="center">

<img src="docs/logo.svg" width="96" alt="Sunsam Apps Store">

# Sunsam Apps Store

**Tienda de apps propia y descentralizada de Jhon Supelano (jhonsu01).**
Descarga directa de APK e instaladores de Windows, verificados con SHA-256, sin depender de Google Play.

**🌐 [jhonsu01.github.io/sunsam-apps-store](https://jhonsu01.github.io/sunsam-apps-store/)** ·
**📱 [Descargar la app de la tienda (APK)](https://github.com/jhonsu01/sunsam-apps-store/releases/latest)**

</div>

---

## Cómo funciona

| Pieza | Qué es |
| --- | --- |
| `docs/` | La tienda web estática, publicada en GitHub Pages. |
| `docs/apps.json` | El catálogo abierto: fichas, versiones, tamaños, **SHA-256** de cada APK y huella de su certificado de firma. |
| `android/` | La app Android de la tienda: muestra la tienda web y añade instalar, actualizar y abrir apps con un toque. |
| [Releases](https://github.com/jhonsu01/sunsam-apps-store/releases) | Binarios de las apps con **código privado** (solo el instalador, nunca el código) y el APK de la tienda. |

Las apps de código abierto se descargan directamente desde el release de su propio repositorio.

### Seguridad

- La app Android descarga el APK, **calcula su SHA-256 y lo compara con el catálogo** antes de entregarlo al instalador del sistema (`PackageInstaller`). Si no coincide, lo borra.
- Cada ficha muestra la huella del certificado con el que está firmada la app.
- Sin conexión, la app usa una copia del catálogo empaquetada dentro del APK.

Certificado de la app de la tienda (SHA-256):
`bc79fc700a87c565f5e54b6c4045527dda46ddd919232027a7d43376c4f0d92e`

## Catálogo

| App | Plataformas | Estado |
| --- | --- | --- |
| OpenCallShield | Android | Google Play · código abierto |
| SafeVault | Android | En revisión en Google Play |
| IDPersonalSecure | Android · Windows | Código abierto |
| Docu Scaner 150% | Android · Windows | Google Play |
| PrintOrganize | Android · Windows | Google Play · Microsoft Store |
| Compartir Archivos RED | Android · Windows · Linux | Código abierto |
| OpenWirelessDisplay | Android · Windows | Código abierto |
| PayBio | Android | Código abierto |
| Turnos Dispensario | Android · Windows | Código abierto |
| Reciclaje Turnero | Android · Windows | Código abierto |
| Klanly | Android · Windows | Código abierto |
| Cuentero Infinito | Android · Windows | Google Play |
| OnionHost | Android · Windows | Microsoft Store · en revisión en Google Play |

## Añadir o actualizar una app

1. Edita `catalog/source.json` (ficha, capturas y archivos).
2. Pon las imágenes en `docs/img/<id>/` (`icon.png`, `cover.webp`, `s1.webp`…).
3. Si el código es privado, sube el binario a un release de este repo con la etiqueta indicada en `tag`.
4. Regenera el catálogo con los APK en una carpeta local:

```bash
python tools/build_catalog.py --apks <carpeta_apks> --win <carpeta_instaladores>
```

## Compilar la app de la tienda

Requiere JDK 17 y Android SDK. La firma de release se lee de `android/keystore.properties`, que **no** está en el repo.

```bash
cd android
./gradlew assembleRelease
```

---

Hecho por [Jhon Supelano](https://github.com/jhonsu01). El código de la tienda es MIT; cada app conserva su propia licencia.
