# ESAT Mathematics 1 Calibration v2

An original 15-question calibration set designed for a first ESAT Camp interaction.

## Assessment shape

- 15 questions
- 19 minutes 45 seconds of target solving time; present to students as about 20 minutes
- No calculator
- 4 accessible, 7 medium, 4 difficult
- All seven official Mathematics 1 headings represented
- 8 deterministic Python/Matplotlib diagrams
- Correct-answer positions: `CEBADFCAEBDFACE`

## Question map

| Q | Internal title | Main heading | Difficulty | Target | Visual | Answer |
|---:|---|---|---|---:|:---:|:---:|
| 1 | Circle inside a midpoint square | Geometry | Accessible | 70 s | Yes | C |
| 2 | Time-lapse storage | Units | Accessible | 45 s | No | E |
| 3 | Light beam through a parabolic arch | Algebra | Medium | 85 s | Yes | B |
| 4 | Changing a light mixture | Ratio and proportion | Accessible | 50 s | No | A |
| 5 | Prime total from two spinners | Probability | Medium | 75 s | Yes | D |
| 6 | 3D-printer filament mass | Units | Accessible | 75 s | No | F |
| 7 | Hidden reciprocal cube | Algebra | Difficult | 95 s | No | C |
| 8 | Drone lap-time statistics | Statistics | Medium | 70 s | No | A |
| 9 | Tangent and equal chords | Geometry | Medium | 80 s | Yes | E |
| 10 | Conjugate surd without expansion | Number | Medium | 65 s | No | B |
| 11 | Larger sculpture, lighter material | Ratio and proportion | Difficult | 100 s | No | D |
| 12 | Growing light wall | Algebra | Medium | 80 s | Yes | F |
| 13 | Which box was chosen? | Probability | Difficult | 95 s | Yes | A |
| 14 | Perpendicular drone route | Geometry | Medium | 85 s | Yes | C |
| 15 | Shortest route over a cuboid | Geometry | Difficult | 115 s | Yes | E |

## Files

- `questions.json`: implementation source of truth, including content, options, solutions, diagnostics, and semantic visual specifications.
- `CURSOR_IMPLEMENTATION_PROMPT.md`: paste-ready instructions for integrating the test into the existing application and visual engine.
- `render_reference_diagrams.py`: deterministic reference renderer.
- `diagram_previews/`: eight visual acceptance references.
- `validate_content.py`: independent structural and mathematical checks.
- `diagram-contact-sheet.png`: quick review of every visual.

## Local verification

```bash
python3 validate_content.py
python3 render_reference_diagrams.py
```

The content validator must print:

```text
PASS: structure, 15 independent answers, and 8 reference diagrams validated.
```

The supplied difficulty labels are design targets rather than empirical item parameters. Keep the assessment version on every attempt and recalibrate the score mapping once enough real response-time and accuracy data have been collected.
