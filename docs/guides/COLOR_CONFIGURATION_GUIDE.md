# Color Configuration Guide

All colors in your application are centrally configured. Here's where to edit them:

---

## 🎨 Main Color Configuration File

**Location:** `src/styles/globals.css`

This is the **primary file** where all colors are defined using CSS variables.

### How to Change Colors

Edit the CSS variables in the `:root` section (lines 42-88) for dark mode, or `.light` section (lines 90-136) for light mode.

---

## 📋 Available Color Variables

### Primary Colors
```css
--color-primary: #85BC82;           /* Main brand color (green) */
--color-primary-hover: #6c9e69;     /* Hover state */
--color-secondary: #7b6fa6;          /* Secondary brand color (purple) */
--color-accent: #5a8a8c;             /* Accent color */
```

### Background & Surface Colors
```css
--color-background: #0e0f13;         /* Main background */
--color-surface: #12141a;            /* Card/surface background */
--color-surface-elevated: #1a1d26;   /* Elevated surfaces */
--color-surface-subtle: #0f1114;     /* Subtle surfaces */
--color-surface-mid: #111318;         /* Mid-level surfaces */
--color-surface-neutral: #151821;     /* Neutral surfaces */
```

### Border Colors
```css
--color-border: rgba(255, 255, 255, 0.1);        /* Main borders */
--color-border-subtle: rgba(255, 255, 255, 0.05); /* Subtle borders */
```

### Text Colors
```css
--color-text: #e5e7eb;                           /* Main text */
--color-text-muted: rgba(255, 255, 255, 0.7);     /* Muted text */
--color-text-subtle: rgba(255, 255, 255, 0.5);    /* Subtle text */
--color-text-disabled: rgba(255, 255, 255, 0.3);  /* Disabled text */
```

### Subject Colors
```css
--color-maths: #3d6064;        /* Mathematics color */
--color-physics: #6b5e94;      /* Physics color */
--color-chemistry: #8c525a;    /* Chemistry color */
--color-biology: #4e6b8a;      /* Biology color */
--color-advanced: #9e5974;     /* Advanced math color */
```

### Status Colors
```css
--color-success: #85BC82;      /* Success/green */
--color-error: #ef4444;        /* Error/red */
--color-warning: #f59e0b;      /* Warning/orange */
```

### Surface Opacities (for overlays)
```css
--surface-02: rgba(255, 255, 255, 0.02);
--surface-05: rgba(255, 255, 255, 0.05);
--surface-10: rgba(255, 255, 255, 0.1);
--surface-15: rgba(255, 255, 255, 0.15);
--surface-20: rgba(255, 255, 255, 0.2);
```

---

## 🔧 How to Change Colors

### Step 1: Open the File
```bash
src/styles/globals.css
```

### Step 2: Edit the Variables

**For Dark Mode (default):**
- Edit values in the `:root` section (lines 42-88)

**For Light Mode:**
- Edit values in the `.light` section (lines 90-136)

### Step 3: Save and Restart

After changing colors:
1. Save the file
2. Restart your dev server (`npm run dev`)
3. Changes will appear throughout the app

---

## 📝 Example: Change Primary Color

**Before:**
```css
--color-primary: #85BC82;  /* Green */
```

**After:**
```css
--color-primary: #3B82F6;  /* Blue */
```

This will change the primary color throughout the entire app automatically!

---

## 🎯 Where Colors Are Used

### In Tailwind Classes:
- `bg-primary` → Uses `--color-primary`
- `text-primary` → Uses `--color-primary`
- `border-primary` → Uses `--color-primary`
- `bg-maths` → Uses `--color-maths`
- `text-text-muted` → Uses `--color-text-muted`
- etc.

### In CSS:
- `var(--color-primary)`
- `var(--color-background)`
- `var(--color-text)`
- etc.

### In TypeScript/React:
- Colors are accessed via Tailwind classes
- Or via CSS variables: `var(--color-primary)`

---

## 🌓 Dark vs Light Mode

Your app supports both dark and light modes:

- **Dark Mode (default):** Colors in `:root` section
- **Light Mode:** Colors in `.light` section

When you change colors, update **both sections** to maintain consistency across themes.

---

## 🎨 Current Color Scheme

### Primary Colors:
- **Primary:** `#85BC82` (Green)
- **Secondary:** `#7b6fa6` (Purple)
- **Accent:** `#5a8a8c` (Teal)

### Subject Colors:
- **Math:** `#3d6064` (Dark Teal)
- **Physics:** `#6b5e94` (Purple)
- **Chemistry:** `#8c525a` (Red-Brown)
- **Biology:** `#4e6b8a` (Blue)
- **Advanced:** `#9e5974` (Pink)

### Background:
- **Background:** `#0e0f13` (Very Dark Blue)
- **Surface:** `#12141a` (Dark Blue-Gray)

---

## 📚 Additional Color Files

### `src/config/colors.ts`
- Contains paper-specific color mappings
- Uses theme system colors
- Maps paper types to subject colors

### `tailwind.config.ts`
- References CSS variables
- Maps Tailwind classes to CSS variables
- **Don't edit this** - it automatically uses variables from `globals.css`

---

## ✅ Quick Reference

**To change ALL colors:**
1. Edit `src/styles/globals.css`
2. Update CSS variables in `:root` and `.light` sections
3. Save and restart

**To change specific colors:**
- Primary color → `--color-primary`
- Background → `--color-background`
- Text → `--color-text`
- Subject colors → `--color-maths`, `--color-physics`, etc.

---

## 🚀 Example: Complete Color Theme Change

Want to change from green to blue theme?

1. **Edit `src/styles/globals.css`:**
   ```css
   :root {
     --color-primary: #3B82F6;        /* Change to blue */
     --color-primary-hover: #2563EB;  /* Darker blue for hover */
     /* ... other colors ... */
   }
   ```

2. **Save and restart**

3. **Result:** Entire app now uses blue instead of green!

---

**Last Updated:** 2025-01-XX
