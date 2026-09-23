/* Sunsam Apps Store — SPA estática multidioma. Lee apps.json (español, base) y
   i18n/<idioma>.json (interfaz + fichas traducidas). Dentro de la app Android usa el
   puente window.SunsamNative para instalar, actualizar y abrir apps (la app verifica
   el SHA-256 antes de instalar). */
(() => {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const view = $('#view');
  const native = window.SunsamNative || null;

  const LANGS = {
    es: { name: 'Español', locale: 'es-CO' },
    en: { name: 'English', locale: 'en-US' },
    fr: { name: 'Français', locale: 'fr-FR' },
    pt: { name: 'Português', locale: 'pt-BR' },
    zh: { name: '简体中文', locale: 'zh-CN' },
    ru: { name: 'Русский', locale: 'ru-RU' },
    ja: { name: '日本語', locale: 'ja-JP' },
    ko: { name: '한국어', locale: 'ko-KR' }
  };
  const state = { catalog: null, category: 'all', query: '', lang: 'es', dict: null, base: null };

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
  const fmtDate = (d) => new Date(d + 'T12:00:00').toLocaleDateString(LANGS[state.lang].locale, { day: 'numeric', month: 'short', year: 'numeric' });
  const img = (app, f) => `img/${app.id}/${f}`;
  const norm = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  /* ---------- i18n ---------- */
  /** Texto de interfaz traducido; cae al español si falta la clave. Los valores *_html son de confianza (archivos propios). */
  function t(key, vars = {}) {
    const raw = state.dict?.ui?.[key] ?? state.base?.ui?.[key] ?? key;
    return raw.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : `{${k}}`));
  }
  const tx = (key, vars) => esc(t(key, vars));
  /** Etiquetas del catálogo (licencias, nombres de instaladores) escritas en español en apps.json. */
  const label = (s) => state.dict?.labels?.[s] ?? s;
  /** Campo de ficha traducido (tagline, description, features, notes) con respaldo al español. */
  function field(app, key) {
    const tr = state.dict?.apps?.[app.id]?.[key];
    return tr !== undefined && tr !== '' ? tr : app[key];
  }
  const catName = (k) => state.dict?.categories?.[k] ?? state.catalog.categories[k];

  function pickLang() {
    const fromUrl = new URLSearchParams(location.search).get('lang');
    if (fromUrl && LANGS[fromUrl]) return fromUrl;
    try { const s = localStorage.getItem('sunsam.lang'); if (s && LANGS[s]) return s; } catch { /* almacenamiento bloqueado */ }
    // En la app Android manda el idioma de la app (sistema o idioma por app de Android 13+).
    const nativeLocale = native && native.locale ? [String(native.locale())] : [];
    for (const l of [...nativeLocale, ...(navigator.languages || [navigator.language || 'es'])]) {
      const code = l.toLowerCase().split('-')[0];
      if (LANGS[code]) return code;
    }
    return 'es';
  }

  async function loadDict(lang) {
    const r = await fetch(`i18n/${lang}.json`, { cache: 'no-cache' });
    if (!r.ok) throw new Error(r.status);
    return r.json();
  }

  async function setLang(lang, persist) {
    state.lang = lang;
    try { state.dict = lang === 'es' ? state.base : await loadDict(lang); } catch { state.dict = state.base; }
    if (persist) { try { localStorage.setItem('sunsam.lang', lang); } catch { /* sin almacenamiento */ } }
    document.documentElement.lang = lang === 'zh' ? 'zh-Hans' : lang;
    applyStatic();
    route();
  }

  function applyStatic() {
    $('#q').placeholder = t('search_placeholder');
    $('#q').setAttribute('aria-label', t('search_placeholder'));
    $('#nav-how').textContent = t('nav_how');
    $('#get-store').textContent = native ? t('nav_about') : t('nav_get_store');
    $('#lang').setAttribute('aria-label', t('lang_label'));
    $('#lang').value = state.lang;
    $('#foot-catalog').textContent = t('footer_catalog');
    $('#foot-note').textContent = t('footer_note');
    document.querySelector('meta[name="description"]').content = t('meta_desc');
    $('.lb-close').setAttribute('aria-label', t('lb_close'));
    $('.lb-prev').setAttribute('aria-label', t('lb_prev'));
    $('.lb-next').setAttribute('aria-label', t('lb_next'));
  }

  function toast(msg) {
    const el = $('#toast'); el.textContent = msg; el.hidden = false;
    clearTimeout(toast.t); toast.t = setTimeout(() => (el.hidden = true), 3600);
  }

  /* ---------- estado de instalación (solo dentro de la app Android) ---------- */
  function installed(pkg) {
    if (!native) return -1;
    try { return Number(native.getInstalledVersion(pkg)); } catch { return -1; }
  }
  function androidAction(apk) {
    const v = installed(apk.package);
    if (v < 0) return { kind: 'install', label: t('btn_install') };
    if (v < apk.versionCode) return { kind: 'update', label: t('btn_update') };
    return { kind: 'open', label: t('btn_open') };
  }

  function statusTags(app) {
    const out = [];
    if (app.status === 'play') out.push(`<span class="tag ok">${tx('tag_play')}</span>`);
    if (app.status === 'review') out.push(`<span class="tag warn">${tx('tag_review')}</span>`);
    if (app.msStoreUrl) out.push(`<span class="tag info">${tx('tag_ms')}</span>`);
    if (app.openSource) out.push(`<span class="tag">${tx('tag_oss')}</span>`);
    return out.join('');
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
      const [cat, base] = await Promise.all([
        fetch('apps.json', { cache: 'no-cache' }).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); }),
        loadDict('es')
      ]);
      state.catalog = cat; state.base = base;
    } catch {
      view.innerHTML = '<div class="empty">No se pudo cargar el catálogo. / Could not load the catalog.</div>';
      return;
    }
    const sel = $('#lang');
    sel.innerHTML = Object.entries(LANGS).map(([k, v]) => `<option value="${k}">${esc(v.name)}</option>`).join('');
    sel.addEventListener('change', () => setLang(sel.value, true));
    await setLang(pickLang(), false);
  }

  /* ---------- vistas ---------- */
  function renderHome() {
    const { apps, categories } = state.catalog;
    const q = norm(state.query);
    const list = apps.filter((a) =>
      (state.category === 'all' || a.category === state.category) &&
      (!q || norm([a.name, field(a, 'tagline'), field(a, 'description'), (field(a, 'features') || []).join(' '), a.tagline].join(' ')).includes(q)));

    const heroIcons = apps.slice(0, 8).map((a) => `<img src="${img(a, 'icon.png')}" alt="" loading="lazy">`).join('');
    const chips = [['all', t('cat_all')], ...Object.keys(categories).map((k) => [k, catName(k)])]
      .map(([k, v]) => `<button class="chip" data-cat="${k}" aria-pressed="${state.category === k}">${esc(v)}</button>`).join('');
    const title = q ? tx('results_for', { q: state.query }) : state.category === 'all' ? tx('all_apps') : esc(catName(state.category));

    view.innerHTML = `
      ${storeUpdateBanner()}
      ${q ? '' : `<section class="hero">
        <div>
          <h1>${tx('hero_title')}</h1>
          <p>${tx('hero_text')}</p>
          <div class="pills"><span class="pill">${tx('pill_apps', { n: apps.length })}</span><span class="pill">${tx('pill_platforms')}</span><span class="pill">${tx('pill_verified')}</span></div>
        </div>
        <div class="hero-icons" aria-hidden="true">${heroIcons}</div>
      </section>`}
      <div class="chips" role="toolbar" aria-label="${tx('cat_aria')}">${chips}</div>
      <div class="section-title"><h2>${title}</h2><span class="muted">${tx(list.length === 1 ? 'count_one' : 'count_many', { n: list.length })}</span></div>
      ${list.length ? `<div class="grid">${list.map(card).join('')}</div>` : `<div class="empty">${tx('no_results')}</div>`}`;

    view.querySelectorAll('.chip').forEach((b) => b.addEventListener('click', () => { state.category = b.dataset.cat; renderHome(); }));
    const up = view.querySelector('#store-update');
    if (up) up.addEventListener('click', () => {
      const c = state.catalog.store.client;
      up.disabled = true; up.textContent = t('downloading_short');
      $('#dl-progress').innerHTML = progressHtml();
      state.installing = { pkg: c.package, name: 'Sunsam Apps Store' };
      native.install(c.url, c.sha256, c.package, 'Sunsam Apps Store');
    });
  }

  /** Dentro de la app Android: avisa si hay una versión más nueva de la propia tienda. */
  function storeUpdateBanner() {
    const c = state.catalog.store.client;
    if (!native || !c || !native.appVersionCode || native.appVersionCode() >= c.versionCode) return '';
    return `<div class="note" style="display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap">
      <span>${tx('store_update_text', { v: c.versionName })}</span>
      <button class="btn primary" id="store-update">${tx('store_update_btn')}</button></div><div id="dl-progress"></div>`;
  }

  function card(a) {
    const cover = a.cover
      ? `<img src="${img(a, a.cover)}" alt="" loading="lazy">`
      : `<div class="cover-fallback" style="background:${fallbackBg(a.id)}"><img src="${img(a, 'icon.png')}" alt="" loading="lazy"></div>`;
    return `<a class="card" href="#/app/${a.id}">
      <div class="cover">${cover}</div>
      <div class="body">
        <img class="icon" src="${img(a, 'icon.png')}" alt="" loading="lazy">
        <div><h3>${esc(a.name)}</h3><p>${esc(field(a, 'tagline'))}</p>
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
    if (!a) { view.innerHTML = `<div class="empty">${tx('not_found')} <a href="#/">${tx('back_store')}</a></div>`; return; }
    document.title = `${a.name} · Sunsam Apps Store`;
    const apk = a.android;
    const notes = field(a, 'notes');
    const shots = a.screenshots.map((s, i) => `<img src="${img(a, s)}" alt="${tx('shot_alt', { i: i + 1, name: a.name })}" loading="lazy" data-i="${i}" tabindex="0">`).join('');
    const dshots = (a.desktopScreenshots || []).map((s, i) => `<img src="${img(a, s)}" alt="${tx('shot_desktop_alt', { i: i + 1, name: a.name })}" loading="lazy" data-i="${a.screenshots.length + i}" tabindex="0">`).join('');

    view.innerHTML = `
      <a class="back" href="#/">${tx('back_all')}</a>
      <section class="detail-head">
        <img class="icon" src="${img(a, 'icon.png')}" alt="${tx('icon_alt', { name: a.name })}">
        <div>
          <h1>${esc(a.name)}</h1>
          <p class="tagline">${esc(field(a, 'tagline'))}</p>
          <div class="tags">${statusTags(a)}<span class="tag">${esc(catName(a.category))}</span></div>
        </div>
      </section>

      <div class="meta">
        <div><b>${esc(apk.versionName)}</b><span>${tx('meta_version')}</span></div>
        <div><b>${mb(apk.size)}</b><span>${tx('meta_size')}</span></div>
        <div><b>${tx('meta_android', { v: apk.minAndroid })}</b><span>${tx('meta_req')}</span></div>
        <div><b>${fmtDate(a.updated)}</b><span>${tx('meta_updated')}</span></div>
        <div><b>${esc(label(a.license))}</b><span>${tx('meta_license')}</span></div>
      </div>

      <div class="actions" id="actions">${actionButtons(a)}</div>
      <div id="dl-progress"></div>
      ${notes ? `<div class="note">${esc(notes)}</div>` : ''}

      <h2 style="font-size:20px;margin:26px 0 10px">${tx('screenshots')}</h2>
      ${state.lang !== 'es' ? `<p class="muted" style="margin:-4px 0 10px;font-size:14px">${tx('shots_lang_note')}</p>` : ''}
      <div class="shots">${shots}</div>
      ${dshots ? `<div class="shots desktop">${dshots}</div>` : ''}

      <div class="cols">
        <div>
          <h2>${tx('about_app')}</h2>
          <div class="desc">${field(a, 'description').split('\n\n').map((p) => `<p>${esc(p)}</p>`).join('')}</div>
          <h2>${tx('features')}</h2>
          <ul class="features">${field(a, 'features').map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
          ${allFiles(a)}
        </div>
        <aside>
          <h2>${tx('tech_info')}</h2>
          <dl class="panel">
            <div class="kv"><dt>${tx('pkg')}</dt><dd class="mono">${esc(apk.package)}</dd></div>
            <div class="kv"><dt>${tx('version_code')}</dt><dd>${apk.versionCode}</dd></div>
            <div class="kv"><dt>${tx('apk_sha')}</dt><dd class="mono">${esc(apk.sha256)}</dd></div>
            <div class="kv"><dt>${tx('cert')}</dt><dd class="mono">${esc(apk.certSha256 || '—')}</dd></div>
            <div class="kv"><dt>${tx('source_code')}</dt><dd>${a.repo ? `<a href="${esc(a.repo)}">${esc(a.repo.replace('https://github.com/', ''))}</a>` : tx('source_private')}</dd></div>
          </dl>
          <h2>${tx('other_sources')}</h2>
          <div class="actions">${storeLinks(a) || `<span class="muted">${tx('only_here')}</span>`}</div>
        </aside>
      </div>`;

    const imgs = [...view.querySelectorAll('.shots img')];
    imgs.forEach((el) => {
      const open = () => openLightbox(imgs.map((i) => i.src), Number(el.dataset.i));
      el.addEventListener('click', open);
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter') open(); });
    });
    bindActions(a);
  }

  function actionButtons(a) {
    const apk = a.android;
    let out = '';
    if (native) {
      const act = androidAction(apk);
      out += `<button class="btn primary" data-act="${act.kind}">${ICON.android}${esc(act.label)} <small>${mb(apk.size)}</small></button>`;
    } else {
      out += `<a class="btn primary" href="${esc(apk.url)}" download>${ICON.android}${tx('btn_download_apk')} <small>${esc(label(apk.label || 'Android'))} · ${mb(apk.size)}</small></a>`;
    }
    if (a.windows && !native) out += `<a class="btn" href="${esc(a.windows.url)}">${ICON.windows}${esc(label(a.windows.label))} <small>${mb(a.windows.size)}</small></a>`;
    return out;
  }

  function storeLinks(a) {
    let s = '';
    if (a.playUrl) s += `<a class="btn" href="${esc(a.playUrl)}" target="_blank" rel="noopener">${ICON.play}Google Play</a>`;
    if (a.msStoreUrl) s += `<a class="btn" href="${esc(a.msStoreUrl)}" target="_blank" rel="noopener">${ICON.ms}Microsoft Store</a>`;
    if (a.repo) s += `<a class="btn" href="${esc(a.repo)}" target="_blank" rel="noopener">${ICON.code}${tx('btn_github')}</a>`;
    if (a.website) s += `<a class="btn" href="${esc(a.website)}" target="_blank" rel="noopener">${ICON.web}${tx('btn_web')}</a>`;
    return s;
  }

  function allFiles(a) {
    const rows = [];
    const small = (svg) => svg.replace('<svg', '<svg width="16" height="16"');
    const apkRow = (x, name) => rows.push(`<a class="file" href="${esc(x.url)}" title="SHA-256: ${esc(x.sha256)}">${small(ICON.android)} ${esc(name)} · ${esc(x.versionName)}<span>${mb(x.size)}</span></a>`);
    apkRow(a.android, a.android.label ? label(a.android.label) : t('apk_default_label'));
    (a.extraApks || []).forEach((x) => apkRow(x, label(x.label)));
    const fileRow = (x, icon) => rows.push(`<a class="file" href="${esc(x.url)}">${small(icon)} ${esc(label(x.label))} · ${esc(x.version)}<span>${mb(x.size)}</span></a>`);
    if (a.windows) fileRow(a.windows, ICON.windows);
    (a.windowsExtra || []).forEach((x) => fileRow(x, ICON.windows));
    if (a.linux) fileRow(a.linux, ICON.linux);
    return `<h2>${tx('all_downloads')}</h2><div class="files">${rows.join('')}</div>`;
  }

  const progressHtml = () => `<div class="progress"><i></i></div><div class="muted" id="dl-msg" style="font-size:14px;margin-top:6px">${tx('preparing')}</div>`;

  function bindActions(a) {
    const btn = view.querySelector('#actions [data-act]');
    if (!btn) return;
    btn.addEventListener('click', () => {
      if (btn.dataset.act === 'open') {
        if (!native.open(a.android.package)) toast(t('err_open'));
        return;
      }
      btn.disabled = true;
      $('#dl-progress').innerHTML = progressHtml();
      state.installing = { pkg: a.android.package, name: a.name };
      native.install(a.android.url, a.android.sha256, a.android.package, a.name);
    });
  }

  function renderAbout() {
    document.title = `${t('about_doc_title')} · Sunsam Apps Store`;
    const client = state.catalog.store.client;
    view.innerHTML = `
      <article class="about">
        <a class="back" href="#/">${tx('about_back')}</a>
        <h1>${tx('about_h1')}</h1>
        <p>${t('about_intro_html')}</p>

        <div class="store-card">
          <img src="logo.svg" alt="">
          <div style="flex:1;min-width:220px">
            <b style="font-size:18px">${tx('store_card_title')}</b>
            <p class="muted" style="margin:4px 0 0">${tx('store_card_text')}</p>
          </div>
          ${client ? `<a class="btn primary" href="${esc(client.url)}">${ICON.android}${tx('btn_download')} <small>v${esc(client.versionName)} · ${mb(client.size)}</small></a>` : `<span class="muted">${tx('soon')}</span>`}
        </div>
        ${client ? `<p class="muted mono" style="margin-top:10px">SHA-256: ${esc(client.sha256)}<br>${tx('cert_label')}: ${esc(client.certSha256)}</p>` : ''}

        <h2>${tx('how_h2')}</h2>
        <ol class="steps">
          <li><div>${tx('step1')}</div></li>
          <li><div>${t('step2_html')}</div></li>
          <li><div>${t('step3_html')}</div></li>
        </ol>

        <h2>${tx('trust_h2')}</h2>
        <p>${t('trust_html')}</p>

        <h2>${tx('oss_h2')}</h2>
        <p>${tx('oss_text')}</p>
      </article>`;
  }

  /* ---------- visor de capturas ---------- */
  const lb = $('#lightbox');
  let lbList = [], lbIdx = 0;
  function openLightbox(list, i) { lbList = list; lbIdx = i; lb.hidden = false; showLb(); lb.querySelector('.lb-close').focus(); }
  function showLb() { lb.querySelector('img').src = lbList[lbIdx]; }
  lb.addEventListener('click', (e) => {
    if (e.target.classList.contains('lb-prev')) { lbIdx = (lbIdx - 1 + lbList.length) % lbList.length; showLb(); }
    else if (e.target.classList.contains('lb-next')) { lbIdx = (lbIdx + 1) % lbList.length; showLb(); }
    else if (e.target !== lb.querySelector('img')) lb.hidden = true;
  });
  document.addEventListener('keydown', (e) => {
    if (lb.hidden) return;
    if (e.key === 'Escape' || e.key === 'Backspace') lb.hidden = true;
    if (e.key === 'ArrowRight') { lbIdx = (lbIdx + 1) % lbList.length; showLb(); }
    if (e.key === 'ArrowLeft') { lbIdx = (lbIdx - 1 + lbList.length) % lbList.length; showLb(); }
  });

  /* ---------- callbacks del puente nativo ----------
     v2 (app ≥ 1.0.2): (pkg, pct, estado, mensaje, código, bytesHechos, bytesTotales) → texto traducido aquí.
     v1 (app 1.0.0–1.0.1): solo (pkg, pct, estado, mensaje en español). */
  const ERR_KEYS = { permission: 'e_permission', hash: 'e_hash', network: 'e_network', conflict: 'e_conflict', incompatible: 'e_incompatible', storage: 'e_storage', other: 'e_other' };
  function progressText(st, msg, code, done, total) {
    const name = state.installing?.name || '';
    if (code && ERR_KEYS[code]) return t(ERR_KEYS[code], { name, detail: msg || '' });
    switch (st) {
      case 'downloading': return done != null ? t('p_downloading', { name, done: mb(done) || '0 MB', total: mb(total) || '?' }) : (state.lang === 'es' ? msg : t('downloading_short'));
      case 'verifying': return t('p_verifying');
      case 'installing': return code === 'confirm' ? t('p_confirm') : t('p_installing');
      case 'done': return t('p_done');
      case 'cancelled': return t('p_cancelled');
      default: return msg || '';
    }
  }
  window.sunsamProgress = (pkg, pct, st, msg, code, done, total) => {
    const bar = $('#dl-progress .progress i'), m = $('#dl-msg');
    const text = progressText(st, msg, code, done, total);
    if (bar) bar.style.width = Math.max(0, Math.min(100, pct)) + '%';
    if (m) m.textContent = text;
    if (st === 'done' || st === 'error' || st === 'cancelled') {
      if (st === 'error') toast(text);
      setTimeout(route, st === 'done' ? 400 : 1800);
    }
  };
  document.addEventListener('visibilitychange', () => { if (!document.hidden && native && location.hash.startsWith('#/app/')) route(); });

  /* ---------- enrutado ---------- */
  function route() {
    if (!state.catalog || !state.base) return;
    const h = location.hash.replace(/^#/, '') || '/';
    document.title = 'Sunsam Apps Store';
    if (h.startsWith('/app/')) renderApp(decodeURIComponent(h.slice(5)));
    else if (h === '/acerca') renderAbout();
    else renderHome();
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);

  const q = $('#q');
  q.addEventListener('input', () => {
    state.query = q.value.trim();
    if (location.hash && location.hash !== '#/') { location.hash = '#/'; } else renderHome();
  });

  load();
})();
