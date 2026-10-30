'use client';
// The patch configurator: one question per screen, in EP-CF's order for the chosen product, with a
// live price, then artwork and contact details. Opened from a patch type card or with ?p=<slug>.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import { estimate, money, quantityBracket, type Answers, type Product, type Step } from '@/lib/catalog';
import { ARTWORK_EXTENSIONS, BUSINESS, CONTACT_METHODS, extOf } from '@/lib/options';
import { DIAL_CODES, joinPhone, toE164 } from '@/lib/phone';
import { getAttribution, track, uuid } from '@/lib/track-client';
import { fe, flush, funnelIds, noteStep } from '@/lib/funnel-client';
import { withBase } from '@/lib/base';
import css from '../epcf.module.css';

const MAX_MB = Number(process.env.NEXT_PUBLIC_ARTWORK_MAX_MB || 25);
const TURNSTILE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const QTY_PRESETS = [10, 25, 50, 100, 250, 500, 1000];

type UploadState = 'uploading' | 'done' | 'error';
type FileItem = { id: string; name: string; size: number; ext: string; path?: string; state: UploadState; progress: number; error?: string; preview?: string };
type Contact = { first: string; last: string; biz: string; email: string; cc: string; phone: string; method: string; consent: boolean };
const NO_CONTACT: Contact = { first: '', last: '', biz: '', email: '', cc: '+1', phone: '', method: 'WhatsApp', consent: false };

declare global {
  interface Window {
    turnstile?: { render: (el: HTMLElement, o: Record<string, unknown>) => string; reset: (id?: string) => void };
  }
}

const fmtSize = (b: number) => (b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB');
const storeKey = (slug: string) => `epcf-cfg-${slug}`;

export default function Configurator({ product, onClose }: { product: Product; onClose: () => void }) {
  const router = useRouter();
  // Screens: the product's own steps, then contact details.
  const screens = useMemo(() => [...product.steps, { id: 'contact', phase: 7, kind: 'contact' as const, question: 'Where should we send your quote?', help: 'Your price and free mockup arrive on WhatsApp and email.', source: 'Contact' }], [product]);
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [qty, setQty] = useState(product.qtyMin);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [later, setLater] = useState(false);
  const [notes, setNotes] = useState('');
  const [c, setC] = useState<Contact>(NO_CONTACT);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [tsToken, setTsToken] = useState('');
  const [folder] = useState(() => uuid());
  const [eventId] = useState(() => uuid());
  const started = useRef(false);
  const phasesSeen = useRef(new Set<number>());
  const shownAt = useRef(Date.now());
  const fileObjs = useRef(new Map<string, File>());
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tsRef = useRef<HTMLDivElement>(null);
  const tsId = useRef<string | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const screen = screens[i];
  const est = estimate(product, answers, qty);
  const sizeStep = product.steps.find((s) => s.kind === 'size');

  // Restore an unfinished configuration of this product (refresh, back from another tab).
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(storeKey(product.slug)) || 'null');
      if (saved) {
        setAnswers(saved.answers || {});
        setQty(saved.qty || product.qtyMin);
        setNotes(saved.notes || '');
        setLater(!!saved.later);
        setC({ ...NO_CONTACT, ...(saved.c || {}) });
        setFiles((saved.files || []).filter((f: FileItem) => f.state === 'done'));
        setI(Math.min(saved.i || 0, screens.length - 1));
      }
    } catch {
      /* ignore */
    }
  }, [product, screens.length]);
  useEffect(() => {
    try {
      sessionStorage.setItem(storeKey(product.slug), JSON.stringify({ answers, qty, notes, later, c, i, files: files.map(({ preview, ...f }) => f) }));
    } catch {
      /* ignore */
    }
  }, [product.slug, answers, qty, notes, later, c, i, files]);

  // Lock the page behind the sheet and close on Escape.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  // Analytics: one view per phase, in the order the visitor meets them.
  useEffect(() => {
    shownAt.current = Date.now();
    bodyRef.current?.scrollTo({ top: 0 });
    noteStep(screen.phase);
    if (!phasesSeen.current.has(screen.phase)) {
      phasesSeen.current.add(screen.phase);
      fe('rfq_step_view', screen.phase, { product: product.slug });
    }
  }, [i, screen.phase, product.slug]);

  const begin = useCallback(() => {
    if (started.current) return;
    started.current = true;
    track('StartRFQ', { content_name: product.name });
    fe('rfq_start', undefined, { product: product.slug });
  }, [product]);

  // Opening the configurator means the visitor picked a patch type: step 1 is done.
  useEffect(() => {
    begin();
    track('PatchTypeSelected', { patch_type: product.name });
    fe('rfq_step_complete', 1, { patch_type: product.name, product: product.slug });
  }, [begin, product]);

  const go = (to: number) => {
    setErr('');
    setI(Math.max(0, Math.min(screens.length - 1, to)));
  };

  function completeMeta(s: Step | (typeof screens)[number]) {
    const meta: Record<string, unknown> = { ms: Date.now() - shownAt.current, product: product.slug };
    if (s.phase === 2) meta.quantity = quantityBracket(qty);
    return meta;
  }

  function validate(s: (typeof screens)[number]): [string, string] {
    if (s.kind === 'quantity' && (!(qty >= product.qtyMin) || qty > product.qtyMax)) return [`Enter a quantity from ${product.qtyMin} to ${product.qtyMax.toLocaleString('en-US')}.`, 'qty'];
    if ((s.kind === 'single' || s.kind === 'size' || s.kind === 'turnaround') && !answers[s.id]) return ['Choose an option to continue.', 'option'];
    if (s.kind === 'upload') {
      if (files.some((f) => f.state === 'uploading')) return ['Wait for your file to finish uploading.', 'files'];
      if (files.some((f) => f.state === 'error')) return ['One file did not upload. Tap Retry on it, or remove it.', 'files'];
      if (!files.length && !later) return ['Upload your artwork, or tick that you will send it later.', 'files'];
    }
    if (s.kind === 'contact') {
      if (!c.first.trim()) return ['Enter your first name.', 'first'];
      if (!c.last.trim()) return ['Enter your last name.', 'last'];
      if (!EMAIL_RE.test(c.email.trim())) return ['Enter a valid email so we can send your quote.', 'email'];
      if (!toE164(joinPhone(c.cc || '+1', c.phone))) return ['Check your WhatsApp number: pick your country code and type the number without the leading 0.', 'phone'];
      if (!c.consent) return ['Tick the box to agree to be contacted about your quote.', 'consent'];
    }
    return ['', ''];
  }

  function next() {
    const [e, field] = validate(screen);
    if (e) {
      setErr(e);
      fe('validation_error', screen.phase, { field, product: product.slug });
      return;
    }
    fe('rfq_step_complete', screen.phase, completeMeta(screen));
    if (i < screens.length - 1) go(i + 1);
  }

  function pick(step: Step, optionId: string) {
    begin();
    setAnswers((a) => ({ ...a, [step.id]: optionId }));
    setErr('');
    // Single choice screens move on by themselves, quickly, so the flow feels like tapping through.
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(() => {
      fe('rfq_step_complete', step.phase, { ms: Date.now() - shownAt.current, product: product.slug, option: optionId });
      setI((cur) => (screens[cur]?.id === step.id ? Math.min(cur + 1, screens.length - 1) : cur));
    }, 260);
  }

  // ---------- uploads (signed upload straight to private storage) ----------
  async function upload(item: FileItem, file: File) {
    const update = (patch: Partial<FileItem>) => setFiles((list) => list.map((x) => (x.id === item.id ? { ...x, ...patch } : x)));
    update({ state: 'uploading', progress: 0, error: undefined });
    try {
      const res = await fetch(withBase('/api/upload/sign'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: file.name, size: file.size, folder }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed.');
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', data.signedUrl);
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
        xhr.setRequestHeader('x-upsert', 'false');
        xhr.upload.onprogress = (e) => e.lengthComputable && update({ progress: Math.round((e.loaded / e.total) * 100) });
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error('Upload failed. Check your connection and tap Retry.')));
        xhr.onerror = () => reject(new Error('Upload failed. Check your connection and tap Retry.'));
        xhr.send(file);
      });
      update({ state: 'done', progress: 100, path: data.path });
      fileObjs.current.delete(item.id);
      track('ArtworkUploaded', { file_type: item.ext });
      fe('artwork_upload_success', 5, { ext: item.ext, size: item.size });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Upload failed.';
      update({ state: 'error', error: msg });
      fe('artwork_upload_fail', 5, { ext: item.ext, size: item.size, error: msg.slice(0, 120) });
    }
  }

  function addFiles(list: FileList | null) {
    if (!list) return;
    begin();
    let bad = '';
    const add: { item: FileItem; file: File }[] = [];
    Array.from(list).forEach((file) => {
      const ext = extOf(file.name);
      if (!(ARTWORK_EXTENSIONS as readonly string[]).includes(ext)) {
        bad = `${file.name} is not a supported file type. Use PNG, JPG, PDF, AI, PSD, EPS or SVG.`;
        fe('artwork_upload_fail', 5, { ext: ext || 'none', size: file.size, error: 'unsupported type' });
        return;
      }
      if (file.size > MAX_MB * 1024 * 1024) {
        bad = `${file.name} is over ${MAX_MB} MB. Upload a smaller version.`;
        fe('artwork_upload_fail', 5, { ext, size: file.size, error: 'too large' });
        return;
      }
      const isImg = /^image\/(png|jpe?g|svg\+xml)$/.test(file.type);
      const item: FileItem = { id: uuid(), name: file.name, size: file.size, ext, state: 'uploading', progress: 0, preview: isImg ? URL.createObjectURL(file) : undefined };
      fileObjs.current.set(item.id, file);
      add.push({ item, file });
    });
    if (add.length) {
      setFiles((prev) => [...prev, ...add.map((a) => a.item)]);
      setLater(false);
      add.forEach((a) => upload(a.item, a.file));
    }
    setErr(bad);
  }

  // ---------- Turnstile on the last screen only ----------
  const renderTurnstile = useCallback(() => {
    if (!TURNSTILE_KEY || !window.turnstile || !tsRef.current || tsId.current) return;
    tsId.current = window.turnstile.render(tsRef.current, { sitekey: TURNSTILE_KEY, callback: (t: string) => setTsToken(t), 'expired-callback': () => setTsToken(''), appearance: 'interaction-only' });
  }, []);
  useEffect(() => {
    if (screen.kind === 'contact') renderTurnstile();
    else tsId.current = null;
  }, [screen.kind, renderTurnstile]);

  function lines(done = false) {
    const out: { k: string; v: string }[] = [{ k: 'Patch type', v: product.title }];
    for (const s of product.steps) {
      if (s.kind === 'quantity') out.push({ k: 'Quantity', v: `${qty.toLocaleString('en-US')} pcs` });
      else if (s.kind === 'upload') out.push({ k: 'Artwork', v: files.filter((f) => f.state === 'done').length ? `${files.filter((f) => f.state === 'done').length} file(s) received` : later ? 'Will send later' : 'Not added yet' });
      else {
        const o = s.options?.find((x) => x.id === answers[s.id]);
        if (o) out.push({ k: s.kind === 'turnaround' ? 'Turnaround' : s.question.replace(/\?$/, ''), v: o.label });
      }
    }
    if (done) out.push({ k: 'Estimated price', v: `${money(est.unit)} per piece, ${money(est.total)} total` });
    return out;
  }

  async function submit() {
    for (let k = 0; k < screens.length; k++) {
      const [e, field] = validate(screens[k]);
      if (e) {
        go(k);
        setErr(e);
        fe('validation_error', screens[k].phase, { field, product: product.slug });
        return;
      }
    }
    if (TURNSTILE_KEY && !tsToken) {
      setErr('One moment, we are checking you are not a robot. Tap the button again in a second.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(withBase('/api/rfq'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product: product.slug,
          quantity: qty,
          answers,
          files: files.filter((f) => f.state === 'done' && f.path).map((f) => ({ path: f.path, name: f.name, size: f.size, ext: f.ext })),
          noArtwork: !files.some((f) => f.state === 'done'),
          notes,
          firstName: c.first,
          lastName: c.last,
          business: c.biz,
          email: c.email,
          phone: joinPhone(c.cc || '+1', c.phone),
          contactMethod: c.method,
          consent: c.consent,
          turnstileToken: tsToken,
          eventId,
          tracking: { ...getAttribution(), ...funnelIds() },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data.error || 'Something went wrong. Please try again.');
        if (window.turnstile && tsId.current) window.turnstile.reset(tsId.current);
        setTsToken('');
        setBusy(false);
        return;
      }
      track('Lead', { content_name: product.name, value: Math.round(est.total * 100) / 100, currency: 'USD' }, eventId, false);
      fe('rfq_step_complete', 7, { ms: Date.now() - shownAt.current, product: product.slug, contact: c.method });
      sessionStorage.setItem('cpl-last', JSON.stringify({ id: data.id, code: data.code, first: c.first, summary: lines(true), hasArtwork: data.hasArtwork }));
      sessionStorage.removeItem(storeKey(product.slug));
      flush();
      router.push('/thank-you');
    } catch {
      setErr('Network problem. Check your connection and tap the button again. Your answers are saved.');
      setBusy(false);
    }
  }

  const pct = Math.round(((i + 1) / screens.length) * 100);
  const isLast = screen.kind === 'contact';
  const needsButton = screen.kind === 'quantity' || screen.kind === 'upload' || isLast || !!answers[screen.id];
  const unitAt = (q: number) => estimate(product, answers, q).unit;

  return (
    <div className={css.sheet} role="dialog" aria-modal="true" aria-label={`Configure ${product.title}`}>
      {TURNSTILE_KEY && isLast && <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onReady={renderTurnstile} />}
      <div className={css.sheetTop}>
        <img src={withBase(product.img)} alt="" width={44} height={44} />
        <div className={css.sheetTitle}>
          <strong>{product.title}</strong>
          <span>Step {i + 1} of {screens.length}</span>
        </div>
        <button type="button" className={css.close} onClick={onClose} aria-label="Close and go back to patch types">×</button>
        <div className={css.progress} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progress"><i style={{ width: `${pct}%` }} /></div>
      </div>

      <div className={css.sheetMain}>
        <div className={css.sheetBody} ref={bodyRef}>
          <div className={css.qWrap} key={screen.id}>
            <h2 className={css.q}>{screen.question}</h2>
            {screen.help && <p className={css.help}>{screen.help}</p>}

            {(screen.kind === 'single') && (
              <div className={`${css.opts} ${(screen.options?.length || 0) > 6 ? css.optsDense : ''}`} role="radiogroup" aria-label={screen.question}>
                {screen.options!.map((o) => (
                  <button key={o.id} type="button" role="radio" aria-checked={answers[screen.id] === o.id} className={css.opt} onClick={() => pick(screen as Step, o.id)}>
                    {o.img && <span className={css.optImg}><img src={withBase(o.img)} alt="" loading="lazy" decoding="async" /></span>}
                    <span className={css.optLabel}>{o.label}</span>
                    {o.note && <span className={css.optNote}>{o.note}</span>}
                    {(o.price > 0 || o.setup > 0) && <span className={css.optTag}>{o.price > 0 ? `+${money(o.price)}/pc` : ''}{o.price > 0 && o.setup > 0 ? ', ' : ''}{o.setup > 0 ? `setup ${money(o.setup)}` : ''}</span>}
                  </button>
                ))}
              </div>
            )}

            {screen.kind === 'size' && (
              <div className={css.sizes} role="radiogroup" aria-label={screen.question}>
                {screen.options!.map((o) => {
                  const t = o.tiers?.find(([a, b]) => qty >= a && qty <= b) || o.tiers?.[o.tiers.length - 1];
                  return (
                    <button key={o.id} type="button" role="radio" aria-checked={answers[screen.id] === o.id} className={css.size} onClick={() => pick(screen as Step, o.id)}>
                      <strong>{o.label}</strong>
                      {o.mm && <small>{o.mm} mm</small>}
                      {t && <em>{money(t[2])}/pc</em>}
                    </button>
                  );
                })}
              </div>
            )}

            {screen.kind === 'turnaround' && (
              <div className={css.turns} role="radiogroup" aria-label={screen.question}>
                {screen.options!.map((o, k) => (
                  <button key={o.id} type="button" role="radio" aria-checked={answers[screen.id] === o.id} className={css.turn} onClick={() => pick(screen as Step, o.id)}>
                    <span className={css.turnHead}>{o.label}{k === 0 && <b className={css.pill}>Quickest</b>}{(o.discount || 0) > 0 && <b className={`${css.pill} ${css.pillGold}`}>{o.discount}% off</b>}</span>
                    <span className={css.turnNote}>{o.note}</span>
                    {(o.discount || 0) > 0 && qty < product.discountMinQty && <span className={css.turnWarn}>Discount applies from {product.discountMinQty} pieces</span>}
                  </button>
                ))}
              </div>
            )}

            {screen.kind === 'quantity' && (
              <div className={css.qty}>
                <div className={css.stepper}>
                  <button type="button" aria-label="Fewer" onClick={() => { begin(); setQty((q) => Math.max(product.qtyMin, q - (q > 100 ? 50 : q > 25 ? 5 : 1))); }}>−</button>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={product.qtyMin}
                    max={product.qtyMax}
                    value={qty || ''}
                    aria-label="Quantity in pieces"
                    onChange={(e) => { begin(); setQty(Math.min(product.qtyMax, parseInt(e.target.value, 10) || 0)); setErr(''); }}
                    onBlur={() => setQty((q) => Math.max(product.qtyMin, q || product.qtyMin))}
                  />
                  <button type="button" aria-label="More" onClick={() => { begin(); setQty((q) => Math.min(product.qtyMax, q + (q >= 100 ? 50 : q >= 25 ? 5 : 1))); }}>+</button>
                </div>
                <div className={css.presets}>
                  {QTY_PRESETS.map((n) => (
                    <button key={n} type="button" aria-pressed={qty === n} onClick={() => { begin(); setQty(n); setErr(''); }}>
                      <strong>{n.toLocaleString('en-US')}</strong>
                      {answers[sizeStep?.id || ''] && <small>{money(unitAt(n))}/pc</small>}
                    </button>
                  ))}
                </div>
                {est.nextTier && answers[sizeStep?.id || ''] && (
                  <p className={css.nudge}>Order {est.nextTier.qty.toLocaleString('en-US')} or more and pay {money(est.nextTier.unit)} per piece instead of {money(est.unit)}.</p>
                )}
                {qty < product.discountMinQty && <p className={css.hint}>Turnaround discounts unlock at {product.discountMinQty} pieces.</p>}
              </div>
            )}

            {screen.kind === 'upload' && (
              <div className={css.upload}>
                <label className={css.drop} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer?.files || null); }}>
                  <input type="file" multiple accept=".png,.jpg,.jpeg,.pdf,.ai,.psd,.eps,.svg,image/*,application/pdf" onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
                  <span className={css.dropIcon} aria-hidden="true">⇪</span>
                  <strong>Tap to upload or drop your file here</strong>
                  <small>JPG, PNG, PDF, AI, PSD, EPS or SVG, up to {MAX_MB} MB</small>
                </label>
                {files.length > 0 && (
                  <ul className={css.files} aria-live="polite">
                    {files.map((f) => (
                      <li key={f.id} className={f.state === 'error' ? css.fileErr : ''}>
                        {f.preview ? <img src={f.preview} alt="" /> : <span className={css.fileExt}>{f.ext.toUpperCase()}</span>}
                        <div>
                          <b>{f.name}</b>
                          <small>{fmtSize(f.size)}{f.state === 'uploading' ? `, uploading ${f.progress}%` : f.state === 'done' ? ', uploaded' : `, ${f.error}`}</small>
                          {f.state === 'uploading' && <i className={css.fileBar}><i style={{ width: `${f.progress}%` }} /></i>}
                        </div>
                        {f.state === 'error' && fileObjs.current.get(f.id) && <button type="button" onClick={() => upload(f, fileObjs.current.get(f.id)!)}>Retry</button>}
                        <button type="button" aria-label={`Remove ${f.name}`} onClick={() => { fileObjs.current.delete(f.id); setFiles((l) => l.filter((x) => x.id !== f.id)); }}>×</button>
                      </li>
                    ))}
                  </ul>
                )}
                <label className={css.check}>
                  <input type="checkbox" checked={later} onChange={(e) => { begin(); setLater(e.target.checked); setErr(''); }} />
                  I will send my file later (email or WhatsApp)
                </label>
                <label className={css.field}>
                  Special instructions (optional)
                  <textarea rows={3} maxLength={3000} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Colors, placement, deadline or anything else we should know" />
                </label>
              </div>
            )}

            {isLast && (
              <div className={css.contact}>
                <div className={css.grid2}>
                  <label className={css.field}>First name<input autoComplete="given-name" value={c.first} onChange={(e) => setC({ ...c, first: e.target.value })} /></label>
                  <label className={css.field}>Last name<input autoComplete="family-name" value={c.last} onChange={(e) => setC({ ...c, last: e.target.value })} /></label>
                  <label className={css.field}>Business name (optional)<input autoComplete="organization" value={c.biz} onChange={(e) => setC({ ...c, biz: e.target.value })} /></label>
                  <label className={css.field}>Email<input type="email" autoComplete="email" value={c.email} onChange={(e) => setC({ ...c, email: e.target.value })} /></label>
                </div>
                <label className={css.field}>
                  WhatsApp number
                  <span className={css.phone}>
                    <select aria-label="Country code" value={c.cc} onChange={(e) => setC({ ...c, cc: e.target.value })}>
                      {DIAL_CODES.map((d) => <option key={d.code} value={d.code}>{d.label}</option>)}
                    </select>
                    <input type="tel" autoComplete="tel-national" placeholder="(555) 123 4567" value={c.phone} onChange={(e) => setC({ ...c, phone: e.target.value })} />
                  </span>
                  <small>We send your quote and mockup on WhatsApp.</small>
                </label>
                <p className={css.mini}>How should we contact you?</p>
                <div className={css.methods} role="radiogroup" aria-label="Contact method">
                  {CONTACT_METHODS.map((m) => (
                    <button key={m} type="button" role="radio" aria-checked={c.method === m} onClick={() => setC({ ...c, method: m })}>{m}</button>
                  ))}
                </div>
                <label className={css.check}>
                  <input type="checkbox" checked={c.consent} onChange={(e) => setC({ ...c, consent: e.target.checked })} />
                  <span>I agree that {BUSINESS.name} may contact me by phone, SMS, WhatsApp or email about this quote. Message and data rates may apply. See our <a href={withBase('/privacy')}>Privacy Policy</a> and <a href={withBase('/terms')}>Terms</a>.</span>
                </label>
                <div ref={tsRef} />
              </div>
            )}

            {err && <p className={css.err} role="alert">{err}</p>}
          </div>
        </div>

        <aside className={css.summary} aria-label="Your patch">
          <img src={withBase(product.img)} alt={product.title} width={220} height={220} />
          <h3>{product.title}</h3>
          <ul>
            {lines().slice(1).map((r) => {
              const at = screens.findIndex((s) => (r.k === 'Quantity' ? s.kind === 'quantity' : r.k === 'Artwork' ? s.kind === 'upload' : r.k === 'Turnaround' ? s.kind === 'turnaround' : s.question.replace(/\?$/, '') === r.k));
              return (
                <li key={r.k}>
                  <span>{r.k}</span>
                  <button type="button" onClick={() => at >= 0 && go(at)}>{r.v}</button>
                </li>
              );
            })}
          </ul>
          <div className={css.price}>
            <div><span>Price per piece</span><b>{money(est.unit)}</b></div>
            {est.setup > 0 && <div><span>Setup</span><b>{money(est.setup)}</b></div>}
            {est.discountPct > 0 && <div><span>Turnaround discount</span><b>−{money(est.discount)}</b></div>}
            <div className={css.total}><span>Estimated total</span><b>{money(est.total)}</b></div>
            <small>Final price confirmed with your free mockup. Nothing to pay today.</small>
          </div>
        </aside>
      </div>

      <div className={css.bar}>
        <div className={css.barPrice}>
          <small>{answers[sizeStep?.id || ''] ? `${qty.toLocaleString('en-US')} pcs total` : `From ${money(product.from)}/pc`}</small>
          <b>{answers[sizeStep?.id || ''] ? money(est.total) : money(est.unit)}</b>
        </div>
        {i > 0 && <button type="button" className={css.back} onClick={() => go(i - 1)}>Back</button>}
        {isLast ? (
          <button type="button" className={css.cta} onClick={submit} disabled={busy} aria-busy={busy}>{busy ? 'Sending' : 'Get my free quote'}</button>
        ) : needsButton ? (
          <button type="button" className={css.cta} onClick={next}>Continue</button>
        ) : (
          <span className={css.tapHint}>Tap an option</span>
        )}
      </div>
    </div>
  );
}
