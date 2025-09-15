
import React, { useEffect, useMemo, useState } from "react";

const BASE = import.meta.env.BASE_URL.replace(/\/+$/, ""); // حذف / انتهایی
const toPath = (p: string) => (p.startsWith("/") ? `${BASE}${p}` : `${BASE}/${p}`);
const rulesUrl = (id: string) => `${BASE}/rules/${encodeURIComponent(id)}`;
const homeUrl = () => `${BASE}/`;


type Rule = {
  id: string;
  title: string;
  category: string;
  summary: string;
  before?: string;
  after?: string;
  tags?: string[];
  body?: string;     // markdown
  bodyPath?: string; // /content/rules/xxx.md
};

// Seed fallback if manifest isn't found
const RULES: Rule[] = [
  {
    id: "numbers", title: "اعداد و واحدها", category: "رسم‌الخط رسمی",
    summary: "بین عدد و واحد فاصلهٔ باریک؛ درصد بدون فاصله.",
    before: "۱۲kg | ۵ %", after: "۱۲ kg | ۵%", tags: ["اعداد", "واحد", "درصد"]
  },
  {
    id: "greeting", title: "سلام و خداحافظی رسمی", category: "نامه و ایمیل",
    summary: "افتتاحیه و اختتامیهٔ استاندارد.", before: "سلام، خسته نباشید!",
    after: "با سلام،\nبا احترام", tags: ["نامه", "ایمیل"]
  },
];

const CATEGORIES = [
  { key: "all", label: "همه" },
  { key: "رسم‌الخط رسمی", label: "رسم‌الخط رسمی" },
  { key: "نشانه‌گذاری", label: "نشانه‌گذاری" },
  { key: "نامه و ایمیل", label: "نامه و ایمیل" },
  { key: "عامیانه", label: "عامیانه" },
];

function catTint(cat: string) {
  switch (cat) {
    case "نشانه‌گذاری": return { bg: "rgba(168,85,247,.12)", border: "rgba(168,85,247,.35)", text: "#8b5cf6" };
    case "عامیانه": return { bg: "rgba(6,182,212,.12)", border: "rgba(6,182,212,.35)", text: "#06b6d4" };
    case "نامه و ایمیل": return { bg: "rgba(59,130,246,.12)", border: "rgba(59,130,246,.35)", text: "#3b82f6" };
    case "رسم‌الخط رسمی": return { bg: "rgba(99,102,241,.12)", border: "rgba(99,102,241,.35)", text: "#6366f1" };
    default: return { bg: "var(--chip)", border: "var(--chip-border)", text: "var(--fg-muted)" };
  }
}

export default function OsloobLanding() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [active, setActive] = useState<Rule | null>(null);
  const [page, setPage] = useState<'home' | 'rule'>('home');
  const [rules, setRules] = useState<Rule[]>(RULES);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  // Load manifest + markdown bodies at runtime
  useEffect(() => {
    (async () => {
      try {
        // manifest باید در public/content/manifest.json باشد
        const res = await fetch(toPath("/content/manifest.json"), { cache: "no-store" });
        if (!res.ok) return; // اگر نبود، همان seed می‌ماند
        const m: Rule[] = await res.json();
        const withBodies = await Promise.all(m.map(async r => {
          if (r.bodyPath) {
            try {
              const mdRes = await fetch(toPath(r.bodyPath));
              if (mdRes.ok) r.body = await mdRes.text();
            } catch { }
          }
          return r;
        }));
        setRules(withBodies);
      } catch { }
    })();
  }, []);


  // Simple SPA routing
  const openRule = (r: Rule) => {
    setActive(r); setPage('rule');
    window.history.pushState({}, '', rulesUrl(r.id));
  };
  const goHome = () => {
    setActive(null); setPage('home');
    window.history.pushState({}, '', homeUrl());
  };
  useEffect(() => {
    const apply = () => {
      const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(`^${esc(BASE)}/rules/([^/]+)$`);
      const m = window.location.pathname.match(re);
      if (m) {
        const r = rules.find(x => x.id === decodeURIComponent(m[1]));
        if (r) { setActive(r); setPage('rule'); return; }
      }
      setActive(null); setPage('home');
    };
    apply();
    window.addEventListener('popstate', apply);
    return () => window.removeEventListener('popstate', apply);
  }, [rules]);

  // bg parallax
  useEffect(() => {
    let raf = 0;
    let next = { x: 0, y: 0 };
    const onMove = (e: MouseEvent) => {
      next.x = e.clientX; next.y = e.clientY;
      if (!raf) {
        raf = requestAnimationFrame(() => {
          setMouse(next);
          raf = 0;
        });
      }
    };
    window.addEventListener('mousemove', onMove, { passive: true }); // passive مهم
    return () => {
      window.removeEventListener('mousemove', onMove as any);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const filtered = useMemo(() => {
    const kw = q.trim();
    return rules.filter(
      r =>
        (cat === "all" || r.category === cat) &&
        (kw === "" || r.title.includes(kw) || r.summary.includes(kw) || r.tags?.some(t => t.includes(kw)))
    );
  }, [q, cat, rules]);


  const themeVars: React.CSSProperties =
    theme === "dark" ? {
      // @ts-ignore
      "--fg": "#e5e7eb", "--fg-muted": "#94a3b8",
      "--glass": "rgba(255,255,255,.14)", "--glass-strong": "rgba(255,255,255,.20)", "--glass-border": "rgba(255,255,255,.22)",
      "--chip": "rgba(255,255,255,.10)", "--chip-border": "rgba(255,255,255,.16)",
      "--panel-bad-bg": "rgba(244,63,94,.14)", "--panel-bad-border": "rgba(244,63,94,.40)", "--panel-bad-text": "#fecdd3",
      "--panel-good-bg": "rgba(16,185,129,.14)", "--panel-good-border": "rgba(16,185,129,.40)", "--panel-good-text": "#bbf7d0",
    } : {
      // @ts-ignore
      "--fg": "#0f172a", "--fg-muted": "#475569",
      "--glass": "rgba(255,255,255,.60)", "--glass-strong": "rgba(255,255,255,.75)", "--glass-border": "rgba(15,23,42,.10)",
      "--chip": "rgba(15,23,42,.06)", "--chip-border": "rgba(15,23,42,.15)",
      "--panel-bad-bg": "rgba(244,63,94,.10)", "--panel-bad-border": "rgba(244,63,94,.35)", "--panel-bad-text": "#b91c1c",
      "--panel-good-bg": "rgba(16,185,129,.12)", "--panel-good-border": "rgba(16,185,129,.35)", "--panel-good-text": "#065f46",
    };

  return (
    <main dir="rtl" style={themeVars}
      className={"min-h-screen text-[color:var(--fg)] transition-colors " + (theme === "dark" ? "bg-[#0b1020]" : "bg-gradient-to-br from-rose-50 via-sky-50 to-emerald-50")}>
      <BgLayer theme={theme} mouse={mouse} />

      <header className="relative mx-auto max-w-7xl px-4 pt-10 pb-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Logo />
            <h1 className="bg-gradient-to-l from-emerald-500 via-cyan-500 to-fuchsia-500 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent sm:text-4xl">اسلوب</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setTheme(t => t === "light" ? "dark" : "light")} className="rounded-full border border-[color:var(--glass-border)] bg-[color:var(--glass-strong)] px-3 py-1 text-xs shadow-sm backdrop-blur-md transition hover:brightness-110">
              {theme === "light" ? "تیره" : "روشن"}
            </button>
          </div>
        </div>

        <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[color:var(--fg-muted)]">ابزاری برای درست‌نویسی فارسی</p>

        <div className="mx-auto mt-6 flex max-w-3xl gap-3">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جست‌وجوی قاعده، برچسب یا کلیدواژه…"
            className="w-full rounded-2xl border border-[color:var(--glass-border)] bg-[color:var(--glass)] px-4 py-3 shadow-lg outline-none backdrop-blur-xl placeholder:text-[color:var(--fg-muted)] focus:ring-2 focus:ring-cyan-300" />
        </div>

        <div className="mx-auto mt-3 flex max-w-3xl flex-wrap gap-2">
          {CATEGORIES.map(c => {
            if (c.key === "all") return (
              <button key={c.key} onClick={() => setCat(c.key)}
                className={`cursor-pointer rounded-full border px-3 py-1 text-sm backdrop-blur-md transition ${cat === c.key ? "border-[color:var(--glass-border)] bg-[color:var(--glass-strong)] shadow-md" : "border-[color:var(--chip-border)] bg-[color:var(--chip)] hover:brightness-110"}`}>
                {c.label}
              </button>
            );
            const tint = catTint(c.key); const active = cat === c.key;
            return (
              <button key={c.key} onClick={() => setCat(c.key)}
                className={`cursor-pointer rounded-full px-3 py-1 text-sm backdrop-blur-md transition ${active ? "shadow-md" : "hover:brightness-110"}`}
                style={{ background: tint.bg, border: `1px solid ${tint.border}`, color: tint.text }}>{c.label}</button>
            );
          })}
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 pb-24">
        <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3 cv-auto">
          {filtered.map(r => (
            <RuleCard key={r.id} rule={r} onOpen={() => openRule(r)} />
          ))}
        </section>
      </div>

      {page === 'rule' && active && <RulePage rule={active} onBack={goHome} />}
    </main>
  );
}

function RuleCard({ rule, onOpen }: { rule: Rule; onOpen: () => void }) {
  return (
    <article
      className="group relative overflow-hidden rounded-3xl border border-[color:var(--glass-border)] 
             bg-[color:var(--glass)] p-5 shadow-xl backdrop-blur-2xl sm:backdrop-blur-2xl 
             backdrop-blur-xl 
             transition hover:scale-[1.01] hover:shadow-2xl 
             transform-gpu [will-change:transform] [backface-visibility:hidden]">      <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-inset ring-transparent group-hover:ring-cyan-300/40" />
      <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br from-white/20 to-transparent opacity-0 transition group-hover:opacity-40 mix-blend-soft-light dark:from-white/10 dark:group-hover:opacity-20" />
      <div className="relative flex items-start justify-between gap-3">
        <h3 className="text-lg font-bold leading-7">{rule.title}</h3>
        <span className="rounded-full px-2 py-0.5 text-[10px] font-medium backdrop-blur-md"
          style={(() => { const t = catTint(rule.category); return { background: t.bg, border: `1px solid ${t.border}`, color: t.text }; })()}>
          {rule.category}
        </span>
      </div>
      <p className="mt-2 text-sm text-[color:var(--fg-muted)]">{rule.summary}</p>
      {(rule.before || rule.after) && (
        <div className="mt-4 grid gap-3">
          <BeforeAfter before={rule.before} after={rule.after} />
        </div>
      )}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex flex-wrap gap-1">
          {rule.tags?.map(t => <span key={t} className="rounded-full border border-[color:var(--chip-border)] bg-[color:var(--chip)] px-2 py-0.5 text-[10px] text-[color:var(--fg-muted)] backdrop-blur-sm">#{t}</span>)}
        </div>
        <button onClick={onOpen} className="cursor-pointer rounded-full border border-[color:var(--glass-border)] bg-[color:var(--glass-strong)] px-3 py-1 text-xs backdrop-blur-md transition hover:brightness-110">توضیح بیشتر</button>
      </div>
    </article>
  );
}

function BeforeAfter({ before, after }: { before?: string; after?: string }) {
  return (
    <div className="grid gap-3">
      <div className="rounded-2xl border p-3 text-sm" style={{ borderColor: "var(--panel-bad-border)", background: "var(--panel-bad-bg)", color: "var(--panel-bad-text)" }}>
        <span className="inline-block rounded-md px-2 text-[10px] font-bold" style={{ background: "rgba(244,63,94,.10)", color: "var(--panel-bad-text)" }}>قبل</span>
        <div className="mt-1 leading-7"><BidiText text={before} /></div>
      </div>
      <div className="rounded-2xl border p-3 text-sm" style={{ borderColor: "var(--panel-good-border)", background: "var(--panel-good-bg)", color: "var(--panel-good-text)" }}>
        <span className="inline-block rounded-md px-2 text-[10px] font-bold" style={{ background: "rgba(16,185,129,.12)", color: "var(--panel-good-text)" }}>بعد</span>
        <div className="mt-1 leading-7"><BidiText text={after} /></div>
      </div>
    </div>
  );
}

function BidiText({ text }: { text?: string }) {
  if (!text) return <span>—</span>;
  const parts = String(text).split("|");
  return (
    <span dir="rtl" className="whitespace-pre-wrap">
      {parts.map((p, i) => {
        const normalized = p.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\\n/g, "\n");
        const lines = normalized.split("\n");
        return (
          <span key={i} className="inline">
            <bdi dir="auto" style={{ unicodeBidi: "isolate" }} className="align-middle">
              {lines.map((ln, idx) => (
                <React.Fragment key={idx}>
                  {ln}{idx < lines.length - 1 && <br />}
                </React.Fragment>
              ))}
            </bdi>
            {i < parts.length - 1 && <span className="mx-1 opacity-60">|</span>}
          </span>
        );
      })}
    </span>
  );
}




function RulePage({ rule, onBack }: { rule: Rule; onBack: () => void }) {
  const tint = catTint(rule.category);
  return (
    <div className="fixed inset-0 z-50 overflow-auto p-4 bg-slate-900/30 sm:bg-slate-900/40 
                backdrop-blur-md sm:backdrop-blur-lg">
      <div className="mx-auto w-full max-w-3xl">
        <article className="relative overflow-hidden rounded-3xl border border-[color:var(--glass-border)] bg-[color:var(--glass)] p-6 shadow-2xl backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-inset ring-white/30" />
          <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-b from-white/60 to-white/30 opacity-80 mix-blend-luminosity dark:opacity-0" />
          <div className="relative flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ background: tint.bg, border: `1px solid ${tint.border}`, color: tint.text }}>{rule.category}</span>
              <h3 className="text-xl font-extrabold">{rule.title}</h3>
            </div>
            <button onClick={onBack} className="relative z-10 rounded-full border border-[color:var(--glass-border)] bg-[color:var(--glass-strong)] px-3 py-1 text-xs backdrop-blur-md transition hover:brightness-110">بازگشت</button>
          </div>
          <p className="relative mt-2 text-sm opacity-80">{rule.summary}</p>
          <div className="relative mt-4"><BeforeAfter before={rule.before} after={rule.after} /></div>
          <div className="prose prose-sm prose-slate relative mt-6 max-w-none rtl:prose-p:text-right rtl:prose-ul:text-right rtl:prose-li:text-right dark:prose-invert">
            {rule.body ? <Markdown md={rule.body} /> : <DefaultMore />}
          </div>
        </article>
      </div>
    </div>
  );
}

function DefaultMore() {
  return (<div><h4>توضیح بیشتر</h4><p>به‌زودی مثال‌های بیشتری اضافه می‌شود.</p></div>);
}

function Logo() {
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[color:var(--glass-border)] bg-[color:var(--glass)] shadow-lg backdrop-blur-xl">
      <svg viewBox="0 0 24 24" className="h-7 w-7">
        <path d="M4 18c4-2 7-6 8-12 1 6 4 10 8 12-3 1-6 1-8 0-2 1-5 1-8 0z" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    </div>
  );
}

function BgLayer({ theme, mouse }: { theme: "light" | "dark"; mouse: { x: number; y: number } }) {
  const dims = { w: typeof window !== 'undefined' ? window.innerWidth : 0, h: typeof window !== 'undefined' ? window.innerHeight : 0 };
  const t = (k: number) => ({ transform: `translate3d(${(mouse.x - dims.w / 2) / k}px, ${(mouse.y - dims.h / 2) / k}px, 0)` });
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div style={t(20)} className={"absolute -top-16 -right-10 h-72 w-72 rounded-[2rem] blur-3xl " + (theme === "dark" ? "bg-gradient-to-br from-fuchsia-500/25 to-cyan-500/25" : "bg-gradient-to-br from-fuchsia-400/70 to-cyan-400/70")} />
      <div style={t(18)} className={"absolute top-40 left-10 h-40 w-40 rotate-12 rounded-full blur-3xl " + (theme === "dark" ? "bg-emerald-400/25" : "bg-emerald-400/60")} />
      <div style={t(28)} className={"absolute bottom-20 right-24 h-52 w-52 -rotate-6 rounded-[50%_50%_40%_60%/60%_40%_60%_40%] blur-3xl " + (theme === "dark" ? "bg-sky-400/25" : "bg-sky-400/60")} />
      <div style={t(24)} className={"absolute bottom-10 left-1/3 h-28 w-64 rounded-3xl blur-3xl " + (theme === "dark" ? "bg-pink-400/20" : "bg-pink-400/55")} />
      <div className="absolute inset-0">
        {[...Array(12)].map((_, i) => (<div key={i} style={{ right: `${(i * 83) % 100}%`, top: `${(i * 47) % 100}%` }} className={"absolute h-2 w-2 rounded-full blur-[2px] " + (theme === "dark" ? "bg-white/20" : "bg-slate-400/40")} />))}
      </div>
    </div>
  );
}

// Minimal Markdown renderer
function Markdown({ md }: { md: string }) {
  const lines = md.split(/\\r?\\n/);
  const elements: React.ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length) {
      elements.push(<ul key={'ul-' + elements.length}>{list.map((li, i) => <li key={i}><Inline text={li} /></li>)}</ul>);
      list = [];
    }
  };
  lines.forEach((raw, idx) => {
    const line = raw.trimEnd();
    const m = line.match(/^(#{1,4})\\s+(.*)$/);
    if (/^\\s*-\\s+/.test(line)) { list.push(line.replace(/^\\s*-\\s+/, '')); return; }
    flush();
    if (m) { const lvl = m[1].length; const txt = m[2]; const H: any = ('h' + lvl); elements.push(React.createElement(H, { key: 'h' + idx }, txt)); return; }
    if (line === '') { elements.push(<p key={'e' + idx} />); return; }
    elements.push(<p key={'p' + idx}><Inline text={line} /></p>);
  });
  flush();
  return (<div className="prose prose-sm dark:prose-invert">{elements}</div>);
}
function Inline({ text }: { text: string }) {
  const parts = text.split(/`([^`]+)`/g);
  return (<>
    {parts.map((seg, i) => i % 2 === 1 ? <code key={'c' + i}>{seg}</code> :
      seg.split(/\\*\\*(.+?)\\*\\*/g).map((s, j) => j % 2 === 1 ? <strong key={'b' + i + '-' + j}>{s}</strong> : <React.Fragment key={'t' + i + '-' + j}>{s}</React.Fragment>)
    )}
  </>);
}

