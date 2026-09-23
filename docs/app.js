/* Sunsam Apps Store — SPA estática. Lee apps.json y, si corre dentro de la app
   Android de la tienda, usa el puente window.SunsamNative para instalar, actualizar
   y abrir apps (la app verifica el SHA-256 antes de instalar). */
(() => {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const view = $('#view');
  const native = window.SunsamNative || null;
  const state = { catalog: null, category: 'all', query: '', progress: {} };

  const ICON = {
    android: '<svg viewBox="0 0 24 24"><path d="M17.6 9.48 19.44 6.3a.38.38 0 0 0-.66-.38l-1.87 3.23a11.4 11.4 0 0 0-9.82 0L5.22 5.92a.38.38 0 0 0-.66.38L6.4 9.48A10.8 10.8 0 0 0 1 18h22a10.8 10.8 0 0 0-5.4-8.52ZM7 15.25a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5Zm10 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5Z"/></svg>',
    windows: '<svg viewBox="0 0 24 24"><path d="M3 5.1 10.4 4v7.1H3V5.1Zm8.4-1.2L21 2.5v8.6h-9.6V3.9ZM3 12.1h7.4v7.1L3 18.1v-6Zm8.4 0H21v9.4l-9.6-1.4v-8Z"/></svg>',
    linux: '<svg viewBox="0 0 24 24"><path d="M12 2c-2.2 0-3.6 1.9-3.6 4.6 0 1.4.3 2.3-.9 4C6 12.6 4.5 14.8 5 17c.2 1 1 1.5 1.8 1.6-.3.9.1 2 1.3 2.4 1.3.4 2.6-.2 3.9-.2s2.6.6 3.9.2c1.2-.4 1.6-1.5 1.3-2.4.8-.1 1.6-.6 1.8-1.6.5-2.2-1-4.4-2.5-6.4-1.2-1.7-.9-2.6-.9-4C15.6 3.9 14.2 2 12 2Z"/></svg>',
    play: '<svg viewBox="0 0 24 24"><path d="M4 2.8v18.4c0 .5.5.8 1 .6l10.3-9.2L5 2.2c-.5-.2-1 .1-1 .6Zm12.8 7.8-2.2 2 2.2 2 3-1.7c.8-.4.8-1.5 0-1.9l-3-1.6ZM6.6 1.6l9.1 8.2 1.1-1L7.6 1.3c-.4-.2-.8 0-1 .3Zm0 20.8c.2.3.6.5 1 .3l9.2-7.5-1.1-1-9.1 8.2Z"/></svg>',
    ms: '<svg viewBox="0 0 24 24"><path d="M3 3h8.5v8.5H3V3Zm9.5 0H21v8.5h-8.5V3ZM3 12.5h8.5V21H3v-8.5Zm9.5 0H21V21h-8.5v-8.5Z"/></svg>',
    code: '<svg viewBox="0 0 24 24"><path d="m8.7 16.6-4.6-4.6 4.6-4.6L7.3 6 1.3 12l6 6 1.4-1.4Zm6.6 0 4.6-4.6-4.6-4.6L16.7 6l6 6-6 6-1.4-1.4Z"/></svg>',
    web: '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm6.9 6h-2.9a15.6 15.6 0 0 0-1.4-3.6A8 8 0 0 1 18.9 8ZM12 4c.8 1.2 1.5 2.5 1.9 4h-3.8c.4-1.5 1.1-2.8 1.9-4ZM4.3 14a8.2 8.2 0 0 1 0-4h3.4a16.5 16.5 0 0 0 0 4H4.3Zm.8 2h2.9c.3 1.3.8 2.5 1.4 3.6A8 8 0 0 1 5.1 16ZM8 8H5.1a8 8 0 0 1 4.3-3.6C8.8 5.5 8.3 6.7 8 8Zm4 12c-.8-1.2-1.5-2.5-1.9-4h3.8c-.4 1.5-1.1 2.8-1.9 4Zm2.3-6H9.7a14.7 14.7 0 0 1 0-4h4.6a14.7 14.7 0 0 1 0 4Zm.3 5.6c.6-1.1 1.1-2.3 1.4-3.6h2.9a8 8 0 0 1-4.3 3.6Zm1.7-5.6a16.5 16.5 0 0 0 0-4h3.4a8.2 8.2 0 0 1 0 4h-3.4Z"/></svg>'
  };

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const mb = (b) => (b ? (b >= 1e9 ? (b / 1e9).toFixed(1) + ' GB' : (b / 1e6).toFixed(b < 1e7 ? 1 : 0) + ' MB') : '');
  const fmtDate = (d) => new Date(d + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
  const img = (app, f) => `img/${app.id}/${f}`;
  const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toast.t); toast.t = setTimeout(() => (t.hidden = true), 3200);
  }

  /* ---------- estado de instalación (solo dentro de la app Android) ---------- */
  function installed(pkg) {
    if (!native) return -1;
    try { return Number(native.getInstalledVersion(pkg)); } catch { return -1; }
  }
  function androidAction(apk) {
    const v = installed(apk.package);
    if (v < 0) return { kind: 'install', label: 'Instalar' };
    if (v < apk.versionCode) return { kind: 'update', label: 'Actualizar' };
    return { kind: 'open', label: 'Abrir' };
  }

  function statusTags(app) {
    const t = [];
    if (app.status === 'play') t.push('<span class="tag ok">En Google Play</span>');
    if (app.status === 'review') t.push('<span class="tag warn">En revisión en Play</span>');
    if (app.msStoreUrl) t.push('<span class="tag info">Microsoft Store</span>');
    if (app.openSource) t.push('<span class="tag">Código abierto</span>');
    return t.join('');
  }
  function platforms(app) {
    const p = ['Android'];
    if (app.windows) p.push('Windows');
    if (app.linux) p.push('Linux');
    return p;
  }

  /* ---------- carga ---------- */
  async function load() {
    try {
      const r = await fetch('apps.json', { cache: 'no-cache' });
      if (!r.ok) throw new Error(r.status);
      state.catalog = await r.json();
    } catch (e) {
      view.innerHTML = '<div class="empty">No se pudo cargar el catálogo. Revisa tu conexión y vuelve a intentarlo.</div>';
      return;
    }
    route();
  }

  /* ---------- vistas ---------- */
  function renderHome() {
    const { apps, categories } = state.catalog;
    const q = norm(state.query);
    const list = apps.filter((a) =>
      (state.category === 'all' || a.category === state.category) &&
      (!q || norm([a.name, a.tagline, a.description, (a.features || []).join(' ')].join(' ')).includes(q)));

    const heroIcons = apps.slice(0, 8).map((a) => `<img src="${img(a, 'icon.png')}" alt="" loading="lazy">`).join('');
    const chips = [['all', 'Todas'], ...Object.entries(categories)]
      .map(([k, v]) => `<button class="chip" data-cat="${k}" aria-pressed="${state.category === k}">${esc(v)}</button>`).join('');

    view.innerHTML = `
      ${storeUpdateBanner()}
      ${q ? '' : `<section class="hero">
        <div>
          <h1>Apps privadas, sin anuncios y sin intermediarios</h1>
          <p>Descarga directa de APK e instaladores de Windows desde los releases originales. Cada archivo se publica con su huella SHA-256 para que compruebes que es auténtico.</p>
          <div class="pills"><span class="pill">${apps.length} apps</span><span class="pill">Android · Windows · Linux</span><span class="pill">Verificado con SHA-256</span></div>
        </div>
        <div class="hero-icons" aria-hidden="true">${heroIcons}</div>
      </section>`}
      <div class="chips" role="toolbar" aria-label="Categorías">${chips}</div>
      <div class="section-title"><h2>${q ? `Resultados para “${esc(state.query)}”` : state.category === 'all' ? 'Todas las apps' : esc(categories[state.category])}</h2><span class="muted">${list.length} ${list.length === 1 ? 'app' : 'apps'}</span></div>
      ${list.length ? `<div class="grid">${list.map(card).join('')}</div>` : '<div class="empty">No hay apps que coincidan con la búsqueda.</div>'}`;

    view.querySelectorAll('.chip').forEach((b) => b.addEventListener('click', () => { state.category = b.dataset.cat; renderHome(); }));
    const up = view.querySelector('#store-update');
    if (up) up.addEventListener('click', () => {
      const c = state.catalog.store.client;
      up.disabled = true; up.textContent = 'Descargando…';
      native.install(c.url, c.sha256, c.package, 'Sunsam Apps Store');
    });
  }

  /** Dentro de la app Android: avisa si hay una versión más nueva de la propia tienda. */
  function storeUpdateBanner() {
    const c = state.catalog.store.client;
    if (!native || !c || !native.appVersionCode || native.appVersionCode() >= c.versionCode) return '';
    return `<div class="note" style="display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap">
      <span>Hay una nueva versión de la tienda: <b>${esc(c.versionName)}</b></span>
      <button class="btn primary" id="store-update">Actualizar tienda</button></div><div id="dl-progress"></div>`;
  }

  function card(a) {
    const cover = a.cover
      ? `<img src="${img(a, a.cover)}" alt="" loading="lazy">`
      : `<div class="cover-fallback" style="background:${fallbackBg(a.id)}"><img src="${img(a, 'icon.png')}" alt="" loading="lazy"></div>`;
    return `<a class="card" href="#/app/${a.id}">
      <div class="cover">${cover}</div>
      <div class="body">
        <img class="icon" src="${img(a, 'icon.png')}" alt="" loading="lazy">
        <div><h3>${esc(a.name)}</h3><p>${esc(a.tagline)}</p>
          <div class="tags">${statusTags(a)}<span class="tag">${platforms(a).join(' · ')}</span></div></div>
      </div></a>`;
  }
  function fallbackBg(id) {
    const palettes = { cuentero: '#1f1633,#3b2a5c', docuscaner: '#27211d,#c2410c', printorganize: '#4338ca,#7c3aed' };
    const [c1, c2] = (palettes[id] || '#f97316,#e11d48').split(',');
    return `linear-gradient(135deg, ${c1}, ${c2})`;
  }

  function renderApp(id) {
    const a = state.catalog.apps.find((x) => x.id === id);
    if (!a) { view.innerHTML = '<div class="empty">Esta app no existe en el catálogo. <a href="#/">Volver a la tienda</a></div>'; return; }
    document.title = `${a.name} · Sunsam Apps Store`;
    const cat = state.catalog.categories[a.category];
    const apk = a.android;

    view.innerHTML = `
      <a class="back" href="#/">← Todas las apps</a>
      <section class="detail-head">
        <img class="icon" src="${img(a, 'icon.png')}" alt="Icono de ${esc(a.name)}">
        <div>
          <h1>${esc(a.name)}</h1>
          <p class="tagline">${esc(a.tagline)}</p>
          <div class="tags">${statusTags(a)}<span class="tag">${esc(cat)}</span></div>
        </div>
      </section>

      <div class="meta">
        <div><b>${esc(apk.versionName)}</b><span>Versión Android</span></div>
        <div><b>${mb(apk.size)}</b><span>Tamaño del APK</span></div>
        <div><b>Android ${esc(apk.minAndroid)}+</b><span>Requisito</span></div>
        <div><b>${fmtDate(a.updated)}</b><span>Actualizada</span></div>
        <div><b>${esc(a.license)}</b><span>Licencia</span></div>
      </div>

      <div class="actions" id="actions">${actionButtons(a)}</div>
      <div id="dl-progress"></div>
      ${a.notes ? `<div class="note">${esc(a.notes)}</div>` : ''}

      <h2 class="sr-title" style="font-size:20px;margin:26px 0 10px">Capturas</h2>
      <div class="shots">${a.screenshots.map((s, i) => `<img src="${img(a, s)}" alt="Captura ${i + 1} de ${esc(a.name)}" loading="lazy" data-i="${i}">`).join('')}</div>
      ${a.desktopScreenshots ? `<div class="shots desktop">${a.desktopScreenshots.map((s, i) => `<img src="${img(a, s)}" alt="Captura de escritorio ${i + 1}" loading="lazy" data-i="${a.screenshots.length + i}">`).join('')}</div>` : ''}

      <div class="cols">
        <div>
          <h2>Acerca de esta app</h2>
          <div class="desc">${a.description.split('\n\n').map((p) => `<p>${esc(p)}</p>`).join('')}</div>
          <h2>Funciones</h2>
          <ul class="features">${a.features.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
          ${allFiles(a)}
        </div>
        <aside>
          <h2>Información técnica</h2>
          <dl class="panel">
            <div class="kv"><dt>Paquete</dt><dd class="mono">${esc(apk.package)}</dd></div>
            <div class="kv"><dt>Código de versión</dt><dd>${apk.versionCode}</dd></div>
            <div class="kv"><dt>SHA-256 del APK</dt><dd class="mono">${esc(apk.sha256)}</dd></div>
            <div class="kv"><dt>Certificado de firma</dt><dd class="mono">${esc(apk.certSha256 || '—')}</dd></div>
            <div class="kv"><dt>Código fuente</dt><dd>${a.repo ? `<a href="${esc(a.repo)}">${esc(a.repo.replace('https://github.com/', ''))}</a>` : 'Privado (solo se publican los binarios)'}</dd></div>
          </dl>
          <h2>Otras fuentes</h2>
          <div class="actions">${storeLinks(a) || '<span class="muted">Solo disponible en esta tienda.</span>'}</div>
        </aside>
      </div>`;

    const imgs = [...view.querySelectorAll('.shots img')];
    imgs.forEach((el) => el.addEventListener('click', () => openLightbox(imgs.map((i) => i.src), Number(el.dataset.i))));
    bindActions(a);
  }

  function actionButtons(a) {
    const apk = a.android;
    let out = '';
    if (native) {
      const act = androidAction(apk);
      out += `<button class="btn primary" data-act="${act.kind}" data-pkg="${esc(apk.package)}">${ICON.android}${act.label} <small>${mb(apk.size)}</small></button>`;
    } else {
      out += `<a class="btn primary" href="${esc(apk.url)}" download>${ICON.android}Descargar APK <small>${esc(apk.label || 'Android')} · ${mb(apk.size)}</small></a>`;
    }
    if (a.windows && !native) out += `<a class="btn" href="${esc(a.windows.url)}">${ICON.windows}${esc(a.windows.label)} <small>${mb(a.windows.size)}</small></a>`;
    return out;
  }

  function storeLinks(a) {
    let s = '';
    if (a.playUrl) s += `<a class="btn" href="${esc(a.playUrl)}" target="_blank" rel="noopener">${ICON.play}Google Play</a>`;
    if (a.msStoreUrl) s += `<a class="btn" href="${esc(a.msStoreUrl)}" target="_blank" rel="noopener">${ICON.ms}Microsoft Store</a>`;
    if (a.repo) s += `<a class="btn" href="${esc(a.repo)}" target="_blank" rel="noopener">${ICON.code}Código en GitHub</a>`;
    if (a.website) s += `<a class="btn" href="${esc(a.website)}" target="_blank" rel="noopener">${ICON.web}Sitio web</a>`;
    return s;
  }

  function allFiles(a) {
    const rows = [];
    const apkRow = (x, label) => rows.push(`<a class="file" href="${esc(x.url)}" data-sha="${esc(x.sha256)}" title="SHA-256: ${esc(x.sha256)}">${ICON.android.replace('<svg', '<svg width="16" height="16"')} ${esc(label)} · ${esc(x.versionName)}<span>${mb(x.size)}</span></a>`);
    apkRow(a.android, a.android.label || 'Android APK');
    (a.extraApks || []).forEach((x) => apkRow(x, x.label));
    const fileRow = (x, icon) => rows.push(`<a class="file" href="${esc(x.url)}">${icon.replace('<svg', '<svg width="16" height="16"')} ${esc(x.label)} · ${esc(x.version)}<span>${mb(x.size)}</span></a>`);
    if (a.windows) fileRow(a.windows, ICON.windows);
    (a.windowsExtra || []).forEach((x) => fileRow(x, ICON.windows));
    if (a.linux) fileRow(a.linux, ICON.linux);
    return `<h2>Todas las descargas</h2><div class="files">${rows.join('')}</div>`;
  }

  function bindActions(a) {
    const btn = view.querySelector('#actions [data-act]');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const kind = btn.dataset.act;
      if (kind === 'open') {
        if (!native.open(a.android.package)) toast('No se pudo abrir la app.');
        return;
      }
      btn.disabled = true;
      $('#dl-progress').innerHTML = '<div class="progress"><i></i></div><div class="muted" id="dl-msg" style="font-size:14px;margin-top:6px">Preparando descarga…</div>';
      native.install(a.android.url, a.android.sha256, a.android.package, a.name);
    });
  }

  function renderAbout() {
    document.title = 'Cómo funciona · Sunsam Apps Store';
    const client = state.catalog.store.client;
    view.innerHTML = `
      <article class="about">
        <a class="back" href="#/">← Volver a la tienda</a>
        <h1>Una tienda de apps propia y descentralizada</h1>
        <p>Sunsam Apps Store reúne las apps de Jhon Supelano en un solo lugar sin depender de Google Play. El catálogo es un archivo abierto (<a href="apps.json">apps.json</a>) alojado en GitHub Pages, y cada descarga sale directamente de los releases de GitHub donde se publicó.</p>

        <div class="store-card">
          <img src="logo.svg" alt="">
          <div style="flex:1;min-width:220px">
            <b style="font-size:18px">App de la tienda para Android</b>
            <p class="muted" style="margin:4px 0 0">Instala, actualiza y abre las apps con un toque. Comprueba el SHA-256 de cada APK antes de instalarlo.</p>
          </div>
          ${client ? `<a class="btn primary" href="${esc(client.url)}">${ICON.android}Descargar <small>v${esc(client.versionName)} · ${mb(client.size)}</small></a>` : '<span class="muted">Próximamente</span>'}
        </div>
        ${client ? `<p class="muted mono" style="margin-top:10px">SHA-256: ${esc(client.sha256)}<br>Certificado: ${esc(client.certSha256)}</p>` : ''}

        <h2>Cómo instalar un APK</h2>
        <ol class="steps">
          <li><div>Descarga el APK desde la ficha de la app (o instala la app de la tienda para hacerlo todo desde el teléfono).</div></li>
          <li><div>Android te pedirá permitir la instalación desde esta fuente: <b>Ajustes → Instalar apps desconocidas</b>. Actívalo solo para el navegador o la tienda.</div></li>
          <li><div>Abre el archivo y pulsa <b>Instalar</b>. Si ya tenías la app de Google Play, puede que debas desinstalarla primero: las firmas pueden ser distintas.</div></li>
        </ol>

        <h2>Por qué confiar en cada archivo</h2>
        <p>Cada ficha muestra la huella <b>SHA-256</b> del APK y la del <b>certificado de firma</b>. La app de la tienda compara la huella del archivo descargado antes de pasarlo al instalador de Android; si no coincide, lo borra y no lo instala. En Windows puedes comprobarlo con <code>Get-FileHash archivo.apk</code>.</p>

        <h2>Código abierto y apps privadas</h2>
        <p>Algunas apps son de código abierto y enlazan a su repositorio. Otras tienen el código privado: de ellas solo se publican los instaladores, nunca el código fuente.</p>
      </article>`;
  }

  /* ---------- visor de capturas ---------- */
  const lb = $('#lightbox');
  let lbList = [], lbIdx = 0;
  function openLightbox(list, i) { lbList = list; lbIdx = i; lb.hidden = false; showLb(); }
  function showLb() { lb.querySelector('img').src = lbList[lbIdx]; }
  lb.addEventListener('click', (e) => {
    if (e.target.classList.contains('lb-prev')) { lbIdx = (lbIdx - 1 + lbList.length) % lbList.length; showLb(); }
    else if (e.target.classList.contains('lb-next')) { lbIdx = (lbIdx + 1) % lbList.length; showLb(); }
    else if (e.target !== lb.querySelector('img')) lb.hidden = true;
  });
  document.addEventListener('keydown', (e) => {
    if (lb.hidden) return;
    if (e.key === 'Escape') lb.hidden = true;
    if (e.key === 'ArrowRight') { lbIdx = (lbIdx + 1) % lbList.length; showLb(); }
    if (e.key === 'ArrowLeft') { lbIdx = (lbIdx - 1 + lbList.length) % lbList.length; showLb(); }
  });

  /* ---------- callbacks del puente nativo ---------- */
  window.sunsamProgress = (pkg, pct, st, msg) => {
    const bar = $('#dl-progress .progress i'), m = $('#dl-msg');
    if (bar) bar.style.width = Math.max(0, Math.min(100, pct)) + '%';
    if (m) m.textContent = msg || '';
    if (st === 'done' || st === 'error' || st === 'cancelled') {
      if (st === 'error') toast(msg || 'No se pudo instalar.');
      setTimeout(route, st === 'done' ? 400 : 1500);
    }
  };
  document.addEventListener('visibilitychange', () => { if (!document.hidden && native && location.hash.startsWith('#/app/')) route(); });

  /* ---------- enrutado ---------- */
  function route() {
    if (!state.catalog) return;
    const h = location.hash.replace(/^#/, '') || '/';
    document.title = 'Sunsam Apps Store';
    if (h.startsWith('/app/')) renderApp(decodeURIComponent(h.slice(5)));
    else if (h === '/acerca') renderAbout();
    else renderHome();
    if (!route.keepScroll) window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);

  const q = $('#q');
  q.addEventListener('input', () => {
    state.query = q.value.trim();
    if (location.hash && location.hash !== '#/') { location.hash = '#/'; } else renderHome();
  });
  if (native) { const g = $('#get-store'); g.textContent = 'Acerca de'; }

  load();
})();
