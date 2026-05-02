# Changing the app color palette

The UI reads colors from **global CSS variables**. Those variables are produced from **`src/config/theme.ts`**, then exposed to Tailwind in **`tailwind.config.ts`**.

## Where to edit

| What | File |
|------|------|
| **Primary palette** | `src/config/theme.ts` — `figmaPalette` (brand hues) and `figmaNeutralScale` (greys). |
| **Semantic tokens** | Same file — `colorTokens`: maps each semantic role (`primary`, `background`, `text`, subjects, …) to **dark** and **light** hex/rgba strings. |

Each entry in `colorTokens` looks like `{ dark: "...", light: "..." }`. Update **both** if you care about theme toggle.

Those values flow into **`buildCssVariables()`**, which sets names such as `--color-primary`, `--color-background`, `--color-text`, etc. **`applyThemeCssVariables(mode)`** (used by theme switching) writes them on `<html>`.

## How components use colors

Prefer **semantic Tailwind classes** (wired to CSS variables), not raw hex:

- **Surfaces:** `bg-background`, `bg-surface`, `bg-surface-elevated`, `bg-surface-mid`, …
- **Text:** `text-text`, `text-text-muted`, `text-text-subtle`
- **Brand / status:** `bg-primary`, `bg-secondary`, `bg-accent`, `text-error`, `bg-warning`, …
- **Subjects:** `bg-maths`, `text-chemistry`, …

Full tables and conventions: **`DESIGN.md`**.

## After you change tokens

1. Save `theme.ts`.
2. Refresh the dev app (restart `next dev` if something looks cached).

## Limitations

- Code that still uses **`#RRGGBB`** or **`bg-[#…]`** will **not** follow the token palette until those spots are migrated to semantic classes or CSS variables.
