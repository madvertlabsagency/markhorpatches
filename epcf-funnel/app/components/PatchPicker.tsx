'use client';
// Patch type grid. A card opens the configurator; ?p=<slug> in the address opens it directly,
// so every ad can land on its own patch type. The browser Back button closes the configurator.
import { useCallback, useEffect, useRef, useState } from 'react';
import { PRODUCTS, getProduct, money, type Product } from '@/lib/catalog';
import { fe } from '@/lib/funnel-client';
import { withBase } from '@/lib/base';
import Configurator from './Configurator';
import css from '../epcf.module.css';

export default function PatchPicker() {
  const [open, setOpen] = useState<Product | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fromUrl = () => setOpen(getProduct(new URLSearchParams(location.search).get('p')) || null);
    fromUrl();
    window.addEventListener('popstate', fromUrl);
    const onOpen = (e: Event) => choose((e as CustomEvent<string>).detail);
    window.addEventListener('epcf:open', onOpen);
    return () => {
      window.removeEventListener('popstate', fromUrl);
      window.removeEventListener('epcf:open', onOpen);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Step 1 of the funnel is seeing the patch types.
  useEffect(() => {
    const el = gridRef.current;
    if (!el || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting)) {
        io.disconnect();
        fe('rfq_step_view', 1);
      }
    }, { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const choose = useCallback((slug: string) => {
    const p = getProduct(slug);
    if (!p) return;
    fe('patch_type_card_click', undefined, { patch_type: p.name });
    const url = new URL(location.href);
    url.searchParams.set('p', slug);
    history.pushState({ epcf: slug }, '', url);
    setOpen(p);
  }, []);

  const close = useCallback(() => {
    const url = new URL(location.href);
    if (url.searchParams.has('p')) {
      if (history.state?.epcf) history.back();
      else {
        url.searchParams.delete('p');
        history.replaceState(null, '', url);
      }
    }
    setOpen(null);
  }, []);

  return (
    <>
      <div className={css.cards} ref={gridRef}>
        {PRODUCTS.map((p, k) => (
          <button key={p.slug} type="button" className={`${css.card} ${k < 3 ? css.cardTop : ''}`} onClick={() => choose(p.slug)} data-cta={`type_${p.slug}`}>
            {p.badge && <span className={css.badge}>{p.badge}</span>}
            <span className={css.cardImg}><img src={withBase(p.img)} alt={`${p.title} example`} width={280} height={280} loading={k < 6 ? 'eager' : 'lazy'} decoding="async" /></span>
            <span className={css.cardName}>{p.name}</span>
            <span className={css.cardBlurb}>{p.blurb}</span>
            <span className={css.cardFoot}>
              <span>From <b>{money(p.from)}</b>/pc</span>
              <span className={css.cardGo} aria-hidden="true">→</span>
            </span>
          </button>
        ))}
      </div>
      {open && <Configurator key={open.slug} product={open} onClose={close} />}
    </>
  );
}

// "Start" buttons elsewhere on the page open a product without scrolling first.
export function OpenProductButton({ slug, children, className }: { slug: string; children: React.ReactNode; className?: string }) {
  return (
    <button type="button" className={className} onClick={() => window.dispatchEvent(new CustomEvent('epcf:open', { detail: slug }))}>
      {children}
    </button>
  );
}
