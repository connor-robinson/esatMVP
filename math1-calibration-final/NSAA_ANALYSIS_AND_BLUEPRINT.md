# NSAA analysis and final calibration blueprint

## Evidence base

This blueprint uses the official UAT-UK archive of the 2021, 2022 and 2023 NSAA Section 1 papers. Each paper contains 20 Part A Mathematics questions. Topic labels below are editorial because many questions combine two areas.

Official sources:

- https://esat-tmua.ac.uk/esat-preparation-materials/
- https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/05/07120532/NSAA_2021_S1_QuestionPaper.pdf
- https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/05/07120525/NSAA_2022_S1_QuestionPaper.pdf
- https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/05/07120523/NSAA_2023_S1_QuestionPaper.pdf

## Observed topic distribution

| Primary area | Questions among 60 | Approximate share | Design implication |
|---|---:|---:|---|
| M1 Units and rates | 3 | 5% | Include one compact rate item, not a long conversion chain. |
| M2 Number | 6 | 10% | Include one exact-number/surd observation. |
| M3 Ratio and proportion | 8 | 13% | Include a same-time percentage comparison; rate item also supplies secondary evidence. |
| M4 Algebra | 18 | 30% | Make algebra the largest group, but prefer rearrangement, identities and structural graph conditions over expansion. |
| M5 Geometry and trigonometry | 18 | 30% | Make geometry the joint-largest group and use it for most diagrams. |
| M6 Statistics | 2 | 3% | Omit from a 15-question calibration rather than force a low-value histogram or routine mean question. |
| M7 Probability | 5 | 8% | Include one systematic-counting item and one high-ceiling conditional item. |

## Observed question-writing pattern

The most useful NSAA mechanisms are:

1. A familiar fact is hidden inside an unfamiliar arrangement.
2. The stem is short; complexity comes from selecting the right relationship.
3. Most successful solutions take two to five lines.
4. Diagrams are sparse, black-and-white, explicitly not to scale, and carry exact labels rather than decorative context.
5. Difficulty is mixed rather than strictly increasing.
6. Strong distractors usually correspond to one recognisable wrong turn.
7. Several hard-looking questions collapse after an identity, symmetry, scale or repeated-root observation.

## Final distribution

| Area | Count | Question numbers |
|---|---:|---|
| M1 Units and rates | 1 | 10 |
| M2 Number | 1 | 2 |
| M3 Ratio and proportion | 1 | 14 |
| M4 Algebra | 5 | 3, 6, 7, 8, 13 |
| M5 Geometry | 5 | 1, 5, 9, 12, 15 |
| M6 Statistics | 0 | - |
| M7 Probability | 2 | 4, 11 |

Secondary tags allow Questions 10 and 14 to contribute additional ratio/rate evidence.

## Difficulty and discrimination

| Tier | Count | Questions | Purpose |
|---|---:|---|---|
| Accessible | 4 | 1, 2, 4, 10 | Establish fundamentals and detect students who are not yet ready for timed ESAT work. |
| Medium | 7 | 3, 5, 6, 8, 9, 12, 14 | Main calibration range; separate method selection from routine school fluency. |
| Difficult | 4 | 7, 11, 13, 15 | Separate strong and exceptional students through pattern, conditional reasoning, identity and geometry. |

The paper alternates difficulty rather than forming a simple staircase. Total target time is 1195 seconds, leaving five seconds of interface margin in a 20-minute session.

## Question provenance map

| Final item | Main mechanism | Historic comparison |
|---|---|---|
| 1 | Exact area in a square construction | NSAA 2023 A5 |
| 2 | Exact-number recognition | NSAA 2021 A13; 2023 A2 |
| 3 | Multi-symbol subject rearrangement | NSAA 2021 A3; 2023 A3 |
| 4 | Random subset satisfying a number property | NSAA 2022 A17 |
| 5 | Triangle from side-division ratios | NSAA 2023 A5 |
| 6 | Graph condition becomes discriminant condition | NSAA 2021 A11; 2022 A14 |
| 7 | Spatial number pattern controlled by squares | NSAA 2021 A8 |
| 8 | Complete the square inside an exponential | NSAA 2023 A16 |
| 9 | Circle theorem after one triangle deduction | NSAA 2021 A14 |
| 10 | Rate combined with a non-additive ratio | NSAA 2023 A11; 2021 A18 |
| 11 | Counter transfer with reverse inference | NSAA 2023 A20 |
| 12 | Exact comparison under a shared scale | NSAA 2021 A16; 2022 A18 |
| 13 | Transform the target before using supplied information | NSAA 2021 A6 |
| 14 | Same-time distance comparison | NSAA 2021 A18 |
| 15 | Linked right triangles reveal an exact length | NSAA 2021 A9 |

These are mechanism references for internal review. Do not show them to students or market the questions as official NSAA material.

## Scoring design

Raw score alone is too coarse for 15 questions. The package includes provisional item difficulty (`b`) and discrimination (`a`) values. `score_model_reference.ts` uses a stabilised 3-parameter item-response estimate:

- The chance floor is `1 / optionCount`.
- The student's latent ability is estimated from the complete right/wrong pattern.
- A normal prior prevents extreme estimates from a small sample.
- The provisional mapping anchors the intended cohort median to 4.5 and its 90th percentile to 7.0.
- The UI shows an estimated range and raw score, never a purported official score.
- At least 12 answered questions are required.
- Timing produces separate pace feedback and never changes the score.

This model is suitable for launch but not permanent calibration. After at least 200 serious completions, refit item parameters. A defensible link to the actual ESAT scale requires matched official results or another external anchor.

