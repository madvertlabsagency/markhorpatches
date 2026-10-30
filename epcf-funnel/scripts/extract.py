import re, sys, json, html, os
def clean(t): return ' '.join(html.unescape(re.sub(r'<[^>]+>', ' ', t)).split())
out = []
for path in sys.argv[2:]:
    raw = open(path, encoding='utf-8', errors='ignore').read()
    s = re.sub(r'\s+', ' ', raw)
    slug = os.path.basename(path)[:-5]
    prod = {'slug': slug}
    m = re.search(r'<h2[^>]*>\s*Customize ([^<]+)</h2>', s); prod['title'] = clean(m.group(1)) if m else slug
    for k, pat in [('base_price', r'const BASE_PRICE = ([\d.]+)'), ('qty_min', r'const QTY_MIN = (\d+)'), ('qty_max', r'const QTY_MAX = (\d+)'),
                   ('discount_min_qty', r'const DISCOUNT_MIN_QUANTITY = (\d+)'), ('mold_fee', r'const MOLD_FEE = ([\d.]+)')]:
        m = re.search(pat, s); prod[k] = float(m.group(1)) if m else None
    m = re.search(r'<meta name="description" content="([^"]*)"', s); prod['meta_description'] = html.unescape(m.group(1)) if m else ''
    m = re.search(r'Starting (?:from|at) \$?([\d.]+)', s); prod['starting_from_text'] = m.group(0) if m else ''
    # one block per step card
    cards = list(re.finditer(r'<div class="card mb-4 step-card[^"]*" data-step-id="(\d+)" data-step-number="(\d+)" data-step-type="([^"]*)">', s))
    steps = []
    for i, c in enumerate(cards):
        end = cards[i + 1].start() if i + 1 < len(cards) else s.find('Order Summary', c.end())
        block = s[c.end():end]
        h5 = re.search(r'<h5 class="mb-1">(.*?)</h5>', block); sub = re.search(r'<p class="step-sub[^"]*">(.*?)</p>', block)
        st = {'n': int(c.group(2)), 'step_id': c.group(1), 'kind': c.group(3), 'title': clean(h5.group(1)) if h5 else '', 'sub': clean(sub.group(1)) if sub else ''}
        qi = re.search(r'name="step\[\d+\]\[quantity\]"[^>]*min="(\d+)"[^>]*max="(\d+)"', block)
        opts = []
        for om in re.finditer(r'<input type="(radio|checkbox)" class="step-option[^"]*"([^>]*)>(?:\s*<span[^>]*></span>)?\s*<label[^>]*>(.*?)</label>', block):
            a2 = dict(re.findall(r'(data-[\w-]+|value)="([^"]*)"', om.group(2)))
            inner = om.group(3)
            img = re.search(r'<img src="([^"]+)"', inner)
            title = re.search(r'<h6[^>]*>(.*?)</h6>', inner)
            extras = [clean(x) for x in re.findall(r'<(?:p|span|small)[^>]*>(.*?)</(?:p|span|small)>', inner) if clean(x)]
            opts.append({'label': html.unescape(a2.get('data-label', '')) or (clean(title.group(1)) if title else ''), 'price': a2.get('data-price'),
                         'setup_fee': a2.get('data-setup-fee'), 'discount': a2.get('data-discount'), 'img': img.group(1) if img else None,
                         'extra': extras, 'input': om.group(1), 'value_id': a2.get('value')})
        if qi: st.update(type='quantity', min=int(qi.group(1)), max=int(qi.group(2)))
        elif opts: st.update(type='multi' if opts[0]['input'] == 'checkbox' else 'single', options=opts)
        elif 'type="file"' in block:
            acc = re.search(r'accept="([^"]*)"', block); note = re.search(r'Accepted formats:(.*?)</div>', block)
            st.update(type='upload', accept=acc.group(1) if acc else '', note=clean(note.group(1)) if note else '', email_later='email-later' in block)
        else:
            st.update(type='text', fields=[clean(x) for x in re.findall(r'<label[^>]*>(.*?)</label>', block)], placeholder=(re.search(r'placeholder="([^"]*)"', block) or [None, ''])[1])
        steps.append(st)
    prod['steps'] = steps
    cm = re.search(r'Your Contact Details(.*?)(?:</form>|Product Gallery)', s)
    prod['contact_fields'] = [clean(x) for x in re.findall(r'<label[^>]*>(.*?)</label>', cm.group(1))] if cm else []
    out.append(prod)
json.dump(out, open(sys.argv[1], 'w'), indent=1, ensure_ascii=False)
for p in out:
    print(f"\n### {p['title']} ({p['slug']}) base ${p['base_price']} qty {p['qty_min']:.0f}-{p['qty_max']:.0f} | {p['starting_from_text']}")
    for st in p['steps']:
        o = st.get('options') or []
        print(f"  {st['n']}. {st['title']} [{st['type']}/{st['kind']}] {('('+st['sub']+')') if st['sub'] else ''} -> " + '; '.join(x['label'] + (f" [{', '.join(x['extra'])}]" if x['extra'] else '') + (f" +${x['price']}" if x['price'] not in (None,'0.00','0') else '') + (f" setup ${x['setup_fee']}" if x['setup_fee'] not in (None,'0','0.00') else '') for x in o)[:900] + (' fields: ' + ', '.join(st.get('fields', [])) if st.get('fields') else ''))
    print('  contact:', p['contact_fields'])
