/* ---------- shared core: storage, audio, SRS, helpers ---------- */
const PAGES = false; // build.py --pages flips this: standalone site, no audio, backup controls
const DAY = 86400000;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const todayKey = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
const isKana = s => /^[぀-ヿー\s・〜ー!?！？。、]*$/.test(s);
function ruby(w, r) {
  if (!r || w === r || isKana(w)) return esc(w);
  return `<ruby>${esc(w)}<rt>${esc(r)}</rt></ruby>`;
}
const SPEAK_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
const sayBtn = (text, label = "Play audio") => PAGES ? "" : `<button class="say" type="button" data-say="${esc(text)}" aria-label="${esc(label)}" title="Listen">${SPEAK_ICON}</button>`;

function toast(msg) {
  let t = $(".toast"); if (!t) { t = document.createElement("div"); t.className = "toast"; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add("show"); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("show"), 1800);
}

/* ---- persistence: account-synced db doc (private per viewer) with browser fallback ---- */
const LS = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
};
const withTimeout = (p, ms) => Promise.race([p, new Promise(r => setTimeout(() => r(null), ms))]);
const dbConn = (async () => {
  try {
    if (!window.claude || !window.claude.use) return null;
    const [db, user] = await Promise.all([claude.use("db"), claude.use("user")]);
    if (!db || !user) return null;
    const id = await withTimeout(user.id(), 10000);
    return id ? { db, id } : null;
  } catch (e) { return null; }
})();
function setSync(on) { const el = $(".sync"); if (!el) return; el.classList.toggle("on", on); $("span", el).textContent = on ? "Progress synced to your account" : "Progress saved in this browser"; }

function makeStore(key, onLoad) {
  const lsKey = "jpstudy:" + key;
  const s = { data: LS.get(lsKey) || {}, ref: null };
  let writing = false, again = false, timer = null;
  async function flush() {
    timer = null;
    if (!s.ref) return;
    if (writing) { again = true; return; }
    writing = true;
    try { await s.ref.set(JSON.parse(JSON.stringify(s.data))); }
    catch (e) { if (e && (e.code === "invalid_argument" || e.code === "revoked" || e.code === "not_granted")) { s.ref = null; setSync(false); } }
    writing = false;
    if (again) { again = false; flush(); }
  }
  s.save = () => {
    s.data._t = Date.now();
    LS.set(lsKey, s.data);
    if (s.ref) { clearTimeout(timer); timer = setTimeout(flush, 1200); }
  };
  document.addEventListener("visibilitychange", () => { if (document.hidden && timer) { clearTimeout(timer); flush(); } });
  s.ready = (async () => {
    const c = await dbConn;
    if (!c) { setSync(false); return; }
    try {
      const ref = c.db.doc("data/users/" + c.id + "/" + key);
      const snap = await withTimeout(ref.get(), 10000);
      if (!snap) { setSync(false); return; }
      s.ref = ref; setSync(true);
      if (snap.exists) {
        const remote = snap.data();
        if ((remote._t || 0) >= (s.data._t || 0)) { s.data = JSON.parse(JSON.stringify(remote)); LS.set(lsKey, s.data); onLoad && onLoad(); }
        else flush();
      } else if (s.data._t) flush();
    } catch (e) { setSync(false); }
  })();
  return s;
}

/* ---- audio: Claude voice when available, else the browser's Japanese voice ---- */
const Speech = PAGES ? (document.documentElement.classList.add("no-audio"), { speak() { }, available: () => false }) : (() => {
  let tts = null, ttsOff = false, jaVoice = null, settled = false;
  const synth = "speechSynthesis" in window ? window.speechSynthesis : null;
  function pickVoice() { if (!synth) return; const vs = synth.getVoices(); jaVoice = vs.find(v => /^ja(-|_|$)/i.test(v.lang)) || null; refresh(); }
  if (synth) { pickVoice(); synth.onvoiceschanged = pickVoice; }
  const ready = (window.claude && window.claude.use) ? claude.use("tts").catch(() => null) : Promise.resolve(null);
  ready.then(t => { tts = t; refresh(); });
  setTimeout(() => { settled = true; refresh(); }, 2500);
  function available() { return (tts && !ttsOff) || !!jaVoice; }
  function refresh() { if (settled || tts || jaVoice) document.documentElement.classList.toggle("no-audio", !available()); }
  function speak(text, rate = 0.9) {
    if (!text) return;
    if (tts && !ttsOff) {
      tts.speak(text, { language: "ja", rate }).catch(e => {
        if (e && (e.code === "not_granted" || e.code === "unavailable")) { ttsOff = true; tts = null; refresh(); }
      });
      return;
    }
    if (synth && jaVoice) {
      synth.cancel(); const u = new SpeechSynthesisUtterance(text); u.voice = jaVoice; u.lang = jaVoice.lang; u.rate = rate; synth.speak(u);
    }
  }
  document.addEventListener("click", e => { const b = e.target.closest("[data-say]"); if (b) { e.stopPropagation(); speak(b.dataset.say); } }, true);
  return { speak, available };
})();

/* ---- spaced repetition (SM-2 style, with short learning steps) ---- */
const SRS = {
  status(c) { if (!c) return "new"; if (c.i === 0) return "learning"; return c.i >= 21 ? "known" : "young"; },
  grade(c, g, now = Date.now()) {
    c = c ? { ...c } : { i: 0, e: 2.5, r: 0, l: 0, st: 0 };
    if (c.i === 0) {
      if (g === 0) { c.st = 0; c.d = now + 60e3; }
      else if (g === 1) { c.d = now + 5 * 60e3; }
      else if (g === 2) { if (c.st >= 1) { c.i = 1; c.d = now + DAY; } else { c.st = 1; c.d = now + 10 * 60e3; } }
      else { c.i = 4; c.d = now + 4 * DAY; }
    } else {
      if (g === 0) { c.l++; c.e = Math.max(1.3, c.e - 0.2); c.i = 0; c.st = 0; c.d = now + 10 * 60e3; }
      else {
        if (g === 1) { c.e = Math.max(1.3, c.e - 0.15); c.i = Math.max(1, c.i * 1.2); }
        else if (g === 2) c.i = c.i * c.e;
        else { c.e += 0.15; c.i = c.i * c.e * 1.3; }
        c.i = Math.round(c.i * 10) / 10; c.d = now + c.i * DAY;
      }
    }
    c.r++; return c;
  },
  preview(c, g) { const now = Date.now(); const n = SRS.grade(c, g, now); return SRS.fmt(n.d - now); },
  fmt(ms) {
    const m = ms / 60e3; if (m < 1.5) return "<1 min"; if (m < 60) return Math.round(m) + " min";
    const d = ms / DAY; if (d < 1) return Math.round(m / 60) + " h"; if (d < 30) return Math.round(d) + (Math.round(d) === 1 ? " day" : " days");
    if (d < 365) return Math.round(d / 30) + " mo"; return (d / 365).toFixed(1) + " yr";
  },
  known() { const now = Date.now(); return { i: 30, e: 2.6, r: 1, l: 0, st: 1, d: now + 30 * DAY }; }
};

/* ---- hash tabs ---- */
function hashTabs(views, start, onShow) {
  function show() {
    const h = location.hash.slice(1); const v = views.includes(h) ? h : start;
    views.forEach(n => { const el = document.getElementById("view-" + n); if (el) el.hidden = n !== v; });
    $$(".tabs a").forEach(a => a.classList.toggle("on", a.getAttribute("href") === "#" + v));
    onShow && onShow(v);
  }
  window.addEventListener("hashchange", show); show();
}

/* ---- choose the next card: due reviews, then new, then learning cards coming up soon ---- */
function pickNext(items, cards, { id, newLeft, lastId }) {
  const now = Date.now(); const due = [], ahead = []; let fresh = null;
  for (const it of items) {
    const k = id(it), c = cards[k];
    if (!c) { if (!fresh && newLeft > 0) fresh = it; continue; }
    if (c.d <= now) due.push([c.d, it]); else if (c.i === 0 && c.d <= now + 20 * 60e3) ahead.push([c.d, it]);
  }
  due.sort((a, b) => a[0] - b[0]); ahead.sort((a, b) => a[0] - b[0]);
  const order = [...due.map(x => [x[1], "due"]), ...(fresh ? [[fresh, "new"]] : []), ...ahead.map(x => [x[1], "ahead"])];
  if (!order.length) return null;
  const pick = order.find(o => id(o[0]) !== lastId) || order[0];
  return { it: pick[0], kind: pick[1] };
}
function srsCounts(items, cards, id) {
  const now = Date.now(); let due = 0, learning = 0, fresh = 0;
  for (const it of items) { const c = cards[id(it)]; if (!c) fresh++; else if (c.d <= now) { due++; } else if (c.i === 0) learning++; }
  return { due, learning, fresh };
}

/* ---- standalone site: ask the browser to keep our data, and offer backup / restore ---- */
if (PAGES) {
  try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) { }
  const PREFIX = "jpstudy:";
  function exportProgress() {
    const out = { app: "learn-japanese", version: 1, exported: new Date().toISOString(), data: {} };
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith(PREFIX)) out.data[k] = JSON.parse(localStorage.getItem(k)); } } catch (e) { }
    if (!Object.keys(out.data).length) { toast("Nothing to back up yet"); return; }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(out)], { type: "application/json" }));
    a.download = "japanese-progress-" + todayKey() + ".json";
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast("Backup downloaded");
  }
  function importProgress(file) {
    const r = new FileReader();
    r.onload = () => {
      try {
        const j = JSON.parse(r.result);
        if (j.app !== "learn-japanese" || !j.data || typeof j.data !== "object") throw new Error("not a backup");
        const keys = Object.keys(j.data).filter(k => k.startsWith(PREFIX));
        if (!keys.length) throw new Error("empty");
        keys.forEach(k => localStorage.setItem(k, JSON.stringify(j.data[k])));
        toast("Progress restored"); setTimeout(() => location.reload(), 700);
      } catch (e) { toast("That file isn't a progress backup from these pages"); }
    };
    r.readAsText(file);
  }
  document.addEventListener("DOMContentLoaded", () => {
    const wrap = $(".wrap"); if (!wrap) return;
    const f = document.createElement("footer"); f.className = "backup";
    f.innerHTML = `<div><b>Your progress lives in this browser.</b> It covers all three pages. Clearing site data erases it, and other devices don't see it, so download a backup now and then.</div>
      <div class="row"><button class="btn small" type="button" id="bkExport">Download backup</button><label class="btn small ghost" for="bkImport">Restore from file</label><input type="file" id="bkImport" accept="application/json,.json" hidden></div>`;
    wrap.appendChild(f);
    $("#bkExport").onclick = exportProgress;
    $("#bkImport").onchange = e => { const file = e.target.files[0]; if (file) importProgress(file); e.target.value = ""; };
  });
}
