# Design System

Tokens are defined in `src/app/globals.css`. Components are in `src/components/ui/*`.

## Direction
The product is meant to feel like premium industrial B2B: precise and calm, with an electric accent. The palette is deep navy surfaces, electric-blue action colour, and cyan highlights. Display type is set in Space Grotesk and body type in Inter. Both fonts are self-hosted from `src/app/fonts`, so pages make no external font requests.

## Brand palette (fixed)
| Token | Hex | Use |
|---|---|---|
| `navy` | #0A0F1C | Dark surfaces, primary ink |
| `ink` / `deep` | #101827 / #121C2E | Dark-mode layers |
| `electric` | #00B4FF | Primary action, focus ring |
| `cyan` | #00E5FF | Highlights on dark |
| `offwhite` / `mist` | #F7F9FC / #E5EAF0 | Light background, hairlines |
| `success` / `warning` / `danger` | #16A34A / #F59E0B / #DC2626 | Status only. Always paired with an icon and a label. |

## Semantic tokens (these change in dark mode)
`bg`, `surface`, `surface-2`, `fg`, `muted`, `line`, `primary`, `primary-fg`, `ring`, `chart`.

Components use only these semantic classes (`bg-surface`, `text-muted`, `border-line`, …), so dark mode is a variable swap under `.dark`. The theme can be light, dark or system; the choice is stored per viewer as a preference only.

- Electric fills always carry navy text (`primary-fg`), because white on #00B4FF fails contrast.
- Muted text (#5B6B80 on white) meets WCAG AA for body text.

## Type scale
| Role | Class |
|---|---|
| Display / hero | `font-display text-4xl–6xl tracking-tight` |
| Page title | `text-2xl sm:text-[1.75rem] font-semibold` |
| Section / card title | `text-base font-semibold` |
| Body | `text-sm`–`text-base` |
| Eyebrow | `.eyebrow` (uppercase, tracked, electric) |
| Numbers | `.tabular` (tabular-nums) for money, counts and refs |

## Radius, elevation and motion
- Radii are `xl` (14px) for controls and `2xl` (18px) for cards and dialogs.
- Shadows are `card` (hairline), `lift` (hover) and `glow` (primary CTA only).
- Easing is `--ease-brand` (`cubic-bezier(.22,1,.36,1)`). Motion is limited to page-load reveals, hover lift, and the matching-progress pulse. Everything respects `prefers-reduced-motion`.

## Components
- **`ui/Button`**: variants are primary, secondary, ghost, danger and link; sizes are sm, md and lg. Loading state and `asChild` are supported.
- **`ui/primitives`**: `Card`, `CardHeader`, `Badge` (tones neutral/blue/green/amber/red/dark/violet), `Alert`, `EmptyState`, `Skeleton`, `StatCard`, `PageHeader`, `KeyValue`, `Avatar`, `DemoBadge`.
- **`ui/fields`**: labelled inputs, select, textarea, checkbox and radio cards, with errors linked via `aria-describedby`.
- **`ui/data`**: responsive tables (they become cards on mobile) and pagination.
- **`ui/client`**: `ActionForm` / `ActionButton` (server-action forms with pending and error states), `Dialog`, `Drawer`, `Tabs`, `Tooltip` (Radix).
- **Layout**: `SiteChrome`, `MobileNav`, `DashboardShell` / `DashNav` (role-aware sidebar), `NotificationList`, `VerifyBanner`.
- **Brand**: `Logo`, `PatchArt` (generated SVG illustrations per patch type, so the site does not rely on stock imagery).
- **Domain**: the `RfqWizard` (11 steps with a progress rail), `OpportunityCard`, `RfqStatusPanel`, `MatchingProgress`, `QuoteActions`, the messaging `Inbox` / `Composer`.

## Status → tone mapping
`src/lib/ui-status.ts` maps every enum status to a badge tone, so the same state always looks the same across portals.

## Charts
Charts follow the dataviz method:
- **Single-series bar charts** use `--pm-chart`, which is #0091D5 in light mode and #0098D9 in dark mode. Both colours were validated for contrast against their surface.
- Bars have 4px rounded data ends, a 2px gap and a recessive grid.
- Every chart has a hover tooltip and an accessible table fallback.

KPIs are rendered as `StatCard` tiles, not charts. Demo data always carries a violet "Fictional demo data" badge.

## Accessibility
- Visible focus rings (`ring`), a skip link, and landmark regions.
- Every form control has a label. Errors use `role="alert"`.
- Colour is never the only signal: status has icon + text, and charts have tables.
- Touch targets are at least 40px. Mobile has been checked at 360px with no horizontal overflow; an E2E test covers this.
