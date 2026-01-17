# ESAT Trainer - Complete Mode Summary

## CRAM (Speed Drills)

1. **mental_add_fast** - Fast Addition
   - Generates quick addition problems: two-digit + single-digit (55%), single-digit + single-digit (35%), or two-digit + single-digit + single-digit (10%)

2. **mental_sub_fast** - Fast Subtraction
   - Generates quick subtraction problems: two-digit - single-digit (40%), single-digit - single-digit (20%), or single-digit - two-digit (40%)

3. **mental_div** - Division
   - Simple division: `a ÷ b` where `a` is a multiple of `b`, with `b` from 2-12

4. **mul_of_5** - Multiples of 5
   - Multiplies a number by 5, 15, or 25

5. **diff_speed** - Differentiate
   - Speed drill for differentiation: generates `k·x^n` where n is an integer or half-integer (n ≠ -1), asks to differentiate

6. **integrate_speed** - Integrate
   - Speed drill for integration: generates definite integrals of power terms `k·x^n` with specified bounds, asks to evaluate

7. **friendly_frac_decimals** - Frac to Dec Fast
   - Converts between "friendly" fractions (like 1/5, 2/5, 3/4, 1/2) and decimals (to 3 d.p.), or vice versa (finite or recurring decimals to fractions)

8. **simplify_fraction** - Simplifying fractions
   - Simplifies complex fractions to lowest terms. Patterns include: nested fractions (a/b)/c, a/(b/c), sums in numerator/denominator, or harder flat fractions

9. **binomial_expand** - Binomial Expansion
   - Expands `(x ± a)^n` for n=2-3 (full expansion) or n=4-6 (asks for coefficient of specific term)

10. **tri_special** - Special Triangles
    - Problems involving 30-60-90 or 45-45-90 right triangles. Can ask to find unknown side length (x) or unknown angle (θ) in degrees, given other sides/angles

11. **trig_inverse_recall** - Inverse Trig Ratios
    - Recalls inverse trigonometric ratios (arcsin, arccos, arctan) in degrees or radians for special values (0, 1/2, √2/2, √3/2, 1, 1/√3, √3)

12. **trig_recall_basic** - Basic Trig Ratios
    - Recalls basic trigonometric ratios (sin, cos, tan) for angles 0°, 30°, 45°, 60°, 90° in degrees or 0, π/6, π/4, π/3, π/2 in radians

---

## CALCULATION

13. **mental_decimal_mul** - Decimal × Digit
    - Multiplies a decimal number (XX.X format) by a single digit, returns decimal or integer answer

14. **mental_add** - Addition
    - Addition of two 2-3 digit numbers (10-999)

15. **mental_sub** - Subtraction
    - Subtraction of two 2-3 digit numbers (100-999), ensures positive result

16. **mental_mul** - Multiplication
    - Multiplication: two-digit number (10-99) × single-digit (2-9)

17. **mental_mul_fast** - Multiplication Fast
    - Fast single-digit × single-digit multiplication

18. **mul_focus_multiples** - Multiplication (2 Digit)
    - Focuses on multiplication where one number is from curated list (12-16, 25) and the other is 1-12

19. **squares** - Squares
    - Calculates the square of a number from 2-35

20. **cubes** - Cubes
    - Calculates the cube of a number from 2-15

21. **quadratics_eval** - Quadratic Functions
    - Evaluates a quadratic expression `ax² + bx + c` at a given integer x

22. **percent_calc** - Percentages
    - Calculates a percentage (4-25%) of a given number (40-600, rounded to nearest 5)

23. **prime_factorise** - Prime Factorisation
    - Prime factorises a number from a curated pool of "nice" numbers (72-600, products of small primes)

24. **powers_mixed** - Powers of 2
    - Computes powers of 2, 4, or 8 (e.g., 2^5, 4^3, 8^2)

25. **divisibility_rules** - Divisibility Rule
    - Tests divisibility rules: given a number (100-999) and a divisor (3, 4, 6, 7, 8, 9, 11), asks if divisible (yes/no) with explanation

26. **sci_rewrite** - Scientific Notation
    - Rewrites a number in scientific notation form `a×10^n`

27. **common_multiples** - Common Multiples
    - Multiplies two-digit number (12-19) × one-digit (3-9), avoiding 19×9

28. **common_multiples_reverse** - Reversed Multiples
    - Asks for two numbers whose product equals a given number (e.g., `? × ? = N`), provides suggestions in explanation

29. **two_power_fraction** - Powers of 2 (Fraction Exponents)
    - Calculates `2^(n/2)` and expects simplified surd form (e.g., `4√2` for `2^(9/2)`)

30. **diff_speed** - Differentiate (duplicate, same as #5)
    - Same as CRAM version

31. **integrate_speed** - Integrate (duplicate, same as #6)
    - Same as CRAM version

32. **estimate_common_sqrts** - Estimate Surds
    - Estimates square root of non-perfect square (2, 3, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 17, 18, 19) to 2 decimal places, with explanation using Newton's method

---

## FRACTIONS

33. **common_frac_to_dec_2dp** - Fractions and Decimals
    - Converts fractions to decimals (2 d.p.) OR converts decimals (finite or recurring) to fractions in lowest terms

34. **friendly_frac_decimals** - Friendly Fraction ↔ Decimal (duplicate, same as #7)
    - Same as CRAM version

35. **simplify_fraction** - Simplifying fractions (duplicate, same as #8)
    - Same as CRAM version

---

## ALGEBRA

36. **factorise_quadratic** - Factorise Quadratics
    - Factorises quadratic expressions `ax² + bx + c`. Has "easy" (small coefficients) and "hard" (a=1, larger c) modes

37. **complete_square** - Complete the Square
    - Completes the square for quadratic expressions of form `x² + bx + c` (b is always even)

38. **inequalities** - Inequalities
    - Solves linear inequalities of form `ax + b < c` where a ∈ {2, 3, 4, 5, -2, -3}

39. **binomial_expand** - Binomial Expansion (duplicate, same as #9)
    - Same as CRAM version

---

## EQUATIONS

40. **speed_basic** - Speed Equation
    - Two modes: numeric (compute speed, distance, or time given two others) or formula recall (e.g., `v=?` expecting `s/t`)

41. **wave_basic** - Waves Equation
    - Two modes: numeric (compute `v`, `f`, or `λ` given others, in light (3×10⁸ m/s) or sound (340 m/s) environments) or formula recall (e.g., `v=?` expecting `fλ`)

42. **ohms_law_basic** - Ohms Law Equation
    - Two modes: numeric (compute `V`, `I`, or `R` given others) or formula recall (e.g., `V=?` expecting `IR`)

43. **suvat_solve** - SUVAT
    - Solves problems using SUVAT equations, asking for `s`, `u`, `v`, `a`, or `t` given others. Uses equations: `s=ut+0.5at²`, `v=u+at`, `v²=u²+2as`

44. **units_convert** - Units (SI)
    - Converts between km/h and m/s

45. **sphere_volume** - Sphere Volume
    - Calculates volume of sphere given radius (1-12), to 2 decimal places: `V = (4/3)πr³`

46. **circle_theorems** - Circle Theorems
    - Various circle theorem problems: angle at center is twice angle at circumference, angles in same segment, angle in semicircle is 90°, cyclic quadrilaterals, equal tangents, alternate segment theorem, intersecting chords, secants from external point, tangent-secant power theorem. Asks to find angle (θ) or length (x)

47. **sphere_area** - Sphere Surface Area
    - Calculates surface area of sphere given radius (1-15), to 2 d.p.: `A = 4πr²`

48. **cylinder_sa** - Cylinder Surface Area
    - Calculates surface area of closed cylinder given radius (1-12) and height (1-20), to 2 d.p.: `SA = 2πr(h+r)`

49. **cone_sa** - Cone Surface Area
    - Calculates surface area of cone given radius (1-15) and slant height, to 2 d.p.: `SA = πr(r+l)`

50. **square_pyramid_sa** - Square Pyramid Surface Area
    - Calculates surface area of square pyramid given base side length (2-20) and slant height (2-25), to 2 d.p.: `SA = a² + 2al`

---

## TRIGONOMETRY

51. **trig_recall_extended** - Advanced Trig Ratios
    - Extended trigonometric ratios for angles 0-360° (degrees) or 0-2π (radians), including negative values

52. **trig_eval** - Using Trig Functions
    - Computes sin, cos, or tan for angle in right triangle with Pythagorean triple sides (3-4-5, 5-12-13, 8-15-17)

53. **tri_special** - Special Triangles (duplicate, same as #10)
    - Same as CRAM version

54. **trig_inverse_recall** - Inverse Trig Ratios (duplicate, same as #11)
    - Same as CRAM version

55. **trig_recall_basic** - Basic Trig Ratios (duplicate, same as #12)
    - Same as CRAM version

---

## TOOLS

56. **flash_timer** - Flash Timer (special)
    - Special tool mode (not a question generator, but a timer feature for practice sessions)

---

## Summary Statistics

- **Total unique modes**: 41 (excluding duplicates and flash_timer tool)
- **Modes with duplicates across categories**: 7 (diff_speed, integrate_speed, friendly_frac_decimals, simplify_fraction, binomial_expand, tri_special, trig_inverse_recall, trig_recall_basic)
- **Question generation method**: All modes use programmatic generation via switch statement in App.jsx, with random number generation, pattern selection, and mathematical computation

























