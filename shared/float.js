/* =========================================================================
   FLOAT SUITE: Shared runtime
   HUD (Ubuntu Unity style), theme manager, shortcuts registry, modal
   manager, toast helper, and a small DOM/Events utility layer.

   Depends on: shared/i18n.js (loaded before this file).
   ========================================================================= */
(function(global){
  'use strict';

  const I18n = global.FloatI18n;
  if(!I18n) console.warn('[float.js] i18n.js must be loaded first');

  /* ----- DOM helpers -------------------------------------------------- */
  const $  = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  function el(tag, attrs={}, ...children){
    const node = document.createElement(tag);
    Object.keys(attrs).forEach(k => {
      if(k === 'class') node.className = attrs[k];
      else if(k === 'dataset') Object.assign(node.dataset, attrs[k]);
      else if(k.startsWith('on') && typeof attrs[k] === 'function') node.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
      else if(k === 'style' && typeof attrs[k] === 'object') Object.assign(node.style, attrs[k]);
      else if(attrs[k] != null) node.setAttribute(k, attrs[k]);
    });
    children.flat().forEach(c => {
      if(c == null || c === false) return;
      if(typeof c === 'string' || typeof c === 'number') node.appendChild(document.createTextNode(String(c)));
      else node.appendChild(c);
    });
    return node;
  }
  function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }
  function uid(){ return 'id-' + Math.random().toString(36).slice(2,9) + Date.now().toString(36).slice(-4); }

  /* ----- Toast -------------------------------------------------------- */
  let _toastContainer = null;
  function ensureToastContainer(){
    if(_toastContainer && document.body.contains(_toastContainer)) return _toastContainer;
    _toastContainer = $('#toast-container');
    if(!_toastContainer){
      _toastContainer = el('div', {class:'toast-container', id:'toast-container'});
      document.body.appendChild(_toastContainer);
    }
    return _toastContainer;
  }
  function toast(msg, type='', ms=2400){
    const c = ensureToastContainer();
    const t = el('div', {class:'toast ' + type, role:'status', 'aria-live':'polite'}, msg);
    c.appendChild(t);
    setTimeout(() => {
      t.style.animation = 'toast-out .25s ease forwards';
      setTimeout(() => t.remove(), 260);
    }, ms);
    return t;
  }

  /* ----- Theme manager (shared across the suite) --------------------- */
  const THEME_KEY = 'float_theme_mode';
  const THEME_APPS = ['float_theme_mode','paint_theme_mode','inkling_theme_mode','thesis_theme_mode'];

  function detectTheme(){
    try{
      const stored = localStorage.getItem(THEME_KEY);
      if(stored === 'light' || stored === 'dark') return stored;
    }catch(e){}
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme(mode){
    const actual = mode === 'auto' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : mode;
    if(actual === 'dark') document.documentElement.setAttribute('data-theme','dark');
    else document.documentElement.removeAttribute('data-theme');
    document.dispatchEvent(new CustomEvent('float:theme', {detail:{mode, actual}}));
    return actual;
  }

  function getThemeMode(){
    try{ return localStorage.getItem(THEME_KEY) || 'auto'; }catch(e){ return 'auto'; }
  }

  function setThemeMode(mode){
    if(mode !== 'auto' && mode !== 'light' && mode !== 'dark') return;
    try{
      if(mode === 'auto') localStorage.removeItem(THEME_KEY);
      else localStorage.setItem(THEME_KEY, mode);
      // Sync to per-app keys for legacy compatibility
      THEME_APPS.forEach(k => {
        try{
          if(mode === 'auto') localStorage.removeItem(k);
          else localStorage.setItem(k, mode);
        }catch(e){}
      });
    }catch(e){}
    applyTheme(mode);
    updateThemeIcons(mode);
  }

  function cycleTheme(){
    const order = ['auto','light','dark'];
    const cur = getThemeMode();
    const next = order[(order.indexOf(cur)+1) % order.length];
    setThemeMode(next);
    return next;
  }

  function themeIcon(mode){
    if(mode === 'light') return 'fa-sun';
    if(mode === 'dark')  return 'fa-moon';
    return 'fa-circle-half-stroke';
  }
  function themeLabel(mode){
    return I18n ? I18n.t('common.theme_'+(mode==='auto'?'auto':mode)) : mode;
  }
  function updateThemeIcons(mode){
    if(!mode) mode = getThemeMode();
    $$('.theme-icon').forEach(i => {
      i.className = 'fa-solid theme-icon ' + themeIcon(mode);
    });
    $$('.theme-label').forEach(l => { l.textContent = themeLabel(mode); });
  }

  // Listen to OS preference changes when in auto mode
  if(window.matchMedia){
    try{
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if(getThemeMode() === 'auto') applyTheme('auto');
      });
    }catch(e){}
  }

  // Cross-tab/cross-app sync
  window.addEventListener('storage', e => {
    if(THEME_APPS.indexOf(e.key) >= 0){
      const mode = e.newValue || 'auto';
      applyTheme(mode);
      updateThemeIcons(mode);
    }
    if(e.key === 'float_lang' && I18n){
      // i18n.js handles its own storage; just re-apply
      I18n.apply();
    }
  });

  /* ----- Modals ------------------------------------------------------- */
  function openModal(id){
    const overlay = (typeof id === 'string') ? document.getElementById(id) : id;
    if(!overlay) return;
    overlay.classList.add('open');
    overlay.style.display = 'flex';
    const focusable = overlay.querySelector('input,textarea,select,button');
    if(focusable) setTimeout(() => focusable.focus(), 60);
    document.dispatchEvent(new CustomEvent('float:modalopen', {detail:{overlay}}));
  }
  function closeModal(id){
    const overlay = (typeof id === 'string') ? document.getElementById(id) : id;
    if(!overlay) return;
    overlay.classList.remove('open');
    setTimeout(() => { overlay.style.display = ''; }, 180);
    document.dispatchEvent(new CustomEvent('float:modalclose', {detail:{overlay}}));
  }
  function bindModalClose(overlay){
    if(!overlay) return;
    overlay.addEventListener('click', e => {
      if(e.target === overlay) closeModal(overlay);
    });
    const x = overlay.querySelector('.modal-close');
    if(x) x.addEventListener('click', () => closeModal(overlay));
  }
  // Wire up all modals on the page
  function initModals(){
    $$('.modal-overlay').forEach(bindModalClose);
  }

  /* ----- Shortcuts registry + Help overlay --------------------------- */
  const _shortcuts = []; // {key, label, group, fn, mod, scope}
  function addShortcut(opts){
    if(!opts || !opts.key || typeof opts.fn !== 'function') return;
    _shortcuts.push(Object.assign({mod:[], group:'common', scope:null, label:''}, opts));
  }
  function getShortcuts(){ return _shortcuts.slice(); }
  function clearShortcuts(){ _shortcuts.length = 0; }

  function formatKeys(s){
    const parts = [];
    if(s.mod && s.mod.length){
      s.mod.forEach(m => parts.push(m));
    }
    parts.push(s.key);
    return parts.map(p => '<kbd>'+p.replace('Cmd','⌘').replace('Shift','⇧').replace('Alt','⌥').replace('Ctrl','⌃')+'</kbd>').join(' ');
  }

  function buildShortcutsOverlay(){
    let overlay = $('#shortcuts-overlay');
    if(!overlay){
      overlay = el('div', {class:'shortcuts-overlay', id:'shortcuts-overlay', role:'dialog', 'aria-modal':'true'});
      document.body.appendChild(overlay);
      overlay.addEventListener('click', e => { if(e.target === overlay) overlay.classList.remove('open'); });
    }
    const groups = {};
    _shortcuts.forEach(s => {
      const g = s.group || 'common';
      (groups[g] = groups[g] || []).push(s);
    });
    const groupOrder = ['file','edit','tools','view','insert','format','references','layers','filter','help','common'];
    const groupLabels = {
      file:'File',edit:'Edit',tools:'Tools',view:'View',insert:'Insert',
      format:'Format',references:'References',layers:'Layers',filter:'Filter',
      help:'Help',common:'General'
    };
    const html = ['<div class="shortcuts-modal" role="document">',
      '<h2><i class="fa-solid fa-keyboard"></i> ', I18n ? I18n.t('common.shortcuts') : 'Shortcuts', '</h2>',
      '<div class="modal-sub">', I18n ? I18n.t('common.hud_hint') : '', '</div>',
      '<div class="shortcuts-grid">'];
    groupOrder.forEach(g => {
      if(!groups[g]) return;
      html.push('<div class="shortcuts-section"><h3>'+groupLabels[g]+'</h3><ul class="shortcuts-list">');
      groups[g].forEach(s => {
        html.push('<li><span>'+s.label+'</span><span class="keys">'+formatKeys(s)+'</span></li>');
      });
      html.push('</ul></div>');
    });
    html.push('</div></div>');
    overlay.innerHTML = html.join('');
    return overlay;
  }
  function showShortcuts(){
    buildShortcutsOverlay();
    $('#shortcuts-overlay').classList.add('open');
  }
  function hideShortcuts(){
    const o = $('#shortcuts-overlay');
    if(o) o.classList.remove('open');
  }

  /* ----- Unity HUD ---------------------------------------------------- */
  /*
     HUD has two parts:
     1) Menubar: top of the app with File/Edit/View/etc. menus that drop
        down on click or Alt+underlined-letter.
     2) Search overlay: Alt (or Ctrl+Space) opens a command palette
        where the user types a command name and Enter executes it.
     Commands are registered via `registerCommand({id,label,i18n,group,run,shortcut})`.
     Either `label` or `i18n` is required: `i18n` is resolved live against
     the current language so labels follow the active locale.
  */
  const _commands = []; // {id,label,i18n,group,run,shortcut,icon}
  function registerCommand(c){
    if(!c || !c.id || typeof c.run !== 'function') return;
    if(!c.label && !c.i18n) return;
    // De-dupe by id (re-registration replaces the previous entry)
    const existing = _commands.findIndex(x => x.id === c.id);
    if(existing >= 0) _commands[existing] = c;
    else _commands.push(c);
  }
  function clearCommands(){ _commands.length = 0; }
  function getCommands(){ return _commands.slice(); }
  function findCommand(id){ return _commands.find(c => c.id === id); }
  function commandLabel(c){
    if(!c) return '';
    if(c.i18n && I18n) return I18n.t(c.i18n);
    return c.label || c.id;
  }

  function buildHUD(spec){
    /*
      spec = {
        appName: 'paint',
        menus: [
          {label:'File', i18n:'paint.menu_file', items:[
            {label:'New', i18n:'common.new', shortcut:{mod:['Ctrl'],key:'N'}, cmd:'file.new'},
            {sep:true},
            {label:'Export…', i18n:'common.export_as', shortcut:{mod:['Ctrl'],key:'S'}, cmd:'file.export'},
          ]},
          ...
        ]
      }
    */
    let bar = $('#hud-menubar');
    if(bar) bar.remove();

    bar = el('div', {class:'hud-menubar', id:'hud-menubar', role:'menubar'});

    spec.menus.forEach((m, idx) => {
      const menu = el('div', {class:'hud-menu', role:'menuitem', 'aria-haspopup':'true', tabindex:'0'});
      const btn = el('button', {
        class:'hud-menu-btn',
        type:'button',
        onclick: e => { e.stopPropagation(); toggleMenu(menu); }
      }, m.i18n ? I18n.t(m.i18n) : m.label);
      btn.setAttribute('data-menu-index', idx);
      menu.appendChild(btn);

      const dd = el('div', {class:'hud-dropdown', role:'menu'});
      (m.items || []).forEach(item => {
        if(item.sep){ dd.appendChild(el('div', {class:'hud-sep'})); return; }
        const label = item.i18n ? I18n.t(item.i18n) : item.label;
        const kbd = item.shortcut ? formatKeys(item.shortcut) : '';
        const btn2 = el('button', {
          class:'hud-item', type:'button', role:'menuitem',
          onclick: () => {
            closeAllMenus();
            if(item.cmd){
              const c = findCommand(item.cmd);
              if(c){ try{c.run();}catch(e){console.error(e); toast(I18n.t('common.error')+': '+e.message,'danger');} }
            } else if(item.run){ try{item.run();}catch(e){console.error(e);} }
          }
        }, el('span', {class:'hud-item-label'}, label), el('span', {class:'hud-kbd'}, kbd));
        if(item.disabled) btn2.disabled = true;
        dd.appendChild(btn2);
      });
      menu.appendChild(dd);
      bar.appendChild(menu);
    });

    // Right side: HUD hint, language select, theme, shortcuts
    const right = el('div', {class:'hud-menubar-right'});
    const hint = el('span', {class:'hud-hint', 'aria-hidden':'true'},
      el('kbd', {}, 'Alt'),
      ' ' + (I18n ? I18n.t('common.hud_hint') : 'for commands')
    );
    right.appendChild(hint);

    // Language selector
    const langSelect = el('select', {
      class:'hud-lang-select',
      'aria-label':'Language',
      onchange: e => { I18n.setLang(e.target.value); rebuildHUD(spec); }
    });
    (I18n ? I18n.supported() : ['en']).forEach(l => {
      const o = el('option', {value:l}, l.toUpperCase());
      if(I18n && I18n.getLang() === l) o.selected = true;
      langSelect.appendChild(o);
    });
    right.appendChild(langSelect);

    // Theme toggle button
    const themeBtn = el('button', {
      class:'hud-lang-select',
      type:'button',
      title:'Theme',
      onclick: () => cycleTheme()
    }, el('i', {class:'fa-solid theme-icon ' + themeIcon(getThemeMode())}));
    right.appendChild(themeBtn);

    // Help button
    const helpBtn = el('button', {
      class:'hud-lang-select',
      type:'button',
      title: I18n ? I18n.t('common.help') : 'Help',
      onclick: () => showShortcuts()
    }, '?');
    right.appendChild(helpBtn);

    bar.appendChild(el('div', {class:'hud-menubar-spacer'}));
    bar.appendChild(right);

    // Register outside-click + Escape handlers once for the whole document.
    // These are global behaviours, not per-HUD: guard against duplicates.
    if(!_hudListenersBound){
      document.addEventListener('click', closeAllMenus);
      document.addEventListener('keydown', e => { if(e.key === 'Escape') closeAllMenus(); });
      _hudListenersBound = true;
    }

    return bar;
  }
  let _hudListenersBound = false;

  function mountHUD(spec){
    const bar = buildHUD(spec);
    const mount = $('#hud-mount') || $('.app-header') || document.body.firstChild;
    if(mount && mount.parentNode){
      mount.parentNode.insertBefore(bar, mount.nextSibling);
    }else{
      document.body.appendChild(bar);
    }
  }

  function rebuildHUD(spec){
    const old = $('#hud-menubar');
    if(old) old.remove();
    mountHUD(spec);
  }

  function toggleMenu(menu){
    const isOpen = menu.classList.contains('open');
    closeAllMenus();
    if(!isOpen) menu.classList.add('open');
  }
  function closeAllMenus(){
    $$('.hud-menu.open').forEach(m => m.classList.remove('open'));
  }

  /* ----- HUD search overlay ------------------------------------------ */
  let _searchState = {selected:0, items:[], spec:null};

  function ensureSearchOverlay(){
    let o = $('#hud-search-overlay');
    if(o) return o;
    o = el('div', {class:'hud-overlay', id:'hud-search-overlay', role:'dialog', 'aria-modal':'true'});
    const box = el('div', {class:'hud-search-box'});
    const input = el('input', {
      type:'search', class:'hud-search-input', id:'hud-search-input',
      placeholder: I18n ? I18n.t('common.hud_hint') : 'Search commands…',
      autocomplete:'off', spellcheck:'false'
    });
    const results = el('div', {class:'hud-results', id:'hud-search-results'});
    box.appendChild(input);
    box.appendChild(results);
    o.appendChild(box);
    document.body.appendChild(o);

    o.addEventListener('click', e => { if(e.target === o) closeSearchOverlay(); });
    input.addEventListener('input', () => renderSearchResults(input.value));
    input.addEventListener('keydown', e => {
      if(e.key === 'Escape'){ closeSearchOverlay(); }
      else if(e.key === 'ArrowDown'){ e.preventDefault(); _searchState.selected = Math.min(_searchState.items.length-1, _searchState.selected+1); paintSearchSelection(); }
      else if(e.key === 'ArrowUp'){ e.preventDefault(); _searchState.selected = Math.max(0, _searchState.selected-1); paintSearchSelection(); }
      else if(e.key === 'Enter'){
        e.preventDefault();
        const c = _searchState.items[_searchState.selected];
        if(c){ closeSearchOverlay(); try{c.run();}catch(err){console.error(err); toast(I18n.t('common.error'),'danger');} }
      }
    });
    return o;
  }

  function openSearchOverlay(){
    const o = ensureSearchOverlay();
    o.classList.add('open');
    const input = $('#hud-search-input');
    input.value = '';
    setTimeout(() => input.focus(), 60);
    renderSearchResults('');
  }
  function closeSearchOverlay(){
    const o = $('#hud-search-overlay');
    if(o) o.classList.remove('open');
  }

  function renderSearchResults(query){
    const container = $('#hud-search-results');
    if(!container) return;
    const q = (query || '').toLowerCase().trim();
    const list = _commands.map(c => {
      const label = commandLabel(c);
      return Object.assign({}, c, {_label:label, _group:c.group || 'common'});
    }).filter(c => !q || c._label.toLowerCase().indexOf(q) >= 0 || c._group.toLowerCase().indexOf(q) >= 0 || (c.id && c.id.indexOf(q)>=0));
    _searchState.items = list;
    _searchState.selected = 0;
    if(!list.length){
      container.innerHTML = '<div class="hud-empty">'+I18n.t('common.no_results')+'</div>';
      return;
    }
    container.innerHTML = '';
    list.slice(0, 60).forEach((c, i) => {
      const r = el('div', {class:'hud-result'+(i===0?' selected':''), tabindex:'-1', 'data-idx':i},
        el('div', {},
          el('div', {}, c._label),
          el('div', {class:'hud-result-group'}, c._group + ' › ' + c.id)
        ),
        c.shortcut ? el('kbd', {class:'hud-result-kbd'}, formatKeys(c.shortcut).replace(/<[^>]+>/g,'')) : null
      );
      r.addEventListener('click', () => { closeSearchOverlay(); try{c.run();}catch(e){console.error(e);} });
      r.addEventListener('mouseenter', () => { _searchState.selected = i; paintSearchSelection(); });
      container.appendChild(r);
    });
  }
  function paintSearchSelection(){
    $$('#hud-search-results .hud-result').forEach((r,i) => r.classList.toggle('selected', i===_searchState.selected));
  }

  /* ----- Global keyboard wiring -------------------------------------- */
  document.addEventListener('keydown', e => {
    // Alt alone (no other keys) → open HUD search
    if(e.key === 'Alt' && !e.ctrlKey && !e.shiftKey && !e.metaKey){
      const tag = (e.target.tagName || '').toUpperCase();
      if(tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      e.preventDefault();
      openSearchOverlay();
      return;
    }
    // Ctrl+Space → also opens HUD search
    if(e.key === ' ' && e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey){
      const tag = (e.target.tagName || '').toUpperCase();
      if(tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      e.preventDefault();
      openSearchOverlay();
      return;
    }
    // ? (Shift+/) → shortcuts overlay
    if(e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey){
      const tag = (e.target.tagName || '').toUpperCase();
      if(tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      e.preventDefault();
      showShortcuts();
      return;
    }
    // Escape closes overlays/modals (topmost first)
    if(e.key === 'Escape'){
      const so = $('#shortcuts-overlay');
      if(so && so.classList.contains('open')){ so.classList.remove('open'); return; }
      const ho = $('#hud-search-overlay');
      if(ho && ho.classList.contains('open')){ closeSearchOverlay(); return; }
      const open = $$('.modal-overlay.open');
      if(open.length){ closeModal(open[open.length-1]); return; }
    }

    // Custom shortcuts (only when not in input)
    const tag = (e.target.tagName || '').toUpperCase();
    const inField = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable;
    _shortcuts.forEach(s => {
      if(s.scope && !s.scope()) return;
      if(inField && !s.allowInField) return;
      const mod = s.mod || [];
      const wantCtrl = mod.indexOf('Ctrl')>=0 || mod.indexOf('Cmd')>=0;
      const wantShift = mod.indexOf('Shift')>=0;
      const wantAlt = mod.indexOf('Alt')>=0;
      const gotCtrl = e.ctrlKey || e.metaKey;
      if(wantCtrl !== gotCtrl) return;
      if(wantShift !== e.shiftKey) return;
      if(wantAlt !== e.altKey) return;
      // Normalize key
      let key = e.key;
      if(key === ' ') key = 'Space';
      if(s.key === 'Space' && e.key !== ' ') return;
      if(s.key.length === 1 && s.key !== key.toLowerCase() && s.key !== key.toUpperCase()) return;
      if(s.key.length > 1 && s.key !== key && s.key !== key.toLowerCase()) return;
      e.preventDefault();
      try{ s.fn(e); }catch(err){ console.error(err); }
    });
  });

  /* ----- Apply i18n on language change ------------------------------- */
  if(I18n){
    I18n.on(() => {
      I18n.apply();
      // Rebuild the HUD so menu labels update
      const spec = _currentSpec;
      if(spec) rebuildHUD(spec);
    });
  }

  let _currentSpec = null;
  function rememberSpec(spec){ _currentSpec = spec; }

  /* ----- Public API -------------------------------------------------- */
  global.Float = {
    $, $$, el, clamp, uid,
    toast,
    openModal, closeModal, initModals, bindModalClose,
    addShortcut, getShortcuts, clearShortcuts, showShortcuts, hideShortcuts,
    getThemeMode, setThemeMode, cycleTheme, applyTheme, detectTheme, updateThemeIcons,
    registerCommand, getCommands, findCommand, clearCommands, commandLabel,
    mountHUD, rebuildHUD,
    openSearchOverlay, closeSearchOverlay,
    rememberSpec
  };

})(window);
