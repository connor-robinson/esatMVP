You are reviewing mid-stem diagram placement for past-paper questions.

For each question below:
1. Open **source screenshot** and compare layout to the numbered **text blocks**.
2. For every stem diagram asset (d1, d2, ...), return `insert_after_block`:
   - 0 = diagram before block 1
   - N = diagram after block N
   - {blockCount} = diagram after all text (end of stem)
3. Do not recrop. Ignore answer-choice images. Only stem diagrams listed.
4. Optional: comment if `displayWidthPct` looks too large/small (32-78% typical).

Return JSON per question:
{"questionId": 2904, "placements": [{"asset_id": "d1", "insert_after_block": 0, "confidence": 0.95}]}

# Diagram placement review: NSAA 2023 Section 1

- paper_id: 50
- diagram questions: 25
- multi-diagram questions: 1

## Slot model (read this first)

Text is split into numbered blocks (paragraphs/tables). Figures are stripped from blocks.
Your job: say which **slot** each diagram belongs in, using the **source screenshot** as ground truth.

| insert_after_block | Meaning |
| --- | --- |
| 0 | Diagram before block 1 |
| 1 | Diagram after block 1 |
| 2 | Diagram after block 2 |
| blockCount | Diagram after all blocks (end of stem) |

Example: 2 blocks, diagram between them → `insert_after_block: 1`.
Example: diagram above all text → `insert_after_block: 0`.

---

## Q5 (questionId 2904)

- blockCount: 2
- allowed insert_after_block: [0, 1, 2]
- stem diagrams: 1

### Source screenshot (layout ground truth)
Open this image and compare to the blocks below:
https://bcbttpsokwoapjypwwwq.supabase.co/storage/v1/object/public/question-images/nsaa-2023-section-1-official/q005.png

### Stem diagram crops (already cropped; do not recrop)
- **d1**, displayWidthPct=34.2
  - alt: diagram not to scale
  - crop: https://bcbttpsokwoapjypwwwq.supabase.co/storage/v1/object/public/question-images/past-papers/2904/diagram_1_daf9ecf8c2c3.png

### Numbered text blocks (figures removed)
**Block 1**
```
$WXYZ$ is a square of side length 1.
$WM: MX = 1:2$
$XN:NY=3:1$
$YP: PZ = 4:1$
```

**Block 2**
```
What is the area of triangle $MNP$?
```

### Reviewed placements
- d1: insertAfterBlock=0 (confidence=0.99)

### Placement preview (diagram markers in reading order)
```
{{diagram:d1}}

$WXYZ$ is a square of side length 1.
$WM: MX = 1:2$
$XN:NY=3:1$
$YP: PZ = 4:1$

What is the area of triangle $MNP$?
```

---

## Q23 (questionId 2922)

- blockCount: 3
- allowed insert_after_block: [0, 1, 2, 3]
- stem diagrams: 1

### Source screenshot (layout ground truth)
Open this image and compare to the blocks below:
https://bcbttpsokwoapjypwwwq.supabase.co/storage/v1/object/public/question-images/nsaa-2023-section-1-official/q023.png

### Stem diagram crops (already cropped; do not recrop)
- **d1**, displayWidthPct=32.0
  - alt: diagram not to scale
  - crop: https://bcbttpsokwoapjypwwwq.supabase.co/storage/v1/object/public/question-images/past-papers/2922/diagram_1_66d120298412.png

### Numbered text blocks (figures removed)
**Block 1**
```
A heater is connected in series with a dc power supply, a variable resistor and an ammeter in the circuit shown.
```

**Block 2**
```
The variable resistor is adjusted until the reading on the ammeter is 0.50 A and the resistance of the heater is $8.0 \Omega$.
```

**Block 3**
```
How much energy is converted to thermal energy in 5.0 minutes?
```

### Reviewed placements
- d1: insertAfterBlock=1 (confidence=0.99)

### Placement preview (diagram markers in reading order)
```
A heater is connected in series with a dc power supply, a variable resistor and an ammeter in the circuit shown.

{{diagram:d1}}

The variable resistor is adjusted until the reading on the ammeter is 0.50 A and the resistance of the heater is $8.0 \Omega$.

How much energy is converted to thermal energy in 5.0 minutes?
```

---

## Q24 (questionId 2923)

- blockCount: 4
- allowed insert_after_block: [0, 1, 2, 3, 4]
- stem diagrams: 1

### Source screenshot (layout ground truth)
Open this image and compare to the blocks below:
https://bcbttpsokwoapjypwwwq.supabase.co/storage/v1/object/public/question-images/nsaa-2023-section-1-official/q024.png

### Stem diagram crops (already cropped; do not recrop)
- **d1**, displayWidthPct=32.9
  - alt: diagram not to scale
  - crop: https://bcbttpsokwoapjypwwwq.supabase.co/storage/v1/object/public/question-images/past-papers/2923/diagram_1_c5070386d195.png

### Numbered text blocks (figures removed)
**Block 1**
```
A circuit is set up as shown. All three resistors are identical.
When the switch is open, the reading on the ammeter is $1.0\text{ A}$ and the power transferred from the battery is $1.0\text{ W}$.
```

**Block 2**
```
The switch is now closed.
```

**Block 3**
```
What is the new reading on the ammeter and what is the new power transferred from the battery?
```

**Block 4**
```
|  | ammeter reading / A | power transferred / W |
| --- | --- | --- |
| A | 0.67 | 0.67 |
| B | 0.67 | 1.3 |
| C | 0.67 | 1.5 |
| D | 0.67 | 2.0 |
| E | 1.0 | 1.0 |
| F | 1.0 | 1.5 |
| G | 1.0 | 2.0 |
| H | 1.0 | 3.0 |
```

### Reviewed placements
- d1: insertAfterBlock=1 (confidence=0.99)

### Placement preview (diagram markers in reading order)
```
A circuit is set up as shown. All three resistors are identical.
When the switch is open, the reading on the ammeter is $1.0\text{ A}$ and the power transferred from the battery is $1.0\text{ W}$.

{{diagram:d1}}

The switch is now closed.

What is the new reading on the ammeter and what is the new power transferred from the battery?

|  | ammeter reading / A | power transferred / W |
| --- | --- | --- |
| A | 0.67 | 0.67 |
| B | 0.67 | 1.3 |
| C | 0.67 | 1.5 |
| D | 0.67 | 2.0 |
| E | 1.0 | 1.0 |
| F | 1.0 | 1.5 |
| G | 1.0 | 2.0 |
| H | 1.0 | 3.0 |
```

---

## Q26 (questionId 2925)

- blockCount: 2
- allowed insert_after_block: [0, 1, 2]
- stem diagrams: 1

### Source screenshot (layout ground truth)
Open this image and compare to the blocks below:
https://bcbttpsokwoapjypwwwq.supabase.co/storage/v1/object/public/question-images/nsaa-2023-section-1-official/q026.png

### Stem diagram crops (already cropped; do not recrop)
- **d1**, displayWidthPct=32.0
  - alt: diagram not to scale
  - crop: https://bcbttpsokwoapjypwwwq.supabase.co/storage/v1/object/public/question-images/past-papers/2925/diagram_1_1721de310ce0.png

### Numbered text blocks (figures removed)
**Block 1**
```
A spring is initially unstretched. A force $F$ is used to stretch the spring. The extension $x$ and the energy $E$ stored in the stretched spring are measured for different values of $F$. The graph shows how the energy $E$, in J, varies with the extension squared, $x^2$, in cm$^2$.
```

**Block 2**
```
What is the magnitude of $F$ when the spring stores $0.015$ J of energy?
```

### Reviewed placements
- d1: insertAfterBlock=1 (confidence=0.99)

### Placement preview (diagram markers in reading order)
```
A spring is initially unstretched. A force $F$ is used to stretch the spring. The extension $x$ and the energy $E$ stored in the stretched spring are measured for different values of $F$. The graph shows how the energy $E$, in J, varies with the extension squared, $x^2$, in cm$^2$.

{{diagram:d1}}

What is the magnitude of $F$ when the spring stores $0.015$ J of energy?
```

---

## Q29 (questionId 2928)

- blockCount: 3
- allowed insert_after_block: [0, 1, 2, 3]
- stem diagrams: 2

### Source screenshot (layout ground truth)
Open this image and compare to the blocks below:
https://bcbttpsokwoapjypwwwq.supabase.co/storage/v1/object/public/question-images/nsaa-2023-section-1-official/q029.png

### Stem diagram crops (already cropped; do not recrop)
- **d1**, displayWidthPct=49.3
  - alt: diagram not to scale
  - crop: https://bcbttpsokwoapjypwwwq.supabase.co/storage/v1/object/public/question-images/past-papers/2928/diagram_1_b89073bff457.png
- **d2**, displayWidthPct=45.2
  - alt: diagram not to scale
  - crop: https://bcbttpsokwoapjypwwwq.supabase.co/storage/v1/object/public/question-images/past-papers/2928/diagram_2_30a34f21a787.png

### Numbered text blocks (figures removed)
**Block 1**
```
A ray of light is directed horizontally towards two long, plane mirrors X and Y which are both at $45^{\circ}$ to the horizontal. After two reflections the ray is travelling horizontally again.
```

**Block 2**
```
Mirror X is now rotated clockwise through less than $45^{\circ}$. After this rotation, mirror X makes an angle $\theta$ with the horizontal, where $\theta < 45^{\circ}$. The direction of the incident ray is unchanged.
```

**Block 3**
```
In what direction and through what angle should mirror Y be rotated in order for the ray to be still horizontal and travelling to the right after reflecting from mirror Y?
```

### Reviewed placements
- d1: insertAfterBlock=1 (confidence=0.99)
- d2: insertAfterBlock=2 (confidence=0.99)

### Placement preview (diagram markers in reading order)
```
A ray of light is directed horizontally towards two long, plane mirrors X and Y which are both at $45^{\circ}$ to the horizontal. After two reflections the ray is travelling horizontally again.

{{diagram:d1}}

Mirror X is now rotated clockwise through less than $45^{\circ}$. After this rotation, mirror X makes an angle $\theta$ with the horizontal, where $\theta < 45^{\circ}$. The direction of the incident ray is unchanged.

{{diagram:d2}}

In what direction and through what angle should mirror Y be rotated in order for the ray to be still horizontal and travelling to the right after reflecting from mirror Y?
```

---

## Q32 (questionId 2931)

- blockCount: 1
- allowed insert_after_block: [0, 1]
- stem diagrams: 1

### Source screenshot (layout ground truth)
Open this image and compare to the blocks below:
https://bcbttpsokwoapjypwwwq.supabase.co/storage/v1/object/public/question-images/nsaa-2023-section-1-official/q032.png

### Stem diagram crops (already cropped; do not recrop)
- **d1**, displayWidthPct=37.6
  - alt: diagram not to scale
  - crop: https://bcbttpsokwoapjypwwwq.supabase.co/storage/v1/object/public/question-images/past-papers/2931/diagram_1_d3767a16414e.png

### Numbered text blocks (figures removed)
**Block 1**
```
A large, flat, metal plate is coated on one side with a layer of thermally insulating material of the same thickness $a$ as the metal plate. The uninsulated top surface of the metal plate is maintained at a constant temperature $T_1$. The bottom surface of the insulating material is maintained at a constant, lower temperature $T_2$. The system is in equilibrium. The diagram shows this arrangement. Which graph could show how the temperature varies with distance from the top surface of the metal plate to the bottom surface of the insulating material?
```

### Reviewed placements
- d1: insertAfterBlock=1 (confidence=0.99)

### Placement preview (diagram markers in reading order)
```
A large, flat, metal plate is coated on one side with a layer of thermally insulating material of the same thickness $a$ as the metal plate. The uninsulated top surface of the metal plate is maintained at a constant temperature $T_1$. The bottom surface of the insulating material is maintained at a constant, lower temperature $T_2$. The system is in equilibrium. The diagram shows this arrangement. Which graph could show how the temperature varies with distance from the top surface of the metal plate to the bottom surface of the insulating material?

{{diagram:d1}}
```

---

## Q35 (questionId 2934)

- blockCount: 2
- allowed insert_after_block: [0, 1, 2]
- stem diagrams: 1

### Source screenshot (layout ground truth)
Open this image and compare to the blocks below:
https://bcbttpsokwoapjypwwwq.supabase.co/storage/v1/object/public/question-images/nsaa-2023-section-1-official/q035.png

### Stem diagram crops (already cropped; do not recrop)
- **d1**, displayWidthPct=44.7
  - alt: diagram not to scale
  - crop: https://bcbttpsokwoapjypwwwq.supabase.co/storage/v1/object/public/question-images/past-papers/2934/diagram_1_f9bd98267361.png

### Numbered text blocks (figures removed)
**Block 1**
```
A physicist introduces a thin piece of glass into the path of a laser beam in order to delay the beam. The light of the laser beam has a single wavelength $L$ in air.
While the beam is inside the glass it completes 10 more complete oscillations compared to the same beam passing through the same thickness of air.
The speed of light in air is $c$ and the speed of light in glass is $\frac{2}{3}c$.
```

**Block 2**
```
What is the thickness of the glass?
```

### Reviewed placements
- d1: insertAfterBlock=1 (confidence=0.99)

### Placement preview (diagram markers in reading order)
```
A physicist introduces a thin piece of glass into the path of a laser beam in order to delay the beam. The light of the laser beam has a single wavelength $L$ in air.
While the beam is inside the glass it completes 10 more complete oscillations compared to the same beam passing through the same thickness of air.
The speed of light in air is $c$ and the speed of light in glass is $\frac{2}{3}c$.

{{diagram:d1}}

What is the thickness of the glass?
```

---

## Q37 (questionId 2936)

- blockCount: 1
- allowed insert_after_block: [0, 1]
- stem diagrams: 1

### Source screenshot (layout ground truth)
Open this image and compare to the blocks below:
https://bcbttpsokwoapjypwwwq.supabase.co/storage/v1/object/public/question-images/nsaa-2023-section-1-official/q037.png

### Stem diagram crops (already cropped; do not recrop)
- **d1**, displayWidthPct=43.8
  - alt: diagram not to scale
  - crop: https://bcbttpsokwoapjypwwwq.supabase.co/storage/v1/object/public/question-images/past-papers/2936/diagram_1_f7a43220e456.png

### Numbered text blocks (figures removed)
**Block 1**
```
A copper ring, with a small gap XY, rests in a uniform horizontal magnetic field. The ring lies in the plane of the page and the direction of the magnetic field is horizontal from left to right, as shown in the diagram.
A voltage is now applied across XY, such that X is connected to the positive terminal of the power supply and Y is connected to the negative terminal.
Which statement describes the motion of the ring immediately after the voltage is applied?
(Assume that the mechanism supporting the ring allows the ring to move freely and allows the voltage to be applied continuously.)
```

### Reviewed placements
- d1: insertAfterBlock=1 (confidence=0.99)

### Placement preview (diagram markers in reading order)
```
A copper ring, with a small gap XY, rests in a uniform horizontal magnetic field. The ring lies in the plane of the page and the direction of the magnetic field is horizontal from left to right, as shown in the diagram.
A voltage is now applied across XY, such that X is connected to the positive terminal of the power supply and Y is connected to the negative terminal.
Which statement describes the motion of the ring immediately after the voltage is applied?
(Assume that the mechanism supporting the ring allows the ring to move freely and allows the voltage to be applied continuously.)

{{diagram:d1}}
```

---

## Q38 (questionId 2937)

- blockCount: 2
- allowed insert_after_block: [0, 1, 2]
- stem diagrams: 1

### Source screenshot (layout ground truth)
Open this image and compare to the blocks below:
https://bcbttpsokwoapjypwwwq.supabase.co/storage/v1/object/public/question-images/nsaa-2023-section-1-official/q038.png

### Stem diagram crops (already cropped; do not recrop)
- **d1**, displayWidthPct=32.5
  - alt: diagram not to scale
  - crop: https://bcbttpsokwoapjypwwwq.supabase.co/storage/v1/object/public/question-images/past-papers/2937/diagram_1_69e225a01c6f.png

### Numbered text blocks (figures removed)
**Block 1**
```
A battery and two resistors X and Y are connected in series.
The power transferred by the battery is 6 W.
The resistance of X is $10\ \Omega$.
The voltage across Y is 4 V.
```

**Block 2**
```
What is the current in the circuit?
```

### Reviewed placements
- d1: insertAfterBlock=1 (confidence=0.99)

### Placement preview (diagram markers in reading order)
```
A battery and two resistors X and Y are connected in series.
The power transferred by the battery is 6 W.
The resistance of X is $10\ \Omega$.
The voltage across Y is 4 V.

{{diagram:d1}}

What is the current in the circuit?
```

---

## Q43 (questionId 2942)

- blockCount: 2
- allowed insert_after_block: [0, 1, 2]
- stem diagrams: 1

### Source screenshot (layout ground truth)
Open this image and compare to the blocks below:
https://bcbttpsokwoapjypwwwq.supabase.co/storage/v1/object/public/question-images/nsaa-2023-section-1-official/q043.png

### Stem diagram crops (already cropped; do not recrop)
- **d1**, displayWidthPct=42.5
  - alt: diagram not to scale
  - crop: https://bcbttpsokwoapjypwwwq.supabase.co/storage/v1/object/public/question-images/past-papers/2942/diagram_1_eb7822b1851d.png

### Numbered text blocks (figures removed)
**Block 1**
```
The chart shows the relative abundances of the isotopes of an element.
```

**Block 2**
```
What is the relative atomic mass ($A_r$) of this element?
```

### Reviewed placements
- d1: insertAfterBlock=1 (confidence=0.99)

### Placement preview (diagram markers in reading order)
```
The chart shows the relative abundances of the isotopes of an element.

{{diagram:d1}}

What is the relative atomic mass ($A_r$) of this element?
```

---

## Q55 (questionId 2954)

- blockCount: 1
- allowed insert_after_block: [0, 1]
- stem diagrams: 1

### Source screenshot (layout ground truth)
Open this image and compare to the blocks below:
https://bcbttpsokwoapjypwwwq.supabase.co/storage/v1/object/public/question-images/nsaa-2023-section-1-official/q055.png

### Stem diagram crops (already cropped; do not recrop)
- **d1**, displayWidthPct=42.7
  - alt: diagram not to scale
  - crop: https://bcbttpsokwoapjypwwwq.supabase.co/storage/v1/object/public/question-images/past-papers/2954/diagram_1_d1f05ef3b165.png

### Numbered text blocks (figures removed)
**Block 1**
```
When methanol is burned in the apparatus shown it gives out $720 \text{ kJ mol}^{-1}$. However, only $80\%$ of the energy released is transferred into the water.
The starting temperature of the water is $12^{\circ}\text{C}$.
What mass of methanol would need to be burned to give a $60^{\circ}\text{C}$ temperature rise in the water?
($M_\text{r}$ value: methanol $= 32$. Assume that the specific heat capacity of water $= 4\text{ Jg}^{-1\circ}\text{C}^{-1}$)
```

### Reviewed placements
- d1: insertAfterBlock=1 (confidence=0.99)

### Placement preview (diagram markers in reading order)
```
When methanol is burned in the apparatus shown it gives out $720 \text{ kJ mol}^{-1}$. However, only $80\%$ of the energy released is transferred into the water.
The starting temperature of the water is $12^{\circ}\text{C}$.
What mass of methanol would need to be burned to give a $60^{\circ}\text{C}$ temperature rise in the water?
($M_\text{r}$ value: methanol $= 32$. Assume that the specific heat capacity of water $= 4\text{ Jg}^{-1\circ}\text{C}^{-1}$)

{{diagram:d1}}
```

---

## Q57 (questionId 2956)

- blockCount: 4
- allowed insert_after_block: [0, 1, 2, 3, 4]
- stem diagrams: 1

### Source screenshot (layout ground truth)
Open this image and compare to the blocks below:
https://bcbttpsokwoapjypwwwq.supabase.co/storage/v1/object/public/question-images/nsaa-2023-section-1-official/q057.png

### Stem diagram crops (already cropped; do not recrop)
- **d1**, displayWidthPct=22.0
  - alt: diagram not to scale
  - crop: https://bcbttpsokwoapjypwwwq.supabase.co/storage/v1/object/public/question-images/past-papers/2956/diagram_1_1a8f409cf027.png

### Numbered text blocks (figures removed)
**Block 1**
```
The structure of cyclohexa-1,4-diene is:
```

**Block 2**
```
Bromine is dissolved in inert organic solvent to form $0.250 \text{ mol dm}^{-3}$ of bromine solution.
```

**Block 3**
```
What is the minimum volume of this bromine solution required to react completely with $0.10 \text{ cm}^3$ of cyclohexa-1,4-diene?
```

**Block 4**
```
($M_r$ value: cyclohexa-1,4-diene = 80. Density of cyclohexa-1,4-diene = $0.84 \text{ g cm}^{-3}$)
```

### Reviewed placements
- d1: insertAfterBlock=1 (confidence=0.99), displayWidthPct=22.0

### Placement preview (diagram markers in reading order)
```
The structure of cyclohexa-1,4-diene is:

{{diagram:d1}}

Bromine is dissolved in inert organic solvent to form $0.250 \text{ mol dm}^{-3}$ of bromine solution.

What is the minimum volume of this bromine solution required to react completely with $0.10 \text{ cm}^3$ of cyclohexa-1,4-diene?

($M_r$ value: cyclohexa-1,4-diene = 80. Density of cyclohexa-1,4-diene = $0.84 \text{ g cm}^{-3}$)
```

---

## Q58 (questionId 2957)

- blockCount: 5
- allowed insert_after_block: [0, 1, 2, 3, 4, 5]
- stem diagrams: 1

### Source screenshot (layout ground truth)
Open this image and compare to the blocks below:
https://bcbttpsokwoapjypwwwq.supabase.co/storage/v1/object/public/question-images/nsaa-2023-section-1-official/q058.png

### Stem diagram crops (already cropped; do not recrop)
- **d1**, displayWidthPct=49.3
  - alt: A circuit diagram showing a voltmeter connected to two half-cells. Each half-cell contains a metal electrode (metal 1 and metal 2) immersed in a 1 mol dm^{-3} solution of its respective ions. The two solutions are connected by an inert conductor (salt bridge). Metal 1 is connected to the negative terminal of the voltmeter, and metal 2 to the positive terminal.
  - crop: https://bcbttpsokwoapjypwwwq.supabase.co/storage/v1/object/public/question-images/past-papers/2957/diagram_1_984e5a421420.png

### Numbered text blocks (figures removed)
**Block 1**
```
The relative tendency for metals to form positive ions in solution can be measured using the following apparatus:
```

**Block 2**
```
Electrons can pass from metal 1 to metal 2 via the external circuit. The difference in the tendency of the metals to form positive ions is given by the reading on the voltmeter. The higher the reading on the voltmeter the greater the \textbf{difference} in the tendency of the pair of metals to form positive ions.
```

**Block 3**
```
Results from three experiments are given in the following table.
```

**Block 4**
```
| experiment | metal 1 | metal 2 | reading on voltmeter / V |
| --- | --- | --- | --- |
| 1 | P | Q | +0.62 |
| 2 | S | Q | +0.30 |
| 3 | S | R | +1.24 |
```

**Block 5**
```
Using the information in the table, what is the order of reactivity of the four metals P, Q, R and S, from most reactive to least reactive?
```

### Reviewed placements
- d1: insertAfterBlock=1 (confidence=0.99)

### Placement preview (diagram markers in reading order)
```
The relative tendency for metals to form positive ions in solution can be measured using the following apparatus:

{{diagram:d1}}

Electrons can pass from metal 1 to metal 2 via the external circuit. The difference in the tendency of the metals to form positive ions is given by the reading on the voltmeter. The higher the reading on the voltmeter the greater the \textbf{difference} in the tendency of the pair of metals to form positive ions.

Results from three experiments are given in the following table.

| experiment | metal 1 | metal 2 | reading on voltmeter / V |
| --- | --- | --- | --- |
| 1 | P | Q | +0.62 |
| 2 | S | Q | +0.30 |
| 3 | S | R | +1.24 |

Using the information in the table, what is the order of reactivity of the four metals P, Q, R and S, from most reactive to least reactive?
```

---

## Q62 (questionId 2961)

- blockCount: 1
- allowed insert_after_block: [0, 1]
- stem diagrams: 1

### Source screenshot (layout ground truth)
Open this image and compare to the blocks below:
https://bcbttpsokwoapjypwwwq.supabase.co/storage/v1/object/public/question-images/nsaa-2023-section-1-official/q062.png

### Stem diagram crops (already cropped; do not recrop)
- **d1**, displayWidthPct=73.4
  - alt: Graph 1: rate of photosynthesis vs temperature / °C; Graph 2: mass of carbon dioxide used in the leaf vs time of day; Graph 3: rate of photosynthesis vs distance from a light source
  - crop: https://bcbttpsokwoapjypwwwq.supabase.co/storage/v1/object/public/question-images/past-papers/2961/diagram_1_5f05689b5752.png

### Numbered text blocks (figures removed)
**Block 1**
```
Which of the following graphs could describe processes taking place in the leaf of an oak tree in the presence of light?
```

### Reviewed placements
- d1: insertAfterBlock=1 (confidence=0.99)

### Placement preview (diagram markers in reading order)
```
Which of the following graphs could describe processes taking place in the leaf of an oak tree in the presence of light?

{{diagram:d1}}
```

---

## Q63 (questionId 2962)

- blockCount: 3
- allowed insert_after_block: [0, 1, 2, 3]
- stem diagrams: 1

### Source screenshot (layout ground truth)
Open this image and compare to the blocks below:
https://bcbttpsokwoapjypwwwq.supabase.co/storage/v1/object/public/question-images/nsaa-2023-section-1-official/q063.png

### Stem diagram crops (already cropped; do not recrop)
- **d1**, displayWidthPct=60.5
  - alt: Energy flow diagram showing a cow grazing on grass, with various energy transfers in kJ: 1020 kJ in breath, movement and heat loss; 3000 kJ eaten by the cow; 120 kJ to growth of cow; 1860 kJ in faeces and urine; 3520 kJ eaten by other herbivores; 14800 kJ to decomposers.
  - crop: https://bcbttpsokwoapjypwwwq.supabase.co/storage/v1/object/public/question-images/past-papers/2962/diagram_1_9d11441fa5ce.png

### Numbered text blocks (figures removed)
**Block 1**
```
The diagram shows the flow of energy in a year's growth of grass from $1 \text{ m}^2$ of grassland.
```

**Block 2**
```
Which of the following statements is/are correct?
```

**Block 3**
```
1. $62\%$ of the energy consumed by the cow is lost in faeces and urine.
2. The diagram illustrates all the main processes of carbon uptake and release in the carbon cycle.
3. $4\%$ of the energy absorbed by the cells of the cow is used for growth.
```

### Reviewed placements
- d1: insertAfterBlock=1 (confidence=0.99)

### Placement preview (diagram markers in reading order)
```
The diagram shows the flow of energy in a year's growth of grass from $1 \text{ m}^2$ of grassland.

{{diagram:d1}}

Which of the following statements is/are correct?

1. $62\%$ of the energy consumed by the cow is lost in faeces and urine.
2. The diagram illustrates all the main processes of carbon uptake and release in the carbon cycle.
3. $4\%$ of the energy absorbed by the cells of the cow is used for growth.
```

---

## Q64 (questionId 2963)

- blockCount: 1
- allowed insert_after_block: [0, 1]
- stem diagrams: 1

### Source screenshot (layout ground truth)
Open this image and compare to the blocks below:
https://bcbttpsokwoapjypwwwq.supabase.co/storage/v1/object/public/question-images/nsaa-2023-section-1-official/q064.png

### Stem diagram crops (already cropped; do not recrop)
- **d1**, displayWidthPct=57.4
  - alt: diagram not to scale
  - crop: https://bcbttpsokwoapjypwwwq.supabase.co/storage/v1/object/public/question-images/past-papers/2963/diagram_1_9f379f984cc1.png

### Numbered text blocks (figures removed)
**Block 1**
```
A Petri dish was filled with agar that had been mixed with starch. The agar is not digested by enzymes used in the experiment. Four small wells were cut in the agar. Three were filled with different solutions. Well Y was filled with water to act as a control. The dish was kept at $30^{\circ}\text{C}$ for 30 minutes. The surface of the agar was then washed with iodine solution, turning parts of it blue-black in the presence of starch. The Petri dish was placed on a piece of graph paper, as shown in the diagram, to measure the clear areas around the wells. The area of each well should be considered negligible. Which of the statements is/are correct?
1 The area of starch digested around well W is 4 times the area digested around well X.
2 Amylase could have been used in well W and protease could have been used in well X.
3 The solution put in well Z could have contained boiled enzyme.
```

### Reviewed placements
- d1: insertAfterBlock=1 (confidence=0.99)

### Placement preview (diagram markers in reading order)
```
A Petri dish was filled with agar that had been mixed with starch. The agar is not digested by enzymes used in the experiment. Four small wells were cut in the agar. Three were filled with different solutions. Well Y was filled with water to act as a control. The dish was kept at $30^{\circ}\text{C}$ for 30 minutes. The surface of the agar was then washed with iodine solution, turning parts of it blue-black in the presence of starch. The Petri dish was placed on a piece of graph paper, as shown in the diagram, to measure the clear areas around the wells. The area of each well should be considered negligible. Which of the statements is/are correct?
1 The area of starch digested around well W is 4 times the area digested around well X.
2 Amylase could have been used in well W and protease could have been used in well X.
3 The solution put in well Z could have contained boiled enzyme.

{{diagram:d1}}
```

---

## Q65 (questionId 2964)

- blockCount: 2
- allowed insert_after_block: [0, 1, 2]
- stem diagrams: 1

### Source screenshot (layout ground truth)
Open this image and compare to the blocks below:
https://bcbttpsokwoapjypwwwq.supabase.co/storage/v1/object/public/question-images/nsaa-2023-section-1-official/q065.png

### Stem diagram crops (already cropped; do not recrop)
- **d1**, displayWidthPct=57.3
  - alt: diagram not to scale
  - crop: https://bcbttpsokwoapjypwwwq.supabase.co/storage/v1/object/public/question-images/past-papers/2964/diagram_1_b35953a3c882.png

### Numbered text blocks (figures removed)
**Block 1**
```
The diagram shows a bubble potometer at the start of an experiment.
The glass tube has an internal diameter of 1 mm.
After five minutes, one end of the air bubble had moved to the 4 cm mark on the scale.
Which row is correct?
```

**Block 2**
```
|  | name of process being investigated | volume of water taken up / $\text{mm}^3$ |
| --- | --- | --- |
| A | translocation | $\pi \times (0.5)^2 \times 10$ |
| B | translocation | $\pi \times (0.5)^2 \times 15$ |
| C | translocation | $2\pi \times (0.5) \times 10$ |
| D | translocation | $2\pi \times (0.5) \times 15$ |
| E | transpiration | $\pi \times (0.5)^2 \times 10$ |
| F | transpiration | $\pi \times (0.5)^2 \times 15$ |
| G | transpiration | $2\pi \times (0.5) \times 10$ |
| H | transpiration | $2\pi \times (0.5) \times 15$ |
```

### Reviewed placements
- d1: insertAfterBlock=1 (confidence=0.99)

### Placement preview (diagram markers in reading order)
```
The diagram shows a bubble potometer at the start of an experiment.
The glass tube has an internal diameter of 1 mm.
After five minutes, one end of the air bubble had moved to the 4 cm mark on the scale.
Which row is correct?

{{diagram:d1}}

|  | name of process being investigated | volume of water taken up / $\text{mm}^3$ |
| --- | --- | --- |
| A | translocation | $\pi \times (0.5)^2 \times 10$ |
| B | translocation | $\pi \times (0.5)^2 \times 15$ |
| C | translocation | $2\pi \times (0.5) \times 10$ |
| D | translocation | $2\pi \times (0.5) \times 15$ |
| E | transpiration | $\pi \times (0.5)^2 \times 10$ |
| F | transpiration | $\pi \times (0.5)^2 \times 15$ |
| G | transpiration | $2\pi \times (0.5) \times 10$ |
| H | transpiration | $2\pi \times (0.5) \times 15$ |
```

---

## Q67 (questionId 2966)

- blockCount: 2
- allowed insert_after_block: [0, 1, 2]
- stem diagrams: 1

### Source screenshot (layout ground truth)
Open this image and compare to the blocks below:
https://bcbttpsokwoapjypwwwq.supabase.co/storage/v1/object/public/question-images/nsaa-2023-section-1-official/q067.png

### Stem diagram crops (already cropped; do not recrop)
- **d1**, displayWidthPct=32.1
  - alt: diagram not to scale
  - crop: https://bcbttpsokwoapjypwwwq.supabase.co/storage/v1/object/public/question-images/past-papers/2966/diagram_1_a095ec40d2a0.png

### Numbered text blocks (figures removed)
**Block 1**
```
A student viewed a bacterial cell using a microscope. The cell was measured with a microscope ruler as shown in the diagram. Each division on this ruler measures $2.5\ \mu\text{m}$. The student made a drawing of this cell. The drawing was $5.0\ \text{cm}$ in length and included the structures that the student expected to see. Which row of the table gives the magnification of the student's drawing and one of the structures that should be included?
```

**Block 2**
```
|  | magnification of the student's drawing | structure that should be included |
| --- | --- | --- |
| A | $2.5 \times 10^{-4}$ | cell wall |
| B | $2.5 \times 10^{-4}$ | nucleus |
| C | $4.0 \times 10^{-1}$ | cell wall |
| D | $4.0 \times 10^{-1}$ | nucleus |
| E | $4.0 \times 10^{3}$ | cell wall |
| F | $4.0 \times 10^{3}$ | nucleus |
| G | $2.0 \times 10^{4}$ | cell wall |
| H | $2.0 \times 10^{4}$ | nucleus |
```

### Reviewed placements
- d1: insertAfterBlock=1 (confidence=0.99)

### Placement preview (diagram markers in reading order)
```
A student viewed a bacterial cell using a microscope. The cell was measured with a microscope ruler as shown in the diagram. Each division on this ruler measures $2.5\ \mu\text{m}$. The student made a drawing of this cell. The drawing was $5.0\ \text{cm}$ in length and included the structures that the student expected to see. Which row of the table gives the magnification of the student's drawing and one of the structures that should be included?

{{diagram:d1}}

|  | magnification of the student's drawing | structure that should be included |
| --- | --- | --- |
| A | $2.5 \times 10^{-4}$ | cell wall |
| B | $2.5 \times 10^{-4}$ | nucleus |
| C | $4.0 \times 10^{-1}$ | cell wall |
| D | $4.0 \times 10^{-1}$ | nucleus |
| E | $4.0 \times 10^{3}$ | cell wall |
| F | $4.0 \times 10^{3}$ | nucleus |
| G | $2.0 \times 10^{4}$ | cell wall |
| H | $2.0 \times 10^{4}$ | nucleus |
```

---

## Q70 (questionId 2969)

- blockCount: 3
- allowed insert_after_block: [0, 1, 2, 3]
- stem diagrams: 1

### Source screenshot (layout ground truth)
Open this image and compare to the blocks below:
https://bcbttpsokwoapjypwwwq.supabase.co/storage/v1/object/public/question-images/nsaa-2023-section-1-official/q070.png

### Stem diagram crops (already cropped; do not recrop)
- **d1**, displayWidthPct=73.4
  - alt: Legend: '-' indicates a negative feedback loop; '+' indicates a loop in which an ovarian hormone stimulates the release of a second hormone from the pituitary gland. Flowchart shows hypothalamus, gonadotrophin-releasing hormone (GnRH), anterior pituitary, hormone 1, hormone 2, ovarian follicle, ovarian corpus luteum, hormone 3, hormone 4, and their interconnections with feedback loops.
  - crop: https://bcbttpsokwoapjypwwwq.supabase.co/storage/v1/object/public/question-images/past-papers/2969/diagram_1_9eea923b860a.png

### Numbered text blocks (figures removed)
**Block 1**
```
The diagram shows a flow chart representing the hormonal activity associated with the menstrual cycle.
```

**Block 2**
```
Which of the following statements about the menstrual cycle is/are correct?
```

**Block 3**
```
1 Hormone 1 stimulates follicle maturation and the release of hormone 3 from the ovarian follicle.
2 Hormone 4 maintains the uterus lining.
3 At the end of the menstrual cycle the levels of hormone 1 and hormone 2 will reach their highest point and then decrease, leading to menstruation.
```

### Reviewed placements
- d1: insertAfterBlock=1 (confidence=0.99)

### Placement preview (diagram markers in reading order)
```
The diagram shows a flow chart representing the hormonal activity associated with the menstrual cycle.

{{diagram:d1}}

Which of the following statements about the menstrual cycle is/are correct?

1 Hormone 1 stimulates follicle maturation and the release of hormone 3 from the ovarian follicle.
2 Hormone 4 maintains the uterus lining.
3 At the end of the menstrual cycle the levels of hormone 1 and hormone 2 will reach their highest point and then decrease, leading to menstruation.
```

---

## Q71 (questionId 2970)

- blockCount: 1
- allowed insert_after_block: [0, 1]
- stem diagrams: 1

### Source screenshot (layout ground truth)
Open this image and compare to the blocks below:
https://bcbttpsokwoapjypwwwq.supabase.co/storage/v1/object/public/question-images/nsaa-2023-section-1-official/q071.png

### Stem diagram crops (already cropped; do not recrop)
- **d1**, displayWidthPct=78.2
  - alt: diagram not to scale
  - crop: https://bcbttpsokwoapjypwwwq.supabase.co/storage/v1/object/public/question-images/past-papers/2970/diagram_1_48f0ea72a8fe.png

### Numbered text blocks (figures removed)
**Block 1**
```
A scientist was investigating the effect of substrate concentration on lipase enzyme activity. Two test tubes were set up: one containing a sample of full-fat milk mixed with an alkaline solution, and a pH indicator; one containing lipase. The pH indicator turned the alkaline milk sample pink. Both tubes were incubated in a water bath set to an optimum temperature for lipase until the contents had reached this temperature. The scientist then added the lipase to the tube with the milk sample and measured the time taken for the indicator to turn colourless. This colour change was caused by an increase in concentration of one of the products of the reaction. Further samples of the milk were diluted, and added to the same quantity of alkaline solution and pH indicator, to produce another six different substrate concentrations, and the experiment was repeated. All other variables were kept constant. The scientist found that each substrate concentration caused the pH indicator to change to colourless in a different length of time. The results of the reaction in all seven tubes were plotted on a graph. Which option correctly identifies the shape of the graph of the results, the limiting factor during the experiment and an explanation for the change in colour of the pH indicator?
```

### Reviewed placements
- d1: insertAfterBlock=1 (confidence=0.97)

### Placement preview (diagram markers in reading order)
```
A scientist was investigating the effect of substrate concentration on lipase enzyme activity. Two test tubes were set up: one containing a sample of full-fat milk mixed with an alkaline solution, and a pH indicator; one containing lipase. The pH indicator turned the alkaline milk sample pink. Both tubes were incubated in a water bath set to an optimum temperature for lipase until the contents had reached this temperature. The scientist then added the lipase to the tube with the milk sample and measured the time taken for the indicator to turn colourless. This colour change was caused by an increase in concentration of one of the products of the reaction. Further samples of the milk were diluted, and added to the same quantity of alkaline solution and pH indicator, to produce another six different substrate concentrations, and the experiment was repeated. All other variables were kept constant. The scientist found that each substrate concentration caused the pH indicator to change to colourless in a different length of time. The results of the reaction in all seven tubes were plotted on a graph. Which option correctly identifies the shape of the graph of the results, the limiting factor during the experiment and an explanation for the change in colour of the pH indicator?

{{diagram:d1}}
```

---

## Q72 (questionId 2971)

- blockCount: 3
- allowed insert_after_block: [0, 1, 2, 3]
- stem diagrams: 1

### Source screenshot (layout ground truth)
Open this image and compare to the blocks below:
https://bcbttpsokwoapjypwwwq.supabase.co/storage/v1/object/public/question-images/nsaa-2023-section-1-official/q072.png

### Stem diagram crops (already cropped; do not recrop)
- **d1**, displayWidthPct=74.7
  - alt: Key\nglucose\nethanol\nyeast\nconcentration of\nglucose or ethanol\n/\text{g}\ \text{dm}^{-3}\nconcentration of yeast\n/ arbitrary units\ntime/hours
  - crop: https://bcbttpsokwoapjypwwwq.supabase.co/storage/v1/object/public/question-images/past-papers/2971/diagram_1_a72221de7753.png

### Numbered text blocks (figures removed)
**Block 1**
```
Even when sufficient oxygen is available, yeast will respire anaerobically using glucose as a substrate. However, if its source of glucose runs out and oxygen is available, yeast can switch to using ethanol as a substrate, which it uses to respire aerobically.
A sample of yeast was added to 100\ \text{cm}^3 glucose solution in an open flask.
The contents of the flask were monitored over 32 hours and the results are shown in the graph.
```

**Block 2**
```
Which of the following statements are correct?
```

**Block 3**
```
1 Carbon dioxide would be produced in the flask at all times throughout the observation period, regardless of whether the yeast was respiring aerobically or anaerobically.
2 The yeast was respiring using ethanol as the only substrate for 22 hours.
3 The yeast started respiring anaerobically from the start of the observation period.
4 The yeast used an average of 4 g glucose per hour for the first 10 hours.
```

### Reviewed placements
- d1: insertAfterBlock=1 (confidence=0.99)

### Placement preview (diagram markers in reading order)
```
Even when sufficient oxygen is available, yeast will respire anaerobically using glucose as a substrate. However, if its source of glucose runs out and oxygen is available, yeast can switch to using ethanol as a substrate, which it uses to respire aerobically.
A sample of yeast was added to 100\ \text{cm}^3 glucose solution in an open flask.
The contents of the flask were monitored over 32 hours and the results are shown in the graph.

{{diagram:d1}}

Which of the following statements are correct?

1 Carbon dioxide would be produced in the flask at all times throughout the observation period, regardless of whether the yeast was respiring aerobically or anaerobically.
2 The yeast was respiring using ethanol as the only substrate for 22 hours.
3 The yeast started respiring anaerobically from the start of the observation period.
4 The yeast used an average of 4 g glucose per hour for the first 10 hours.
```

---

## Q73 (questionId 2972)

- blockCount: 1
- allowed insert_after_block: [0, 1]
- stem diagrams: 1

### Source screenshot (layout ground truth)
Open this image and compare to the blocks below:
https://bcbttpsokwoapjypwwwq.supabase.co/storage/v1/object/public/question-images/nsaa-2023-section-1-official/q073.png

### Stem diagram crops (already cropped; do not recrop)
- **d1**, displayWidthPct=52.8
  - alt: A diagram showing a part of the carbon cycle with several numbered arrows representing processes between different reservoirs, one of which is labeled 'plants'.
  - crop: https://bcbttpsokwoapjypwwwq.supabase.co/storage/v1/object/public/question-images/past-papers/2972/diagram_1_d51f27833feb.png

### Numbered text blocks (figures removed)
**Block 1**
```
The diagram represents part of the carbon cycle.
Which of the arrows represent processes resulting in at least one organic product (contains carbon and hydrogen)?
```

### Reviewed placements
- d1: insertAfterBlock=1 (confidence=0.99)

### Placement preview (diagram markers in reading order)
```
The diagram represents part of the carbon cycle.
Which of the arrows represent processes resulting in at least one organic product (contains carbon and hydrogen)?

{{diagram:d1}}
```

---

## Q74 (questionId 2973)

- blockCount: 3
- allowed insert_after_block: [0, 1, 2, 3]
- stem diagrams: 1

### Source screenshot (layout ground truth)
Open this image and compare to the blocks below:
https://bcbttpsokwoapjypwwwq.supabase.co/storage/v1/object/public/question-images/nsaa-2023-section-1-official/q074.png

### Stem diagram crops (already cropped; do not recrop)
- **d1**, displayWidthPct=47.9
  - alt: Graph showing percentage change in mass versus concentration of sodium chloride.
  - crop: https://bcbttpsokwoapjypwwwq.supabase.co/storage/v1/object/public/question-images/past-papers/2973/diagram_1_d21d14802b00.png

### Numbered text blocks (figures removed)
**Block 1**
```
In an experiment, 8 identical cubes of potato were each weighed and placed in a different test tube. Each of the test tubes contained a different concentration of sodium chloride solution. All other conditions were kept the same throughout the experiment. After 30 minutes, the potato cubes were removed from the test tubes and weighed, and the percentage change in mass was calculated.
```

**Block 2**
```
Which of the following statements is/are correct?
```

**Block 3**
```
1 The initial concentration of sodium chloride inside the potato cubes must be $0.3 \text{ mol dm}^{-3}$.
2 Osmosis involves the diffusion of water molecules from a solution of high solute concentration to one of low solute concentration.
3 In this experiment, the rate of osmosis is fastest at a sodium chloride concentration of $0.8 \text{ mol dm}^{-3}$.
```

### Reviewed placements
- d1: insertAfterBlock=1 (confidence=0.99)

### Placement preview (diagram markers in reading order)
```
In an experiment, 8 identical cubes of potato were each weighed and placed in a different test tube. Each of the test tubes contained a different concentration of sodium chloride solution. All other conditions were kept the same throughout the experiment. After 30 minutes, the potato cubes were removed from the test tubes and weighed, and the percentage change in mass was calculated.

{{diagram:d1}}

Which of the following statements is/are correct?

1 The initial concentration of sodium chloride inside the potato cubes must be $0.3 \text{ mol dm}^{-3}$.
2 Osmosis involves the diffusion of water molecules from a solution of high solute concentration to one of low solute concentration.
3 In this experiment, the rate of osmosis is fastest at a sodium chloride concentration of $0.8 \text{ mol dm}^{-3}$.
```

---

## Q76 (questionId 2975)

- blockCount: 3
- allowed insert_after_block: [0, 1, 2, 3]
- stem diagrams: 1

### Source screenshot (layout ground truth)
Open this image and compare to the blocks below:
https://bcbttpsokwoapjypwwwq.supabase.co/storage/v1/object/public/question-images/nsaa-2023-section-1-official/q076.png

### Stem diagram crops (already cropped; do not recrop)
- **d1**, displayWidthPct=67.3
  - alt: diagram not to scale
  - crop: https://bcbttpsokwoapjypwwwq.supabase.co/storage/v1/object/public/question-images/past-papers/2975/diagram_1_6ef468289923.png

### Numbered text blocks (figures removed)
**Block 1**
```
The family tree shows the inheritance of an autosomal recessive genetic condition.
```

**Block 2**
```
Which of the following statements is/are correct for this family?
```

**Block 3**
```
1 If one cheek cell is collected from each individual, the overall ratio of X chromosomes to Y chromosomes will be $3.67:1$
2 The probability of individual 2 and individual 3 having the same alleles on their X chromosomes is $100\%$.
3 The probability of individual 2 and individual 3 having the same genotype for the condition is $50\%$.
(Assume no mutations.)
```

### Reviewed placements
- d1: insertAfterBlock=1 (confidence=0.99)

### Placement preview (diagram markers in reading order)
```
The family tree shows the inheritance of an autosomal recessive genetic condition.

{{diagram:d1}}

Which of the following statements is/are correct for this family?

1 If one cheek cell is collected from each individual, the overall ratio of X chromosomes to Y chromosomes will be $3.67:1$
2 The probability of individual 2 and individual 3 having the same alleles on their X chromosomes is $100\%$.
3 The probability of individual 2 and individual 3 having the same genotype for the condition is $50\%$.
(Assume no mutations.)
```

---

## Q78 (questionId 2977)

- blockCount: 3
- allowed insert_after_block: [0, 1, 2, 3]
- stem diagrams: 1

### Source screenshot (layout ground truth)
Open this image and compare to the blocks below:
https://bcbttpsokwoapjypwwwq.supabase.co/storage/v1/object/public/question-images/nsaa-2023-section-1-official/q078.png

### Stem diagram crops (already cropped; do not recrop)
- **d1**, displayWidthPct=75.0
  - alt: diagram not to scale
  - crop: https://bcbttpsokwoapjypwwwq.supabase.co/storage/v1/object/public/question-images/past-papers/2977/diagram_1_b21444ccafad.png

### Numbered text blocks (figures removed)
**Block 1**
```
The graph shows the change in the pressure in the space X between the wall of the thorax and the lungs (as shown in the diagram) during one complete breathing cycle.
```

**Block 2**
```
Which of the following statements is/are correct?
```

**Block 3**
```
1 The person is breathing out between 0 and 1.5 seconds.
2 The diaphragm is relaxing between 2 and 3 seconds.
3 The rate of breathing is 15 breaths per minute.
(Assume the person continues breathing at the same rate.)
```

### Reviewed placements
- d1: insertAfterBlock=1 (confidence=0.99)

### Placement preview (diagram markers in reading order)
```
The graph shows the change in the pressure in the space X between the wall of the thorax and the lungs (as shown in the diagram) during one complete breathing cycle.

{{diagram:d1}}

Which of the following statements is/are correct?

1 The person is breathing out between 0 and 1.5 seconds.
2 The diaphragm is relaxing between 2 and 3 seconds.
3 The rate of breathing is 15 breaths per minute.
(Assume the person continues breathing at the same rate.)
```

---
