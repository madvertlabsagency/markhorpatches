import FunnelTracker from './components/FunnelTracker';
import PatchPicker, { OpenProductButton } from './components/PatchPicker';
import { BUSINESS } from '@/lib/options';
import { PRODUCTS } from '@/lib/catalog';
import { withBase } from '@/lib/base';
import css from './epcf.module.css';

const WA = `https://wa.me/${BUSINESS.phoneTel}?text=${encodeURIComponent('Hi EPCF, I would like a quote for custom patches')}`;

// Customer reviews exactly as published on ep-cf.com (their site shows them shortened).
const REVIEWS = [
  ['Rene', 'Great quality, excellent price, love the embroidery I had them made for...'],
  ['Hoa Mai', 'The quality is fantastic! Perfectly sized for the patch on my hat.'],
  ['Henry B.', 'The quality is superb! I ordered an embroidered patch and the stitching is...'],
  ['Noel', 'I really needed a 1 inch x 1 inch patch. They did a beautiful job on it...'],
];

const FAQ: [string, string][] = [
  ['How much do custom patches cost?', 'Prices start from $0.49 per piece for embroidered patches. Your price depends on the patch type, size, options and quantity, and you see it live as you choose. Bigger orders pay less per piece.'],
  ['What is the minimum order?', '10 pieces per design. You can order up to 100,000 pieces.'],
  ['How long does it take?', 'Pick the speed that suits you. Fastest: 7 business days production plus 3 days shipping. Save 10%: 20 business days production plus 3 days shipping. Save 20%: 25 business days production and shipping, or 40 business days by sea. Turnaround discounts apply from 25 pieces.'],
  ['What file do I need?', 'JPG, PNG, PDF, AI, PSD, EPS or SVG. Vector files (AI or PDF) give the cleanest result. No file ready? Tick "send it later" and email or WhatsApp it to us.'],
  ['Do I pay now?', 'No. You send your request, we check your artwork and send a free digital mockup with your final price. Production starts only after you approve it.'],
  ['Which border and backing should I choose?', 'Merrow is the classic rounded edge and suits most designs. Heat cut and laser cut suit detailed shapes. Sew on is the most secure for uniforms and jackets, iron on is quick for hats and casual wear.'],
  ['Do you ship across the United States?', 'Yes, we ship to customers across the US.'],
];

const STEPS = [
  ['Pick your patch', 'Choose the type, then tap through size, shape, colors and backing. Your price updates with every tap.'],
  ['Add your artwork', 'Upload your logo, sketch or photo, or send it later. Our team checks every file before production.'],
  ['Approve your free mockup', 'We send a digital mockup and your final price on WhatsApp and email. Production starts when you say go.'],
];

export default function Page() {
  const featured = PRODUCTS.slice(0, 3);
  return (
    <div className={css.page}>
      <div className={css.announce}>
        <span>From 10 pieces</span>
        <span className={css.dot} aria-hidden="true" />
        <span>Free digital mockup</span>
        <span className={css.dot} aria-hidden="true" />
        <span>Up to 20% off with flexible turnaround</span>
      </div>

      <header className={css.top}>
        <a href="#top" className={css.brand} aria-label="EPCF home">
          <img src={withBase('/assets/crown-logo.webp')} alt="EPCF" height={42} width={50} />
          <span>
            <b>EPCF</b>
            <small>Custom Patches</small>
          </span>
        </a>
        <nav className={css.topNav}>
          <a href={WA} className={css.waLink} data-cta="header_whatsapp" target="_blank" rel="noopener">WhatsApp us</a>
          <a href="#types" className={css.goldBtn} data-cta="header_quote">Get my price</a>
        </nav>
      </header>

      <main>
        <section id="top" className={css.hero}>
          <div className={css.heroInner}>
            <div className={css.heroCopy}>
              <p className={css.eyebrow}>Excellence Punch Custom Factory</p>
              <h1>
                Custom Patches, <em>Priced in Seconds.</em>
              </h1>
              <p className={css.lead}>Choose your patch type, tap through a few quick choices and watch your price update live. Get a free digital mockup before you pay anything.</p>
              <div className={css.heroCtas}>
                <a href="#types" className={css.goldBtnLg} data-cta="hero_quote">See my price <span aria-hidden="true">→</span></a>
                <a href={WA} className={css.ghostBtn} data-cta="hero_whatsapp" target="_blank" rel="noopener">Ask on WhatsApp</a>
              </div>
              <ul className={css.proof}>
                <li><b>10</b> piece minimum</li>
                <li><b>15+</b> patch types</li>
                <li><b>24/7</b> support</li>
              </ul>
            </div>
            <div className={css.heroArt} aria-hidden="true">
              {featured.map((p, k) => (
                <img key={p.slug} src={withBase(p.img)} alt="" className={css[`float${k}` as 'float0']} width={280} height={280} />
              ))}
              <span className={css.coin}><img src={withBase('/assets/logo-160.webp')} alt="" width={96} height={96} /></span>
            </div>
          </div>
        </section>

        <section id="types" className={css.types}>
          <div className={css.wrap}>
            <p className={css.eyebrowDark}>Step 1</p>
            <h2>Choose your patch type</h2>
            <p className={css.sub}>Tap a patch to start. You will see your price per piece as you go.</p>
            <PatchPicker />
          </div>
        </section>

        <section className={css.band}>
          <div className={css.wrapRow}>
            {[['No expensive price', 'Factory direct pricing that drops as your quantity grows.'], ['No inferior products', 'Every file is checked and every patch is made to your design.'], ['No slow shipping', 'Choose a turnaround that fits your deadline or your budget.']].map(([t, d]) => (
              <div key={t} className={css.bandItem}>
                <span className={css.crown} aria-hidden="true">♛</span>
                <b>{t}</b>
                <span>{d}</span>
              </div>
            ))}
          </div>
        </section>

        <section className={css.how}>
          <div className={css.wrap}>
            <h2>How it works</h2>
            <ol className={css.howList}>
              {STEPS.map(([t, d], k) => (
                <li key={t}>
                  <span className={css.howNum}>{k + 1}</span>
                  <b>{t}</b>
                  <span>{d}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className={css.reviews}>
          <div className={css.wrap}>
            <h2>What customers say</h2>
            <div className={css.revGrid}>
              {REVIEWS.map(([n, t]) => (
                <figure key={n} className={css.rev}>
                  <span className={css.stars} aria-label="5 stars">★★★★★</span>
                  <blockquote>“{t}”</blockquote>
                  <figcaption>{n}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        <section className={css.faq}>
          <div className={css.wrapNarrow}>
            <h2>Questions, answered</h2>
            {FAQ.map(([q, a]) => (
              <details key={q}>
                <summary>{q}<span aria-hidden="true">+</span></summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className={css.final}>
          <div className={css.finalInner}>
            <h2>Your patches, priced in under a minute.</h2>
            <p>Start with our best seller or pick any of the 17 patch types above.</p>
            <div className={css.heroCtas}>
              <OpenProductButton slug="embroidered-patches" className={css.goldBtnLg}>Start with embroidered <span aria-hidden="true">→</span></OpenProductButton>
              <a href="#types" className={css.ghostBtn} data-cta="final_types">See all patch types</a>
            </div>
          </div>
        </section>
      </main>

      <footer className={css.footer}>
        <div className={css.wrapRow}>
          <div className={css.footBrand}>
            <img src={withBase('/assets/logo-160.webp')} alt="EPCF" width={56} height={56} />
            <div>
              <b>EPCF</b>
              <span>{BUSINESS.tagline}</span>
            </div>
          </div>
          <div className={css.footLinks}>
            <a href={WA} target="_blank" rel="noopener">WhatsApp {BUSINESS.phoneDisplay}</a>
            <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>
            <span>{BUSINESS.address}</span>
            <a href={withBase('/privacy')}>Privacy Policy</a>
            <a href={withBase('/terms')}>Terms</a>
          </div>
        </div>
      </footer>

      <a href="#types" className={css.mcta} data-cta="mobile_sticky">See my price</a>
      <FunnelTracker />
    </div>
  );
}
