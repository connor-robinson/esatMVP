/**
 * Rotating sample prompts for drill module cards (2–3 per variant).
 */

type DrillPreview =
  | { kind: 'plain'; text: string }
  | { kind: 'latex'; latex: string };

const S = (samples: DrillPreview[]): readonly DrillPreview[] => samples;

export const DRILL_VARIANT_SAMPLE_SETS: Record<string, readonly DrillPreview[]> = {
  // —— Arithmetic (see also drillPreviews for re-export) ——
  'addition-single-digit': S([
    { kind: 'plain', text: '9 + 7' },
    { kind: 'plain', text: '6 + 8' },
  ]),
  'addition-double-no-carry': S([
    { kind: 'plain', text: '34 + 52' },
    { kind: 'plain', text: '21 + 46' },
  ]),
  'addition-double-with-carry': S([
    { kind: 'plain', text: '47 + 38' },
    { kind: 'plain', text: '59 + 27' },
  ]),
  'addition-mental-add-5': S([
    { kind: 'plain', text: '23 + 15' },
    { kind: 'plain', text: '38 + 20' },
  ]),
  'addition-three-numbers': S([
    { kind: 'plain', text: '7 + 8 + 6' },
    { kind: 'plain', text: '12 + 5 + 9' },
  ]),
  'addition-three-numbers-hard': S([
    { kind: 'plain', text: '34 + 28 + 15' },
    { kind: 'plain', text: '47 + 36 + 22' },
  ]),
  'subtraction-single-digit': S([
    { kind: 'plain', text: '13 − 7' },
    { kind: 'plain', text: '16 − 9' },
  ]),
  'subtraction-double-no-borrow': S([
    { kind: 'plain', text: '47 − 23' },
    { kind: 'plain', text: '68 − 35' },
  ]),
  'subtraction-double-with-borrow': S([
    { kind: 'plain', text: '52 − 27' },
    { kind: 'plain', text: '61 − 38' },
  ]),
  'subtraction-mental-subtract-5': S([
    { kind: 'plain', text: '43 − 15' },
    { kind: 'plain', text: '58 − 20' },
  ]),
  'subtraction-three-numbers': S([
    { kind: 'plain', text: '18 − 5 − 4' },
    { kind: 'plain', text: '25 − 7 − 6' },
  ]),
  'subtraction-three-numbers-hard': S([
    { kind: 'plain', text: '85 − 27 − 14' },
    { kind: 'plain', text: '72 − 38 − 9' },
  ]),
  'multiplication-single-digit': S([
    { kind: 'plain', text: '7 × 8' },
    { kind: 'plain', text: '9 × 6' },
  ]),
  'multiplication-tables-up-to-12': S([
    { kind: 'plain', text: '7 × 9' },
    { kind: 'plain', text: '11 × 8' },
  ]),
  'multiplication-double-single': S([
    { kind: 'plain', text: '24 × 7' },
    { kind: 'plain', text: '36 × 4' },
  ]),
  'multiplication-double-double': S([
    { kind: 'plain', text: '23 × 14' },
    { kind: 'plain', text: '18 × 16' },
  ]),
  'multiplication-double-double-hard': S([
    { kind: 'plain', text: '47 × 36' },
    { kind: 'plain', text: '58 × 27' },
  ]),
  'multiplication-decimal': S([
    { kind: 'plain', text: '2.5 × 4' },
    { kind: 'plain', text: '3.2 × 5' },
  ]),
  'division-small-divisors': S([
    { kind: 'plain', text: '56 ÷ 7' },
    { kind: 'plain', text: '48 ÷ 6' },
  ]),
  'division-larger-dividends': S([
    { kind: 'plain', text: '144 ÷ 12' },
    { kind: 'plain', text: '96 ÷ 8' },
  ]),
  'division-two-digit-by-single': S([
    { kind: 'plain', text: '84 ÷ 6' },
    { kind: 'plain', text: '72 ÷ 9' },
  ]),
  'division-with-remainders': S([
    { kind: 'plain', text: '47 ÷ 6' },
    { kind: 'plain', text: '53 ÷ 8' },
  ]),
  'division-harder-remainders': S([
    { kind: 'plain', text: '127 ÷ 9' },
    { kind: 'plain', text: '158 ÷ 11' },
  ]),
  'division-long-division': S([
    { kind: 'plain', text: '372 ÷ 4' },
    { kind: 'plain', text: '285 ÷ 5' },
  ]),
  'fractions-same-denominator': S([
    { kind: 'latex', latex: String.raw`\frac{2}{7} + \frac{3}{7}` },
    { kind: 'latex', latex: String.raw`\frac{1}{5} + \frac{2}{5}` },
  ]),
  'fractions-different-denominators': S([
    { kind: 'latex', latex: String.raw`\frac{1}{3} + \frac{1}{4}` },
    { kind: 'latex', latex: String.raw`\frac{2}{5} + \frac{1}{2}` },
  ]),
  'fractions-multiplication': S([
    { kind: 'latex', latex: String.raw`\frac{2}{3} \times \frac{5}{7}` },
    { kind: 'latex', latex: String.raw`\frac{3}{4} \times \frac{2}{5}` },
  ]),
  'friendly_frac_decimals-level-1': S([
    { kind: 'latex', latex: String.raw`\frac{3}{8}` },
    { kind: 'latex', latex: String.raw`\frac{1}{4}` },
  ]),
  'common_frac_to_dec_2dp-level-1': S([
    { kind: 'latex', latex: String.raw`\frac{5}{16}` },
    { kind: 'latex', latex: String.raw`\frac{7}{20}` },
  ]),
  'simplify_fraction-nested-fractions': S([
    { kind: 'latex', latex: String.raw`\frac{\frac{3}{4}}{5}` },
    { kind: 'latex', latex: String.raw`\frac{\frac{2}{3}}{4}` },
  ]),
  'simplify_fraction-complex-expressions': S([
    { kind: 'latex', latex: String.raw`\frac{2 + 3}{5}` },
    { kind: 'latex', latex: String.raw`\frac{4 + 1}{6}` },
  ]),
  'simplify_fraction-sum-of-fractions': S([
    { kind: 'latex', latex: String.raw`\frac{1}{2} + \frac{1}{3}` },
    { kind: 'latex', latex: String.raw`\frac{2}{3} + \frac{1}{4}` },
  ]),
  'common_multiples-basic': S([
    { kind: 'latex', latex: String.raw`8 \times 17` },
    { kind: 'latex', latex: String.raw`7 \times 15` },
  ]),
  'sci_rewrite-mixed': S([
    { kind: 'latex', latex: String.raw`3.2 \times 10^{4}` },
    { kind: 'plain', text: '0.0000502' },
    { kind: 'latex', latex: String.raw`7.5 \times 10^{-2}` },
  ]),
  'sci_calc-multiply': S([
    { kind: 'latex', latex: String.raw`(3.2 \times 10^{4})(5 \times 10^{-2})` },
    { kind: 'latex', latex: String.raw`(1.5 \times 10^{3})(4 \times 10^{1})` },
  ]),
  'sci_calc-mix': S([
    { kind: 'latex', latex: String.raw`(6.4 \times 10^{5})\div(3.2 \times 10^{2})` },
    { kind: 'latex', latex: String.raw`(2.5 \times 10^{-3})(4 \times 10^{6})` },
  ]),
  'estimate_common_sqrts-2dp': S([
    { kind: 'latex', latex: String.raw`\sqrt{50} \approx ?` },
    { kind: 'latex', latex: String.raw`\sqrt{18} \approx ?` },
  ]),
  'estimate_common_sqrts-3dp': S([
    { kind: 'latex', latex: String.raw`\sqrt{147} \approx ?` },
    { kind: 'latex', latex: String.raw`\sqrt{75} \approx ?` },
  ]),
  'surds_simplify-simplify': S([
    { kind: 'latex', latex: String.raw`\sqrt{72}` },
    { kind: 'latex', latex: String.raw`\sqrt{98}` },
  ]),
  'surds_simplify-reverse': S([
    { kind: 'latex', latex: String.raw`6\sqrt{2}` },
    { kind: 'latex', latex: String.raw`5\sqrt{3}` },
  ]),

  // —— Algebra ——
  'linearEquations-core': S([
    { kind: 'latex', latex: String.raw`2x + 5 = 13` },
    { kind: 'latex', latex: String.raw`2(x + 3) = 14` },
  ]),
  'linearEquations-fractions': S([
    { kind: 'latex', latex: String.raw`2(x + 3) = 14` },
    { kind: 'latex', latex: String.raw`-(x - 2) = 5` },
  ]),
  'linearEquations-fractions-both-sides': S([
    { kind: 'latex', latex: String.raw`\frac{x}{2} + 1 = 5` },
    { kind: 'latex', latex: String.raw`\frac{2x}{3} = 4` },
  ]),
  'quadraticEquations-factorise': S([
    { kind: 'latex', latex: String.raw`x^2 + 5x + 6 = 0` },
    { kind: 'latex', latex: String.raw`2x^2 + 7x + 3 = 0` },
  ]),
  'quadraticEquations-hard': S([
    { kind: 'latex', latex: String.raw`x^2 - 4x + 1 = 0` },
    { kind: 'latex', latex: String.raw`(x - 3)^2 = 0` },
  ]),
  'polynomials-expand': S([
    { kind: 'latex', latex: String.raw`2(x + 3)` },
    { kind: 'latex', latex: String.raw`(x + 2)(x - 1)` },
  ]),
  'polynomials-factor': S([
    { kind: 'latex', latex: String.raw`6x + 9` },
    { kind: 'latex', latex: String.raw`4x^2 + 8x` },
  ]),
  'exponents-index-laws-basic': S([
    { kind: 'latex', latex: String.raw`x^3 \cdot x^4` },
    { kind: 'latex', latex: String.raw`x^8 \div x^2` },
  ]),
  'exponents-index-laws-fractions': S([
    { kind: 'latex', latex: String.raw`x^{-2}` },
    { kind: 'latex', latex: String.raw`x^{1/2}` },
  ]),
  'exponents-indices-and-surds': S([
    { kind: 'latex', latex: String.raw`\sqrt{12}` },
    { kind: 'latex', latex: String.raw`2\sqrt{3}` },
  ]),
  'systemsOfEquations-simultaneous': S([
    { kind: 'latex', latex: String.raw`x + y = 10` },
    { kind: 'latex', latex: String.raw`2x - y = 4` },
  ]),
  'systemsOfEquations-simultaneous-hard': S([
    { kind: 'latex', latex: String.raw`3x + 2y = 12` },
    { kind: 'latex', latex: String.raw`x - y = 1` },
  ]),
  'systemsOfEquations-three-simultaneous': S([
    { kind: 'latex', latex: String.raw`x + y + z = 6` },
    { kind: 'latex', latex: String.raw`2x - y + z = 4` },
  ]),
  'binomial_expand-expand': S([
    { kind: 'latex', latex: String.raw`(x + 2)^2` },
    { kind: 'latex', latex: String.raw`(x - 3)^2` },
  ]),
  'binomial_expand-coefficients': S([
    { kind: 'latex', latex: String.raw`(x + 1)^3` },
    { kind: 'latex', latex: String.raw`(2x - 1)^2` },
  ]),
  'factorise_quadratic-mixed': S([
    { kind: 'latex', latex: String.raw`x^2 + 7x + 12` },
    { kind: 'latex', latex: String.raw`x^2 - 16` },
  ]),
  'factorise_quadratic-hard': S([
    { kind: 'latex', latex: String.raw`2x^2 + 5x + 3` },
    { kind: 'latex', latex: String.raw`3x^2 - 12` },
  ]),
  'complete_square-nice-square': S([
    { kind: 'latex', latex: String.raw`x^2 + 6x` },
    { kind: 'latex', latex: String.raw`x^2 - 8x` },
  ]),
  'complete_square-general-monic': S([
    { kind: 'latex', latex: String.raw`x^2 + 4x + 1` },
    { kind: 'latex', latex: String.raw`x^2 - 10x + 5` },
  ]),
  'complete_square-non-monic': S([
    { kind: 'latex', latex: String.raw`2x^2 + 8x + 3` },
    { kind: 'latex', latex: String.raw`3x^2 - 12x + 5` },
  ]),
  'complete_square-vertex-form': S([
    { kind: 'latex', latex: String.raw`y = (x - 2)^2 + 1` },
    { kind: 'latex', latex: String.raw`y = 2(x + 1)^2 - 3` },
  ]),
  'inequalities-single': S([
    { kind: 'latex', latex: String.raw`2x + 1 < 9` },
    { kind: 'latex', latex: String.raw`3x - 2 \geq 7` },
  ]),
  'inequalities-compound': S([
    { kind: 'latex', latex: String.raw`-2 < x \leq 5` },
    { kind: 'latex', latex: String.raw`x < 1 \text{ or } x > 4` },
  ]),
  'indices_simplify-same-base': S([
    { kind: 'latex', latex: String.raw`x^5 \cdot x^{-2}` },
    { kind: 'latex', latex: String.raw`\frac{a^7}{a^3}` },
  ]),
  'indices_simplify-products-quotients': S([
    { kind: 'latex', latex: String.raw`(2x^2)^3` },
    { kind: 'latex', latex: String.raw`\frac{(3x)^2}{9x}` },
  ]),
  'quadratics_eval-standard-form': S([
    { kind: 'latex', latex: String.raw`x^2 - 3x + 2,\ x = 2` },
    { kind: 'latex', latex: String.raw`2x^2 + x - 1,\ x = -1` },
  ]),
  'quadratics_eval-vertex-form': S([
    { kind: 'latex', latex: String.raw`y = (x - 1)^2 + 2` },
    { kind: 'latex', latex: String.raw`y = -(x + 2)^2 + 4` },
  ]),

  // —— Geometry ——
  'triangles-level-1': S([
    { kind: 'plain', text: '∠ sum = 180°' },
    { kind: 'plain', text: 'a = 5, b = 7' },
  ]),
  'triangles-level-2': S([
    { kind: 'plain', text: 'isosceles △' },
    { kind: 'plain', text: 'ext. angle = 110°' },
  ]),
  'circles-level-1': S([
    { kind: 'latex', latex: String.raw`r = 4` },
    { kind: 'latex', latex: String.raw`C = 2\pi r` },
  ]),
  'pythagorean-level-1': S([
    { kind: 'latex', latex: String.raw`3^2 + 4^2 = c^2` },
    { kind: 'latex', latex: String.raw`5,\ 12,\ c` },
  ]),
  'area-level-1': S([
    { kind: 'plain', text: 'rect 6 × 4' },
    { kind: 'plain', text: '△ base 8, h 5' },
  ]),
  'volume-level-1': S([
    { kind: 'latex', latex: String.raw`V = lwh` },
    { kind: 'latex', latex: String.raw`r = 3,\ h = 10` },
  ]),
  'sphere_volume-level-1': S([
    { kind: 'latex', latex: String.raw`V = \frac{4}{3}\pi r^3` },
    { kind: 'latex', latex: String.raw`r = 3` },
  ]),
  'sphere_area-level-1': S([
    { kind: 'latex', latex: String.raw`A = 4\pi r^2` },
    { kind: 'latex', latex: String.raw`r = 5` },
  ]),
  'cylinder_sa-level-1': S([
    { kind: 'latex', latex: String.raw`r = 2,\ h = 6` },
    { kind: 'latex', latex: String.raw`SA_{cyl}` },
  ]),
  'cone_sa-level-1': S([
    { kind: 'latex', latex: String.raw`r = 3,\ l = 5` },
    { kind: 'latex', latex: String.raw`SA_{cone}` },
  ]),
  'square_pyramid_sa-level-1': S([
    { kind: 'plain', text: 'base 4 × 4' },
    { kind: 'plain', text: 'slant h = 6' },
  ]),

  // —— Number theory ——
  'primes-identify': S([
    { kind: 'plain', text: 'Is 97 prime?' },
    { kind: 'plain', text: 'Is 91 prime?' },
  ]),
  'prime_factorise-small': S([
    { kind: 'latex', latex: String.raw`60 = ?` },
    { kind: 'latex', latex: String.raw`84 = ?` },
  ]),
  'factors-find-factors': S([
    { kind: 'plain', text: 'factors of 36' },
    { kind: 'plain', text: 'factors of 48' },
  ]),
  'divisibility-easy': S([
    { kind: 'plain', text: '÷ by 3?' },
    { kind: 'plain', text: '÷ by 5?' },
  ]),
  'even_odd_rules-rules': S([
    { kind: 'plain', text: 'odd × odd' },
    { kind: 'plain', text: 'even − odd' },
  ]),
  'even_odd_rules-mixed': S([
    { kind: 'plain', text: '7 × 14' },
    { kind: 'plain', text: '24 ÷ 6' },
  ]),
  'modular-basic': S([
    { kind: 'latex', latex: String.raw`17 \bmod 5` },
    { kind: 'latex', latex: String.raw`23 \bmod 7` },
  ]),
  'sequences-arithmetic': S([
    { kind: 'plain', text: '2, 5, 8, …' },
    { kind: 'plain', text: 'next: 11, 14' },
  ]),
  'powers-squares': S([
    { kind: 'plain', text: '13²' },
    { kind: 'plain', text: '18²' },
  ]),
  'multiplication_shortcuts-multiply-5-15-25': S([
    { kind: 'plain', text: '24 × 25' },
    { kind: 'plain', text: '16 × 15' },
  ]),

  // —— Shortcuts ——
  'percentages-basic': S([
    { kind: 'plain', text: '15% of 80' },
    { kind: 'plain', text: '20% of 150' },
  ]),
  'squaring-ending-in-5': S([
    { kind: 'plain', text: '35²' },
    { kind: 'plain', text: '65²' },
  ]),
  'estimation-rounding': S([
    { kind: 'plain', text: '198 × 4 ≈ ?' },
    { kind: 'plain', text: '49 × 21 ≈ ?' },
  ]),

  // —— Trigonometry ——
  'trig_recall-basic-angles': S([
    { kind: 'latex', latex: String.raw`\sin 30°` },
    { kind: 'latex', latex: String.raw`\cos 60°` },
  ]),
  'trig_inverse-basic-inverse': S([
    { kind: 'latex', latex: String.raw`\sin^{-1}(0.5)` },
    { kind: 'latex', latex: String.raw`\tan^{-1}(1)` },
  ]),
  'trig_applications-triangle-sides': S([
    { kind: 'latex', latex: String.raw`a = 5,\ \theta = 40°` },
    { kind: 'latex', latex: String.raw`opp / hyp` },
  ]),

  // —— Physics ——
  'kinematics-speed-distance-time': S([
    { kind: 'latex', latex: String.raw`v = \frac{s}{t}` },
    { kind: 'plain', text: 's = 120 m, t = 8 s' },
  ]),
  'forces_motion-newtons-laws': S([
    { kind: 'latex', latex: String.raw`F = ma` },
    { kind: 'plain', text: 'm = 4 kg, a = 3' },
  ]),
  'waves-wave-equation': S([
    { kind: 'latex', latex: String.raw`v = f\lambda` },
    { kind: 'plain', text: 'f = 50 Hz' },
  ]),
  'unit_conversions-metric': S([
    { kind: 'plain', text: 'km → m' },
    { kind: 'plain', text: 'g → kg' },
  ]),
  'electricity-ohms-law': S([
    { kind: 'latex', latex: String.raw`V = IR` },
    { kind: 'plain', text: 'I = 2 A, R = 6 Ω' },
  ]),
  'ohms_law_basic-level-1': S([
    { kind: 'latex', latex: String.raw`V = IR` },
    { kind: 'plain', text: '12 V, 4 Ω' },
  ]),
  'speed_basic-level-1': S([
    { kind: 'latex', latex: String.raw`v = s/t` },
    { kind: 'plain', text: '90 km in 2 h' },
  ]),
  'suvat_solve-level-1': S([
    { kind: 'latex', latex: String.raw`v = u + at` },
    { kind: 'plain', text: 'u = 0, a = 2' },
  ]),
};
