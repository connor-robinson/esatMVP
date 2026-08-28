# ESAT Official UI Audit

Internal reference for the Pearson VUE / ESAT exam simulation on ESAT Camp.

**Rules**

- `VERIFIED_ESAT`: confirmed from UAT-UK Tier A (Prepare page, Candidate Handbook 2027 Entry, ESAT pages).
- `VERIFIED_PEARSON_PLATFORM`: confirmed from current Pearson Platform Navigation Guides (Tier B). Applied to ESAT only where consistent with Tier A.
- `UNVERIFIED`: not confirmed in the live ESAT player or Tier A; do not teach as fact.
- `NOT_APPLICABLE_TO_ESAT`: exists on some Pearson exams but conflicts with ESAT rules or is irrelevant.

If Tier A and Tier B disagree, **ESAT Tier A wins**.

Sources consulted:

1. [UAT-UK Prepare](https://esat-tmua.ac.uk/prepare/) (Tier A)
2. [UAT-UK Candidate Handbook 2027 Entry](https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2026/06/26111813/Candidate-Handbook-2027-Entry.pdf) sections 6–7 (Tier A)
3. [Pearson VUE UAT-UK landing](https://home.pearsonvue.com/uatuk) (Tier A listing; sample player launch attempted)
4. Pearson Platform Navigation Guide (CEPI / ECU PDFs) (Tier B)
5. Pixel samples from CEPI guide screenshots at ~100% scale (Tier B visuals)
6. Third-party ESAT UI descriptions (Tier C only; never override A)

---

## Timing

| Behaviour | Status | Notes |
| --- | --- | --- |
| Module length 40:00 | `VERIFIED_ESAT` | Handbook 7.2 |
| Modules timed separately | `VERIFIED_ESAT` | |
| Unused time does not carry | `VERIFIED_ESAT` | |
| No automatic breaks | `VERIFIED_ESAT` | Handbook: no break unless access arrangement |
| Timer continues if candidate leaves seat | `VERIFIED_ESAT` | Toilet etc. |
| Display "Time Remaining" upper-right | `VERIFIED_PEARSON_PLATFORM` | |
| Clock icon hides/shows numerals | `VERIFIED_PEARSON_PLATFORM` | Enabled in sim; live ESAT click-confirm still pending |
| Never show negative time | Implementation rule | |
| Auto-end module at zero | `VERIFIED_PEARSON_PLATFORM` | Auto-submit when time expires |
| Invented 5-minute break screen | `NOT_APPLICABLE_TO_ESAT` | Do not ship in strict mode |
| Short between-module countdown | `UNVERIFIED` | First-hand 2025 candidate report exists; public player did not confirm duration/wording. Config stub only. |

---

## Question chrome

| Behaviour | Status | Notes |
| --- | --- | --- |
| Dark blue header bar `#005596` | `VERIFIED_ESAT` | ESAT specimen screenshots Aug 2026 |
| Lighter blue toolbar `#4a78b6` | `VERIFIED_ESAT` | Specimen screenshots |
| Footer same blue family | `VERIFIED_ESAT` | Specimen screenshots |
| Counter format `N of M` (not "Question N of M") | `VERIFIED_ESAT` | Specimen question screen |
| Loading screen with segmented bar | `VERIFIED_ESAT` | Specimen screen 1 |
| Blurred spinner after End Exam confirm | `VERIFIED_ESAT` | Specimen post-end session |
| NDA / welcome screen before questions | `VERIFIED_ESAT` | Specimen screen 2 |
| Instructions table (Untimed) | `VERIFIED_ESAT` | Specimen screen 3 |
| End Exam footer (not Previous) | `VERIFIED_ESAT` | Specimen screens 2–4 |
| Explain Answer toolbar button | `NOT_APPLICABLE_TO_ESAT` | Omitted in sim |
| Flag for Review upper-right | `VERIFIED_PEARSON_PLATFORM` / ESAT descriptions | Handbook confirms flagging exists |
| Filled vs outline flag when toggled | `VERIFIED_PEARSON_PLATFORM` | Guide shows filled flag on review |
| Color Scheme dropdown | `VERIFIED_PEARSON_PLATFORM` | Exact ESAT option list `UNVERIFIED` |
| Previous / Next / Navigator footer | `VERIFIED_PEARSON_PLATFORM` + Tier C ESAT | Navigator strongly attested for ESAT practice UIs |
| Square / zero radius controls | `VERIFIED_PEARSON_PLATFORM` | Visual sample |
| Desktop preferred for fidelity | `VERIFIED_ESAT` | Prepare page |

---

## Answers / radios

| Behaviour | Status | Notes |
| --- | --- | --- |
| Small circular radios, not cards | `VERIFIED_PEARSON_PLATFORM` | Guide screenshots |
| Click label selects answer | `UNVERIFIED` for ESAT specifically | Standard HTML label behaviour; ship as accessible default |
| Arrow keys within focused radio group | Native HTML | Ship |
| Digit keys 1–8 select answers | `UNVERIFIED` | Disabled in strict mode |
| Correct/incorrect colours mid-exam | `NOT_APPLICABLE_TO_ESAT` in strict mode | Specimen/sample feedback is separate mode |

---

## Unseen Content

| Behaviour | Status | Notes |
| --- | --- | --- |
| Dialog title "Unseen Content" | `VERIFIED_ESAT` | Handbook §7 |
| Exact body wording | `VERIFIED_ESAT` | "You have not yet viewed the entire screen. Make sure you play all multimedia content, select every tab and scroll to every corner." |
| OK dismisses | `VERIFIED_ESAT` | |
| Triggered if not scrolled to end | `VERIFIED_ESAT` | |
| Not triggered when content fully fits | Implementation | No unseen region |

---

## Review / end module

| Behaviour | Status | Notes |
| --- | --- | --- |
| End-of-module review lists flagged + unanswered | `VERIFIED_ESAT` | Handbook 7.2 |
| Review returns into questions | `VERIFIED_ESAT` | |
| Review All / Incomplete / Flagged / End Review | `VERIFIED_PEARSON_PLATFORM` | Item Review Screen |
| Warning before permanent end | `VERIFIED_ESAT` | Handbook: leave review → warning → confirm → permanent |
| Cannot reopen completed module | `VERIFIED_ESAT` | |

---

## Colour schemes

| Scheme | Status |
| --- | --- |
| Black on White, Black on Light Yellow, Black on Salmon, Black on Yellow | `VERIFIED_ESAT` | Specimen Color Scheme dropdown |
| Full-page theme (header/toolbar/footer recolour) | `VERIFIED_ESAT` | Specimen high-contrast modes |
| Blue on White, Blue on Yellow, Light Yellow on Black | `NOT_APPLICABLE_TO_ESAT` | Not in ESAT specimen dropdown |

---

## Magnification

| Behaviour | Status | Notes |
| --- | --- | --- |
| Ctrl+ / Ctrl- up to 200% | `VERIFIED_PEARSON_PLATFORM` | Live ESAT confirm pending; enabled as platform feature |
| Exact step size | `UNVERIFIED` | Implementation uses 25% steps: 100/125/150/175/200 |
| Chrome vs content zoom | `UNVERIFIED` | Content viewport zoomed |

---

## Keyboard shortcuts

| Action | Chord | Status |
| --- | --- | --- |
| Next | Alt+N | `VERIFIED_ESAT` |
| End Exam | Alt+E | `VERIFIED_ESAT` |
| Flag for Review | Alt+F | `VERIFIED_ESAT` |
| Navigator Close | Alt+C | `VERIFIED_ESAT` |
| End Exam Yes / No | Alt+Y / Alt+N | `VERIFIED_ESAT` (N conflicts with Next when dialog closed) |
| Previous | Alt+P or other | `UNVERIFIED` for ESAT (disabled) |
| Navigator open | mnemonic N on button | Visual only; no verified open chord |
| Review / End Review | mnemonic | `UNVERIFIED` (disabled) |
| Color Scheme | mnemonic | `UNVERIFIED` (disabled) |
| Increase magnification | Ctrl+ | `VERIFIED_PEARSON_PLATFORM` |
| Decrease magnification | Ctrl- | `VERIFIED_PEARSON_PLATFORM` |
| Radio arrows / Space | native | Allowed |
| Enter advances question | `UNVERIFIED` (disabled) |

---

## Modes

| Mode | Status | Notes |
| --- | --- | --- |
| strict-simulation | Product | Closest to test day; no explanations |
| specimen | Product | Explained answers when useful |
| sample | Product | End review of correct/incorrect (official sample behaviour) |

---

## Pixel tokens (Tier B samples)

| Token | Value |
| --- | --- |
| `--pearson-header` | `#005596` |
| `--pearson-toolbar` | `#4a78b6` |
| `--pearson-footer` | `#005596` |
| `--pearson-nav-blue` | `#00599c` |
| `--pearson-dialog-blue` | `#0066a1` |
| `--pearson-content-bg` | `#ffffff` |
| `--pearson-text` | `#000000` |

Reference screenshots (where permissible) live under `docs/pearson-reference/`.

---

## Live ESAT player gap

Launching the public specimen/sample player from Pearson and exhaustively clicking every control was **not fully completed** in this audit pass (landing page / rate limits / session constraints). Behaviours marked `VERIFIED_PEARSON_PLATFORM` that are not also `VERIFIED_ESAT` should be re-checked in the live ESAT sample player before marketing them as "identical to test day."

Strict mode already refuses to teach unverified shortcuts.
