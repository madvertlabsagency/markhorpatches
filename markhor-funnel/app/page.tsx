import Image from 'next/image';
import QuoteForm from './components/QuoteForm';
import FunnelTracker from './components/FunnelTracker';
import { PickTypeLink, ProcessReel, TrustBox, UploadCta, ViewContentObserver } from './components/Interactive';
import { BUSINESS, PATCH_TYPES } from '@/lib/options';
import { withBase } from '@/lib/base';

const PRODUCTION_TIME = process.env.NEXT_PUBLIC_PRODUCTION_TIME;
const SHIPPING_TIME = process.env.NEXT_PUBLIC_SHIPPING_TIME;

function Stars({ size = 24 }: { size?: number }) {
  return (
    <span style={{ display: 'inline-flex', gap: 2 }} aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24"><path d="M12 2l3 6.5 7 .9-5.2 4.8 1.4 7L12 17.8 5.8 21.2l1.4-7L2 9.4l7-.9z" fill="#00B67A" /></svg>
      ))}
    </span>
  );
}

const Arrow = () => (
  <span className="cta-arrow">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
  </span>
);

const TRUST = [
  ['i-box', 'No Minimum Order', 'Order one patch or thousands'],
  ['i-truck', 'Door to Door Delivery', 'Shipped straight to your address'],
  ['i-loop', 'Unlimited Revisions', 'We adjust until you love it'],
  ['i-pencil', 'Free Design and Artwork Support', 'Send a logo, sketch or idea'],
  ['i-gift', 'Free Backing and Shipping', 'No extra charges at checkout'],
  ['i-clock', 'Free Mockup in 24 Hours', 'See your patch before you order'],
];

// Real customer reviews only: [name, what they said, month]. The reviews section stays hidden
// while this list is empty. Never add invented reviews.
const REVIEWS: [string, string, string][] = [];

const STEPS = [
  { title: 'Tell us what you need', text: 'Select your patch type, size and quantity.', img: withBase('/assets/art/step-1.webp'), accent: '#0A8BD8' },
  { title: 'Upload your artwork', text: 'Upload your logo, artwork, sketch or reference. No artwork yet? We will help.', img: withBase('/assets/art/step-2.webp'), accent: '#2AA8FF' },
  { title: 'Get your quote and free mockup', text: 'Our patch team reviews your project and contacts you with pricing and a mockup within 24 hours.', img: withBase('/assets/art/step-3.webp'), accent: '#1257E6' },
];

// A tile without a photo shows its brand color and icon instead.
const MADE_FOR: { label: string; img?: string; alt?: string; color: string; icon: string }[] = [
  { label: 'Clothing brands', img: withBase('/assets/art/made-brands.webp'), alt: 'Hoodies and jackets on a clothing rack, each with a custom embroidered patch', color: '#0A8BD8', icon: 'i-box' },
  { label: 'Streetwear labels', img: withBase('/assets/art/made-streetwear.webp'), alt: 'Denim jacket back covered in colorful custom patches on a city street', color: '#2AA8FF', icon: 'i-star' },
  { label: 'Small businesses', img: withBase('/assets/art/made-small-business.webp'), alt: 'Coffee shop apron with an embroidered latte patch on the chest', color: '#0B1F4D', icon: 'i-gift' },
  { label: 'Sports teams', img: withBase('/assets/art/made-teams.webp'), alt: 'Team jerseys and caps with custom patches in a locker room', color: '#1257E6', icon: 'i-star' },
  { label: 'Clubs and events', img: withBase('/assets/art/made-clubs.webp'), alt: 'Leather motorcycle club vest with large embroidered back patches', color: '#9BE3FF', icon: 'i-pin' },
];

const FAQ: [string, string][] = [
  ['How do I talk to you?', 'Send your request and we reply on WhatsApp with your quote code, details and a PDF. You can message us there any time, or reply to our email.'],
  ['Is there a minimum order?', 'No. You can order as few or as many patches as you need. Larger quantities get a lower price per patch.'],
  ['Are there any setup or extra fees?', 'No setup fees, no digitizing fees and no PVC mold fees. Backing and shipping are free too.'],
  ["What if I don't have artwork?", 'No problem. Send a sketch, a photo or just describe your idea. Our design team creates the artwork for free.'],
  ['How fast will I see my mockup?', "You get a free digital mockup within 24 hours of your request, with unlimited revisions until it's right."],
  [
    'How long does production take?',
    PRODUCTION_TIME && SHIPPING_TIME
      ? `${PRODUCTION_TIME} after mockup approval, plus ${SHIPPING_TIME} for delivery. Rush options may be available.`
      : 'Production starts as soon as you approve your mockup, and your quote includes an exact delivery timeline. Rush options may be available.',
  ],
  ['Which file types can I upload?', 'PNG, JPG, JPEG, PDF, AI, EPS and SVG. A clear photo of a sketch works too.'],
];

// Shown under the hero buttons until a Trustpilot business unit id is configured.
const PromiseBlock = (
  <div className="promise-card">
    {['Free mockup before you pay', 'No obligation quote', 'Updates on WhatsApp'].map((t) => (
      <span key={t}><span className="i3 s28 i-check" aria-hidden="true" />{t}</span>
    ))}
  </div>
);

export default function Page() {
  const bySlug = Object.fromEntries(PATCH_TYPES.map((t) => [t.key, t]));
  return (
    <div className="bgp" style={{ minHeight: '100%' }}>
      <div className="announce">
        <span>No minimum order</span>
        <span style={{ color: 'var(--yellow)' }}>Free mockup in 24 hours</span>
        <span>$0 setup, $0 digitizing, $0 mold fees</span>
      </div>

      <header className="topbar">
        <a href="#top" className="brand">
          <Image src={withBase('/assets/logo-160.webp')} alt={`${BUSINESS.name} logo`} width={64} height={64} priority style={{ display: 'block' }} />
          <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.05 }}>
            <span className="hd brand-name">{BUSINESS.nameUpper}</span>
            <span className="brand-tag">{BUSINESS.tagline.toUpperCase()}</span>
          </span>
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          {BUSINESS.phoneTel && <a href={`tel:${BUSINESS.phoneTel}`} data-cta="header_phone" className="hide-sm" style={{ textDecoration: 'none', fontWeight: 700, fontSize: 15, minHeight: 44, display: 'inline-flex', alignItems: 'center' }}>{BUSINESS.phoneDisplay}</a>}
          <a href="#quote" className="btn btn-red" data-cta="header_quote">Get a <span className="xs-hide">free&nbsp;</span>quote</a>
        </div>
      </header>

      <main>
        <section id="top" className="hero">
          <svg aria-hidden="true" viewBox="0 0 600 300" preserveAspectRatio="none" style={{ position: 'absolute', left: -60, top: -110, width: 'min(560px, max(0px, calc((100vw - 1240px) / 2 + 40px)))', height: 300, zIndex: 0 }}>
            <path d="M0 120 C120 40 220 200 360 110 C460 50 520 80 600 40 V0 H0 Z" fill="#0A8BD8" />
            <path d="M0 180 C140 90 240 240 380 150 C470 95 540 120 600 90 V60 C520 100 460 70 360 130 C220 220 120 60 0 140 Z" fill="#2AA8FF" />
            <path d="M0 200 C150 110 250 260 390 170" fill="none" stroke="#0B1F4D" strokeWidth="3" strokeDasharray="10 8" />
          </svg>
          <svg aria-hidden="true" viewBox="0 0 600 300" preserveAspectRatio="none" style={{ position: 'absolute', right: -80, bottom: -40, width: 620, height: 300, zIndex: 0 }}>
            <path d="M600 140 C480 220 380 60 240 150 C140 210 70 180 0 260 V300 H600 Z" fill="#1257E6" />
            <path d="M600 200 C470 270 380 130 250 210 C160 265 90 240 20 300 H600 Z" fill="#9BE3FF" />
            <path d="M600 120 C480 200 380 40 240 130" fill="none" stroke="#0B1F4D" strokeWidth="3" strokeDasharray="10 8" />
          </svg>
          <div className="hero-grid wrap">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <span className="badge-dashed"><span className="i3 s28 i-check" aria-hidden="true" />Embroidered, PVC, chenille, woven and printed</span>
              <h1 className="hd">
                <span style={{ color: 'var(--navy)' }}>Custom Patches</span>
                <span style={{ color: 'var(--teal)' }}>For Bold</span>
                <span style={{ color: 'var(--red)' }}>Brands</span>
              </h1>
              <p className="hero-lead">Send your logo or idea and see a free mockup within 24 hours. Unlimited revisions, zero setup fees, and free backing and shipping. Made for brands, teams and clubs that want to stand out.</p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <a href="#quote" className="btn cta-main" data-cta="hero_quote">Get my free quote<Arrow /></a>
                <UploadCta />
              </div>
              <TrustBox template="5419b6a8b0d04a076446a9ad" height="24px" fallback={PromiseBlock} />
            </div>
            <div className="hero-art">
              <div className="hero-photo">
                <Image
                  src={withBase('/assets/art/hero-flatlay.webp')}
                  alt="Embroidered, PVC, chenille, woven and sublimation custom patches laid out on a cream table"
                  width={1080}
                  height={1080}
                  loading="eager"
                  sizes="(min-width: 980px) 520px, 92vw"
                />
              </div>
              <span className="hero-chip chip-a"><span className="i3 s28 i-clock" aria-hidden="true" />Free mockup in 24 hours</span>
              <span className="hero-chip chip-b"><span className="i3 s28 i-gift" aria-hidden="true" />$0 setup, $0 digitizing</span>
              <span className="hero-chip chip-c"><span className="i3 s28 i-box" aria-hidden="true" />No minimum order</span>
            </div>
          </div>
        </section>

        <section style={{ padding: '0 24px', position: 'relative', zIndex: 2 }}>
          <div className="fees hd">
            <span>$0 SETUP</span>
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><circle cx="7" cy="7" r="5" fill="#FFFFFF" /></svg>
            <span>$0 DIGITIZING</span>
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><circle cx="7" cy="7" r="5" fill="#FFFFFF" /></svg>
            <span>$0 PVC MOLD FEE</span>
          </div>
        </section>

        <section className="reel" style={{ padding: '64px 24px 8px' }}>
          <div className="wrap reel-grid">
            <div className="reel-copy">
              <span className="eyebrow">From thread to jacket</span>
              <h2 className="hd h2">Watch Your Patch Come To Life</h2>
              <p className="sub">Every order is digitized, stitched and checked before it ships. You approve a free mockup first, so the patch you get is the patch you pictured.</p>
              <ul className="reel-points">
                <li><span className="i3 s28 i-pencil" aria-hidden="true" />Free artwork help and mockup in 24 hours</li>
                <li><span className="i3 s28 i-loop" aria-hidden="true" />Unlimited revisions before production</li>
                <li><span className="i3 s28 i-truck" aria-hidden="true" />Free backing and shipping to your door</li>
              </ul>
              <a href="#quote" className="btn cta-main" data-cta="reel_mockup">Start my free mockup<Arrow /></a>
            </div>
            <div className="reel-frame">
              <ProcessReel />
            </div>
          </div>
        </section>

        <section style={{ padding: '56px 24px 24px' }}>
          <div className="wrap" style={{ marginBottom: 28, textAlign: 'center' }}>
            <h2 className="hd h2">Everything Included. Zero Hidden Fees.</h2>
            <p className="sub" style={{ maxWidth: 620 }}>Many patch shops add setup, digitizing and mold charges after you get excited about your design. We don&apos;t. The price we quote is the price you pay.</p>
          </div>
          <div className="wrap trust-grid">
            {TRUST.map(([icon, title, text]) => (
              <div className="trust-card" key={title}>
                <span className={`i3 s64 ${icon}`} aria-hidden="true" />
                <strong>{title}</strong>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </section>

        <section style={{ padding: '56px 24px' }}>
          <div className="wrap">
            <h2 className="hd h2">Pick Your Patch Style</h2>
            <p className="sub" style={{ maxWidth: 560, marginBottom: 32 }}>Not sure which style fits? Choose Not sure in the quote form and our team will recommend the best option.</p>
            <div className="types-grid">
              {['emb', 'pvc', 'che', 'wov', 'sub'].map((k) => {
                const t = bySlug[k];
                return (
                  <div className="type-card" key={k}>
                    <img src={t.img} alt={`${t.label} patch`} width={112} height={112} loading="lazy" style={{ flexShrink: 0 }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <strong className="hd">{t.label}</strong>
                      <span style={{ fontSize: 15, color: 'var(--muted)' }}>{t.desc}</span>
                      <PickTypeLink type={t.label} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="made" style={{ padding: '8px 24px 64px' }}>
          <div className="wrap">
            <span className="eyebrow">Made for</span>
            <h2 className="hd h2">Patches For Every Crew</h2>
            <p className="sub" style={{ maxWidth: 560, marginBottom: 28 }}>From your first 10 patches to a full team order, we make them look sharp on every jacket, cap and uniform.</p>
            <div className="made-grid">
              {MADE_FOR.map((m) => (
                <figure className={`made-tile${m.img ? '' : ' no-img'}`} key={m.label} style={{ ['--tile' as string]: m.color }}>
                  {m.img ? <img src={m.img} alt={m.alt} width={720} height={1080} loading="lazy" decoding="async" /> : <span className={`i3 s64 ${m.icon}`} aria-hidden="true" />}
                  <figcaption>{m.label}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        <section style={{ padding: '24px 24px 56px' }}>
          <div className="wrap">
            <h2 className="hd h2" style={{ marginBottom: 28 }}>How It Works</h2>
            <ol className="steps-grid">
              {STEPS.map((s, i) => (
                <li className="step-card" key={s.title} style={{ ['--accent' as string]: s.accent }}>
                  <span className="n hd" aria-hidden="true">{i + 1}</span>
                  <img className="step-art" src={s.img} alt="" width={180} height={180} loading="lazy" decoding="async" />
                  <strong>{s.title}</strong>
                  <span className="d">{s.text}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="quote" className="quote bgpd">
          <ViewContentObserver />
          <div className="wrap">
            <h2 className="hd h2" style={{ color: '#fff' }}>Build Your Free Quote</h2>
            <p className="sub" style={{ color: '#C9D3E6', maxWidth: 560, marginBottom: 30 }}>Seven quick steps. Takes about a minute.</p>
            <QuoteForm />
          </div>
        </section>

        {REVIEWS.length > 0 && (
          <section style={{ padding: '64px 24px' }}>
            <div className="wrap">
              <h2 className="hd h2">Real Customers. Real Reviews.</h2>
              <p className="sub" style={{ maxWidth: 600, marginBottom: 30 }}>What customers say about working with us.</p>
              <TrustBox
                template="54ad5defc6454f065c28af8b"
                height="240px"
                fallback={
                  <div className="rv-grid" style={{ flex: '1 1 100%' }}>
                    {REVIEWS.map(([name, text, date]) => (
                      <div className="rv" key={name}>
                        <Stars size={18} />
                        <strong style={{ fontSize: 16 }}>{name}</strong>
                        <span style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.5 }}>{text}</span>
                        <span style={{ fontSize: 13, color: '#5A6B86' }}>{date}</span>
                      </div>
                    ))}
                  </div>
                }
              />
            </div>
          </section>
        )}

        <section style={{ padding: '0 24px 56px' }}>
          <div className="wrap local">
            <img className="local-photo" src={withBase('/assets/art/heat-press.webp')} alt="A custom embroidered patch being heat pressed onto a denim jacket" width={960} height={536} loading="lazy" decoding="async" />
            <div style={{ flex: '1 1 380px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span style={{ alignSelf: 'flex-start', fontSize: 13, fontWeight: 700, color: '#fff', background: 'var(--red)', padding: '5px 12px', borderRadius: 999 }}>Real people, real craft</span>
              <h2 className="hd" style={{ margin: 0, fontSize: 'clamp(28px, 3.2vw, 40px)', lineHeight: 1.08 }}>One Team From Mockup To Delivery</h2>
              <p style={{ margin: 0, fontSize: 17, lineHeight: 1.55, color: 'var(--muted)' }}>We work directly with every customer, from the first mockup to final delivery. Message us on WhatsApp and you talk to a real person who knows your order.</p>
            </div>
            <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {BUSINESS.phoneTel && <a href={`tel:${BUSINESS.phoneTel}`} className="contact-row"><span className="i3 s44 i-phone" aria-hidden="true" />Call or text {BUSINESS.phoneDisplay}</a>}
              {BUSINESS.email && <a href={`mailto:${BUSINESS.email}`} className="contact-row"><span className="i3 s44 i-mail" aria-hidden="true" />{BUSINESS.email}</a>}
              {BUSINESS.address && <span className="contact-row"><span className="i3 s44 i-pin" aria-hidden="true" />{BUSINESS.address}</span>}
              <a href="#quote" className="contact-row" data-cta="local_quote"><span className="i3 s44 i-clock" aria-hidden="true" />Start your free quote, it takes a minute</a>
            </div>
          </div>
        </section>

        <section style={{ padding: '24px 24px 64px' }}>
          <div style={{ maxWidth: 860, margin: '0 auto' }}>
            <h2 className="hd h2" style={{ marginBottom: 24 }}>Questions, Answered</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {FAQ.map(([q, a]) => (
                <details className="faq" key={q}>
                  <summary>{q}<span className="plus" aria-hidden="true">+</span></summary>
                  <p>{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section style={{ padding: '0 24px 64px' }}>
          <div className="wrap final">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 640 }}>
              <h2 className="hd" style={{ margin: 0, fontSize: 'clamp(28px, 3.6vw, 44px)', lineHeight: 1.05, color: '#fff' }}>Get Your Free Mockup Within 24 Hours</h2>
              <p style={{ margin: 0, fontSize: 17, color: '#E3F1FF' }}>No minimum order, no setup fees and unlimited revisions until you love it.</p>
            </div>
            <a href="#quote" className="btn cta-main" data-cta="final_quote" style={{ background: '#fff', color: '#0B1F4D', boxShadow: 'none' }}>Get my free quote<Arrow /></a>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="wrap" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 24, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Image src={withBase('/assets/logo-160.webp')} alt={`${BUSINESS.name} logo`} width={56} height={56} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <strong className="hd" style={{ color: '#fff' }}>{BUSINESS.nameUpper}</strong>
              <span style={{ fontSize: 13 }}>{BUSINESS.address || BUSINESS.tagline}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: 14 }}>
            {BUSINESS.phoneTel && <a href={`tel:${BUSINESS.phoneTel}`}>{BUSINESS.phoneDisplay}</a>}
            {BUSINESS.email && <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>}
            <a href={withBase('/privacy')}>Privacy Policy</a>
            <a href={withBase('/terms')}>Terms</a>
          </div>
        </div>
      </footer>

      <div className="mcta"><a href="#quote" data-cta="mobile_sticky">Get my free quote</a></div>
      <FunnelTracker />
    </div>
  );
}
