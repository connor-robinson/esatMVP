# Brand Configuration Guide

All brand names and app titles are now centralized in one file for easy updates.

---

## 📍 Central Configuration File

**Location:** `src/config/brand.ts`

This is the **only file** you need to edit to change brand names throughout the app.

---

## 🔧 How to Change Brand Names

### Step 1: Open the Config File

```bash
src/config/brand.ts
```

### Step 2: Update the Values

```typescript
export const BRAND_CONFIG = {
  // Main brand/app name
  appName: "NoCalc",  // ← Change this
  
  // Display name (can be different from appName for display purposes)
  displayName: "NoCalc",  // ← Change this
  
  // Full title for pages
  fullTitle: "NoCalc | Premium ESAT & TMUA Mastery",  // ← Change this
  
  // Short title
  shortTitle: "NoCalc",  // ← Change this
  
  // Copyright text
  copyright: "© 2024 NoCalc. Not affiliated with the University of Cambridge.",  // ← Change this
  
  // Company/Organization name (if different from app name)
  companyName: "NoCalc",  // ← Change this
  
  // Tagline or description
  tagline: "Premium ESAT & TMUA Mastery",  // ← Change this
  
  // SEO keywords (includes brand name)
  keywords: [
    "mental math",
    "ESAT",
    "TMUA",
    "Cambridge",
    "entrance exams",
    "no calculator",
    "NoCalc"  // ← Change this
  ],
} as const;
```

### Step 3: Save and Restart

After changing the config file:
1. Save the file
2. Restart your dev server (`npm run dev`)
3. Changes will appear throughout the app

---

## 📋 Where Brand Names Are Used

### ✅ Automatically Updated (via config):
- `src/app/layout.tsx` - Page title and metadata
- `src/app/page.tsx` - Footer and display names

### ⚠️ Manual Update Required (static HTML):
- `homepage/homepage1.html` - Static HTML file
- `homepage/homepage2.html` - Static HTML file

**Note:** The HTML files are static and can't use the config file. If you change the brand name, you'll need to update these manually or regenerate them.

---

## 🎯 Current Brand Settings

- **App Name:** NoCalc
- **Display Name:** NoCalc
- **Full Title:** NoCalc | Premium ESAT & TMUA Mastery
- **Copyright:** © 2024 NoCalc. Not affiliated with the University of Cambridge.

---

## 🔍 Finding All Brand References

To search for any remaining brand name references:

```bash
# Search for any brand name (case-insensitive)
grep -r "cantabprep\|chanaacdemy\|yourbrand" --include="*.tsx" --include="*.ts" --include="*.html" -i
```

---

## 💡 Usage Examples

### In React Components:

```typescript
import { BRAND_CONFIG, APP_NAME, DISPLAY_NAME, COPYRIGHT } from "@/config/brand";

// Use the full config object
<h1>{BRAND_CONFIG.fullTitle}</h1>

// Or use individual exports
<span>{DISPLAY_NAME}</span>
<p>{COPYRIGHT}</p>
```

### Available Exports:

- `BRAND_CONFIG` - Full configuration object
- `APP_NAME` - Main app name
- `DISPLAY_NAME` - Display name
- `FULL_TITLE` - Full page title
- `SHORT_TITLE` - Short title
- `COPYRIGHT` - Copyright text
- `COMPANY_NAME` - Company name
- `TAGLINE` - Tagline

---

## ✅ What's Been Updated

- ✅ All "CantabPrep" references replaced with "NoCalc"
- ✅ Centralized configuration created
- ✅ Main app files updated to use config
- ✅ HTML homepage files updated

---

## 🚀 Quick Change Example

To change from "NoCalc" to "MyNewBrand":

1. Open `src/config/brand.ts`
2. Replace all instances of `"NoCalc"` with `"MyNewBrand"`
3. Save and restart

That's it! The change will propagate throughout the app automatically.

---

**Last Updated:** 2025-01-XX
