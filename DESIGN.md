# NoCalc — Design System Reference

> **Source of truth:** All tokens live in [`src/config/theme.ts`](src/config/theme.ts).  
> Tailwind utilities are wired in [`tailwind.config.ts`](tailwind.config.ts) via CSS variables.  
> Never hard-code hex values in components — always use the semantic token classes below.

---

## 1. Color Tokens

### Neutral Scale (`figmaNeutralScale`)
| Token | Dark value | Usage |
|-------|-----------|-------|
| `n50` | `#080607` | `background` |
| `n100` | `#131116` | `surface` |
| `n200` | `#1d1b22` | `surface-elevated` (modal panels, cards) |
| `n300` | `#2b2831` | `surface-mid` (row cards, sidebar fill) |
| `n400` | `#403c46` | `surface-neutral` (hover states) |
| `n500` | `#5b5661` | `text-disabled` |
| `n600` | `#77717d` | `text-subtle` |
| `n700` | `#9a939f` | `text-muted` |
| `n900` | `#f4f1f5` | `text` (primary body text) |

### Brand / Status (`figmaPalette`)
| Semantic token | Tailwind class | Dark hex | Light hex | Usage |
|---------------|---------------|----------|-----------|-------|
| primary | `bg-primary` / `text-primary` | `#a9b167` | `#69724b` | CTAs, Easy pill, active states |
| primary-hover | `bg-primary-hover` | `#69724b` | `#5c6540` | hover for primary |
| secondary | `bg-secondary` / `text-secondary` | `#af6da1` | `#623e56` | Nav active, "DRILL" label, secondary accents |
| accent | `bg-accent` | `#91b4a4` | `#4b6b64` | Extra pill, teal accents |
| error | `bg-error` | `#cf5b5b` | `#7c3942` | Hard pill, error states |
| warning | `bg-warning` | `#eaaf40` | `#8d6741` | Medium pill, warning states |
| success | `bg-success` | same as primary | | |

### Surface tokens (Tailwind classes)
```
bg-background       → page background
bg-surface          → card base
bg-surface-elevated → modal / raised cards (#1d1b22 dark)
bg-surface-mid      → row cards inside modals / folder columns (#2b2831 dark)
bg-surface-neutral  → hover state for rows
bg-surface-subtle   → very subtle hover / divider fills
```

### Border tokens
```
border-border          → standard border (0.35 opacity dark)
border-border-subtle   → dividers, secondary edges (0.2 opacity dark)
```

---

## 2. Typography
Font: **Space Grotesk** (variable `--font-space-grotesk`).  
Fallback: `system-ui, -apple-system, sans-serif`.

| Class | Size | Line-height | Use |
|-------|------|-------------|-----|
| `text-xs` | 10px | 12.76px | Footnote, pill labels, badge text |
| `text-sm` | 13px | 16.59px | Secondary copy, descriptions |
| `text-base` | 16px | 19.2px | Body text |
| `text-lg` | 20px | 24px | Section headings |
| `text-xl` | 25px | 30px | H4 |
| `text-2xl` | 31px | 37.2px | H3 |

---

## 3. Border Radius
| Tailwind class | Value | Typical use |
|---------------|-------|-------------|
| `rounded-organic-sm` | 6px | Badges, pills, small buttons |
| `rounded-organic-md` | 10px | Medium buttons, icon containers |
| `rounded-organic-lg` | 16px | Row cards, drill variant cards |
| `rounded-organic-xl` | 24px | Modal panels, column panels, sidebar |
| `rounded-full` | 9999px | Pill CTA buttons (e.g., Start Session, Review Selection) |

---

## 4. Shadows
| Tailwind class | Value | Use |
|---------------|-------|-----|
| `shadow-bar-floating` | `0 25px 50px -12px rgba(0,0,0,0.25)` | Floating bottom bar |
| `shadow-glow` | `0 0 12px 0 rgba(169,177,103,0.4)` | Primary-glow accent |
| `shadow-glow-focus` | `0 0 0 3px rgba(169,177,103,0.35)` | Focus ring for primary inputs |
| `shadow-badge-mint` | `0 0 12px 0 rgba(133,188,130,0.4)` | Mint calculator badge |
| _(inline style)_ | `0 20px 60px rgba(0,0,0,0.55)` | Modal card depth shadow |

---

## 5. Difficulty Pills
Defined in `difficultyTokens` inside `src/config/theme.ts`.  
Helper: `getDifficultyLabel(difficulty: number)` from `src/lib/drill-difficulty.ts`.

| Level | Key | Tailwind bg | Tailwind text | Label |
|-------|-----|-------------|---------------|-------|
| ≤ 2 | `easy` | `bg-difficulty-easy` (`--color-difficulty-easy`, chartreuse `#D9E88E` dark) | `text-background` | Easy |
| 3 | `medium` | `bg-warning` | `text-text` | Medium |
| 4 | `hard` | `bg-error` | `text-text` | Hard |
| 5 | `extra` | `bg-accent` | `text-text` | Extra |

> **Rule:** Easy uses `text-background` (dark on lime). Medium/Hard/Extra use `text-text` (light on dark fills).

---

## 6. Motion / Transitions
```
ease-signature      → cubic-bezier(0.32, 0.72, 0, 1)
duration-instant    → 120ms
duration-fast       → 200ms
duration-normal     → 300ms
```

---

## 7. Key Components

### Navbar
- Height: `h-[65px]`  
- Active Mental Maths breadcrumb: `rounded-md bg-text px-2.5 py-1 text-background` (white pill in dark mode)  
- Active sub-nav items (DRILL etc): `bg-secondary/15 text-secondary`  

### Subject Categories sidebar
- Width: `w-24 xl:w-28`  
- Panel: `rounded-organic-xl border border-border bg-surface-elevated ring-1 ring-white/[0.06]`  
- Icon tile: `h-14 w-14 rounded-2xl`; selected = category color class, idle = `bg-surface-elevated`  

### Topic Folders (middle column)
- Panel: `rounded-organic-xl border border-border bg-surface-mid ring-1 ring-white/[0.06]`  
- Selected row: left accent `w-1 bg-secondary/80`, ring `ring-secondary/35`  
- Locked rows: `opacity-80`, lock icon, no click handler  
- Upgrade card (bottom): crown icon, `bg-surface-elevated`, `bg-primary` CTA  

### Drill Variants Grid (right column)
- Panel: `rounded-organic-xl border border-border bg-surface-mid ring-1 ring-white/[0.06]`  
- Card selected: `border-primary/55 ring-primary/35 bg-primary/5`  
- Add button: `bg-primary text-background rounded-organic-md`  
- Remove button: `border border-border-subtle bg-surface-mid text-text-muted rounded-organic-md`  

### Drills Selected Modal
- Backdrop: `bg-black/60 backdrop-blur-sm`  
- Panel: `max-w-[540px] rounded-organic-xl border border-border bg-surface-elevated`  
- Panel shadow: `0 20px 60px rgba(0,0,0,0.55)` (inline style)  
- **Header**: vertically centered block — row of **Calculator** in mint `bg-accent` circle + **`Clock`**, then **Drills Selected** (`border-b-2 border-maths`); whole group is **horizontal center** of header; **X** is `absolute right-3 top-1/2 -translate-y-1/2`  
- **Row card**: `rounded-organic-lg border border-border-subtle bg-surface-mid px-4 py-3`  
  - Left: difficulty pill → title → subtitle  
  - Right top: `≡ 10 q  🕐 0.5 m` (inline)  
  - Right bottom: Remove — `rounded-organic-sm border border-border bg-surface-elevated text-[11px] text-text-muted`  
- **Footer**: `{questionCount}` bold + underlined "Clear all" | **Start Session →** `rounded-full bg-primary text-background px-5 py-2.5`  

### Session Selection Bar (bottom floating)
- Layout: `rounded-full border border-border-subtle bg-surface shadow-bar-floating backdrop-blur-md`  
- Left: question count input + "Questions Selected" + underlined "Clear all"  
- Right: `rounded-full bg-primary text-background px-5 py-2.5` pill CTA  

---

## 8. Layout — Drill Builder Page
```
┌─ Navbar (h-[65px]) ──────────────────────────────────────┐
│                                                           │
├─ h-[calc(100vh-65px)] overflow-hidden ───────────────────┤
│  ┌── px-6 py-6 gap-6 flex ─────────────────────────────┐ │
│  │ Subject      │ Topic Folders  │ Drill Variants Grid   │ │
│  │ Categories   │ w-72 → w-80   │ flex-1                │ │
│  │ w-24 → w-28  │ overflow-y-auto│ overflow-y-auto       │ │
│  │ overflow-y   │               │                       │ │
│  └──────────────┴───────────────┴───────────────────────┘ │
│                                          ↑ pb-24 for bar   │
├─ Fixed bottom-right: SessionSelectionBar z-50 ───────────┤
└───────────────────────────────────────────────────────────┘
```

---

## 9. Do / Don't

| ✅ Do | ❌ Don't |
|------|---------|
| Use `bg-primary text-background` for primary CTAs | Hard-code `#a9b167` anywhere |
| Use `rounded-organic-xl` for panel containers | Mix `rounded-2xl` and `rounded-organic-xl` |
| Use `border-border` for panel edges | Use `border-border-subtle/40` — too faint |
| Use `bg-surface-mid` for row cards inside modals | Use `bg-surface-elevated` for rows (too light) |
| Always use `ring-1 ring-white/[0.06]` on panels | Skip the ring — corners won't read on dark bg |
| Use `text-background` on Easy pill | Use `text-text` on lime — too low contrast |
| Use `text-text` on Medium/Hard/Extra pills | Use `text-background` on dark fills |
| Source difficulty colors from `difficultyTokens` in `theme.ts` | Define pill colors inline in components |
