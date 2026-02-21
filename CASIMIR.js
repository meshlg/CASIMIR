// ==UserScript==
// @name         CASIMIR - Cryptographic Authentication System In Micro Interval Randomness
// @namespace    http://tampermonkey.net/
// @version      1.0.0.0358
// @description  Premium password generator with quantum entropy, advanced analysis, HIBP breach checks, and a fully opaque dark UI.
// @author       meshlg
// @match        *://*/*
// @grant        GM_setClipboard
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @connect      qrng.anu.edu.au
// @connect      api.pwnedpasswords.com
// @connect      api.haveibeenpwned.com
// ==/UserScript==

(function () {
  'use strict';

  // ---- Safety / single instance
  const ROOT_ID = 'pg-userscript-container';
  if (document.getElementById(ROOT_ID)) return;
  if (window.top !== window.self) return; // Prevent injection into iframes

  // ---- Tiny persistence wrapper (GM_* preferred; localStorage fallback)
  const store = {
    get(key, def) {
      try {
        if (typeof GM_getValue === 'function') return GM_getValue(key, def);
      } catch (_) { }
      try {
        const raw = localStorage.getItem(`CASIMIR:${key}`);
        return raw == null ? def : JSON.parse(raw);
      } catch (_) {
        return def;
      }
    },
    set(key, val) {
      try {
        if (typeof GM_setValue === 'function') return GM_setValue(key, val);
      } catch (_) { }
      try {
        localStorage.setItem(`CASIMIR:${key}`, JSON.stringify(val));
      } catch (_) { }
    }
  };

  const onReady = (fn) => {
    if (document.readyState === 'complete' || document.readyState === 'interactive') fn();
    else window.addEventListener('DOMContentLoaded', fn, { once: true });
  };

  onReady(() => {
    // ---- Mount container + shadow
    const container = document.createElement('div');
    container.id = ROOT_ID;
    container.style.position = 'fixed';
    container.style.zIndex = '2147483647';
    container.style.right = '20px';
    container.style.bottom = '20px';
    container.style.pointerEvents = 'none'; // allow only internal UI to receive clicks
    document.body.appendChild(container);

    const shadow = container.attachShadow({ mode: 'open' });

    // ---- Styles (dark theme, clean, readable, informative)
    const style = document.createElement('style');
    style.textContent = `
      :host {
        --font: 'Inter', ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        --mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;

        --bg0: #ffffff;
        --bg1: #f6f8fa;
        --bg2: #f3f4f6;
        --bg3: #ebedf0;
        --stroke: #d0d7de;
        --stroke2: #afb8c1;

        --text: #24292f;
        --muted: #57606a;
        --text-bright: #0f1419;
        --text-dim: #57606a;

        --brand: #0969da;
        --brand-bg: #ddf4ff;
        --brand2: #1a7f37;
        --brand2-bg: #dafbe1;
        --quantum: #8250df;
        --quantum-bg: #fbeaff;
        --warn: #9a6700;
        --warn-bg: #fff8c5;
        --danger: #cf222e;
        --danger-bg: #ffebe9;
        --success: #1a7f37;
        --success-bg: #dafbe1;

        --shadow: 0 16px 48px rgba(0,0,0,.15), 0 0 0 1px var(--stroke);
        --shadow2: 0 8px 24px rgba(0,0,0,.10);

        --r8: 8px;
        --r10: 10px;
        --r12: 12px;
        --r16: 16px;
        --r20: 20px;

        --ring: 0 0 0 2px var(--bg0), 0 0 0 4px var(--brand);
        --ringQ: 0 0 0 2px var(--bg0), 0 0 0 4px var(--quantum);

        font-family: var(--font);
        font-size: 14px;
        line-height: 1.5;
        color: var(--text);
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        text-rendering: optimizeLegibility;
        color-scheme: light;
      }

      /* Dark Theme */
      :host(.pg-theme-dark) {
        --bg0: #0d1117;
        --bg1: #161b22;
        --bg2: #21262d;
        --bg3: #282e36;
        --stroke: #30363d;
        --stroke2: #484f58;

        --text: #e6edf3;
        --muted: #8b949e;
        --text-bright: #ffffff;
        --text-dim: #6e7681;

        --brand: #58a6ff;
        --brand-bg: #1a3a5c;
        --brand2: #3fb950;
        --brand2-bg: #1a3a2a;
        --quantum: #bc8cff;
        --quantum-bg: #2d1f54;
        --warn: #d29922;
        --warn-bg: #3d2e00;
        --danger: #f85149;
        --danger-bg: #3d1418;
        --success: #3fb950;
        --success-bg: #1a3a2a;

        --shadow: 0 16px 48px rgba(0,0,0,.55), 0 0 0 1px var(--stroke);
        --shadow2: 0 8px 24px rgba(0,0,0,.40);

        color-scheme: dark;
      }

      /* ---- Keyframes ---- */
      @keyframes pg-spin{ to{ transform:rotate(360deg); } }
      @keyframes pg-pulse{ 0%,100%{ opacity:1; } 50%{ opacity:.6; } }
      @keyframes pg-pulse-danger{ 0%,100%{ box-shadow:0 0 0 0 rgba(248,81,73,.8); } 50%{ box-shadow:0 0 0 6px rgba(248,81,73,0); } }
      @keyframes pg-glow-quantum{ 0%,100%{ box-shadow:0 0 10px rgba(188,140,255,.4), inset 0 0 8px rgba(188,140,255,.2); border-color:var(--quantum); color:var(--quantum); } 50%{ box-shadow:0 0 20px rgba(188,140,255,.8), inset 0 0 15px rgba(188,140,255,.5); border-color:#dcbaff; color:#dcbaff; } }
      @keyframes pg-shimmer{
        0%{ background-position:-200% 0; }
        100%{ background-position:200% 0; }
      }
      @keyframes pg-fadeIn{ from{ opacity:0; transform:translateY(6px); } to{ opacity:1; transform:translateY(0); } }
      @keyframes pg-ripple{ to{ transform:scale(4); opacity:0; } }
      @keyframes pg-slideDown{ from{ max-height:0; opacity:0; } to{ max-height:800px; opacity:1; } }

      /* ---- Tooltip system ---- */
      [data-tip]{
        position:relative;
        cursor:help;
      }
      [data-tip]::after{
        content:attr(data-tip);
        position:absolute;
        bottom:calc(100% + 8px);
        left:50%;
        transform:translateX(-50%) translateY(4px);
        padding:6px 10px;
        border-radius:var(--r8);
        background:var(--bg3);
        border:1px solid var(--stroke2);
        color:var(--text);
        font-size:11px;
        line-height:1.4;
        letter-spacing:.1px;
        white-space:normal;
        max-width:260px;
        pointer-events:none;
        opacity:0;
        transition:opacity .18s ease, transform .18s ease;
        z-index:100;
        box-shadow:var(--shadow2);
      }
      [data-tip]:hover::after{
        opacity:1;
        transform:translateX(-50%) translateY(0);
      }

      /* Tooltip below the element (for header / top-area buttons) */
      [data-tip].tip-down::after{
        bottom:auto;
        top:calc(100% + 8px);
        transform:translateX(-50%) translateY(-4px);
      }
      [data-tip].tip-down:hover::after{
        transform:translateX(-50%) translateY(0);
      }

      /* Root wrapper to re-enable pointer events only inside */
      .pg-root{
        position: relative;
        pointer-events: auto;
      }

      /* Floating toggle */
      #pg-toggle-btn{
        width: 52px;
        height: 52px;
        border-radius: 16px;
        border: 1px solid var(--stroke);
        background: var(--bg1);
        box-shadow: var(--shadow2);
        cursor: pointer;
        display: grid;
        place-items: center;
        outline: none;
        position: relative;
        overflow: hidden;
        transform: translateZ(0);
        transition: transform .2s ease, background .2s ease, border-color .2s ease, box-shadow .2s ease;
      }
      #pg-toggle-btn:hover{ transform:translateY(-2px); background:var(--bg2); border-color:var(--stroke2); box-shadow:var(--shadow2),0 0 20px rgba(88,166,255,.15); }
      #pg-toggle-btn:active{ transform:translateY(0) scale(.96); }
      #pg-toggle-btn:focus-visible{ box-shadow:var(--ring); }
      #pg-toggle-btn.quantum-active{
        border-color: rgba(188,140,255,.4);
        background: var(--quantum-bg);
        box-shadow: var(--shadow2), 0 0 16px rgba(188,140,255,.2);
      }
      #pg-toggle-btn.quantum-active:hover{ box-shadow:var(--shadow2),0 0 28px rgba(188,140,255,.30); }
      #pg-toggle-btn.quantum-active:focus-visible{ box-shadow:var(--ringQ); }

      #pg-icon{
        width: 22px;
        height: 22px;
        fill: var(--brand);
        transition: fill .2s ease;
      }
      .quantum-active #pg-icon{ fill: var(--quantum); }

      /* Panel */
      #pg-panel{
        position: absolute;
        right: 0;
        bottom: 64px;
        width: clamp(380px, 75vw, 860px);
        max-height: min(85vh, 850px);
        display: none;
        flex-direction: column;
        padding: 0;
        border-radius: var(--r16);
        border: 1px solid var(--stroke);
        background: var(--bg0);
        box-shadow: var(--shadow);
        overflow: hidden;
        transform: translateZ(0);
      }

      .pg-scroll{
        overflow-y: auto;
        overflow-x: hidden;
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .pg-scroll::-webkit-scrollbar{ width:6px; }
      .pg-scroll::-webkit-scrollbar-track{ background:transparent; }
      .pg-scroll::-webkit-scrollbar-thumb{
        background: var(--bg3);
        border-radius: 999px;
      }
      .pg-scroll::-webkit-scrollbar-thumb:hover{ background:var(--stroke2); }

      .pg-layout {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        align-items: start;
      }
      .pg-column {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      /* Header */
      .pg-header{
        display:flex; align-items:center; justify-content:space-between; gap:12px;
        padding:12px; border-bottom:1px solid var(--stroke); background:var(--bg1);
      }
      .pg-header-controls {
        display: flex;
        gap: 8px;
        align-items: center;
      }
      .pg-title{ margin:0; display:flex; align-items:center; gap:8px; font-size:15px; font-weight:700; letter-spacing:.3px; color:var(--text-bright); }
      .pg-subtitle{ margin:0; font-size:11px; color:var(--text-dim); letter-spacing:.2px; }
      .pg-titleBlock{ display:flex; flex-direction:column; gap:2px; min-width:0; }
      .pg-close{
        width:32px; height:32px; border-radius:var(--r8); border:1px solid var(--stroke);
        background:var(--bg2); color:var(--muted); cursor:pointer; display:grid; place-items:center;
        font-size:14px; outline:none;
        transition:background .15s,border-color .15s,color .15s,transform .15s;
      }
      .pg-close:hover{ background:var(--bg3); border-color:var(--stroke2); color:var(--text); }
      .pg-close:active{ transform:scale(.94); }
      .pg-close:focus-visible{ box-shadow:var(--ring); }

      /* Toast */
      #pg-toast{
        position:absolute; top:12px; left:12px; right:12px; display:none; align-items:center; gap:10px;
        padding:10px 14px; border-radius:var(--r10); border:1px solid var(--stroke);
        background:var(--bg1); box-shadow:var(--shadow2); z-index:50;
      }
      #pg-toast.toast-success{ border-color:rgba(63,185,80,.4); }
      #pg-toast.toast-warn{ border-color:rgba(210,153,34,.4); }
      #pg-toast.toast-danger{ border-color:rgba(248,81,73,.4); }
      #pg-toast .icon{ font-size:16px; flex-shrink:0; }
      #pg-toast .t{ font-size:12px; color:var(--text); line-height:1.4; flex:1; }
      #pg-toast .x{
        border:none; background:transparent; color:var(--text-dim); cursor:pointer;
        font-size:16px; line-height:1; padding:2px 4px; border-radius:4px;
        transition:color .15s,background .15s;
      }
      #pg-toast .x:hover{ color:var(--text); background:var(--bg2); }

      /* Output row */
      .pg-output{ display:grid; grid-template-columns:1fr auto auto; gap:8px; align-items:stretch; }
      #pg-password-output{
        width:100%; box-sizing:border-box; padding:10px 12px;
        border-radius:var(--r10); border:1px solid var(--stroke); background:var(--bg1);
        color:var(--text-bright); outline:none; font-family:var(--mono); font-size:14px;
        letter-spacing:.5px; line-height:1.4; min-height:40px;
        transition:border-color .18s,box-shadow .18s;
      }
      #pg-password-output:focus-visible{ border-color:var(--brand); box-shadow:var(--ring); }
      #pg-password-output.quantum-mode:focus-visible{ border-color:var(--quantum); box-shadow:var(--ringQ); }

      /* Buttons */
      .pg-btn{
        border:1px solid var(--stroke); border-radius:var(--r10); background:var(--bg2);
        color:var(--text); cursor:pointer; padding:8px 12px; min-height:36px;
        display:inline-flex; align-items:center; justify-content:center; gap:6px;
        outline:none; font-size:12px; font-weight:500; letter-spacing:.1px;
        transition:transform .15s,background .15s,border-color .15s,box-shadow .15s;
        position:relative; overflow:hidden; user-select:none;
      }
      .pg-btn:hover{ background:var(--bg3); border-color:var(--stroke2); transform:translateY(-1px); }
      .pg-btn:active{ transform:translateY(0) scale(.98); }
      .pg-btn:focus-visible{ box-shadow:var(--ring); }
      .pg-btn[disabled]{ opacity:.4; cursor:not-allowed; transform:none; }

      .pg-btn.primary{
        border-color:rgba(88,166,255,.3); background:var(--brand); color:#fff;
        box-shadow:0 4px 12px rgba(88,166,255,.2);
      }
      .pg-btn.primary:hover{ background:#79bbff; box-shadow:0 6px 16px rgba(88,166,255,.3); }
      .pg-btn.primary:focus-visible{ box-shadow:0 4px 12px rgba(88,166,255,.2),var(--ring); }
      .pg-btn.primary.quantum{
        border-color:rgba(188,140,255,.3); background:var(--quantum);
        box-shadow:0 4px 12px rgba(188,140,255,.2);
      }
      .pg-btn.primary.quantum:hover{ background:#cfb3ff; }
      .pg-btn.primary.quantum:focus-visible{ box-shadow:0 4px 12px rgba(188,140,255,.2),var(--ringQ); }

      .pg-actions{ display:flex; gap:8px; }

      /* Sections */
      .pg-section{
        border:1px solid var(--stroke); border-radius:var(--r12); background:var(--bg1);
        padding:12px; display:flex; flex-direction:column; gap:8px;
      }
      .pg-section-head{
        display:flex; align-items:center; gap:8px; cursor:pointer; user-select:none;
        padding:0; border:none; background:none; color:var(--text); font-size:12px;
        font-weight:600; letter-spacing:.3px; text-transform:uppercase;
        transition:color .15s;
      }
      .pg-section-head:hover{ color:var(--text-bright); }
      .pg-section-head .chevron{
        font-size:10px; color:var(--text-dim); transition:transform .2s ease;
      }
      .pg-section-head .chevron.open{ transform:rotate(90deg); }
      .pg-section-body{
        overflow:hidden; transition:max-height .3s ease,opacity .25s ease;
      }
      .pg-section-body.collapsed{ max-height:0!important; opacity:0; pointer-events:none; }

      .pg-row{ display:flex; align-items:center; justify-content:space-between; gap:10px; }
      .pg-label{ font-size:12px; letter-spacing:.15px; color:var(--muted); }
      .pg-value{ font-size:12px; color:var(--text); font-weight:600; letter-spacing:.2px; font-family:var(--mono); }

      /* Switch */
      .pg-switch{ display:inline-flex; align-items:center; gap:10px; user-select:none; }
      .switch{
        position:relative; width:40px; height:22px; border-radius:999px;
        border:1px solid var(--stroke); background:var(--bg3);
        transition:background .2s,border-color .2s,box-shadow .18s; flex:0 0 auto; cursor:pointer;
      }
      .switch::after{
        content:""; position:absolute; top:2px; left:2px; width:16px; height:16px;
        border-radius:999px; background:var(--muted);
        box-shadow:0 2px 4px rgba(0,0,0,.3);
        transition:transform .22s cubic-bezier(.2,.9,.2,1),background .2s;
      }
      input[type="checkbox"].pg-switchInput{
        position:absolute; opacity:0; width:1px; height:1px; pointer-events:none;
      }
      input[type="checkbox"].pg-switchInput:focus-visible + .switch{ box-shadow:var(--ring); }
      input[type="checkbox"].pg-switchInput:checked + .switch{
        background:var(--quantum-bg); border-color:rgba(188,140,255,.4);
      }
      input[type="checkbox"].pg-switchInput:checked + .switch::after{
        transform:translateX(18px); background:var(--quantum);
      }

      /* Length slider */
      .pg-slider{ display:grid; grid-template-columns:1fr auto; gap:10px; align-items:center; }
      input[type="range"]{
        -webkit-appearance:none; width:100%; height:6px; border-radius:3px;
        background:var(--bg3); outline:none; cursor:pointer;
      }
      input[type="range"]::-webkit-slider-thumb{
        -webkit-appearance:none; width:18px; height:18px; border-radius:50%;
        background:var(--brand); border:2px solid var(--bg0);
        box-shadow:0 2px 6px rgba(0,0,0,.4); cursor:pointer;
        transition:transform .15s,box-shadow .15s;
      }
      input[type="range"]::-webkit-slider-thumb:hover{ transform:scale(1.15); box-shadow:0 2px 8px rgba(88,166,255,.4); }
      input[type="range"]:focus-visible::-webkit-slider-thumb{ box-shadow:var(--ring); }

      /* Options grid */
      .pg-grid{ display:grid; grid-template-columns:1fr 1fr; gap:8px; }
      @media(max-width:768px){
        .pg-layout{ grid-template-columns: 1fr; }
      }
      @media(max-width:420px){
        #pg-panel{ width:96vw; right:2vw; left:2vw; margin:0 auto; }
        .pg-grid{ grid-template-columns:1fr; }
        .pg-output{ grid-template-columns:1fr; }
      }
      .pg-check{
        display:flex; align-items:center; justify-content:space-between; gap:8px;
        border:1px solid var(--stroke); border-radius:var(--r10);
        background:var(--bg2); padding:10px 12px;
        transition:transform .14s,background .15s,border-color .15s,box-shadow .15s;
        cursor:pointer;
      }
      .pg-check:hover{ background:var(--bg3); border-color:var(--stroke2); transform:translateY(-1px); }
      .pg-check:has(input:focus-visible){ box-shadow:var(--ring); }
      .pg-check span{ font-size:12px; color:var(--text); letter-spacing:.15px; font-weight:500; }
      .pg-check input[type="checkbox"]{ width:16px; height:16px; cursor:pointer; accent-color:var(--brand); }

      /* Quantum badge */
      #pg-badge{
        display:none; font-size:9px; letter-spacing:.8px; font-weight:700;
        padding:3px 8px; border-radius:999px;
        border:1px solid rgba(188,140,255,.3); color:var(--quantum);
        background:var(--quantum-bg); text-transform:uppercase;
      }

      /* Strength meter — segmented */
      .pg-meter{ display:flex; gap:3px; height:6px; }
      .pg-meter-seg{
        flex:1; border-radius:3px; background:var(--bg3);
        transition:background .25s ease;
      }
      .pg-meter-seg.lit-red{ background:#f85149; }
      .pg-meter-seg.lit-orange{ background:#d29922; }
      .pg-meter-seg.lit-yellow{ background:#e3b341; }
      .pg-meter-seg.lit-green{ background:#3fb950; }
      .pg-meter-seg.lit-cyan{ background:#58a6ff; }

      .pg-meterRow{ display:flex; align-items:center; justify-content:space-between; gap:10px; }
      .pg-hint{ font-size:11px; color:var(--text-dim); line-height:1.4; }

      /* ===== Analysis Section ===== */
      .pg-analysis{
        border:1px solid var(--stroke); border-radius:var(--r12); background:var(--bg1);
        display:flex; flex-direction:column; overflow:hidden;
      }
      .pg-analysis-header{
        display:flex; align-items:center; justify-content:space-between; gap:10px;
        padding:10px 12px; cursor:pointer; user-select:none;
        transition:background .15s;
      }
      .pg-analysis-header:hover{ background:var(--bg2); }
      .pg-analysis-title{
        font-size:11px; font-weight:600; letter-spacing:.3px; color:var(--text);
        display:flex; align-items:center; gap:8px; text-transform:uppercase;
      }
      .pg-analysis-toggle{
        border:none; background:none; color:var(--brand); cursor:pointer;
        font-size:10px; padding:4px 8px; border-radius:var(--r8);
        transition:background .15s,color .15s; font-weight:500;
      }
      .pg-analysis-toggle:hover{ background:var(--brand-bg); }
      .pg-analysis-content{
        display:none; flex-direction:column; gap:10px; padding:0 12px 12px;
      }
      .pg-analysis-content.visible{
        display:flex; animation:pg-fadeIn .25s ease;
      }
      @media(min-width:769px){
        .pg-analysis-content { display:flex; padding:8px 12px 12px; }
        .pg-analysis-toggle { display:none; }
        .pg-analysis-header { cursor:default; }
        .pg-analysis-header:hover { background:var(--bg1); }
      }

      /* Entropy display */
      .pg-entropy-row{
        display:flex; align-items:center; justify-content:space-between; gap:10px;
        padding:8px 10px; background:var(--bg2); border-radius:var(--r10);
      }
      .pg-entropy-label{ font-size:11px; color:var(--muted); letter-spacing:.15px; }
      .pg-entropy-value{ font-size:15px; font-weight:700; font-family:var(--mono); color:var(--brand); }
      .pg-entropy-value.excellent{ color:var(--success); }
      .pg-entropy-value.good{ color:var(--brand); }
      .pg-entropy-value.fair{ color:var(--warn); }
      .pg-entropy-value.weak{ color:var(--danger); }

      /* Crack Time */
      .pg-crack-section{
        display:flex; flex-direction:column; gap:6px;
        padding:10px; background:var(--bg2); border-radius:var(--r10);
      }
      .pg-crack-header{ display:flex; align-items:center; gap:6px; }
      .pg-crack-icon{ font-size:13px; }
      .pg-crack-title{ font-size:11px; font-weight:600; color:var(--muted); letter-spacing:.15px; text-transform:uppercase; }
      .pg-crack-time{
        font-size:17px; font-weight:700; font-family:var(--mono);
        text-align:center; padding:8px; background:var(--bg1); border-radius:var(--r8);
        transition:all .3s ease;
      }
      .pg-crack-time.instant{ color:var(--danger); background:var(--danger-bg); }
      .pg-crack-time.seconds{ color:#f97316; background:#3d2000; }
      .pg-crack-time.minutes{ color:var(--warn); background:var(--warn-bg); }
      .pg-crack-time.hours{ color:#e3b341; background:#3d3200; }
      .pg-crack-time.days{ color:#7ee787; background:#1a3a2a; }
      .pg-crack-time.months{ color:var(--success); background:var(--success-bg); }
      .pg-crack-time.years{ color:#56d364; background:#1a3a2a; }
      .pg-crack-time.centuries{ color:var(--brand); background:var(--brand-bg); }
      
      .pg-crack-time.danger-pulse{ animation:pg-pulse-danger 1.5s infinite; border:1px solid rgba(248,81,73,.5); }
      .pg-crack-time.quantum-glow{ animation:pg-glow-quantum 2s infinite alternate; border:1px solid var(--quantum); background:var(--quantum-bg); }
      .pg-crack-desc{ font-size:10px; color:var(--text-dim); text-align:center; }
      .pg-crack-modes{ display:flex; flex-direction:column; gap:4px; }
      .pg-crack-mode{
        display:flex; justify-content:space-between; align-items:center;
        padding:6px 10px; background:var(--bg1); border-radius:var(--r8); font-size:11px;
      }
      .pg-mode-label{ color:var(--muted); }
      .pg-mode-value{ font-family:var(--mono); font-weight:600; color:var(--text); }

      /* Character distribution */
      .pg-dist-section{ display:flex; flex-direction:column; gap:6px; }
      .pg-dist-title{ font-size:11px; color:var(--muted); letter-spacing:.15px; text-transform:uppercase; font-weight:600; margin-bottom:2px; }
      .pg-dist-bar{ display:flex; align-items:center; gap:8px; }
      .pg-dist-label{ font-size:11px; color:var(--muted); width:50px; flex-shrink:0; }
      .pg-dist-track{ flex:1; height:6px; background:var(--bg3); border-radius:3px; overflow:hidden; }
      .pg-dist-fill{ height:100%; border-radius:3px; transition:width .3s ease; }
      .pg-dist-fill.uppercase{ background:var(--brand); }
      .pg-dist-fill.lowercase{ background:var(--success); }
      .pg-dist-fill.numbers{ background:var(--warn); }
      .pg-dist-fill.symbols{ background:var(--quantum); }
      .pg-dist-count{ font-size:10px; color:var(--muted); width:28px; text-align:right; flex-shrink:0; font-family:var(--mono); }

      /* Strength breakdown */
      .pg-strength-grid{ display:grid; grid-template-columns:1fr 1fr; gap:6px; }
      .pg-strength-item{
        display:flex; align-items:center; gap:6px; padding:6px 8px;
        background:var(--bg2); border-radius:var(--r8); font-size:11px;
      }
      .pg-strength-icon{
        width:14px; height:14px; border-radius:50%; display:flex; align-items:center;
        justify-content:center; font-size:9px; flex-shrink:0;
      }
      .pg-strength-icon.pass{ background:var(--success-bg); color:var(--success); }
      .pg-strength-icon.fail{ background:var(--danger-bg); color:var(--danger); }
      .pg-strength-icon.warn{ background:var(--warn-bg); color:var(--warn); }
      .pg-strength-text{ color:var(--text); letter-spacing:.1px; }

      /* Recommendations */
      .pg-recommendations{ display:flex; flex-direction:column; gap:6px; }
      .pg-recommendation{
        display:flex; align-items:flex-start; gap:8px; padding:8px 10px;
        background:var(--warn-bg); border-radius:var(--r8);
        border-left:3px solid var(--warn); font-size:11px; color:var(--text); line-height:1.4;
      }
      .pg-recommendation.urgent{ background:var(--danger-bg); border-left-color:var(--danger); }
      .pg-recommendation.good{ background:var(--success-bg); border-left-color:var(--success); }
      .pg-recomm-icon{ flex-shrink:0; margin-top:1px; }

      /* Common password warning */
      .pg-common-warning{
        display:none; align-items:center; gap:8px; padding:10px 12px;
        background:var(--danger-bg); border:1px solid rgba(248,81,73,.3);
        border-radius:var(--r10); font-size:12px; color:var(--danger);
      }
      .pg-common-warning.visible{ display:flex; }

      /* HIBP Breach Check */
      .pg-breach-section{
        display:flex; flex-direction:column; gap:8px;
        padding:10px; background:var(--bg2); border-radius:var(--r10);
      }
      .pg-breach-header{ display:flex; align-items:center; justify-content:space-between; gap:8px; }
      .pg-breach-title{
        font-size:10px; font-weight:600; color:var(--muted);
        letter-spacing:.15px; display:flex; align-items:center; gap:6px; text-transform:uppercase;
      }
      .pg-breach-btn{
        padding:4px 10px; border-radius:var(--r8); border:1px solid var(--stroke);
        background:var(--bg1); color:var(--text); font-size:10px; cursor:pointer;
        transition:background .15s,transform .14s; display:flex; align-items:center; gap:6px;
      }
      .pg-breach-btn:hover{ background:var(--bg3); transform:translateY(-1px); }
      .pg-breach-btn:disabled{ opacity:.4; cursor:not-allowed; transform:none; }
      .pg-breach-btn.loading{ color:var(--brand); }
      .pg-breach-info{
        display:flex; align-items:flex-start; gap:6px; padding:6px 8px;
        background:var(--success-bg); border:1px solid rgba(63,185,80,.2);
        border-radius:var(--r8); font-size:9px; color:var(--success); line-height:1.2;
      }
      .pg-breach-safe-icon{ font-size:10px; flex-shrink:0; margin-top:1px; }
      .pg-breach-safe-text{ opacity:.85; }
      .pg-breach-result{ display:none; flex-direction:column; gap:6px; }
      .pg-breach-result.visible{ display:flex; animation:pg-fadeIn .2s ease; }
      .pg-breach-status{
        display:flex; align-items:center; gap:10px; padding:10px 12px;
        border-radius:var(--r10); font-size:12px;
      }
      .pg-breach-status.safe{ background:var(--success-bg); border:1px solid rgba(63,185,80,.3); color:var(--success); }
      .pg-breach-status.compromised{ background:var(--danger-bg); border:1px solid rgba(248,81,73,.3); color:var(--danger); }
      .pg-breach-status.error{ background:var(--warn-bg); border:1px solid rgba(210,153,34,.3); color:var(--warn); }
      .pg-breach-icon{ font-size:16px; }
      .pg-breach-details{ font-size:11px; color:var(--muted); line-height:1.4; width:100%; }
      .pg-breach-count{ font-weight:700; font-family:var(--mono); }
      .pg-breach-technical{ 
        margin-top:8px; padding:6px; background:var(--bg1); border-radius:var(--r8); 
        border:1px solid var(--stroke); font-family:var(--mono); font-size:9px; color:var(--text-dim);
        display:flex; flex-direction:column; gap:2px;
      }
      .pg-breach-technical span{ color:var(--text); }
      .pg-breach-spinner{
        width:12px; height:12px; border:2px solid var(--stroke);
        border-top-color:var(--brand); border-radius:50%;
        animation:pg-spin .8s linear infinite; display:inline-block; vertical-align:middle;
      }

      /* Accordion */
      .pg-accordion{
        margin-top:16px; border:1px solid var(--stroke); border-radius:var(--r10);
        background:var(--bg2); overflow:hidden;
      }
      .pg-accordion-header{
        display:flex; justify-content:space-between; align-items:center;
        padding:12px; cursor:pointer; font-size:12px; font-weight:600; color:var(--text);
        user-select:none; transition:background .2s;
      }
      .pg-accordion-header:hover{ background:var(--bg3); }
      .pg-accordion-icon{
        transition:transform .3s cubic-bezier(.4,0,.2,1); font-size:10px; color:var(--muted);
      }
      .pg-accordion.expanded .pg-accordion-icon{ transform:rotate(180deg); }
      .pg-accordion-content{
        max-height:0; opacity:0; padding:0 12px;
        transition:all .3s cubic-bezier(.4,0,.2,1);
        font-size:11px; color:var(--text-dim); line-height:1.5;
      }
      .pg-accordion.expanded .pg-accordion-content{
        max-height:600px; opacity:1; padding:0 12px 12px 12px;
      }
      .pg-acc-item{ margin-top:8px; padding-top:8px; border-top:1px dashed var(--stroke2); }
      .pg-acc-item:first-child{ margin-top:0; padding-top:0; border-top:none; }
      .pg-acc-title{ color:var(--text); font-weight:600; margin-bottom:2px; display:flex; align-items:center; gap:6px; }
      .pg-acc-danger{ color:var(--danger); }
      .pg-acc-warn{ color:#e3b341; }
      .pg-acc-solution{ margin-top:4px; display:block; color:var(--success); font-style:italic; }

      /* Quality meter */
      .pg-quality-meter{ height:6px; border-radius:3px; background:var(--bg3); overflow:hidden; }
      .pg-quality-fill{ height:100%; border-radius:3px; transition:width .2s,background .3s; }

      /* Stats */
      .pg-stats-grid{ display:grid; grid-template-columns:repeat(3,1fr); gap:6px; }
      .pg-stat-item{
        display:flex; flex-direction:column; align-items:center; gap:3px;
        padding:10px 6px; background:var(--bg2); border-radius:var(--r10);
      }
      .pg-stat-value{ font-size:16px; font-weight:700; font-family:var(--mono); color:var(--text); }
      .pg-stat-label{ font-size:9px; color:var(--text-dim); text-transform:uppercase; letter-spacing:.5px; font-weight:600; }

      /* Test input */
      .pg-test-section{
        display:flex; flex-direction:column; gap:8px;
        padding:12px; background:var(--bg2); border-radius:var(--r10);
      }
      .pg-test-label{ font-size:11px; color:var(--muted); letter-spacing:.15px; }
      .pg-test-input{
        width:100%; box-sizing:border-box; padding:8px 12px;
        border-radius:var(--r8); border:1px solid var(--stroke);
        background:var(--bg1); color:var(--text); font-family:var(--mono);
        font-size:13px; outline:none; transition:border-color .18s,box-shadow .18s;
      }
      .pg-test-input:focus{ border-color:var(--brand); box-shadow:var(--ring); }
      .pg-test-input::placeholder{ color:var(--text-dim); }
      .pg-test-actions{ display:flex; gap:6px; }
      .pg-test-btn{
        flex:1; padding:7px 12px; border-radius:var(--r8); border:1px solid var(--stroke);
        background:var(--bg1); color:var(--text); font-size:11px; cursor:pointer;
        transition:background .15s,transform .14s;
      }
      .pg-test-btn:hover{ background:var(--bg3); transform:translateY(-1px); }
      .pg-test-btn.primary{ background:var(--brand); border-color:var(--brand); color:#fff; }
      .pg-test-btn.primary:hover{ background:#79bbff; }

      /* Footer */
      .pg-footer{
        padding:10px 16px; border-top:1px solid var(--stroke); background:var(--bg1);
        display:flex; align-items:center; justify-content:space-between;
        font-size:10px; color:var(--text-dim); letter-spacing:.15px;
      }
      .pg-footer a{ color:var(--brand); text-decoration:none; }
      .pg-footer a:hover{ text-decoration:underline; }

      /* Reduced motion */
      @media(prefers-reduced-motion:reduce){
        *{ transition:none!important; animation:none!important; }
      }
    `;
    shadow.appendChild(style);

    // ---- HTML
    const root = document.createElement('div');
    root.className = 'pg-root';
    root.innerHTML = `
      <button id="pg-toggle-btn" aria-label="Open CASIMIR" aria-expanded="false" title="CASIMIR">
        <svg id="pg-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12.65 10C11.83 7.67 9.61 6 7 6a5 5 0 0 0 0 10c2.61 0 4.83-1.67 5.65-4H17v4h4v-4h2v-4H12.65zM7 14a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"/>
        </svg>
      </button>

      <section id="pg-panel" role="dialog" aria-label="CASIMIR password generator">
        <div id="pg-toast" aria-live="polite">
          <div class="t" id="pg-toast-text"></div>
          <button class="x" id="pg-toast-close" title="Close">×</button>
        </div>

        <div class="pg-header">
          <div class="pg-titleBlock">
            <h3 class="pg-title">
              CASIMIR
              <span id="pg-badge">QUANTUM</span>
            </h3>
            <p class="pg-subtitle"><span data-i18n="subtitle">Cryptographic Authentication System In Micro Interval Randomness</span> · 1.0.0.0358</p>
          </div>
          <div class="pg-header-controls">
            <button class="pg-close" id="pg-lang-toggle" aria-label="Toggle language">EN</button>
            <button class="pg-close tip-down" id="pg-theme-toggle" data-i18n-tip="theme_tip" aria-label="Toggle theme">☀️</button>
            <button class="pg-close tip-down" id="pg-close" data-i18n-tip="close_tip" aria-label="Close panel">✕</button>
          </div>
        </div>

        <div class="pg-scroll" id="pg-scroll">
          <div class="pg-layout">
            <div class="pg-column">
              <div class="pg-output">
            <input type="text" id="pg-password-output" readonly placeholder="Нажмите Generate — пароль появится здесь" data-i18n-ph="output_ph" />
            <button class="pg-btn" id="pg-copy-btn" data-i18n-tip="copy_btn">📋</button>
          </div>

          <div class="pg-section">
            <div class="pg-row">
              <div>
                <div class="pg-label" data-i18n="mode_label">Режим</div>
                <div class="pg-value">Quantum Mode (ANU QRNG)</div>
              </div>

              <label class="pg-switch tip-down" data-i18n-tip="quantum_tip">
                <input class="pg-switchInput" type="checkbox" id="pg-quantum-toggle" />
                <span class="switch" aria-hidden="true"></span>
              </label>
            </div>
          </div>

          <div class="pg-section">
            <div class="pg-row">
              <div class="pg-label" data-i18n="length_label">Длина</div>
              <div class="pg-value"><span id="pg-length-val">16</span></div>
            </div>
            <div class="pg-slider">
              <input type="range" id="pg-length" min="4" max="64" value="16" />
              <button class="pg-btn" id="pg-randomize" data-i18n-tip="rand_tip">🎲</button>
            </div>

            <div class="pg-meterRow">
              <div class="pg-label" data-i18n="analysis_label">Оценка стойкости</div>
              <div class="pg-value" id="pg-strength-text" data-i18n="score_none">—</div>
            </div>
            <div class="pg-meter" aria-hidden="true">
              <div class="pg-meter-seg" id="pg-seg-1"></div>
              <div class="pg-meter-seg" id="pg-seg-2"></div>
              <div class="pg-meter-seg" id="pg-seg-3"></div>
              <div class="pg-meter-seg" id="pg-seg-4"></div>
              <div class="pg-meter-seg" id="pg-seg-5"></div>
            </div>
            <div class="pg-hint" id="pg-hint" data-i18n="hint_msg">
              Для лучшей безопасности используйте 16–24 символа и все классы символов.
            </div>
          </div>

          <div class="pg-grid">
            <label class="pg-check" data-i18n-tip="upper_tip">
              <span data-i18n="upper_label">A‑Z</span>
              <input type="checkbox" id="pg-uppercase" checked />
            </label>
            <label class="pg-check" data-i18n-tip="lower_tip">
              <span data-i18n="lower_label">a‑z</span>
              <input type="checkbox" id="pg-lowercase" checked />
            </label>
            <label class="pg-check" data-i18n-tip="num_tip">
              <span data-i18n="num_label">0‑9</span>
              <input type="checkbox" id="pg-numbers" checked />
            </label>
            <label class="pg-check" data-i18n-tip="sym_tip">
              <span data-i18n="sym_label">!@#$</span>
              <input type="checkbox" id="pg-symbols" checked />
            </label>
            <label class="pg-check" data-i18n-tip="first_tip">
              <span data-i18n="first_label">(A-z)...</span>
              <input type="checkbox" id="pg-first-letter" />
            </label>
            <label class="pg-check" data-i18n-tip="ambig_tip">
              <span data-i18n="ambig_label">Без i,l,O</span>
              <input type="checkbox" id="pg-no-ambiguous" />
            </label>
            <label class="pg-check" data-i18n-tip="repeat_tip">
              <span data-i18n="repeat_label">Уникальные</span>
              <input type="checkbox" id="pg-no-repeats" />
            </label>
          </div>

          <button class="pg-btn primary" id="pg-generate-btn"><span data-i18n="gen_btn">Генерировать</span></button>
          
          <div class="pg-accordion" id="pg-security-accordion">
            <div class="pg-accordion-header" id="pg-acc-toggle">
              <span>🛡️ <span data-i18n="cant_protect">Что генератор не защитит</span></span>
              <span class="pg-accordion-icon">▼</span>
            </div>
            <div class="pg-accordion-content" id="pg-acc-content">
              <span data-i18n="cant_protect_sub">Идеальный пароль бессилен против этих угроз. Требуются иные меры защиты.</span>
              <div class="pg-acc-item">
                <div class="pg-acc-title"><span class="pg-acc-danger">▶</span> <span data-i18n="w_phish">Социальная инженерия и Фишинг</span></div>
                <span data-i18n="w_phish_d">Если вы введете криптоустойчивый пароль на фейковом сайте (напр. vk0ntakte.ru), злоумышленники его получат.</span>
                <span class="pg-acc-solution" data-i18n="w_phish_s">Решение: Аппаратные ключи (U2F) и внимательность.</span>
              </div>
              <div class="pg-acc-item">
                <div class="pg-acc-title"><span class="pg-acc-danger">▶</span> <span data-i18n="w_key">Кейлоггеры и Трояны</span></div>
                <span data-i18n="w_key_d">Вирус может записать клавиатуру или украсть пароль в момент нажатия кнопки "Скопировать" (мониторинг буфера обмена).</span>
                <span class="pg-acc-solution" data-i18n="w_key_s">Решение: Антивирусы и 2FA (двухфакторная авторизация).</span>
              </div>
              <div class="pg-acc-item">
                <div class="pg-acc-title"><span class="pg-acc-warn">▶</span> <span data-i18n="w_time">Атака по времени (Timing attack)</span></div>
                <span data-i18n="w_time_d">Серверная прореха, позволяющая хакеру посимвольно угадать пароль, измеряя микросекунды задержки ответа сервера во время сверки.</span>
                <span class="pg-acc-solution" data-i18n="w_time_s">Решение: Серверные фиксы (crypto.timingSafeEqual). Длина пароля здесь почти не влияет.</span>
              </div>
              <div class="pg-acc-item">
                <div class="pg-acc-title"><span class="pg-acc-warn">▶</span> <span data-i18n="w_sess">Session Hijacking (Угон Cookie)</span></div>
                <span data-i18n="w_sess_d">Хакер крадет ваш авторизационный токен (Cookie) и заходит на сайт без пароля.</span>
                <span class="pg-acc-solution" data-i18n="w_sess_s">Решение: Регулярное разлогинивание и очистка сессий браузера.</span>
              </div>
            </div>
          </div>

            </div>

            <div class="pg-column">
              <div class="pg-analysis">
            <div class="pg-analysis-header">
              <span class="pg-analysis-title">🔍 <span data-i18n="analysis_label">Анализ пароля</span></span>
              <button class="pg-analysis-toggle" id="pg-analysis-toggle" data-i18n="show_btn">Показать</button>
            </div>
            <div class="pg-analysis-content" id="pg-analysis-content">

              <!-- Test custom password -->
              <div class="pg-test-section">
                <div class="pg-test-label" data-i18n="test_label">Тестировать свой пароль:</div>
                <input type="text" class="pg-test-input" id="pg-test-input" placeholder="Введите пароль для анализа..." data-i18n-ph="test_ph" />
                <div class="pg-test-actions">
                  <button class="pg-test-btn primary" id="pg-analyze-btn" data-i18n="analyze_btn">Анализировать</button>
                  <button class="pg-test-btn" id="pg-clear-test" data-i18n="clear_btn">Очистить</button>
                </div>
              </div>

              <!-- Common password warning -->
              <div class="pg-common-warning" id="pg-common-warning">
                <span>⚠️</span>
                <span data-i18n="t_danger">Этот пароль найден в базах утекших паролей! Использовать небезопасно.</span>
              </div>

              <!-- Quality meter -->
              <div>
                <div class="pg-row" style="margin-bottom: 4px;">
                  <div class="pg-label" data-i18n="overall_rate">Общая оценка</div>
                  <div class="pg-value" id="pg-quality-text" data-i18n="awaiting">—</div>
                </div>
                <div class="pg-quality-meter">
                  <div class="pg-quality-fill" id="pg-quality-bar"></div>
                </div>
              </div>

              <!-- Entropy -->
              <div class="pg-entropy-row">
                <div class="pg-entropy-label" data-i18n="entropy_label">Энтропия</div>
                <div class="pg-entropy-value" id="pg-entropy-value">— бит</div>
              </div>

              <!-- Crack Time Estimation -->
              <div class="pg-crack-section">
                <div class="pg-crack-header">
                  <span class="pg-crack-icon">⏱️</span>
                  <span class="pg-crack-title" data-i18n="crack_label">Время взлома</span>
                </div>
                <div class="pg-crack-time" id="pg-crack-time">—</div>
                <div class="pg-crack-desc" id="pg-crack-desc" data-i18n="crack_desc">Оценка при офлайн-атаке (GPU взлом)</div>
                <div class="pg-crack-modes">
                  <div class="pg-crack-mode">
                    <span class="pg-mode-label" data-i18n="mode_on">Онлайн</span>
                    <span class="pg-mode-value" id="pg-crack-online">—</span>
                  </div>
                  <div class="pg-crack-mode">
                    <span class="pg-mode-label" data-i18n="mode_off_f">Офлайн (быстро)</span>
                    <span class="pg-mode-value" id="pg-crack-offline-fast">—</span>
                  </div>
                  <div class="pg-crack-mode">
                    <span class="pg-mode-label" data-i18n="mode_off_s">Офлайн (медленно)</span>
                    <span class="pg-mode-value" id="pg-crack-offline-slow">—</span>
                  </div>
                </div>
              </div>

              <!-- Statistics -->
              <div class="pg-stats-grid">
                <div class="pg-stat-item">
                  <div class="pg-stat-value" id="pg-stat-length">0</div>
                  <div class="pg-stat-label" data-i18n="stat_len">Длина</div>
                </div>
                <div class="pg-stat-item">
                  <div class="pg-stat-value" id="pg-stat-unique">0</div>
                  <div class="pg-stat-label" data-i18n="stat_uni">Уникальных</div>
                </div>
                <div class="pg-stat-item">
                  <div class="pg-stat-value" id="pg-stat-score">0%</div>
                  <div class="pg-stat-label" data-i18n="stat_score">Сложность</div>
                </div>
              </div>

              <!-- Character distribution -->
              <div class="pg-dist-section">
                <div class="pg-dist-title" data-i18n="dist_title">Распределение символов</div>
                <div class="pg-dist-bar">
                  <span class="pg-dist-label">A-Z</span>
                  <div class="pg-dist-track"><div class="pg-dist-fill uppercase" id="pg-dist-upper" style="width: 0%"></div></div>
                  <span class="pg-dist-count" id="pg-count-upper">0</span>
                </div>
                <div class="pg-dist-bar">
                  <span class="pg-dist-label">a-z</span>
                  <div class="pg-dist-track"><div class="pg-dist-fill lowercase" id="pg-dist-lower" style="width: 0%"></div></div>
                  <span class="pg-dist-count" id="pg-count-lower">0</span>
                </div>
                <div class="pg-dist-bar">
                  <span class="pg-dist-label">0-9</span>
                  <div class="pg-dist-track"><div class="pg-dist-fill numbers" id="pg-dist-numbers" style="width: 0%"></div></div>
                  <span class="pg-dist-count" id="pg-count-numbers">0</span>
                </div>
                <div class="pg-dist-bar">
                  <span class="pg-dist-label">!@#$</span>
                  <div class="pg-dist-track"><div class="pg-dist-fill symbols" id="pg-dist-symbols" style="width: 0%"></div></div>
                  <span class="pg-dist-count" id="pg-count-symbols">0</span>
                </div>
              </div>

              <!-- Strength breakdown -->
              <div class="pg-strength-grid">
                <div class="pg-strength-item" id="pg-str-length">
                  <span class="pg-strength-icon fail">✕</span>
                  <span class="pg-strength-text" data-i18n="sb_len">Минимум 12 символов</span>
                </div>
                <div class="pg-strength-item" id="pg-str-upper">
                  <span class="pg-strength-icon fail">✕</span>
                  <span class="pg-strength-text" data-i18n="sb_up">Заглавные буквы</span>
                </div>
                <div class="pg-strength-item" id="pg-str-lower">
                  <span class="pg-strength-icon fail">✕</span>
                  <span class="pg-strength-text" data-i18n="sb_low">Строчные буквы</span>
                </div>
                <div class="pg-strength-item" id="pg-str-numbers">
                  <span class="pg-strength-icon fail">✕</span>
                  <span class="pg-strength-text" data-i18n="sb_num">Цифры</span>
                </div>
                <div class="pg-strength-item" id="pg-str-symbols">
                  <span class="pg-strength-icon fail">✕</span>
                  <span class="pg-strength-text" data-i18n="sb_sym">Спецсимволы</span>
                </div>
                <div class="pg-strength-item" id="pg-str-unique">
                  <span class="pg-strength-icon fail">✕</span>
                  <span class="pg-strength-text" data-i18n="sb_uni">Уникальные символы</span>
                </div>
              </div>

              <!-- Recommendations -->
              <div class="pg-recommendations" id="pg-recommendations">
                <div class="pg-recommendation">
                  <span class="pg-recomm-icon">💡</span>
                  <span>Введите или сгенерируйте пароль для анализа</span>
                </div>
              </div>

              <!-- HIBP Breach Check -->
              <div class="pg-breach-section">
                <div class="pg-breach-header">
                  <span class="pg-breach-title">
                    <span>🛡️</span>
                    <span data-i18n="hibp_btn">Проверка в базах утечек (HIBP)</span>
                  </span>
                  <button class="pg-breach-btn" id="pg-breach-btn">
                    <span id="pg-breach-btn-text" data-i18n="hibp_btn">Проверить</span>
                  </button>
                </div>
                <div class="pg-breach-info">
                  <span class="pg-breach-safe-icon">🔒</span>
                  <span class="pg-breach-safe-text" data-i18n="acc_h_desc">Пароль хешируется локально (SHA-1), на сервер отправляются только первые 5 символов хеша.</span>
                </div>
                <div class="pg-breach-result" id="pg-breach-result">
                  <div class="pg-breach-status" id="pg-breach-status">
                    <span class="pg-breach-icon" id="pg-breach-icon">✓</span>
                    <span id="pg-breach-message" data-i18n="hibp_test">Проверка...</span>
                  </div>
                  <div class="pg-breach-details" id="pg-breach-details"></div>
                </div>
              </div>

            </div>
          </div>
            </div>
          </div>
        </div>
        <div class="pg-footer">
          <span>made with ♥ by meshlg</span>
          <span>Quantum + HIBP</span>
        </div>
      </section>
    `;
    shadow.appendChild(root);

    // ---- Elements
    const toggleBtn = shadow.getElementById('pg-toggle-btn');
    const panel = shadow.getElementById('pg-panel');
    const closeBtn = shadow.getElementById('pg-close');

    const output = shadow.getElementById('pg-password-output');
    const copyBtn = shadow.getElementById('pg-copy-btn');
    const generateBtn = shadow.getElementById('pg-generate-btn');

    const cbUpper = shadow.getElementById('pg-uppercase');
    const cbLower = shadow.getElementById('pg-lowercase');
    const cbNumbers = shadow.getElementById('pg-numbers');
    const cbSymbols = shadow.getElementById('pg-symbols');
    const cbFirstLetter = shadow.getElementById('pg-first-letter');
    const cbNoAmbiguous = shadow.getElementById('pg-no-ambiguous');
    const cbNoRepeats = shadow.getElementById('pg-no-repeats');
    const cbQuantum = shadow.getElementById('pg-quantum-toggle');

    const lengthRange = shadow.getElementById('pg-length');
    const lengthVal = shadow.getElementById('pg-length-val');
    const badge = shadow.getElementById('pg-badge');

    const toast = shadow.getElementById('pg-toast');
    const toastText = shadow.getElementById('pg-toast-text');
    const toastClose = shadow.getElementById('pg-toast-close');

    const meterSegs = [1, 2, 3, 4, 5].map(i => shadow.getElementById('pg-seg-' + i));
    const strengthText = shadow.getElementById('pg-strength-text');

    const randomizeBtn = shadow.getElementById('pg-randomize');

    // ---- Analysis Elements
    const analysisToggle = shadow.getElementById('pg-analysis-toggle');
    const analysisContent = shadow.getElementById('pg-analysis-content');
    const testInput = shadow.getElementById('pg-test-input');
    const analyzeBtn = shadow.getElementById('pg-analyze-btn');
    const clearTestBtn = shadow.getElementById('pg-clear-test');
    const commonWarning = shadow.getElementById('pg-common-warning');
    const qualityText = shadow.getElementById('pg-quality-text');
    const qualityBar = shadow.getElementById('pg-quality-bar');
    const entropyValue = shadow.getElementById('pg-entropy-value');
    const statLength = shadow.getElementById('pg-stat-length');
    const statUnique = shadow.getElementById('pg-stat-unique');
    const statScore = shadow.getElementById('pg-stat-score');
    const distUpper = shadow.getElementById('pg-dist-upper');
    const distLower = shadow.getElementById('pg-dist-lower');
    const distNumbers = shadow.getElementById('pg-dist-numbers');
    const distSymbols = shadow.getElementById('pg-dist-symbols');
    const countUpper = shadow.getElementById('pg-count-upper');
    const countLower = shadow.getElementById('pg-count-lower');
    const countNumbers = shadow.getElementById('pg-count-numbers');
    const countSymbols = shadow.getElementById('pg-count-symbols');
    const strLength = shadow.getElementById('pg-str-length');
    const strUpper = shadow.getElementById('pg-str-upper');
    const strLower = shadow.getElementById('pg-str-lower');
    const strNumbers = shadow.getElementById('pg-str-numbers');
    const strSymbols = shadow.getElementById('pg-str-symbols');
    const strUnique = shadow.getElementById('pg-str-unique');
    const recommendations = shadow.getElementById('pg-recommendations');

    // ---- Crack Time Elements
    const crackTimeDisplay = shadow.getElementById('pg-crack-time');
    const crackOnline = shadow.getElementById('pg-crack-online');
    const crackOfflineFast = shadow.getElementById('pg-crack-offline-fast');
    const crackOfflineSlow = shadow.getElementById('pg-crack-offline-slow');

    // ---- HIBP Elements
    const breachBtn = shadow.getElementById('pg-breach-btn');
    const breachBtnText = shadow.getElementById('pg-breach-btn-text');
    const breachResult = shadow.getElementById('pg-breach-result');
    const breachStatus = shadow.getElementById('pg-breach-status');
    const breachIcon = shadow.getElementById('pg-breach-icon');
    const breachMessage = shadow.getElementById('pg-breach-message');
    const breachDetails = shadow.getElementById('pg-breach-details');

    // ---- Load settings
    const settings = {
      quantum: !!store.get('quantum', false),
      length: Number(store.get('length', 16)),
      upper: !!store.get('upper', true),
      lower: !!store.get('lower', true),
      numbers: !!store.get('numbers', true),
      symbols: !!store.get('symbols', true),
      firstLetter: !!store.get('firstLetter', false),
      noAmbiguous: !!store.get('noAmbiguous', false),
      noRepeats: !!store.get('noRepeats', false),
      floatBtn: !!store.get('floatBtn', true),
      theme: store.get('theme', 'light'),
      lang: store.get('lang', navigator.language.startsWith('ru') ? 'ru' : 'en'),
    };

    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

    // ---- I18n Dictionary
    const TRANSLATIONS = {
      ru: {
        subtitle: 'Cryptographic Authentication System In Micro Interval Randomness',
        theme_tip: 'Переключить тему',
        close_tip: 'Закрыть панель (Esc)',
        output_ph: 'Нажмите Генерировать — пароль появится здесь',
        copy_btn: 'Скопировать',
        mode_label: 'Режим',
        quantum_tip: 'Использовать ANU QRNG для истинно-случайной генерации',
        length_label: 'Длина',
        upper_label: 'A-Z', lower_label: 'a-z', num_label: '0-9', sym_label: '!@#$',
        adv_label: 'Дополнительно',
        first_tip: 'Гарантирует, что пароль начинается с буквы',
        first_label: 'Буква в начале',
        ambig_tip: 'Исключает похожие символы (i, l, 1, L, o, 0, O)',
        ambig_label: 'Без похожих',
        repeat_tip: 'Избегает повторения символов, пока алфавит не кончится',
        repeat_label: 'Уникальные',
        gen_btn: 'Генерировать',

        acc_title: 'Почему CASIMIR безопасен?',
        acc_q_title: '1. Квантовая энтропия (Австралийский нац. университет)',
        acc_q_desc: 'В отличие от стандартного Math.random(), который предсказуем, CASIMIR запрашивает истинно случайные числа, полученные из измерения квантовых флуктуаций вакуума в лаборатории ANU.',
        acc_l_title: '2. Идеальное распределение (Rejection Sampling)',
        acc_l_desc: 'Алгоритм генерации CASIMIR использует математически безупречный метод отсева (Rejection Sampling) для устранения «смещения по модулю» (modulo bias). Вероятность выпадения любого символа из алфавита абсолютно одинакова.',
        acc_h_title: '3. Полная приватность (Хэширование k-Anonymity)',
        acc_h_desc: 'Когда вы проверяете пароль в базе HIBP, скрипт хэширует его локально по алгоритму SHA-1 и отправляет только первые 5 символов хэша. Никто, включая сервис HIBP, никогда не узнает ваш полный пароль.',

        analysis_label: 'Анализ стойкости',
        awaiting: 'Ожидание...',
        score_none: '—',
        rand_tip: 'Перемешать настройки',
        test_label: 'Проверить свой пароль:',
        test_ph: 'Введите пароль...',
        analyze_btn: 'Анализ',
        entropy_label: 'Энтропия Шеннона',
        crack_label: 'Время взлома (Оценка)',
        crack_desc: 'Худший сценарий для злоумышленника',
        mode_on: 'Онлайн', mode_off_f: 'Офлайн (быстро)', mode_off_s: 'Офлайн (медленно)',
        stat_len: 'Длина', stat_uni: 'Уникальных', stat_score: 'Сложность',
        dist_title: 'Распределение символов',
        sb_len: 'Минимум 12 символов', sb_up: 'Заглавные буквы', sb_low: 'Строчные буквы', sb_num: 'Цифры', sb_sym: 'Символы', sb_uni: 'Разнообразие',
        hibp_btn: 'Проверить по базам утечек (k-Anonymity)',
        hibp_test: 'Проверка...',

        t_quantum: 'Космический вакуум обвалился. Quantum API недоступен. Откат к криптографии.',
        t_safe: 'Пароль безопасен',
        t_danger: 'Пароль утек в сеть!',
        t_pwn_test: 'Этот пароль не найден в известных базах утечек данных.',
        t_copy: 'Скопировано в буфер обмена.',
        t_copy_fail: 'Не удалось скопировать. Нажми Ctrl+C.',
        t_mix: 'Настройки перемешаны.',
        t_err: 'Ошибка генерации. Подробности в консоли.',

        // UI labels
        show_btn: 'Показать', clear_btn: 'Очистить',
        overall_rate: 'Общая оценка',
        hint_msg: 'Для лучшей безопасности используйте 16–24 символа и все классы символов.',
        upper_tip: 'Заглавные буквы (A–Z) — +26 символов',
        lower_tip: 'Строчные буквы (a–z) — +26 символов',
        num_tip: 'Цифры (0–9) — +10 символов',
        sym_tip: 'Спецсимволы (!@#$%...) — максимальная энтропия',

        // Accordion: security threats
        cant_protect: 'Что генератор не защитит',
        cant_protect_sub: 'Идеальный пароль бессилен против этих угроз. Требуются иные меры защиты.',
        w_phish: 'Социальная инженерия и Фишинг',
        w_phish_d: 'Если вы введете криптоустойчивый пароль на фейковом сайте, злоумышленники его получат.',
        w_phish_s: 'Решение: Аппаратные ключи (U2F) и внимательность.',
        w_key: 'Кейлоггеры и Трояны',
        w_key_d: 'Вирус может записать клавиатуру или украсть пароль из буфера обмена.',
        w_key_s: 'Решение: Антивирусы и 2FA.',
        w_time: 'Атака по времени (Timing attack)',
        w_time_d: 'Хакер измеряет микросекунды задержки ответа сервера для посимвольного подбора.',
        w_time_s: 'Решение: Серверные фиксы (crypto.timingSafeEqual).',
        w_sess: 'Session Hijacking (Угон Cookie)',
        w_sess_d: 'Хакер крадет ваш токен (Cookie) и заходит на сайт без пароля.',
        w_sess_s: 'Решение: Регулярный разлогин и очистка сессий браузера.'
      },
      en: {
        subtitle: 'Cryptographic Authentication System In Micro Interval Randomness',
        theme_tip: 'Toggle theme',
        close_tip: 'Close panel (Esc)',
        output_ph: 'Click Generate — password will appear here',
        copy_btn: 'Copy',
        mode_label: 'Mode',
        quantum_tip: 'Use ANU QRNG for true random generation',
        length_label: 'Length',
        upper_label: 'A-Z', lower_label: 'a-z', num_label: '0-9', sym_label: '!@#$',
        adv_label: 'Advanced',
        first_tip: 'Ensures password starts with a letter',
        first_label: 'First is letter',
        ambig_tip: 'Exclude similar characters (i, l, 1, L, o, 0, O)',
        ambig_label: 'No ambiguous',
        repeat_tip: 'Avoids character repetition until alphabet exhaust',
        repeat_label: 'Unique chars',
        gen_btn: 'Generate',

        acc_title: 'Why is CASIMIR secure?',
        acc_q_title: '1. Quantum Entropy (Australian National Uni)',
        acc_q_desc: 'Unlike standard predictable Math.random(), CASIMIR requests true random numbers measured from quantum vacuum fluctuations at the ANU lab.',
        acc_l_title: '2. Perfect Distribution (Rejection Sampling)',
        acc_l_desc: 'The generation algorithm uses the mathematically flawless Rejection Sampling method to eliminate modulo bias. Every character in the alphabet has an identical probability.',
        acc_h_title: '3. Full Privacy (k-Anonymity Hashing)',
        acc_h_desc: 'When you check a password against HIBP, the script hashes it locally using SHA-1 and only sends the first 5 characters. No one, including HIBP, will ever know your full password.',

        analysis_label: 'Strength Analysis',
        awaiting: 'Awaiting...',
        score_none: '—',
        rand_tip: 'Randomize settings',
        test_label: 'Test your own password:',
        test_ph: 'Enter password...',
        analyze_btn: 'Analyze',
        entropy_label: 'Shannon Entropy',
        crack_label: 'Crack Time (Estimation)',
        crack_desc: 'Worst case scenario for attacker',
        mode_on: 'Online', mode_off_f: 'Offline (Fast)', mode_off_s: 'Offline (Slow)',
        stat_len: 'Length', stat_uni: 'Unique', stat_score: 'Complexity',
        dist_title: 'Character Distribution',
        sb_len: '12 characters min', sb_up: 'Uppercase', sb_low: 'Lowercase', sb_num: 'Numbers', sb_sym: 'Symbols', sb_uni: 'Diversity',
        hibp_btn: 'Check against breach DBs (k-Anonymity)',
        hibp_test: 'Checking...',

        t_quantum: 'Cosmic vacuum collapsed. Quantum API unavailable. Fallback to Crypto.',
        t_safe: 'Password is secure',
        t_danger: 'Password leaked!',
        t_pwn_test: 'This password was not found in known data breaches.',
        t_copy: 'Copied to clipboard.',
        t_copy_fail: 'Failed to copy. Press Ctrl+C.',
        t_mix: 'Settings randomized.',
        t_err: 'Generation error. See console details.',

        // UI labels
        show_btn: 'Show', clear_btn: 'Clear',
        overall_rate: 'Overall Rating',
        hint_msg: 'For best security, use 16–24 characters with all character classes.',
        upper_tip: 'Uppercase (A–Z) — +26 chars',
        lower_tip: 'Lowercase (a–z) — +26 chars',
        num_tip: 'Digits (0–9) — +10 chars',
        sym_tip: 'Symbols (!@#$%...) — max entropy',

        // Accordion: security threats
        cant_protect: 'What a generator cannot protect against',
        cant_protect_sub: 'A perfect password is powerless against these threats. Other measures are required.',
        w_phish: 'Social Engineering & Phishing',
        w_phish_d: 'If you enter a strong password on a fake site, attackers will get it.',
        w_phish_s: 'Solution: Hardware keys (U2F) and vigilance.',
        w_key: 'Keyloggers & Trojans',
        w_key_d: 'Malware may record your keyboard or steal the password from clipboard.',
        w_key_s: 'Solution: Antivirus and 2FA.',
        w_time: 'Timing Attack',
        w_time_d: 'Server-side flaw allowing an attacker to guess chars by measuring micro-second response delays.',
        w_time_s: 'Solution: Server-side fixes (crypto.timingSafeEqual).',
        w_sess: 'Session Hijacking (Cookie Theft)',
        w_sess_d: 'An attacker steals your auth token (Cookie) and accesses the site without a password.',
        w_sess_s: 'Solution: Regular log-outs and browser session cleanup.'
      }
    };

    cbQuantum.checked = settings.quantum;
    lengthRange.value = String(clamp(settings.length, 4, 64));
    lengthVal.textContent = lengthRange.value;

    cbUpper.checked = settings.upper;
    cbLower.checked = settings.lower;
    cbNumbers.checked = settings.numbers;
    cbSymbols.checked = settings.symbols;
    if (cbFirstLetter) cbFirstLetter.checked = settings.firstLetter;
    if (cbNoAmbiguous) cbNoAmbiguous.checked = settings.noAmbiguous;
    if (cbNoRepeats) cbNoRepeats.checked = settings.noRepeats;

    // Apply initial floating button state
    toggleBtn.style.display = settings.floatBtn ? 'flex' : 'none';

    // Apply init theme
    const themeBtn = shadow.getElementById('pg-theme-toggle');
    function applyTheme(theme) {
      if (theme === 'dark') {
        container.classList.add('pg-theme-dark');
        themeBtn.textContent = '🌙';
      } else {
        container.classList.remove('pg-theme-dark');
        themeBtn.textContent = '☀️';
      }
    }
    applyTheme(settings.theme);

    // ---- Animations helpers
    let decryptInterval = null;
    let toastTimer = null;
    let quantumCooldownEnd = 0;

    const prefersReducedMotion = () => {
      try { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
      catch (_) { return false; }
    };

    function showToast(message, kind = 'info') {
      toastText.textContent = message;

      // subtle kind styling via text only (keep minimal)
      if (kind === 'warn') toastText.style.color = 'var(--text)';
      if (kind === 'danger') toastText.style.color = 'var(--text)';

      toast.style.display = 'flex';

      if (!prefersReducedMotion()) {
        toast.animate(
          [{ opacity: 0, transform: 'translateY(-8px) scale(.98)' }, { opacity: 1, transform: 'translateY(0) scale(1)' }],
          { duration: 220, easing: 'cubic-bezier(.2,.9,.2,1)' }
        );
      }

      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => hideToast(), 2400);
    }

    function hideToast() {
      clearTimeout(toastTimer);
      toastTimer = null;

      if (toast.style.display === 'none') return;

      if (prefersReducedMotion()) {
        toast.style.display = 'none';
        return;
      }

      const anim = toast.animate(
        [{ opacity: 1, transform: 'translateY(0) scale(1)' }, { opacity: 0, transform: 'translateY(-8px) scale(.98)' }],
        { duration: 180, easing: 'ease-out' }
      );
      anim.onfinish = () => { toast.style.display = 'none'; };
    }

    function openPanel() {
      panel.style.display = 'flex';
      toggleBtn.setAttribute('aria-expanded', 'true');

      if (!prefersReducedMotion()) {
        panel.animate(
          [{ opacity: 0, transform: 'translateY(14px) scale(.98)' }, { opacity: 1, transform: 'translateY(0) scale(1)' }],
          { duration: 260, easing: 'cubic-bezier(.2,.9,.2,1)' }
        );
      }

      // small UX: generate first password on first open
      if (!output.value) generatePassword();
    }

    function closePanel() {
      toggleBtn.setAttribute('aria-expanded', 'false');

      if (prefersReducedMotion()) {
        panel.style.display = 'none';
        return;
      }

      const anim = panel.animate(
        [{ opacity: 1, transform: 'translateY(0) scale(1)' }, { opacity: 0, transform: 'translateY(14px) scale(.98)' }],
        { duration: 200, easing: 'ease-in' }
      );
      anim.onfinish = () => { panel.style.display = 'none'; };
    }

    function togglePanel() {
      const hidden = panel.style.display === 'none' || !panel.style.display;
      if (hidden) openPanel();
      else closePanel();
    }

    function setQuantumVisuals(isEnabled) {
      const dict = TRANSLATIONS[settings.lang || 'ru'];
      if (isEnabled) {
        output.classList.add('quantum-mode');
        generateBtn.classList.add('quantum');
        generateBtn.innerHTML = `<span data-i18n="gen_btn">${dict.gen_btn}</span> (Quantum)`;
        badge.style.display = 'inline-block';
        toggleBtn.classList.add('quantum-active');

        if (!prefersReducedMotion()) {
          badge.animate(
            [{ boxShadow: '0 0 0 0 rgba(168,85,247,.55)' }, { boxShadow: '0 0 0 14px rgba(168,85,247,0)' }],
            { duration: 1500, iterations: Infinity, easing: 'ease-out' }
          );
        }
      } else {
        output.classList.remove('quantum-mode');
        generateBtn.classList.remove('quantum');
        generateBtn.innerHTML = `<span data-i18n="gen_btn">${dict.gen_btn}</span>`;
        badge.style.display = 'none';
        toggleBtn.classList.remove('quantum-active');
        badge.textContent = 'QUANTUM';
        badge.style.background = 'rgba(168,85,247,.92)';
        badge.style.borderColor = 'rgba(168,85,247,.35)';
      }
    }

    function runDecryptEffect(targetText) {
      if (prefersReducedMotion()) {
        output.value = targetText;
        updateStrengthUI(targetText);
        return;
      }

      if (decryptInterval) clearInterval(decryptInterval);

      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{},.?';
      const length = targetText.length;
      let iterations = 0;

      decryptInterval = setInterval(() => {
        const out = targetText.split('').map((ch, idx) => {
          if (idx < iterations) return targetText[idx];
          return chars[Math.floor(Math.random() * chars.length)];
        }).join('');

        output.value = out;

        if (iterations >= length) {
          clearInterval(decryptInterval);
          decryptInterval = null;
          output.value = targetText;
          updateStrengthUI(targetText);
        }

        iterations += 1 / 2; // reveal speed
      }, 28);
    }

    // ---- Strength estimator (very lightweight)
    function estimateEntropyBits(len, alphabetSize) {
      // log2(alphabetSize^len) = len * log2(alphabetSize)
      return len * Math.log2(Math.max(1, alphabetSize));
    }

    function currentAlphabetSize() {
      let size = 0;
      if (cbUpper.checked) size += 26;
      if (cbLower.checked) size += 26;
      if (cbNumbers.checked) size += 10;
      if (cbSymbols.checked) size += 28; // approx for our symbol set below
      return size;
    }

    function updateStrengthUI(text) {
      const len = text ? text.length : Number(lengthRange.value);
      const alphabet = currentAlphabetSize();
      const bits = estimateEntropyBits(len, alphabet);

      // Determine level (0–5) based on entropy bits
      let level = 0;
      let label = '—';
      const colors = ['lit-red', 'lit-orange', 'lit-yellow', 'lit-green', 'lit-cyan'];
      const lang = settings.lang || 'ru';
      if (alphabet === 0) { level = 0; label = lang === 'ru' ? 'Выберите опции' : 'Select options'; }
      else if (bits < 30) { level = 1; label = lang === 'ru' ? 'Очень слабый' : 'Very Weak'; }
      else if (bits < 55) { level = 2; label = lang === 'ru' ? 'Слабый' : 'Weak'; }
      else if (bits < 80) { level = 3; label = lang === 'ru' ? 'Хороший' : 'Good'; }
      else if (bits < 110) { level = 4; label = lang === 'ru' ? 'Сильный' : 'Strong'; }
      else { level = 5; label = lang === 'ru' ? 'Отличный' : 'Excellent'; }

      // Light up segments
      meterSegs.forEach((seg, i) => {
        // Remove all lit classes
        seg.className = 'pg-meter-seg';
        if (i < level) {
          seg.classList.add(colors[Math.min(level - 1, colors.length - 1)]);
        }
      });

      strengthText.textContent = label;
    }

    // ======= ADVANCED PASSWORD ANALYSIS ENGINE v2.0 =======
    // Комплексная методика оценки криптографической стойкости
    // Учитывает: энтропию, паттерны, словарные слова, клавиатурные комбинации,
    // leetspeak-замены, повторяющиеся последовательности и другие факторы

    // =====================================================
    // COMMON PASSWORDS DATABASE (Top 200 + variations)
    // =====================================================
    const COMMON_PASSWORDS = [
      // Top 100 most common
      'password', '123456', '12345678', 'qwerty', 'abc123', 'monkey', '1234567',
      'letmein', 'trustno1', 'dragon', 'baseball', 'iloveyou', 'master', 'sunshine',
      'ashley', 'bailey', 'passw0rd', 'shadow', '123123', '654321', 'superman',
      'qazwsx', 'michael', 'football', 'password1', 'password123', 'welcome',
      'jesus', 'ninja', 'mustang', 'password12', 'admin', 'admin123', 'root',
      'toor', 'pass', 'test', 'guest', 'changeme', '123qwe', 'zxcvbn',
      'azerty', 'starwars', 'hello', 'charlie', 'donald', 'princess', 'qwerty123',
      'login', 'passwor', 'passw0rd123', 'welcome123', '666666',
      '888888', '000000', '121212', 'flower', 'hottie', 'loveme', 'zaq1zaq1',
      'password2', 'secret', 'whatever', 'freedom', 'nicole', 'jessica', 'mitnick',
      'trustme', 'hunter2', 'iloveyou123', 'qwertyuiop', '1q2w3e4r', '1q2w3e4r5t',
      'zxcvbnm', 'asdfgh', 'password!', 'P@ssw0rd', 'P@ssword1', 'Passw0rd!',
      'Qwe123', 'Qwe1234', 'Admin@123', 'Root@123', 'Test@123', 'Welcome!',
      // Seasonal and dates
      'Winter2024', 'Spring2024', 'Summer2024', 'Autumn2024', 'January', 'February',
      'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October',
      'November', 'December', 'Monday', 'Tuesday', 'Wednesday', 'Thursday',
      'Friday', 'Saturday', 'Sunday', 'Password!', 'PASSWORD', 'Password1!',
      'Str0ng!', 'MyP@ss', 'MyPassword!', 'ChangeMe!', 'Secret123!', 'Test1234!',
      // Common patterns
      'aaaaaa', 'bbbbbb', '111111', '123321', 'abcabc', 'ababab',
      'qweqwe', 'asdasd', 'zxczxc', '1qaz2wsx', 'qazwsx', '!@#$%^',
      // Names and words
      'andrew', 'joshua', 'matthew', 'daniel', 'anthony', 'chris', 'david',
      'john', 'mike', 'steve', 'alex', 'kevin', 'brian', 'george', 'james',
      'robert', 'richard', 'steven', 'thomas', 'william', 'lisa', 'sarah',
      'jennifer', 'amanda', 'jessica', 'michelle', 'emily', 'ashley', 'samantha',
      // Brand names and tech
      'google', 'facebook', 'twitter', 'apple', 'microsoft', 'amazon', 'netflix',
      'instagram', 'linkedin', 'youtube', 'spotify', 'snapchat', 'tiktok',
      // Sports and hobbies
      'soccer', 'hockey', 'basketball', 'tennis', 'golf', 'swimming', 'gaming',
      'pokemon', 'minecraft', 'fortnite', 'callofduty', 'xbox', 'playstation',
      // Animals
      'tiger', 'lion', 'eagle', 'shark', 'wolf', 'bear', 'panther', 'falcon',
      'dog', 'cat', 'fish', 'bird', 'horse', 'spider', 'snake', 'dragon',
      // Common phrases
      'fuckyou', 'fuckme', 'asshole', 'bitch', 'sexy', 'hottie', 'lover',
      'iloveyou', 'ihateyou', 'mylove', 'forever', 'always', 'never', 'together'
    ];

    // =====================================================
    // KEYBOARD SEQUENCES DATABASE
    // =====================================================
    const KEYBOARD_SEQUENCES = {
      // QWERTY rows
      rows: [
        'qwertyuiop', 'asdfghjkl', 'zxcvbnm',
        'QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM',
        '1234567890', '!@#$%^&*()'
      ],
      // QWERTY columns
      columns: [
        '1qaz', '2wsx', '3edc', '4rfv', '5tgb', '6yhn', '7ujm', '8ik,', '9ol.', '0p;/',
        'qaz', 'wsx', 'edc', 'rfv', 'tgb', 'yhn', 'ujm', 'ik', 'ol', 'p',
        '!qaz', '@wsx', '#edc', '$rfv', '%tgb', '^yhn', '&ujm', '*ik', '(ol', ')p'
      ],
      // Common patterns
      patterns: [
        'qwerty', 'asdf', 'zxcv', 'qazwsx', 'qweasd',
        '1qaz', '2wsx', '3edc', '4rfv', '5tgb', '6yhn', '7ujm', '8ik', '9ol',
        'zaq1', 'xsw2', 'cde3', 'vfr4', 'bgt5', 'nhy6', 'mju7', 'ki8', 'lo9',
        'qwe', 'asd', 'zxc', 'rty', 'fgh', 'vbn', 'uio', 'jkl', 'm'
      ]
    };

    // =====================================================
    // LEETSPEAK SUBSTITUTION MAP
    // =====================================================
    const LEETSPEAK_MAP = {
      'a': ['4', '@', '/\\', '^', '∂'],
      'b': ['8', '|3', 'ß'],
      'c': ['(', '{', '[', '<', '©'],
      'd': ['|)', '|]', '∂'],
      'e': ['3', '€', 'ë'],
      'f': ['|=', 'ph', 'ƒ'],
      'g': ['6', '9', '&', '[)'],
      'h': ['#', '|-|', ']-['],
      'i': ['1', '!', '|', ']['],
      'j': ['_|', '_]', '¿'],
      'k': ['|<', '|{', 'X'],
      'l': ['1', '|', '|_', '£'],
      'm': ['/\\/\\', '|\\/|', '^^'],
      'n': ['|\\|', '/\\/', '~'],
      'o': ['0', '()', '[]', '{}'],
      'p': ['|*', '|o', '|>', '¶'],
      'q': ['0,', '(_,)', '9'],
      'r': ['|2', '|?', '®'],
      's': ['5', '$', 'z', '§'],
      't': ['7', '+', '-|-', '†'],
      'u': ['|_|', '[_]', 'µ'],
      'v': ['\\/', '|/', "\\`"],
      'w': ['\\/\\/', 'VV', '\\^/'],
      'x': ['><', '}{', '×'],
      'y': ['`/', "'/", '¥'],
      'z': ['2', '7_', '>_']
    };

    // Reverse leetspeak map for decoding
    const LEETSPEAK_REVERSE = {};
    for (const [letter, subs] of Object.entries(LEETSPEAK_MAP)) {
      for (const sub of subs) {
        LEETSPEAK_REVERSE[sub.toLowerCase()] = letter;
      }
    }

    // =====================================================
    // DICTIONARY WORDS (Common English words for detection)
    // =====================================================
    // Base64-encoded dictionary for compact storage
    const DICTIONARY_WORDS_BASE64 = 'cGFzc3dvcmQsYWRtaW4sbG9naW4sdXNlcixyb290LGd1ZXN0LHRlc3QsZGVtbyx3ZWxjb21lLGhlbGxvLGxvdmUsaGF0ZSxsaWZlLGRlYXRoLGdvZCxkZXZpbCxhbmdlbCxkZW1vbixoZWF2ZW4saGVsbCxnb29kLGV2aWwsYmxjay53aGl0ZSxkYXJrLGxpZ2h0LG5pZ2h0LGRheSxzdW4sbW9vbixzdGFyLHNreSxlYXJ0aCxmaXJlLHdhdGVyLHdpbmQsaWNlLHN0b3JtLHJhaW4sc25vdyxzdW1tZXIsd2ludGVyLHNwcmluZyxhdHVtbixmYWxsLGNvbGQsaG90LHdhcm0sa2luZyxxdWVlbnAscHJpbmNlLHByaW5jZXNzLGxvcmQsbWFzdGVyLGJvc3MsY2hpZWYsaGVybyx2aWxsYWluLHdhcnJpZXIsZmlnaHRlcixzb2xkaWVyLGtuaWdodCxuamluamEsZHJhZ29uLHBob2VuaXgsdGlnZXIsbGlvbix3b2xmLGJlYXIsZWFnbGUsaGF3ayxzaGFkb3csZ2hvc3Qsc291bCxoZWFydCxtaW5kLGJvZHksYmxvb2QscG93ZXI,bWFnaWMsZm9yY2UsZW5lcmd5LHNwaXJpdCxteXN0aWMsc2VjcmV0LG1vbmV5LGNhc2gsZ29sZCxzaWx2ZXIsZGlhbW9uZCxyaWNoLHdlYXJ0aCxiYW5rLGNvbXB1dGVyLGludGVybmV0LG5ldHdvcmssc3lzdGVtLHNlcnZlcixkYXRhYmFzZSxzZWN1cml0eSxzZWN1cmUsYWNjZXNzLHByaXZhdGUscHVibGljLG9wZW4sY2xvc2Usc3RhcnQsc3RvcCxiZWdpbixlbmQsZmlyc3QsbGFzdCxuZXcgb2xkLHlvdW5nLGJhYnk7Y2hpbGQsbWFuLHdvbWFuLGJveSxiaXIsZnJpZW5kLGZhbWlseSxtb3RoZXIsZmF0aGVyLGJyb3RoZXIsc2lzdGVyLHNvbixkYXVnaHRlcixob21lLGhvdXNlLHJvb20sZG9vcix3aW5kb3csd2FsbCxmbG9vcixyb29mLGNhcix0cnVjayxiaWtlLHBsYW5lLHRyYWluLGJvYXQtc2hpcCxyb2NrZXQsZ2FtZSxwbGF5LHdpbixsb3NlLHNjb3JlLGxldmVsLHBvaW50LGJvbnVzLG11c2ljLHNvbmcsZGFuY2Uscm9jayxqYXp6LHBvcCxtZXRhbCxwdW5rLG1vdmllLGZpbG0sc2hvdyxzdGFyLGFjdG9yLHN1cGVyLG1lZ2EsdWx0cmFbaHBlcixleHRyYSxnaWdhLHRlcmEscGV0YSxjb29sLGhvdCxzZXh5LGN1dGUsbmljZSxncmVhdCwgYXdlc29tZSwgYW1hemluZyxoYXBweSxzYWQsYW5ncnksbWFkLGNyYXp5LHdpbGQsZnJlZSxlYXN5LGhhcmQsc29mdCxhc3Qsc2xvdyxiaWcsc21hbGwsc29uZyxzaG9ydCxoaWcsbG93LHVwLGRvd24sbGVmdCxyaWdodCxmcm9udCxiYWNrLG5vcnRoLHNvdXRoLGVhc3Qsd2VzdCxjZW50ZXIrbWlkZGxlLHRvcCxib3R0b20sb25lLHR3byx0aHJlZSxmb3VyLGZpdmUsc2l4LHNldmVuLGVpZ2h0LG5pbmUtdGVuLHplcm8sbnVsbCx2b2lkLGVtcHR5LGZ1bGwsaGFsZixkb3VibGUtdHJpcGxl';

    // Lazy-loaded dictionary Set
    let _dictionaryWordsSet = null;
    function getDictionaryWords() {
      if (_dictionaryWordsSet === null) {
        try {
          const decoded = atob(DICTIONARY_WORDS_BASE64);
          _dictionaryWordsSet = new Set(decoded.split(','));
          // Manually add critical leetspeak roots that weren't in the original base64
          ['hack', 'hacker', 'pass', 'strong', 'admin'].forEach(w => _dictionaryWordsSet.add(w));
        } catch (e) {
          console.error('[CASIMIR] Failed to decode dictionary:', e);
          _dictionaryWordsSet = new Set();
        }
      }
      return _dictionaryWordsSet;
    }

    // Backward compatibility - direct access to Set
    const DICTIONARY_WORDS = {
      has: function (word) { return getDictionaryWords().has(word); },
      [Symbol.iterator]: function () { return getDictionaryWords()[Symbol.iterator](); }
    };

    // Calculate character distribution
    function getCharacterDistribution(password) {
      const upper = (password.match(/[A-Z]/g) || []).length;
      const lower = (password.match(/[a-z]/g) || []).length;
      const numbers = (password.match(/[0-9]/g) || []).length;
      const symbols = (password.match(/[^A-Za-z0-9]/g) || []).length;
      const total = password.length;
      return {
        upper, lower, numbers, symbols, total,
        upperPct: total ? (upper / total) * 100 : 0,
        lowerPct: total ? (lower / total) * 100 : 0,
        numbersPct: total ? (numbers / total) * 100 : 0,
        symbolsPct: total ? (symbols / total) * 100 : 0
      };
    }

    // =====================================================
    // ADVANCED PATTERN DETECTION ENGINE
    // =====================================================

    // Detect repeated sequences (e.g., "abcabc", "1212", "aaaa")
    function detectRepeatedSequences(password) {
      const findings = [];
      const lower = password.toLowerCase();

      // Single character repeats (aaa, 111)
      const singleCharRepeat = /(.)\1{2,}/g;
      let match;
      while ((match = singleCharRepeat.exec(password)) !== null) {
        findings.push({
          type: 'single_repeat',
          pattern: match[0],
          position: match.index,
          length: match[0].length,
          severity: match[0].length >= 4 ? 'high' : 'medium',
          entropyPenalty: match[0].length * 0.8 // Significant penalty
        });
      }

      // Repeated sequences of 2+ chars (abcabc, 1212)
      for (let seqLen = 2; seqLen <= Math.floor(password.length / 2); seqLen++) {
        for (let i = 0; i <= password.length - seqLen * 2; i++) {
          const seq = password.substring(i, i + seqLen);
          const rest = password.substring(i + seqLen);
          if (rest.startsWith(seq)) {
            // Check if not already found as part of longer sequence
            const alreadyFound = findings.some(f =>
              f.type === 'sequence_repeat' &&
              password.substring(f.position, f.position + f.seqLength) === seq
            );
            if (!alreadyFound) {
              findings.push({
                type: 'sequence_repeat',
                pattern: seq + seq,
                position: i,
                seqLength: seqLen,
                length: seqLen * 2,
                severity: seqLen >= 3 ? 'high' : 'medium',
                entropyPenalty: seqLen * 1.5
              });
            }
          }
        }
      }

      return findings;
    }

    // Detect keyboard patterns (qwerty, asdf, 1qaz, etc.)
    function detectKeyboardPatterns(password) {
      const findings = [];
      const lower = password.toLowerCase();

      // Extended keyboard sequences
      const keyboardSequences = [
        // QWERTY rows
        'qwertyuiop', 'asdfghjkl', 'zxcvbnm',
        // QWERTY reversed
        'poiuytrewq', 'lkjhgfdsa', 'mnbvcxz',
        // QWERTY columns
        'qaz', 'wsx', 'edc', 'rfv', 'tgb', 'yhn', 'ujm', 'ik', 'ol',
        '1qaz', '2wsx', '3edc', '4rfv', '5tgb', '6yhn', '7ujm', '8ik', '9ol', '0p',
        // Number row
        '1234567890', '0987654321',
        // Common patterns
        'qwerty', 'asdf', 'zxcv', 'qweasd', 'qazwsx',
        // Numpad patterns
        '789456123', '321654987', '159', '357',
        // Shift+number symbols
        '!@#$%^&*()', ')(*&^%$#@!'
      ];

      for (const seq of keyboardSequences) {
        let startIndex = 0;
        while ((startIndex = lower.indexOf(seq, startIndex)) !== -1) {
          findings.push({
            type: 'keyboard',
            pattern: password.substring(startIndex, startIndex + seq.length),
            position: startIndex,
            length: seq.length,
            severity: seq.length >= 4 ? 'high' : 'medium',
            entropyPenalty: seq.length * 2.0 // Heavy penalty for keyboard patterns
          });
          startIndex++;
        }
      }

      // Detect partial keyboard sequences (3+ consecutive keys)
      for (const seq of ['qwertyuiop', 'asdfghjkl', 'zxcvbnm', '1234567890']) {
        for (let len = 4; len <= seq.length; len++) {
          for (let i = 0; i <= seq.length - len; i++) {
            const subseq = seq.substring(i, i + len);
            if (lower.includes(subseq) && !findings.some(f => f.pattern.toLowerCase() === subseq)) {
              findings.push({
                type: 'keyboard_partial',
                pattern: subseq,
                position: lower.indexOf(subseq),
                length: len,
                severity: len >= 5 ? 'high' : 'medium',
                entropyPenalty: len * 1.8
              });
            }
          }
        }
      }

      return findings;
    }

    // Detect sequential characters (abc, 123, cba, 321)
    function detectSequentialChars(password) {
      const findings = [];
      const lower = password.toLowerCase();

      // Alphabet sequences
      const alphabet = 'abcdefghijklmnopqrstuvwxyz';
      const alphabetRev = 'zyxwvutsrqponmlkjihgfedcba';

      // Number sequences
      const numbers = '0123456789';
      const numbersRev = '9876543210';

      const checkSequence = (seq, seqRev, type) => {
        for (let len = 3; len <= Math.min(6, password.length); len++) {
          for (let i = 0; i <= seq.length - len; i++) {
            const subseq = seq.substring(i, i + len);
            const subseqRev = seqRev.substring(seq.length - i - len, seq.length - i);

            let pos = lower.indexOf(subseq);
            if (pos !== -1) {
              findings.push({
                type: type,
                direction: 'forward',
                pattern: password.substring(pos, pos + len),
                position: pos,
                length: len,
                severity: len >= 4 ? 'high' : 'medium',
                entropyPenalty: len * 1.5
              });
            }

            pos = lower.indexOf(subseqRev);
            if (pos !== -1) {
              findings.push({
                type: type,
                direction: 'reverse',
                pattern: password.substring(pos, pos + len),
                position: pos,
                length: len,
                severity: len >= 4 ? 'high' : 'medium',
                entropyPenalty: len * 1.5
              });
            }
          }
        }
      };

      checkSequence(alphabet, alphabetRev, 'alphabet_sequence');
      checkSequence(numbers, numbersRev, 'number_sequence');

      return findings;
    }

    // Normalizes a string by replacing leetspeak characters with alphabetical equivalents
    function normalizeLeetspeak(password) {
      const leetMap = {
        '0': 'o', '1': 'i', '2': 'z', '3': 'e', '4': 'a',
        '5': 's', '6': 'g', '7': 't', '8': 'b', '9': 'g',
        '@': 'a', '$': 's', '!': 'i', '+': 't', '=': 'e'
      };
      let normalized = '';
      let substitutions = 0;
      for (const char of password.toLowerCase()) {
        if (leetMap[char]) {
          normalized += leetMap[char];
          substitutions++;
        } else {
          normalized += char;
        }
      }
      return { normalized, substitutions };
    }

    // Detect leetspeak substitutions
    function detectLeetspeak(password) {
      const findings = [];

      // Contextual leetspeak detection:
      // Only count leet chars that are ADJACENT to a letter (forming word-like patterns).
      // Isolated digits/symbols in random passwords are normal and should not trigger.
      const leetMap = { '4': 'a', '@': 'a', '3': 'e', '1': 'i', '!': 'i', '0': 'o', '5': 's', '$': 's', '7': 't', '2': 'z' };
      const isLetter = (c) => c && /[a-zA-Z]/.test(c);
      let contextualLeetCount = 0;

      for (let i = 0; i < password.length; i++) {
        if (leetMap[password[i]]) {
          // Count only if adjacent to at least one letter
          const prev = password[i - 1];
          const next = password[i + 1];
          if (isLetter(prev) || isLetter(next)) {
            contextualLeetCount++;
          }
        }
      }

      // High threshold: 40% of password length, minimum 4 contextual matches
      const leetCharThreshold = Math.max(4, Math.floor(password.length * 0.4));
      if (contextualLeetCount >= leetCharThreshold) {
        findings.push({
          type: 'leetspeak_chars',
          count: contextualLeetCount,
          severity: contextualLeetCount >= leetCharThreshold + 2 ? 'medium' : 'low',
          entropyPenalty: contextualLeetCount * 0.3
        });
      }

      return findings;
    }

    // Detect dictionary words (original and normalized)
    function detectDictionaryWords(password) {
      const findings = [];
      const lower = password.toLowerCase();
      const { normalized, substitutions } = normalizeLeetspeak(password);

      // Check for whole dictionary words
      for (const word of getDictionaryWords()) {
        if (lower === word) {
          findings.push({
            type: 'dictionary_whole',
            word: word,
            position: 0,
            length: word.length,
            severity: 'critical',
            entropyPenalty: word.length * 2.5
          });
        } else if (lower.includes(word) && word.length >= 4) {
          findings.push({
            type: 'dictionary_embedded',
            word: word,
            position: lower.indexOf(word),
            length: word.length,
            severity: 'high',
            entropyPenalty: word.length * 1.8
          });
        }

        // If normalization changed the string, check for hidden words
        if (substitutions > 0) {
          if (normalized === word) {
            findings.push({
              type: 'leetspeak_word',
              pattern: password,
              originalWord: word,
              position: 0,
              length: word.length,
              severity: 'critical',
              entropyPenalty: word.length * 2.0
            });
          } else if (normalized.includes(word) && word.length >= 4) {
            findings.push({
              type: 'leetspeak_embedded',
              pattern: password.substring(normalized.indexOf(word), normalized.indexOf(word) + word.length),
              originalWord: word,
              position: normalized.indexOf(word),
              length: word.length,
              severity: 'high',
              entropyPenalty: word.length * 1.5
            });
          }
        }
      }

      // Check for common name patterns
      const namePattern = /^(mr|ms|mrs|dr|prof|admin|user|test|demo|root|sys|system)/i;
      if (namePattern.test(password)) {
        const match = password.match(namePattern);
        findings.push({
          type: 'prefix_pattern',
          pattern: match[0],
          severity: 'medium',
          entropyPenalty: match[0].length * 0.8
        });
      }

      // Check for suffix patterns
      const suffixPattern = /(123|1234|12345|123456|2024|2025|2026|!@#|!@#$|xxx|xxx|007|666|777|888|999)$/i;
      if (suffixPattern.test(password)) {
        const match = password.match(suffixPattern);
        findings.push({
          type: 'suffix_pattern',
          pattern: match[0],
          severity: 'medium',
          entropyPenalty: match[0].length * 1.0
        });
      }

      return findings;
    }

    // Detect date patterns
    function detectDatePatterns(password) {
      const findings = [];

      // Year patterns (1900-2099)
      const yearPattern = /(19|20)\d{2}/g;
      let match;
      while ((match = yearPattern.exec(password)) !== null) {
        findings.push({
          type: 'year',
          pattern: match[0],
          position: match.index,
          severity: 'medium',
          entropyPenalty: 2.0 // Years have low entropy
        });
      }

      // Date patterns (DDMMYYYY, MMDDYYYY, YYYYMMDD)
      const datePatterns = [
        /(0[1-9]|[12][0-9]|3[01])(0[1-9]|1[0-2])(19|20)\d{2}/g,  // DDMMYYYY
        /(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])(19|20)\d{2}/g,  // MMDDYYYY
        /(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])/g   // YYYYMMDD
      ];

      for (const pattern of datePatterns) {
        while ((match = pattern.exec(password)) !== null) {
          findings.push({
            type: 'date_full',
            pattern: match[0],
            position: match.index,
            severity: 'high',
            entropyPenalty: 8.0 // Full dates have very low entropy
          });
        }
      }

      // Simple date patterns (DD.MM.YYYY, DD-MM-YYYY, etc.)
      const simpleDatePattern = /\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}/g;
      while ((match = simpleDatePattern.exec(password)) !== null) {
        if (!findings.some(f => f.type === 'date_full' && f.pattern === match[0])) {
          findings.push({
            type: 'date_simple',
            pattern: match[0],
            position: match.index,
            severity: 'medium',
            entropyPenalty: 6.0
          });
        }
      }

      return findings;
    }

    // Detect context-specific patterns
    function detectContextPatterns(password) {
      const findings = [];
      const lower = password.toLowerCase();

      // Email-like patterns
      if (lower.includes('@') && lower.includes('.')) {
        findings.push({
          type: 'email_like',
          severity: 'medium',
          entropyPenalty: 3.0
        });
      }

      // Phone number patterns
      const phonePattern = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{2,4}/;
      if (phonePattern.test(password)) {
        findings.push({
          type: 'phone_like',
          severity: 'medium',
          entropyPenalty: 5.0
        });
      }

      // URL-like patterns
      if (/^(www\.|https?:\/\/|\.com|\.ru|\.org|\.net)/i.test(password)) {
        findings.push({
          type: 'url_like',
          severity: 'medium',
          entropyPenalty: 4.0
        });
      }

      // Common substitution patterns
      const substitutionPatterns = [
        { pattern: /p[!@#$%^&*]ss/i, name: 'pass_substitution' },
        { pattern: /[!@#$%^&*][!@#$%^&*][!@#$%^&*]+/, name: 'symbol_repeat' }
      ];

      for (const { pattern, name } of substitutionPatterns) {
        if (pattern.test(password)) {
          findings.push({
            type: name,
            severity: 'medium',
            entropyPenalty: 2.0
          });
        }
      }

      return findings;
    }

    // =====================================================
    // COMPREHENSIVE ENTROPY CALCULATION
    // =====================================================

    // Calculate base charset size with overlap consideration
    function calculateEffectiveCharsetSize(password) {
      const dist = getCharacterDistribution(password);
      let charsetSize = 0;

      // Base charset contributions
      if (dist.upper > 0) charsetSize += 26;
      if (dist.lower > 0) charsetSize += 26;
      if (dist.numbers > 0) charsetSize += 10;
      if (dist.symbols > 0) charsetSize += 32;

      // Bonus for character variety (but not additive - use logarithmic)
      const activeSets = (dist.upper > 0 ? 1 : 0) + (dist.lower > 0 ? 1 : 0) +
        (dist.numbers > 0 ? 1 : 0) + (dist.symbols > 0 ? 1 : 0);

      // Diversity multiplier (encourages using multiple character sets)
      const diversityMultiplier = 1 + (activeSets - 1) * 0.15;

      return charsetSize * diversityMultiplier;
    }

    // Calculate effective entropy with pattern penalties
    function calculateEffectiveEntropy(password) {
      if (!password) return { base: 0, effective: 0, penalty: 0, details: {} };

      const length = password.length;
      const charsetSize = calculateEffectiveCharsetSize(password);

      // Base entropy (Shannon)
      const baseEntropy = length * Math.log2(Math.max(1, charsetSize));

      // Collect all pattern findings
      const allFindings = [
        ...detectRepeatedSequences(password),
        ...detectKeyboardPatterns(password),
        ...detectSequentialChars(password),
        ...detectLeetspeak(password),
        ...detectDictionaryWords(password),
        ...detectDatePatterns(password),
        ...detectContextPatterns(password)
      ];

      // Calculate total entropy penalty
      let totalPenalty = 0;
      const penaltyDetails = {
        repeated: 0,
        keyboard: 0,
        sequential: 0,
        leetspeak: 0,
        dictionary: 0,
        date: 0,
        context: 0,
        common: 0
      };

      for (const finding of allFindings) {
        totalPenalty += finding.entropyPenalty || 0;

        // Categorize penalties
        if (finding.type.includes('repeat')) penaltyDetails.repeated += finding.entropyPenalty;
        else if (finding.type.includes('keyboard')) penaltyDetails.keyboard += finding.entropyPenalty;
        else if (finding.type.includes('sequence')) penaltyDetails.sequential += finding.entropyPenalty;
        else if (finding.type.includes('leet')) penaltyDetails.leetspeak += finding.entropyPenalty;
        else if (finding.type.includes('dictionary')) penaltyDetails.dictionary += finding.entropyPenalty;
        else if (finding.type.includes('date') || finding.type === 'year') penaltyDetails.date += finding.entropyPenalty;
        else penaltyDetails.context += finding.entropyPenalty;
      }

      // Check if common password (massive penalty)
      if (isCommonPassword(password)) {
        const commonPenalty = baseEntropy * 0.9; // 90% penalty for common passwords
        totalPenalty += commonPenalty;
        penaltyDetails.common = commonPenalty;
      }

      // Calculate effective entropy (never negative)
      const effectiveEntropy = Math.max(0, baseEntropy - totalPenalty);

      return {
        base: baseEntropy,
        effective: effectiveEntropy,
        penalty: totalPenalty,
        details: penaltyDetails,
        findings: allFindings,
        charsetSize,
        diversityScore: charsetSize > 0 ? (charsetSize / 94) * 100 : 0 // 94 = max charset
      };
    }

    // Legacy function for backward compatibility
    function calculateEntropy(password) {
      const result = calculateEffectiveEntropy(password);
      return result.effective;
    }

    // =====================================================
    // ADVANCED CRACK TIME ESTIMATION
    // =====================================================

    // Attack scenario configurations (attempts per second)
    const ATTACK_SCENARIOS = {
      // Online attacks (rate-limited by server)
      online: {
        name: 'Online-attack',
        description: 'Web- login brute-force (rate-limited)',
        speed: 1000, // 1000 attempts/sec (typical rate limit)
        icon: 'Web'
      },
      onlineAggressive: {
        name: 'Online (aggressive)',
        description: 'Distributed online attack (multiple IPs)',
        speed: 10000, // 10K attempts/sec
        icon: 'Web'
      },
      // Offline attacks (hash cracking)
      offlineMd5: {
        name: 'Offline (MD5)',
        description: 'GPU cracking MD5 hash',
        speed: 50e9, // 50 billion/sec (RTX 4090)
        icon: 'GPU'
      },
      offlineSha256: {
        name: 'Offline (SHA-256)',
        description: 'GPU cracking SHA-256 hash',
        speed: 10e9, // 10 billion/sec
        icon: 'GPU'
      },
      offlineBcrypt: {
        name: 'Offline (bcrypt)',
        description: 'Slow hash (cost 10)',
        speed: 10000, // 10K attempts/sec
        icon: 'CPU'
      },
      offlineArgon2: {
        name: 'Offline (Argon2)',
        description: 'Memory-hard hash',
        speed: 1000, // 1K attempts/sec
        icon: 'CPU'
      },
      // Dictionary attacks
      dictionary: {
        name: 'Dictionary attack',
        description: 'Common passwords + variations',
        speed: 100e6, // 100M attempts/sec
        icon: 'Dict'
      },
      // Hybrid attack
      hybrid: {
        name: 'Hybrid attack',
        description: 'Dictionary + rules + brute force',
        speed: 1e9, // 1 billion attempts/sec
        icon: 'Hybrid'
      }
    };

    // Calculate crack time for all scenarios
    function calculateCrackTimeAllScenarios(entropy, password) {
      if (!entropy || entropy <= 0) {
        return { scenarios: {}, primary: { online: 0, offlineFast: 0, offlineSlow: 0 } };
      }

      const combinations = Math.pow(2, entropy);
      const avgAttempts = combinations / 2; // Average case

      const scenarios = {};

      for (const [key, config] of Object.entries(ATTACK_SCENARIOS)) {
        const seconds = avgAttempts / config.speed;
        scenarios[key] = {
          ...config,
          seconds,
          formatted: formatCrackTime(seconds),
          class: getCrackTimeClass(seconds)
        };
      }

      // Special case: dictionary attack estimation
      // If password is common or has dictionary words, dictionary attack is much faster
      if (password) {
        const dictFindings = detectDictionaryWords(password);
        const isCommon = isCommonPassword(password);

        if (isCommon) {
          // Common password: instant dictionary hit
          scenarios.dictionary.seconds = 0.001;
          scenarios.dictionary.formatted = 'instant';
          scenarios.dictionary.class = 'instant';
        } else if (dictFindings.length > 0) {
          // Contains dictionary words: estimate based on wordlist size
          const wordlistSize = 10e6; // 10M common passwords + variations
          const estimatedAttempts = wordlistSize / 2;
          scenarios.dictionary.seconds = estimatedAttempts / ATTACK_SCENARIOS.dictionary.speed;
          scenarios.dictionary.formatted = formatCrackTime(scenarios.dictionary.seconds);
        }
      }

      // Return primary scenarios for backward compatibility
      return {
        scenarios,
        primary: {
          online: scenarios.online.seconds,
          offlineFast: scenarios.offlineMd5.seconds,
          offlineSlow: scenarios.offlineBcrypt.seconds
        }
      };
    }

    // Calculate crack time based on entropy (legacy function)
    // Returns time in seconds for different attack scenarios
    function calculateCrackTime(entropy) {
      if (!entropy || entropy <= 0) {
        return { online: 0, offlineFast: 0, offlineSlow: 0 };
      }

      // Number of possible combinations = 2^entropy
      const combinations = Math.pow(2, entropy);

      // Attack speeds (attempts per second)
      const ONLINE_SPEED = 1000;           // Typical online attack (rate limited)
      const OFFLINE_FAST = 10e9;           // Fast GPU hash cracking (10 billion/s)
      const OFFLINE_SLOW = 10000;          // Slow hash (bcrypt, PBKDF2)

      // Average attempts to crack = combinations / 2
      const avgAttempts = combinations / 2;

      return {
        online: avgAttempts / ONLINE_SPEED,
        offlineFast: avgAttempts / OFFLINE_FAST,
        offlineSlow: avgAttempts / OFFLINE_SLOW
      };
    }

    // Format time for display
    function formatCrackTime(seconds) {
      if (!isFinite(seconds) || seconds < 0) {
        return '∞';
      }
      const isRu = (settings.lang || 'ru') === 'ru';

      if (seconds < 0.001) return isRu ? 'мгновенно' : 'instantly';
      if (seconds < 1) return Math.round(seconds * 1000) + (isRu ? ' мс' : ' ms');
      if (seconds < 60) return Math.round(seconds) + (isRu ? ' сек' : ' sec');
      if (seconds < 3600) return Math.round(seconds / 60) + (isRu ? ' мин' : ' min');
      if (seconds < 86400) return Math.round(seconds / 3600) + (isRu ? ' ч' : ' h');
      if (seconds < 2592000) return Math.round(seconds / 86400) + (isRu ? ' дн' : ' days');
      if (seconds < 31536000) return Math.round(seconds / 2592000) + (isRu ? ' мес' : ' mo');
      if (seconds < 31536000 * 100) return Math.round(seconds / 31536000) + (isRu ? ' лет' : ' yrs');
      if (seconds < 31536000 * 1000) return Math.round(seconds / 31536000) + (isRu ? ' лет' : ' yrs');
      if (seconds < 31536000 * 1000000) return Math.round(seconds / 31536000 / 1000) + (isRu ? ' тыс. лет' : 'K yrs');
      if (seconds < 31536000 * 1000000000) return Math.round(seconds / 31536000 / 1000000) + (isRu ? ' млн лет' : 'M yrs');
      return isRu ? 'миллиарды лет' : 'billions of years';
    }

    // Get CSS class for crack time severity
    function getCrackTimeClass(seconds) {
      if (seconds < 1) return 'instant';
      if (seconds < 60) return 'seconds';
      if (seconds < 3600) return 'minutes';
      if (seconds < 86400) return 'hours';
      if (seconds < 2592000) return 'days';
      if (seconds < 31536000) return 'months';
      if (seconds < 31536000 * 100) return 'years';
      return 'centuries';
    }

    // Check if password is common
    function isCommonPassword(password) {
      const lower = password.toLowerCase();
      const { normalized } = normalizeLeetspeak(password);

      return COMMON_PASSWORDS.some(common => {
        const c = common.toLowerCase();

        // Skip subset checks for very short common words to avoid false positives (e.g. "pass", "test")
        if (c.length < 5) {
          return lower === c || normalized === c;
        }

        // Exact match or contains for longer known bad sequences
        return lower === c || lower.includes(c) || normalized === c || normalized.includes(c);
      });
    }

    // Detect patterns
    function detectPatterns(password) {
      const patterns = [];
      const lower = password.toLowerCase();

      // Sequential characters
      if (/^(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|012|123|234|345|456|567|678|789)/i.test(password)) {
        patterns.push('sequential');
      }
      // Repeated characters
      if (new RegExp('(.)\\1{2,}').test(password)) {
        patterns.push('repeated');
      }
      // Keyboard patterns
      if (/qwerty|asdf|zxcv|qazwsx|1qaz|2wsx|3edc|4rfv|5tgb|6yhn|7ujm|8ik|9ol/i.test(password)) {
        patterns.push('keyboard');
      }
      // Date patterns
      if (/(19|20)\d{2}|\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}/.test(password)) {
        patterns.push('date');
      }
      // Common words
      if (/password|login|admin|user|test|guest|root/i.test(password)) {
        patterns.push('commonword');
      }
      return patterns;
    }

    // =====================================================
    // COMPREHENSIVE PASSWORD ANALYSIS
    // =====================================================

    // Comprehensive password analysis with advanced metrics
    function analyzePassword(password) {
      if (!password) {
        return null;
      }

      const len = password.length;
      const dist = getCharacterDistribution(password);
      const uniqueChars = new Set(password).size;
      const isCommon = isCommonPassword(password);

      // Advanced entropy calculation
      const entropyResult = calculateEffectiveEntropy(password);
      const entropy = entropyResult.effective;
      const baseEntropy = entropyResult.base;
      const entropyPenalty = entropyResult.penalty;
      const entropyDetails = entropyResult.details;
      const findings = entropyResult.findings;

      // Calculate crack times for all scenarios
      const crackTimeResult = calculateCrackTimeAllScenarios(entropy, password);

      // Strength checks (enhanced)
      const checks = {
        length: len >= 12,
        lengthStrong: len >= 16,
        upper: dist.upper > 0,
        lower: dist.lower > 0,
        numbers: dist.numbers > 0,
        symbols: dist.symbols > 0,
        unique: uniqueChars >= len * 0.5,
        uniqueStrong: uniqueChars >= len * 0.7,
        notCommon: !isCommon,
        noPatterns: findings.filter(f => f.severity === 'high' || f.severity === 'critical').length === 0,
        entropyGood: entropy >= 60,
        entropyStrong: entropy >= 80,
        charsetDiverse: entropyResult.charsetSize >= 62 // Has multiple character types
      };

      // Calculate comprehensive score
      let score = 0;

      // Length scoring (up to 30 points)
      if (len >= 8) score += 10;
      if (len >= 12) score += 10;
      if (len >= 16) score += 5;
      if (len >= 20) score += 5;

      // Character diversity (up to 30 points)
      if (checks.upper) score += 8;
      if (checks.lower) score += 8;
      if (checks.numbers) score += 7;
      if (checks.symbols) score += 7;

      // Entropy bonus (up to 20 points)
      if (entropy >= 40) score += 5;
      if (entropy >= 60) score += 5;
      if (entropy >= 80) score += 5;
      if (entropy >= 100) score += 5;

      // Uniqueness bonus (up to 10 points)
      if (checks.unique) score += 5;
      if (checks.uniqueStrong) score += 5;

      // Pattern-free bonus (up to 10 points)
      if (checks.noPatterns) score += 10;

      // Penalties
      if (isCommon) {
        score = Math.min(score, 5); // Severe penalty for common passwords
      }

      // Pattern penalties
      const criticalFindings = findings.filter(f => f.severity === 'critical');
      const highFindings = findings.filter(f => f.severity === 'high');
      const mediumFindings = findings.filter(f => f.severity === 'medium');

      score -= criticalFindings.length * 25;
      score -= highFindings.length * 15;
      score -= mediumFindings.length * 5;

      // Entropy penalty impact
      if (entropyPenalty > 0) {
        const penaltyRatio = entropyPenalty / Math.max(1, baseEntropy);
        score -= Math.min(30, penaltyRatio * 30);
      }

      score = clamp(score, 0, 100);

      // Determine strength level
      let strengthLevel = 'very-weak';
      let strengthLabel = 'Very Weak';
      if (score >= 80) { strengthLevel = 'very-strong'; strengthLabel = 'Very Strong'; }
      else if (score >= 65) { strengthLevel = 'strong'; strengthLabel = 'Strong'; }
      else if (score >= 50) { strengthLevel = 'good'; strengthLabel = 'Good'; }
      else if (score >= 35) { strengthLevel = 'fair'; strengthLabel = 'Fair'; }
      else if (score >= 20) { strengthLevel = 'weak'; strengthLabel = 'Weak'; }

      // Generate detailed analysis breakdown
      const breakdown = {
        length: {
          value: len,
          score: len >= 16 ? 'excellent' : len >= 12 ? 'good' : len >= 8 ? 'fair' : 'poor',
          impact: len >= 12 ? 'positive' : 'negative',
          explanation: len < 8
            ? 'Critical: Too short. Easily brute-forced.'
            : len < 12
              ? 'Warning: Minimum acceptable length. Consider 16+ characters.'
              : len < 16
                ? 'Good length. 16+ would be even better.'
                : 'Excellent length for security.'
        },
        charset: {
          activeSets: (dist.upper > 0 ? 1 : 0) + (dist.lower > 0 ? 1 : 0) +
            (dist.numbers > 0 ? 1 : 0) + (dist.symbols > 0 ? 1 : 0),
          size: entropyResult.charsetSize,
          score: entropyResult.charsetSize >= 70 ? 'excellent' :
            entropyResult.charsetSize >= 52 ? 'good' :
              entropyResult.charsetSize >= 36 ? 'fair' : 'poor',
          explanation: entropyResult.charsetSize < 36
            ? 'Limited character variety. Add more character types.'
            : entropyResult.charsetSize < 62
              ? 'Good character variety. Consider adding symbols.'
              : 'Excellent character variety.'
        },
        entropy: {
          base: baseEntropy,
          effective: entropy,
          penalty: entropyPenalty,
          penaltyDetails: entropyDetails,
          score: entropy >= 80 ? 'excellent' : entropy >= 60 ? 'good' : entropy >= 40 ? 'fair' : 'poor',
          explanation: entropy < 40
            ? 'Very low entropy. Highly predictable.'
            : entropy < 60
              ? 'Moderate entropy. Vulnerable to determined attackers.'
              : entropy < 80
                ? 'Good entropy. Resistant to most attacks.'
                : 'Excellent entropy. Highly resistant to brute force.'
        },
        patterns: {
          count: findings.length,
          critical: criticalFindings.length,
          high: highFindings.length,
          medium: mediumFindings.length,
          findings: findings,
          score: findings.length === 0 ? 'excellent' :
            criticalFindings.length > 0 ? 'poor' :
              highFindings.length > 0 ? 'fair' : 'good'
        }
      };

      return {
        password,
        length: len,
        uniqueChars,
        entropy,
        baseEntropy,
        entropyPenalty,
        entropyDetails,
        distribution: dist,
        isCommon,
        patterns: findings.map(f => f.type), // Legacy compatibility
        findings,
        checks,
        score,
        strengthLevel,
        strengthLabel,
        breakdown,
        crackTimeScenarios: crackTimeResult.scenarios,
        crackTime: crackTimeResult.primary
      };
    }

    // Generate detailed recommendations based on advanced analysis
    function getRecommendations(analysis) {
      const recs = [];

      if (!analysis) return recs;

      // Critical issues
      const lang = settings.lang || 'ru';
      if (!analysis.checks.notCommon) {
        recs.push({
          type: 'urgent',
          text: lang === 'ru' ? 'Пароль найден в базах утекших паролей! Срочно замените.' : 'Password found in breached databases! Change immediately.',
          detail: lang === 'ru' ? 'Этот пароль уже использовался в утечках данных и является частой мишенью для атак.' : 'This password has been exposed in data breaches and is heavily targeted.'
        });
      }

      // Length issues
      if (!analysis.checks.length) {
        if (analysis.length < 8) {
          recs.push({
            type: 'urgent',
            text: lang === 'ru' ? 'Критически короткий пароль! Минимум 12 символов.' : 'Critically short password! Minimum 12 characters.',
            detail: lang === 'ru' ? `Текущая длина: ${analysis.length} символов. Короткие пароли перебирается за миллисекунды.` : `Current length: ${analysis.length}. Short passwords are cracked in milliseconds.`
          });
        } else {
          recs.push({
            type: 'warn',
            text: lang === 'ru' ? 'Увеличьте длину до 16+ символов для лучшей защиты.' : 'Increase length to 16+ for better security.',
            detail: lang === 'ru' ? `Текущая длина: ${analysis.length}. Каждый дополнительный символ значительно увеличивает время взлома.` : `Current length: ${analysis.length}. Length exponentially increases crack time.`
          });
        }
      }

      // Character diversity
      if (!analysis.checks.upper) {
        recs.push({
          type: 'warn',
          text: lang === 'ru' ? 'Добавьте заглавные буквы (A-Z)' : 'Add uppercase letters (A-Z)',
          detail: lang === 'ru' ? 'Заглавные буквы увеличивают размер алфавита на 26 символов, значительно усложняя брутфорс.' : 'Uppercase adds 26 chars to alphabet, complicating brute-force.'
        });
      }

      if (!analysis.checks.lower) {
        recs.push({
          type: 'warn',
          text: lang === 'ru' ? 'Добавьте строчные буквы (a-z)' : 'Add lowercase letters (a-z)',
          detail: lang === 'ru' ? 'Строчные буквы расширяют пространство поиска для атакующего.' : 'Lowercase expands the attacker search space.'
        });
      }

      if (!analysis.checks.numbers) {
        recs.push({
          type: 'warn',
          text: lang === 'ru' ? 'Добавьте цифры (0-9)' : 'Add numbers (0-9)',
          detail: lang === 'ru' ? 'Цифры добавляют 10 дополнительных символов к алфавиту пароля.' : 'Numbers add 10 symbols to your character alphabet.'
        });
      }

      if (!analysis.checks.symbols) {
        recs.push({
          type: 'warn',
          text: lang === 'ru' ? 'Добавьте специальные символы (!@#$%^&*)' : 'Add special symbols (!@#$%^&*)',
          detail: lang === 'ru' ? 'Спецсимволы - самый эффективный способ увеличить энтропию. 32 дополнительных символа!' : 'Symbols are the most efficient way to boost entropy!'
        });
      }

      // Uniqueness
      if (!analysis.checks.unique) {
        const uniqueRatio = (analysis.uniqueChars / analysis.length * 100).toFixed(0);
        recs.push({
          type: 'warn',
          text: 'Много повторяющихся символов',
          detail: `Уникальные символы: ${uniqueRatio}%. Низкая уникальность снижает эффективную энтропию.`
        });
      }

      // Pattern-based recommendations using new findings
      if (analysis.findings && analysis.findings.length > 0) {
        // Group findings by type
        const findingsByType = {};
        for (const finding of analysis.findings) {
          const category = finding.type.split('_')[0];
          if (!findingsByType[category]) findingsByType[category] = [];
          findingsByType[category].push(finding);
        }

        // Keyboard patterns
        if (findingsByType.keyboard) {
          const patterns = findingsByType.keyboard.map(f => `"${f.pattern}"`).join(', ');
          recs.push({
            type: 'urgent',
            text: lang === 'ru' ? 'Обнаружены клавиатурные последовательности' : 'Keyboard patterns detected',
            detail: lang === 'ru' ? `Найдены: ${patterns}. Клавиатурные паттерны - первая цель для атак по словарю.` : `Found: ${patterns}. Keyboard sequences are a prime target for dictionary attacks.`
          });
        }

        // Sequential characters
        if (findingsByType.alphabet || findingsByType.number) {
          const seqs = [...(findingsByType.alphabet || []), ...(findingsByType.number || [])];
          const patterns = seqs.map(f => `"${f.pattern}"`).join(', ');
          recs.push({
            type: 'urgent',
            text: lang === 'ru' ? 'Обнаружены последовательные символы' : 'Sequential characters detected',
            detail: lang === 'ru' ? `Найдены: ${patterns}. Последовательности типа "abc" или "123" очевидны для атакующего.` : `Found: ${patterns}. Sequential characters like "abc" are trivial to guess.`
          });
        }

        // Repeated sequences
        if (findingsByType.single || findingsByType.sequence) {
          const repeats = [...(findingsByType.single || []), ...(findingsByType.sequence || [])];
          recs.push({
            type: 'warn',
            text: lang === 'ru' ? 'Обнаружены повторяющиеся последовательности' : 'Repeated sequences detected',
            detail: lang === 'ru' ? `Найдено ${repeats.length} повторов. Повторы снижают эффективную длину пароля.` : `Found ${repeats.length} repetitions. They dramatically reduce the effective length.`
          });
        }

        // Leetspeak
        if (findingsByType.leetspeak) {
          recs.push({
            type: 'warn',
            text: lang === 'ru' ? 'Обнаружены leetspeak-замены' : 'Leetspeak substitutions detected',
            detail: lang === 'ru' ? 'Замены типа @=a, 3=e очевидны для современных инструментов взлома. Используйте настоящую случайность.' : 'Substitutions like @=a or 3=e are trivial for crackers. Use true randomness.'
          });
        }

        // Dictionary words
        if (findingsByType.dictionary_whole || findingsByType.dictionary_embedded) {
          const words = findings.filter(f => f.type.startsWith('dictionary')).map(f => f.word).join(', ');
          recs.push({
            type: 'urgent',
            text: lang === 'ru' ? 'Обнаружены словарные слова' : 'Dictionary words detected',
            detail: lang === 'ru' ? `Найдены: ${words}. Словарные атаки проверяют миллионы слов в секунду.` : `Found: ${words}. Dictionary attacks test millions of words per second.`
          });
        }

        // Normalized Leetspeak Words
        if (findingsByType.leetspeak_word || findingsByType.leetspeak_embedded) {
          const words = findings.filter(f => f.type.startsWith('leetspeak_')).map(f => f.originalWord).join(', ');
          recs.push({
            type: 'urgent',
            text: lang === 'ru' ? 'Словарное слово, замаскированное leetspeak-заменами' : 'Leetspeak-masked dictionary word(s) detected',
            detail: lang === 'ru' ? `Нормализатор выявил скрытые слова: ${words}. Такие пароли легко взламываются по гибридным словарям.` : `Analyzer revealed hidden words: ${words}. Easily cracked via hybrid dictionary attacks.`
          });
        }

        // Date patterns
        if (findingsByType.date || findingsByType.year) {
          recs.push({
            type: 'warn',
            text: lang === 'ru' ? 'Обнаружены паттерны даты' : 'Date patterns detected',
            detail: lang === 'ru' ? 'Даты, годы, дни рождения - одна из самых распространённых слабостей паролей.' : 'Dates, years, birthdays are among the most common password vulnerabilities.'
          });
        }
      }

      // Entropy-based recommendations
      if (analysis.entropyPenalty > 0 && analysis.baseEntropy > 0) {
        const penaltyPercent = ((analysis.entropyPenalty / analysis.baseEntropy) * 100).toFixed(0);
        if (penaltyPercent > 30) {
          recs.push({
            type: 'warn',
            text: `Высокий штраф энтропии: -${penaltyPercent}%`,
            detail: `Базовая энтропия: ${analysis.baseEntropy.toFixed(1)} бит, эффективная: ${analysis.entropy.toFixed(1)} бит. Паттерны значительно ослабляют пароль.`
          });
        }
      }

      // Crack time warnings
      if (analysis.crackTime) {
        if (analysis.crackTime.offlineFast < 3600) { // Less than 1 hour
          recs.push({
            type: 'urgent',
            text: 'Уязвим для GPU-брутфорса!',
            detail: `Время взлома на GPU: ${formatCrackTime(analysis.crackTime.offlineFast)}. Это недопустимо для важных аккаунтов.`
          });
        } else if (analysis.crackTime.offlineFast < 86400 * 30) { // Less than 30 days
          recs.push({
            type: 'warn',
            text: 'Умеренная устойчивость к офлайн-атакам',
            detail: `GPU взлом: ${formatCrackTime(analysis.crackTime.offlineFast)}. Рассмотрите более длинный пароль.`
          });
        }
      }

      // Positive feedback
      if (recs.length === 0 && analysis.score >= 80) {
        recs.push({
          type: 'good',
          text: lang === 'ru' ? 'Отличный пароль! Все рекомендации выполнены.' : 'Excellent password! All recommendations met.',
          detail: lang === 'ru' ? `Энтропия: ${analysis.entropy.toFixed(1)} бит. Время взлома: ${formatCrackTime(analysis.crackTime?.offlineFast || Infinity)}.` : `Entropy: ${analysis.entropy.toFixed(1)} bits. Crack time: ${formatCrackTime(analysis.crackTime?.offlineFast || Infinity)}.`
        });
      } else if (recs.length === 0 && analysis.score >= 60) {
        recs.push({
          type: 'good',
          text: lang === 'ru' ? 'Хороший пароль, но можно улучшить' : 'Good password, but could be better',
          detail: lang === 'ru' ? 'Рассмотрите увеличение длины или добавление специальных символов.' : 'Consider increasing length or adding symbols.'
        });
      }

      return recs;
    }

    // Update analysis UI
    function updateAnalysisUI(analysis) {
      if (!analysis) {
        // Reset all displays
        commonWarning.classList.remove('visible');
        const rlang = settings.lang || 'ru';
        qualityText.textContent = '—';
        qualityBar.style.width = '0%';
        qualityBar.style.background = 'rgba(148,163,184,.3)';
        entropyValue.textContent = rlang === 'ru' ? '— бит' : '— bits';
        entropyValue.className = 'pg-entropy-value';
        crackTimeDisplay.textContent = '—';
        crackTimeDisplay.className = 'pg-crack-time';
        crackOnline.textContent = '—';
        crackOfflineFast.textContent = '—';
        crackOfflineSlow.textContent = '—';
        statLength.textContent = '0';
        statUnique.textContent = '0';
        statScore.textContent = '0%';

        distUpper.style.width = '0%';
        distLower.style.width = '0%';
        distNumbers.style.width = '0%';
        distSymbols.style.width = '0%';
        countUpper.textContent = '0';
        countLower.textContent = '0';
        countNumbers.textContent = '0';
        countSymbols.textContent = '0';

        // Reset strength items
        [strLength, strUpper, strLower, strNumbers, strSymbols, strUnique].forEach(el => {
          const icon = el.querySelector('.pg-strength-icon');
          icon.className = 'pg-strength-icon fail';
          icon.textContent = '✕';
        });

        const resetMsg = rlang === 'ru' ? 'Введите или сгенерируйте пароль для анализа' : 'Enter or generate a password to analyze';
        recommendations.innerHTML = `
          <div class="pg-recommendation">
            <span class="pg-recomm-icon">💡</span>
            <span>${resetMsg}</span>
          </div>
        `;
        return;
      }

      // Common password warning
      if (analysis.isCommon) {
        commonWarning.classList.add('visible');
      } else {
        commonWarning.classList.remove('visible');
      }

      // Quality score
      const lang = settings.lang || 'ru';
      const score = analysis.score;
      const tEx = lang === 'ru' ? 'Отлично' : 'Excellent';
      const tGd = lang === 'ru' ? 'Хорошо' : 'Good';
      const tFr = lang === 'ru' ? 'Средне' : 'Fair';
      const tWk = lang === 'ru' ? 'Слабо' : 'Weak';

      qualityText.textContent = score >= 80 ? tEx : score >= 60 ? tGd : score >= 40 ? tFr : tWk;
      qualityBar.style.width = score + '%';

      if (score >= 80) {
        qualityBar.style.background = 'linear-gradient(90deg, #22c55e, #4ade80)';
      } else if (score >= 60) {
        qualityBar.style.background = 'linear-gradient(90deg, #3b82f6, #60a5fa)';
      } else if (score >= 40) {
        qualityBar.style.background = 'linear-gradient(90deg, #f59e0b, #fbbf24)';
      } else {
        qualityBar.style.background = 'linear-gradient(90deg, #ef4444, #f87171)';
      }

      // Entropy
      const entropy = Math.round(analysis.entropy);
      entropyValue.textContent = entropy + (lang === 'ru' ? ' бит' : ' bits');
      entropyValue.className = 'pg-entropy-value';
      if (entropy >= 80) {
        entropyValue.classList.add('excellent');
      } else if (entropy >= 60) {
        entropyValue.classList.add('good');
      } else if (entropy >= 40) {
        entropyValue.classList.add('fair');
      } else {
        entropyValue.classList.add('weak');
      }

      // Crack time estimation
      const crackTime = analysis.crackTime;
      const crackClass = getCrackTimeClass(crackTime.offlineFast);
      let specialAnimationClass = '';

      // Visual feedback mapping
      if (crackClass === 'instant' || crackClass === 'seconds' || crackClass === 'minutes') {
        specialAnimationClass = ' danger-pulse';
      } else if (entropy >= 300) {
        specialAnimationClass = ' quantum-glow';
      }

      crackTimeDisplay.textContent = formatCrackTime(crackTime.offlineFast);
      crackTimeDisplay.className = 'pg-crack-time ' + crackClass + specialAnimationClass;
      crackOnline.textContent = formatCrackTime(crackTime.online);
      crackOfflineFast.textContent = formatCrackTime(crackTime.offlineFast);
      crackOfflineSlow.textContent = formatCrackTime(crackTime.offlineSlow);

      // Stats
      statLength.textContent = analysis.length;
      statUnique.textContent = analysis.uniqueChars;
      statScore.textContent = Math.round(score) + '%';

      // Distribution
      const d = analysis.distribution;
      distUpper.style.width = d.upperPct + '%';
      distLower.style.width = d.lowerPct + '%';
      distNumbers.style.width = d.numbersPct + '%';
      distSymbols.style.width = d.symbolsPct + '%';
      countUpper.textContent = d.upper;
      countLower.textContent = d.lower;
      countNumbers.textContent = d.numbers;
      countSymbols.textContent = d.symbols;

      // Strength checks
      const checks = analysis.checks;

      function updateCheck(el, passed) {
        const icon = el.querySelector('.pg-strength-icon');
        if (passed) {
          icon.className = 'pg-strength-icon pass';
          icon.textContent = '✓';
        } else {
          icon.className = 'pg-strength-icon fail';
          icon.textContent = '✕';
        }
      }

      updateCheck(strLength, checks.length);
      updateCheck(strUpper, checks.upper);
      updateCheck(strLower, checks.lower);
      updateCheck(strNumbers, checks.numbers);
      updateCheck(strSymbols, checks.symbols);
      updateCheck(strUnique, checks.unique);

      // Recommendations
      const recs = getRecommendations(analysis);
      recommendations.innerHTML = recs.map(r => `
        <div class="pg-recommendation ${r.type}">
          <span class="pg-recomm-icon">${r.type === 'urgent' ? '⚠️' : r.type === 'good' ? '✅' : '💡'}</span>
          <span>${r.text}</span>
        </div>
      `).join('');
    }

    // Analyze current password (from generated or test input)
    function runAnalysis(password) {
      const analysis = analyzePassword(password);
      updateAnalysisUI(analysis);
    }

    // Analysis toggle handler
    let analysisVisible = false;
    function toggleAnalysis() {
      analysisVisible = !analysisVisible;
      if (analysisVisible) {
        analysisContent.classList.add('visible');
        analysisToggle.textContent = 'Скрыть';
        // Analyze current password if exists
        if (output.value) {
          runAnalysis(output.value);
        }
      } else {
        analysisContent.classList.remove('visible');
        analysisToggle.textContent = 'Показать';
      }
    }

    // Test input analysis
    function analyzeTestPassword() {
      const text = testInput.value.trim();
      if (text) {
        runAnalysis(text);
      }
    }

    function clearTestInput() {
      testInput.value = '';
      updateAnalysisUI(null);
    }

    // ---- HAVE I BEEN PWNED API (k-Anonymity)
    async function sha1(message) {
      const encoder = new TextEncoder();
      const data = encoder.encode(message);
      const hashBuffer = await crypto.subtle.digest('SHA-1', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    }

    async function checkPasswordBreach(password) {
      const hash = await sha1(password);
      const prefix = hash.substring(0, 5);
      const suffix = hash.substring(5);
      // Pwned Passwords API uses api.pwnedpasswords.com (not haveibeenpwned.com)
      const url = `https://api.pwnedpasswords.com/range/${prefix}`;

      console.log('[CASIMIR] Pwned Passwords URL:', url);
      console.log('[CASIMIR] Hash prefix:', prefix, 'suffix:', suffix);

      return new Promise((resolve, reject) => {
        const parseResponse = (text) => {
          // The API returns lines like: SUFFIX:COUNT\r\n
          // Using a regex makes this bulletproof to line ending issues
          const regex = new RegExp(`^${suffix}:([0-9]+)`, 'm');
          const match = text.match(regex);

          if (match && match[1]) {
            const count = parseInt(match[1], 10);
            return { found: count > 0, count: count, hash, prefix, suffix, matchLine: match[0] };
          }

          return { found: false, count: 0, hash, prefix, suffix, matchLine: '—' };
        };

        // Try GM_xmlhttpRequest first (Tampermonkey)
        if (typeof GM_xmlhttpRequest === 'function') {
          console.log('[CASIMIR] Using GM_xmlhttpRequest for Pwned Passwords');
          GM_xmlhttpRequest({
            method: 'GET',
            url: url,
            headers: {
              'User-Agent': 'CASIMIR-PwdGen/2.0'
            },
            onload: (response) => {
              console.log('[CASIMIR] Pwned response status:', response.status);
              if (response.status === 200 && response.responseText) {
                console.log('[CASIMIR] Response preview:', response.responseText.substring(0, 100));
                resolve(parseResponse(response.responseText));
              } else {
                reject(new Error(`HTTP ${response.status}: ${response.statusText || 'Error'}`));
              }
            },
            onerror: (error) => {
              console.error('[CASIMIR] GM_xmlhttpRequest error:', error);
              reject(new Error('Network error'));
            },
            ontimeout: () => {
              reject(new Error('Request timeout'));
            },
            timeout: 15000
          });
        } else if (typeof fetch === 'function') {
          // Fallback to fetch (CORS may block this)
          console.log('[CASIMIR] Using fetch for Pwned Passwords');
          fetch(url)
            .then(response => {
              console.log('[CASIMIR] Fetch response status:', response.status);
              if (!response.ok) throw new Error(`HTTP ${response.status}`);
              return response.text();
            })
            .then(text => resolve(parseResponse(text)))
            .catch(error => {
              console.error('[CASIMIR] Fetch error:', error);
              reject(error);
            });
        } else {
          reject(new Error('No HTTP client available'));
        }
      });
    }

    function updateBreachUI(result, error) {
      const lang = settings.lang || 'ru';
      const dict = TRANSLATIONS[lang];
      breachResult.classList.add('visible');

      if (error) {
        breachStatus.className = 'pg-breach-status error';
        breachIcon.textContent = '⚠';
        breachMessage.textContent = lang === 'ru' ? 'Ошибка проверки' : 'Check failed';
        const errorMsg = error.message || String(error);
        breachDetails.textContent = lang === 'ru'
          ? `Ошибка: ${errorMsg}. Проверьте подключение к интернету.`
          : `Error: ${errorMsg}. Check your internet connection.`;
        console.error('[CASIMIR] Breach check error:', error);
        return;
      }

      if (result.found) {
        breachStatus.className = 'pg-breach-status compromised';
        breachIcon.textContent = '✗';
        breachMessage.textContent = dict.t_danger;

        const countStr = result.count.toLocaleString();
        breachDetails.innerHTML = lang === 'ru'
          ? `Обнаружен в <span class="pg-breach-count">${countStr}</span> утечках данных. <strong>Не используйте этот пароль!</strong>`
          : `Found in <span class="pg-breach-count">${countStr}</span> data breaches. <strong>Do not use this password!</strong>`;
      } else {
        breachStatus.className = 'pg-breach-status safe';
        breachIcon.textContent = '✓';
        breachMessage.textContent = dict.t_safe;
        breachDetails.innerHTML = dict.t_pwn_test;
      }

      // Add Technical View
      if (result.hash) {
        const prefixLabel = lang === 'ru' ? 'Отправлен на HIBP API' : 'Sent to HIBP API';
        const suffixLabel = lang === 'ru' ? 'Сверяется локально' : 'Checked locally';
        breachDetails.innerHTML += `
          <div class="pg-breach-technical">
            <div>Hash: <span>${result.hash}</span></div>
            <div>Prefix: <span>${result.prefix}</span> <i>(${prefixLabel})</i></div>
            <div>Suffix: <span>${result.suffix}</span> <i>(${suffixLabel})</i></div>
            <div>Match: <span>${result.matchLine}</span></div>
          </div>
        `;
      }
    }

    // Breach check rate limiting
    let breachCheckCooldown = 0;
    const BREACH_COOLDOWN_MS = 5000; // 5 seconds between checks

    async function handleBreachCheck() {
      const lang = settings.lang || 'ru';
      const dict = TRANSLATIONS[lang];
      // Prioritize manual user input over the generated password
      const password = testInput.value.trim() || output.value;

      if (!password) {
        showToast(lang === 'ru' ? 'Сначала сгенерируйте или введите пароль' : 'Generate or enter a password first', 'warn');
        return;
      }

      // Rate limiting check
      const now = Date.now();
      if (now < breachCheckCooldown) {
        const remaining = Math.ceil((breachCheckCooldown - now) / 1000);
        showToast(lang === 'ru' ? `Подождите ${remaining} сек. перед следующей проверкой` : `Wait ${remaining}s before next check`, 'warn');
        return;
      }

      // Set cooldown
      breachCheckCooldown = now + BREACH_COOLDOWN_MS;

      // Show loading state
      breachBtn.disabled = true;
      breachBtn.classList.add('loading');
      breachBtnText.innerHTML = `<span class="pg-breach-spinner"></span> ${dict.hibp_test}`;
      breachResult.classList.remove('visible');

      try {
        console.log('[CASIMIR] Starting breach check for password length:', password.length);
        const result = await checkPasswordBreach(password);
        console.log('[CASIMIR] Breach check result:', result);
        updateBreachUI(result, null);
      } catch (error) {
        console.error('[CASIMIR] Breach check failed:', error);
        updateBreachUI(null, error);
      } finally {
        breachBtn.disabled = false;
        breachBtn.classList.remove('loading');
        breachBtnText.textContent = dict.hibp_btn;
      }
    }

    // ---- QUANTUM FIELD DYNAMICS (Advanced Entropy Engine)
    class QuantumField {
      constructor() {
        this.observerEffect = 0;
        this.entanglementPool = new Uint32Array(64); // 2048-bit buffer
        this.poolIndex = 0;

        // Initialize vacuum fluctuations
        this.perturbVacuum();
      }

      // Mix environmental entropy into the pool
      perturbVacuum() {
        // Heisenberg Uncertainty Principle: Position and momentum cannot be known simultaneously.
        // We inject high-resolution timing jitter to approximate this uncertainty.
        const t = performance.now();
        const jitter = (t * 1000) % 255;

        // Mix into the current pool index
        this.entanglementPool[this.poolIndex] ^= (Math.floor(t) ^ Math.floor(jitter * 100));
        this.poolIndex = (this.poolIndex + 1) % this.entanglementPool.length;
      }

      // Collapse the wave function to valid byte state
      // Implements Rejection Sampling to eliminate Modulo Bias
      async collapseWaveFunction(alphabetSize) {
        // Calculate the "Event Horizon" - the largest multiple of alphabetSize that fits in 256 (byte limit)
        // If our random byte falls into the "Singularity" (the remainder), we must discard it
        // to preserve the flat distribution of the multiverse.
        const maxByte = 256;
        const singularityZone = maxByte % alphabetSize;
        const eventHorizon = maxByte - singularityZone;

        let observation;
        let attempts = 0;

        while (true) {
          // Observe a new state from the quantum vacuum
          const buffer = new Uint8Array(1);

          if (window.crypto && window.crypto.getRandomValues) {
            window.crypto.getRandomValues(buffer);
            observation = buffer[0];
          } else {
            // Critical Failure: Vacuum Decay
            throw new Error("CRITICAL: Vacuum Stability Lost. Window.crypto not found.");
          }

          this.perturbVacuum(); // Adding observation cost to entropy

          // Check if the particle is within the stable Event Horizon
          if (observation < eventHorizon) {
            // Collapse successful: Map to alphabet space
            return observation % alphabetSize;
          }

          // Particle fell into the Singularity (bias zone).
          // Discard and re-observe.
          attempts++;
          if (attempts > 100) {
            // Extremely unlikely in this reality, but handled for completeness
            // Force collapse to avoid infinite loop (Cosmic Censorship)
            return observation % alphabetSize;
          }
        }
      }

      // Generate a sequence of collapsed states (indices)
      async generateEntangledStates(length, alphabetSize) {
        const states = [];
        for (let i = 0; i < length; i++) {
          states.push(await this.collapseWaveFunction(alphabetSize));
        }
        return states;
      }
    }

    const quantumField = new QuantumField();

    // ---- Fetch quantum random bytes from ANU QRNG API
    async function fetchQuantumBytes(count) {
      const url = `https://qrng.anu.edu.au/API/jsonI.php?length=${count}&type=uint8`;

      // Prefer GM_xmlhttpRequest if available (bypasses CORS)
      if (typeof GM_xmlhttpRequest === 'function') {
        return new Promise((resolve, reject) => {
          GM_xmlhttpRequest({
            method: 'GET',
            url,
            timeout: 8000,
            onload(res) {
              try {
                const json = JSON.parse(res.responseText);
                if (json.success && json.data && json.data.length >= count) {
                  resolve(new Uint8Array(json.data));
                } else {
                  reject(new Error('ANU QRNG: unexpected response format'));
                }
              } catch (e) { reject(e); }
            },
            onerror(e) { reject(new Error('ANU QRNG network error')); },
            ontimeout() { reject(new Error('ANU QRNG timeout')); }
          });
        });
      }

      // Fallback to fetch (may fail due to CORS)
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) throw new Error(`ANU QRNG HTTP ${res.status}`);
      const json = await res.json();
      if (json.success && json.data && json.data.length >= count) {
        return new Uint8Array(json.data);
      }
      throw new Error('ANU QRNG: unexpected response format');
    }

    // ---- Password generation
    async function generatePassword() {
      // Prevent race conditions: if already generating, ignore request
      if (generateBtn.disabled) return;

      // Cooldown for Quantum mode (avoid hammering the public API)
      if (cbQuantum.checked && Date.now() < quantumCooldownEnd) {
        const remaining = Math.ceil((quantumCooldownEnd - Date.now()) / 1000);
        showToast((settings.lang || 'ru') === 'ru' ? `Квантовый поток стабилизируется: ${remaining}с` : `Quantum stream stabilizing: ${remaining}s`, 'warn');
        if (!prefersReducedMotion()) {
          generateBtn.animate(
            [{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }],
            { duration: 260, easing: 'ease-in-out' }
          );
        }
        return;
      }

      const length = parseInt(lengthRange.value, 10);
      const u = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const l = 'abcdefghijklmnopqrstuvwxyz';
      const n = '0123456789';
      const s = '!@#$%^&*()_+-=[]{},.?';

      let alphabet = '';
      if (cbUpper.checked) alphabet += u;
      if (cbLower.checked) alphabet += l;
      if (cbNumbers.checked) alphabet += n;
      if (cbSymbols.checked) alphabet += s;

      if (cbNoAmbiguous && cbNoAmbiguous.checked) {
        alphabet = alphabet.replace(/[il1Lo0O]/g, '');
      }

      if (!alphabet) {
        showToast((settings.lang || 'ru') === 'ru' ? 'Выберите хотя бы один класс символов!' : 'Select at least one character class!', 'danger');
        if (!prefersReducedMotion()) {
          output.animate(
            [{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }],
            { duration: 260, easing: 'ease-in-out' }
          );
        }
        return;
      }

      generateBtn.disabled = true;
      const dict = TRANSLATIONS[settings.lang || 'ru'];

      // quick “loading” shimmer text
      let loadingTimer = null;
      if (!prefersReducedMotion()) {
        loadingTimer = setInterval(() => {
          // Uncollapsed superposition visual
          output.value = Array.from({ length }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
        }, 45);
      }

      try {
        let password = '';
        let isQuantumAPI = cbQuantum.checked;
        let quantumBytes = null;

        // 1. Try Quantum Injection via API (ANU QRNG) if requested
        if (isQuantumAPI) {
          try {
            quantumBytes = await fetchQuantumBytes(length);
            quantumCooldownEnd = Date.now() + 5000;
          } catch (e) {
            // Fallback to local quantum field simulation
            badge.style.display = 'inline-block';
            badge.textContent = 'LOCAL';
            badge.style.background = 'var(--warn-bg)';
            badge.style.borderColor = 'rgba(210,153,34,.4)';
            badge.style.color = 'var(--warn)';
            showToast(dict.t_quantum, 'warn');
            isQuantumAPI = false;
          }
        }

        // 2. Generate Password
        let firstCharAlphabet = alphabet;
        if (cbFirstLetter && cbFirstLetter.checked) {
          firstCharAlphabet = alphabet.replace(/[^a-zA-Z]/g, '');
          if (!firstCharAlphabet) firstCharAlphabet = alphabet;
        }

        let activeAlphabet = alphabet;
        let activeFirstAlphabet = firstCharAlphabet;

        if (isQuantumAPI && quantumBytes) {
          for (let i = 0; i < length; i++) {
            const externalEntropy = quantumBytes[i];
            const useAlphabet = (i === 0) ? activeFirstAlphabet : activeAlphabet;
            const collapsedIndex = (externalEntropy) % useAlphabet.length;
            const selectedChar = useAlphabet.charAt(collapsedIndex);
            password += selectedChar;

            if (cbNoRepeats && cbNoRepeats.checked) {
              activeAlphabet = activeAlphabet.replace(selectedChar, '');
              activeFirstAlphabet = activeFirstAlphabet.replace(selectedChar, '');
              if (!activeAlphabet) activeAlphabet = alphabet;
              if (!activeFirstAlphabet) activeFirstAlphabet = firstCharAlphabet;
            }
          }
        } else {
          // Use our local QuantumField with Rejection Sampling, iteratively due to shrinking alphabet
          const firstIdx = await quantumField.collapseWaveFunction(activeFirstAlphabet.length);
          const firstChar = activeFirstAlphabet.charAt(firstIdx);
          password += firstChar;

          if (cbNoRepeats && cbNoRepeats.checked) {
            activeAlphabet = activeAlphabet.replace(firstChar, '');
            if (!activeAlphabet) activeAlphabet = alphabet;
          }

          for (let i = 1; i < length; i++) {
            const idx = await quantumField.collapseWaveFunction(activeAlphabet.length);
            const selectedChar = activeAlphabet.charAt(idx);
            password += selectedChar;

            if (cbNoRepeats && cbNoRepeats.checked) {
              activeAlphabet = activeAlphabet.replace(selectedChar, '');
              if (!activeAlphabet) activeAlphabet = alphabet;
            }
          }
        }

        // ensure badge back to quantum label when checkbox stays on
        if (cbQuantum.checked && isQuantumAPI) {
          badge.textContent = 'QUANTUM';
          badge.style.background = 'var(--quantum-bg)';
          badge.style.borderColor = 'rgba(188,140,255,.3)';
          badge.style.color = 'var(--quantum)';
        }

        // Clear manual test input to avoid confusion
        if (testInput) testInput.value = '';

        runDecryptEffect(password);
        updateStrengthUI(password);
        runAnalysis(password); // Automatically analyze the new password
      } catch (err) {
        console.error(err);
        showToast(dict.t_err, 'danger');
      } finally {
        if (loadingTimer) clearInterval(loadingTimer);
        generateBtn.disabled = false;
      }
    }

    // ---- Clipboard
    async function copyToClipboard() {
      if (!output.value) return;
      const dict = TRANSLATIONS[settings.lang || 'ru'];

      // 1) Tampermonkey clipboard
      try {
        if (typeof GM_setClipboard === 'function') {
          GM_setClipboard(output.value);
          showToast(dict.t_copy);
          return;
        }
      } catch (_) { }

      // 2) Clipboard API
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(output.value);
          showToast(dict.t_copy);
          return;
        }
      } catch (_) { }

      // 3) Fallback (Manual Copy Prompt or failure)
      // Deprecated 'execCommand' removed for security/audit compliance.
      showToast(dict.t_copy_fail, 'warn');
      output.focus();
      output.select();
    }

    // ---- Randomize settings micro-feature
    function randomizeSettings() {
      const len = clamp(Math.round(8 + Math.random() * 24), 8, 64);
      lengthRange.value = String(len);
      lengthVal.textContent = String(len);

      // keep at least one enabled
      cbUpper.checked = Math.random() > 0.2;
      cbLower.checked = true;
      cbNumbers.checked = Math.random() > 0.15;
      cbSymbols.checked = Math.random() > 0.35;
      if (cbFirstLetter) cbFirstLetter.checked = Math.random() > 0.5;
      if (cbNoAmbiguous) cbNoAmbiguous.checked = Math.random() > 0.7;
      if (cbNoRepeats) cbNoRepeats.checked = Math.random() > 0.6;

      if (!cbUpper.checked && !cbLower.checked && !cbNumbers.checked && !cbSymbols.checked) cbLower.checked = true;

      persistSettings();
      updateStrengthUI(output.value || '');
      showToast(TRANSLATIONS[settings.lang || 'ru'].t_mix);
    }

    function persistSettings() {
      store.set('quantum', cbQuantum.checked);
      store.set('length', Number(lengthRange.value));
      store.set('upper', cbUpper.checked);
      store.set('lower', cbLower.checked);
      store.set('numbers', cbNumbers.checked);
      store.set('symbols', cbSymbols.checked);
      if (cbFirstLetter) store.set('firstLetter', cbFirstLetter.checked);
      if (cbNoAmbiguous) store.set('noAmbiguous', cbNoAmbiguous.checked);
      if (cbNoRepeats) store.set('noRepeats', cbNoRepeats.checked);
    }

    // ---- Event bindings
    toggleBtn.addEventListener('click', togglePanel);
    closeBtn.addEventListener('click', closePanel);

    const themeBtnEl = shadow.getElementById('pg-theme-toggle');
    themeBtnEl.addEventListener('click', () => {
      settings.theme = settings.theme === 'light' ? 'dark' : 'light';
      store.set('theme', settings.theme);
      applyTheme(settings.theme);
    });

    toastClose.addEventListener('click', hideToast);

    copyBtn.addEventListener('click', copyToClipboard);
    generateBtn.addEventListener('click', generatePassword);

    randomizeBtn.addEventListener('click', randomizeSettings);

    // ---- Analysis Event Bindings
    analysisToggle.addEventListener('click', toggleAnalysis);
    analyzeBtn.addEventListener('click', analyzeTestPassword);
    clearTestBtn.addEventListener('click', clearTestInput);

    // ---- HIBP Event Binding
    breachBtn.addEventListener('click', handleBreachCheck);

    // Real-time analysis on test input
    testInput.addEventListener('input', () => {
      // Clear generated password output to avoid confusion
      if (testInput.value.trim() && output) {
        output.value = '';
      }

      if (testInput.value.trim()) {
        analyzeTestPassword();
      } else {
        updateAnalysisUI(null);
      }
    });

    // Enter key in test input
    testInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        analyzeTestPassword();
      }
    });

    // Accordion UI Logic
    const accToggle = shadow.getElementById('pg-acc-toggle');
    const accordion = shadow.getElementById('pg-security-accordion');
    if (accToggle && accordion) {
      accToggle.addEventListener('click', () => {
        accordion.classList.toggle('expanded');
      });
    }

    cbQuantum.addEventListener('change', (e) => {
      setQuantumVisuals(e.target.checked);
      persistSettings();
      updateStrengthUI(output.value || '');
    });

    const onOptionChange = () => {
      persistSettings();
      updateStrengthUI(output.value || '');
    };
    cbUpper.addEventListener('change', onOptionChange);
    cbLower.addEventListener('change', onOptionChange);
    cbNumbers.addEventListener('change', onOptionChange);
    cbSymbols.addEventListener('change', onOptionChange);
    if (cbFirstLetter) cbFirstLetter.addEventListener('change', onOptionChange);
    if (cbNoAmbiguous) cbNoAmbiguous.addEventListener('change', onOptionChange);
    if (cbNoRepeats) cbNoRepeats.addEventListener('change', onOptionChange);

    lengthRange.addEventListener('input', () => {
      lengthVal.textContent = lengthRange.value;
      persistSettings();
      updateStrengthUI(output.value || '');
    });

    // Global Hotkey UX
    window.addEventListener('keydown', (e) => {
      // Toggle Panel via Alt + C
      if (e.altKey && e.code === 'KeyC') {
        e.preventDefault();
        togglePanel();
        return;
      }
      if (e.key === 'Escape' && panel.style.display === 'flex') {
        closePanel();
        return;
      }
      if ((e.key === 'Enter' || e.key === 'NumpadEnter') && panel.style.display === 'flex') {
        // Prevent Keyjacking: Only handle Enter if user is NOT typing in a page input
        // unless they are focused inside our Shadow DOM
        const activePageElement = document.activeElement;
        const pageTag = activePageElement ? activePageElement.tagName.toLowerCase() : '';
        const isEditingPage = (pageTag === 'input' || pageTag === 'textarea' || activePageElement.isContentEditable);

        // If user is editing page content, do not steal Enter
        if (isEditingPage) return;

        // avoid firing while toggling checkboxes inside our panel
        const active = shadow.activeElement;
        const tag = active && active.tagName ? active.tagName.toLowerCase() : '';
        if (tag !== 'textarea' && tag !== 'input') generatePassword();
      }
    });

    // Tampermonkey Menu Command Binding
    if (typeof GM_registerMenuCommand === 'function') {
      GM_registerMenuCommand("Toggle CASIMIR Panel", togglePanel, "c");
      GM_registerMenuCommand("Toggle floating button", () => {
        settings.floatBtn = !settings.floatBtn;
        store.set('floatBtn', settings.floatBtn);
        toggleBtn.style.display = settings.floatBtn ? 'flex' : 'none';

        const lang = settings.lang || 'ru';
        if (settings.floatBtn) {
          showToast(lang === 'ru' ? 'Плавающая кнопка включена' : 'Floating button enabled', 'success');
        } else {
          showToast(lang === 'ru' ? 'Плавающая кнопка скрыта' : 'Floating button hidden', 'warn');
        }
      }, "f");
    }

    // ---- i18n: Apply language to all data-i18n elements ----
    function applyLanguage(lang) {
      const dict = TRANSLATIONS[lang] || TRANSLATIONS['en'];
      // Update text content
      root.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (dict[key] !== undefined) el.textContent = dict[key];
      });
      // Update tooltips (custom data-tip only, remove native title)
      root.querySelectorAll('[data-i18n-tip]').forEach(el => {
        const key = el.getAttribute('data-i18n-tip');
        if (dict[key] !== undefined) {
          el.setAttribute('data-tip', dict[key]);
          el.removeAttribute('title');
        }
      });
      // Update placeholders
      root.querySelectorAll('[data-i18n-ph]').forEach(el => {
        const key = el.getAttribute('data-i18n-ph');
        if (dict[key] !== undefined) el.setAttribute('placeholder', dict[key]);
      });
      // Update language toggle button label
      const langToggle = shadow.getElementById('pg-lang-toggle');
      if (langToggle) langToggle.textContent = lang === 'ru' ? 'EN' : 'RU';
      // Re-apply quantum visuals to update generate button text
      setQuantumVisuals(cbQuantum.checked);
      // Re-render dynamic strings (strength labels, crack time, quality ratings)
      const currentPw = testInput.value.trim() || output.value || '';
      updateStrengthUI(currentPw);
      if (currentPw) {
        runAnalysis(currentPw);
      } else {
        updateAnalysisUI(null);
      }
    }

    // ---- Language toggle binding ----
    const langToggleBtn = shadow.getElementById('pg-lang-toggle');
    if (langToggleBtn) {
      langToggleBtn.addEventListener('click', () => {
        settings.lang = settings.lang === 'ru' ? 'en' : 'ru';
        store.set('lang', settings.lang);
        applyLanguage(settings.lang);
      });
    }

    // Init visuals
    setQuantumVisuals(cbQuantum.checked);
    updateStrengthUI('');
    applyLanguage(settings.lang);
  });
})();