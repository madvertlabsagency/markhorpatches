// Builds lib/catalog.json and optimized images for the EP-CF funnel from the scraped configurators.
// Usage: node build-catalog.mjs <products.json> <img dir> <tiers dir> <product img dir> <funnel dir>
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const [, , PRODUCTS, IMG, TIERS, PIMG, OUT] = process.argv;
const require = createRequire(path.join(OUT, 'package.json'));
const sharp = require('sharp');
const products = JSON.parse(fs.readFileSync(PRODUCTS, 'utf8'));
fs.mkdirSync(path.join(OUT, 'public/opt'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'public/products'), { recursive: true });

const ORDER = ['embroidered-patches', 'pvc-patches', 'woven-patches', 'chenille-patches', '3d-embroidered-patches', 'printed-patches',
  'leather-patches', 'custom-3d-silicone-patches', 'embroidered-printed-patches', 'sequin-patches', 'heat-transfer-patches',
  'full-color-flex-patches', 'one-color-flex-patches', 'denim-patches', 'tatami-fabric-silicone-patches', 'tatami-fabric-flock-patches', 'blank-patches'];
const META = {
  'embroidered-patches': ['Embroidered', 'Classic stitched texture for uniforms, hats and jackets.', 'Best seller'],
  'pvc-patches': ['PVC', 'Rubber, waterproof and tough. Built for gear and outdoors.', 'Most durable'],
  'woven-patches': ['Woven', 'Flat, fine detail for small text and thin lines.', 'Finest detail'],
  'chenille-patches': ['Chenille', 'Soft, fuzzy varsity look for letterman jackets.', null],
  '3d-embroidered-patches': ['3D Embroidered', 'Raised, puffy stitching for a bold logo.', null],
  'printed-patches': ['Printed', 'Full color print for photos and gradients.', null],
  'leather-patches': ['Leather', 'Debossed, embossed or printed genuine look for hats and denim.', null],
  'custom-3d-silicone-patches': ['3D Silicone', 'Glossy, matte, glitter or reflective silicone.', null],
  'embroidered-printed-patches': ['Embroidered + Printed', 'Printed detail with an embroidered finish.', null],
  'sequin-patches': ['Sequin', 'Sparkling sequins for fashion and events.', null],
  'heat-transfer-patches': ['Heat Transfer', 'Press on transfers, glitter, reflective or glow.', null],
  'full-color-flex-patches': ['Full Color Flex', 'Thin, flexible full color with metallic upgrades.', null],
  'one-color-flex-patches': ['One Color Flex', 'Single color flex in silver, gold, holographic and more.', null],
  'denim-patches': ['Denim', 'Real denim base for a vintage, streetwear look.', null],
  'tatami-fabric-silicone-patches': ['Tatami Silicone', 'Textured tatami fabric with raised silicone logo.', null],
  'tatami-fabric-flock-patches': ['Tatami Flock', 'Tatami fabric with soft velvet flock print.', null],
  'blank-patches': ['Blank', 'Plain twill patches ready for your own work.', null],
};
const PRODUCT_IMG = {
  'embroidered-patches': '1777460747_emb patch.png', 'pvc-patches': '1777460873_pvc patch.png', 'woven-patches': '1777461105_woven patch.png',
  '3d-embroidered-patches': '1778583079_3d emb patch (1).png', 'blank-patches': '1777461499_blank patch.png', 'full-color-flex-patches': '1777461687_full colour flex patches.png',
  'one-color-flex-patches': '1777461711_one colour patches.png', 'sequin-patches': '1778583747_sequin patch final (1).png', 'tatami-fabric-silicone-patches': '1777461821_Tatami Fabric Silicone Patche.png',
  'tatami-fabric-flock-patches': '1777461864_Tatami Fabric Flock Patch.png', 'denim-patches': '1777461887_denim patches.png', 'printed-patches': '1777462473_printed patch.png',
  'leather-patches': '1777462528_leather patch.png', 'embroidered-printed-patches': '1777462548_e+p patch.png', 'chenille-patches': '1777462621_Chenille patches.png',
  'custom-3d-silicone-patches': '1777461530_3d silicone patch.png', 'heat-transfer-patches': '1777461582_41ee1a55-9716-41df-8eaa-4c1706d3eb24.png',
};
// Short explanations shown under options, taken from EP-CF's own product descriptions.
const NOTES = {
  'Merrow': 'Classic rounded stitched edge', 'Heat Cut': 'Sealed edge, best for simple shapes', 'Laser cut': 'Precise edge for detailed shapes', 'Laser Cut': 'Precise edge for detailed shapes',
  'Sew on (No Backing)': 'Most secure, best for uniforms', 'Iron On': 'Quick to apply with heat', '3M Self-Adhesive': 'Peel and stick on smooth surfaces',
  'Plastic': 'Hard back for display', 'Velcro Hook': 'Hook side, swap patches easily', 'Velcro Loop': 'Loop side, soft to the touch', 'Double Velcro': 'Hook and loop both included',
  'Safety Pin': 'Clip on, no sewing', 'Shoe Charm': 'Snaps into shoes and clogs',
  '50% Embroidered Patches': 'Shows more base fabric, lower cost', '75% Embroidered Patches': 'Balanced look and price', '100% Embroidered Patches': 'Solid, fully stitched look',
};
// Spelling fixes for labels as they appear on ep-cf.com.
const LABEL_FIX = { 'PVC Laguage Tags': 'PVC Luggage Tags', 'Sheild B': 'Shield B', 'vertical oval': 'Vertical Oval', '0.12': '0.12 inch sequins', '0.19': '0.19 inch sequins' };
function phaseOf(title) {
  const t = title.toLowerCase();
  if (t.includes('quantity')) return 2;
  if (t.includes('size')) return 3;
  if (t.includes('upload') || t.includes('artwork')) return 5;
  if (t.includes('turnaround')) return 6;
  return 4;
}
function question(title, kind) {
  const t = title.replace(/^select\s+/i, '').replace(/^select\s+/i, '').trim();
  const l = t.toLowerCase();
  if (kind === 'quantity') return ['How many patches do you need?', 'Minimum 10 pieces. Bigger orders get a lower price per patch.'];
  if (l.includes('size')) return ['What size do you need?', 'Measured edge to edge. 2 to 3 inches suits hats and sleeves, 4 to 6 inches chest and back.'];
  if (l.includes('turnaround')) return ['When do you need them?', 'Choose speed or savings.'];
  if (l.includes('upload')) return ['Upload your artwork', 'Logo, sketch or photo. No file yet? Tick the box and send it later.'];
  if (l.includes('backing')) return ['How will you attach them?', 'Pick the backing for how the patch will be worn.'];
  if (l.includes('border colour') || l.includes('border color')) return ['Pick the border color', ''];
  if (l.includes('border')) return ['Choose the edge', 'The finish around the outside of the patch.'];
  if (l.includes('shape')) return ['Pick a shape', 'Not listed? Choose a custom shape and we cut it to your design.'];
  if (l === 'colors') return ['Choose the color', ''];
  if (l.includes('silicone colors')) return ['How many silicone colors?', ''];
  if (l.includes('colors') || l === 'number of colors') return ['How many colors are in your design?', 'Count the thread or ink colors in your logo.'];
  if (l.includes('coverage')) return ['How much of the patch is embroidered?', 'Less coverage shows more base fabric and costs less.'];
  if (l.includes('style')) return ['Choose a style', ''];
  if (l.includes('2d or 3d')) return ['Flat (2D) or raised (3D)?', '3D adds depth with layered, raised detail.'];
  if (l.includes('leather color')) return ['Pick the leather color', ''];
  if (l.includes('fabric color') || l.includes('twill color')) return ['Pick the fabric color', ''];
  if (l.includes('method')) return ['How should the design be made?', ''];
  if (l.includes('outline')) return ['Add an outline?', ''];
  if (l.includes('thickness')) return ['Choose the thickness', ''];
  if (l.includes('layers')) return ['How many silicone layers?', ''];
  if (l.includes('cutting') || l.includes('pre-cut')) return ['Cutting method', 'Pre-cut transfers come cut to your shape.'];
  if (l.includes('more options')) return ['Add a metallic upgrade?', ''];
  if (l.includes('diameter')) return ['Choose the sequin size', ''];
  if (l === 'type') return ['Choose the base', ''];

  return [t.charAt(0).toUpperCase() + t.slice(1).replace(/^Select /i, ''), ''];
}
const TURN = {
  0: { label: 'Fastest', note: '7 business days production + 3 days shipping', pct: 0 },
  10: { label: 'Save 10%', note: '20 business days production + 3 days shipping', pct: 10 },
  20: { label: 'Save 20%', note: '25 business days production and shipping, or 40 by sea', pct: 20 },
};
const optImg = async (url) => {
  if (!url) return null;
  const src = path.join(IMG, path.basename(url));
  if (!fs.existsSync(src)) return null;
  const name = path.basename(url).replace(/\.[^.]+$/, '') + '.webp';
  const dst = path.join(OUT, 'public/opt', name);
  if (!fs.existsSync(dst)) await sharp(src).resize(260, 260, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 74 }).toFile(dst);
  return '/opt/' + name;
};
const out = [];
for (const slug of ORDER) {
  const p = products.find((x) => x.slug === slug);
  const [name, blurb, badge] = META[slug];
  const pimgSrc = path.join(PIMG, PRODUCT_IMG[slug]);
  const pimg = `/products/${slug}.webp`;
  await sharp(pimgSrc).resize(560, 560, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toFile(path.join(OUT, 'public' + pimg));
  const steps = [];
  for (const st of p.steps) {
    const kind = st.type === 'quantity' ? 'quantity' : st.type === 'upload' || /upload/i.test(st.title) ? 'upload' : /size/i.test(st.title) ? 'size' : /turnaround/i.test(st.title) ? 'turnaround' : 'single';
    const [q, help] = question(st.title, kind);
    const step = { id: st.step_id, phase: phaseOf(st.title), kind, source: st.title, question: q, help };
    if (kind === 'quantity') Object.assign(step, { min: st.min ?? 10, max: st.max ?? 100000 });
    if (st.options) {
      step.options = [];
      st.options.forEach((o, i) => {
        const fixed = LABEL_FIX[o.label] || o.label.charAt(0).toUpperCase() + o.label.slice(1);
        const opt = { id: o.value_id, label: fixed, price: +o.price || 0, setup: +o.setup_fee || 0 };
        if (kind === 'turnaround') {
          const pct = i === 0 ? 0 : i === 1 ? 10 : 20; // EP-CF lists them in this order; one product mislabels the 10% option
          Object.assign(opt, { label: TURN[pct].label, note: TURN[pct].note, discount: pct, source: o.label });
        } else if (kind === 'size') {
          const t = JSON.parse(fs.readFileSync(path.join(TIERS, o.value_id + '.json'), 'utf8'));
          opt.tiers = t.map((x) => [x.min_qty, x.max_qty, +x.unit_price]);
          opt.label = o.label.replace(/\s*\(([\d.]+)mm\)/g, '').replace(/"/g, '"').replace(/(\d+(?:\.\d+)?")\s*(\d+(?:\.\d+)?")/, '$1');
          opt.mm = (o.label.match(/\(([\d.]+)mm\)/) || [])[1] || null;
        } else {
          if (NOTES[fixed]) opt.note = NOTES[fixed];
        }
        step.options.push(opt);
      });
      if (kind !== 'size' && kind !== 'turnaround') for (const [i, o] of st.options.entries()) step.options[i].img = await optImg(o.img);
    }
    if (kind === 'upload') Object.assign(step, { accept: 'png,jpg,jpeg,pdf,ai,psd,eps,svg' });
    steps.push(step);
  }
  const fromTier = Math.min(...steps.filter((s) => s.kind === 'size').flatMap((s) => s.options.flatMap((o) => o.tiers.map((t) => t[2]))), p.base_price || 99);
  out.push({ slug, name, title: `${name} Patches`, blurb, badge, img: pimg, basePrice: p.base_price, from: p.base_price, qtyMin: p.qty_min, qtyMax: p.qty_max,
    discountMinQty: p.discount_min_qty, moldFee: p.mold_fee || 0, steps, source: `https://ep-cf.com/product/${slug}/customize` });
}
fs.writeFileSync(path.join(OUT, 'lib/catalog.json'), JSON.stringify({ capturedAt: new Date().toISOString().slice(0, 10), source: 'https://ep-cf.com/products/category/2', products: out }));
console.log(out.map((p) => `${p.name}: ${p.steps.length} steps, from $${p.from}`).join('\n'));
