# EPCF patch catalog

`lib/catalog.json` holds every patch type, its questions in EP-CF's order, each option (label, image,
price per piece, setup fee, turnaround discount) and the size price tiers. It is a snapshot of ep-cf.com
taken on the date in `capturedAt`. The configurator and the server both read it.

## Price formula (same as ep-cf.com)
- unit price = size tier price for the quantity (or the base price before a size is chosen) + each option's price
- subtotal = unit price x quantity + setup fees
- the turnaround discount applies from 25 pieces
- total = subtotal - discount + mold fee

The estimate is shown as an estimate. The final price is confirmed with the mockup.

## Refreshing prices
1. Save each configurator page from ep-cf.com (`/products/<slug>/customize`) as `<slug>.html`.
2. `python3 scripts/extract.py products.json pages/*.html` writes the raw steps and options.
3. Download the option images, the size tiers (`/admin/option-value/<id>/price-tiers`) and product images.
4. `node scripts/build-catalog.mjs products.json img/ tiers/ pimg/ .` rebuilds `lib/catalog.json`,
   `public/opt/*.webp` and `public/products/*.webp`.

Friendly question wording, option notes and label fixes live at the top of `scripts/build-catalog.mjs`.

## Differences from ep-cf.com to check with EPCF
- On ep-cf.com only Denim, Embroidered and PVC actually apply the 10% and 20% turnaround discounts in the
  price; the other types show the labels but charge the full price. This funnel applies the labelled
  discount from 25 pieces on every type.
- Blank patches: the 10% turnaround option is labelled "10 Colors" on ep-cf.com. Here it reads "Save 10%".
- "Free digital mockup" appears in the copy. Confirm EPCF offers it.
