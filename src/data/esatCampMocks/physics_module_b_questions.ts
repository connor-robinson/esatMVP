import type { EsatCampMockQuestion } from "./types";

/** Exact candidate + editor-key content from ESAT_Physics_Mock_Modules_A_B.docx */
export const PHYSICS_MODULE_B_QUESTIONS: EsatCampMockQuestion[] = [
  {
    number: 1,
    stem: "A solid cuboid has side lengths x, 2x and 4x and density 2500 kg m⁻³. It rests on its largest face and produces a pressure of 5000 Pa. What pressure does it produce when resting on its smallest face? (g = 10 N kg⁻¹)",
    options: {
      A: "80,000 Pa",
      B: "20,000 Pa",
      C: "1250 Pa",
      D: "5000 Pa",
      E: "10,000 Pa",
      F: "40,000 Pa"
    },
    answer: "B",
    answerText: "20,000 Pa",
    topicCode: "P5.5",
    topicName: "Pressure",
    difficulty: "3/4 Challenging",
    targetSeconds: 85,
    targetDisplay: "85 s",
    tip: "The weight is unchanged. Compare the largest and smallest face areas.",
    solution: "The largest face has area 8x² and the smallest has area 2x². The smallest area is one quarter as large, so the pressure is four times greater: 4 × 5000 = 20,000 Pa.",
    distractors: {
      A: "Uses the ratio of all three dimensions instead of the contact areas.",
      C: "Changes pressure in the same direction as area instead of inversely.",
      D: "Assumes orientation does not affect pressure.",
      E: "Uses only a factor of 2 between the face areas.",
      F: "Uses the ratio of longest to shortest side twice rather than the face-area ratio."
    },
    benchmarkNote: "NSAA 2022 Q40 and ENGAA 2023 Q8: connect cuboid geometry with pressure.",
    editorPick: false
  },
  {
    number: 2,
    stem: "A rechargeable battery stores 54 kJ of energy. It is charged from a 9.0 V supply that provides a current of 2.0 A. Only 75% of the electrical energy supplied is stored. How long does charging take?",
    options: {
      A: "50 min",
      B: "38 min",
      C: "90 min",
      D: "75 min",
      E: "60 min",
      F: "67 min"
    },
    answer: "F",
    answerText: "67 min",
    topicCode: "P1.2",
    topicName: "Electric circuits",
    difficulty: "3/4 Challenging",
    targetSeconds: 85,
    targetDisplay: "85 s",
    tip: "The stored energy is the useful output, not the electrical input.",
    solution: "Input power is VI = 9.0 × 2.0 = 18 W. The required input energy is 54,000/0.75 = 72,000 J. Time = 72,000/18 = 4000 s = 66.7 min, about 67 min.",
    distractors: {
      A: "Uses an incorrect effective power or rounds before completing the calculation.",
      B: "Multiplies the stored energy by 0.75 instead of dividing by efficiency.",
      C: "Uses current alone as power or applies efficiency twice.",
      D: "Applies the 75% efficiency directly as a time in minutes.",
      E: "Treats 54 kJ as 54,000 watt-minutes."
    },
    benchmarkNote: "ESAT Physics Guide P1.2 and NSAA circuit-energy style: link E = VIt with efficiency.",
    editorPick: false
  },
  {
    number: 3,
    stem: "A 300 kg cart starts from rest. Its distance-time graph curves smoothly to the point (4 s, 24 m), then becomes a straight line ending at (10 s, 60 m). What is the average resultant force on the cart during the first 4 s?",
    options: {
      A: "150 N",
      B: "300 N",
      C: "450 N",
      D: "600 N",
      E: "900 N",
      F: "1800 N"
    },
    answer: "C",
    answerText: "450 N",
    topicCode: "P3.1",
    topicName: "Kinematics",
    difficulty: "3/4 Challenging",
    targetSeconds: 85,
    targetDisplay: "85 s",
    tip: "The gradient of the straight section gives the speed reached at 4 s.",
    solution: "From 4 s to 10 s, the speed is the graph gradient: (60 - 24)/(10 - 4) = 6 m s⁻¹. The cart reaches this speed at 4 s. Average force = m delta v/delta t = 300 × 6/4 = 450 N.",
    distractors: {
      A: "Divides the final speed by the full 10 s interval.",
      B: "Uses the average speed 24/4 as though it were the velocity change over a longer interval.",
      D: "Uses 24/4 as the acceleration rather than the final speed.",
      E: "Uses 6 m s⁻¹ as the acceleration without dividing by time.",
      F: "Calculates momentum change but does not divide by 4 s."
    },
    benchmarkNote: "NSAA 2020 Q33: infer final speed from a distance-time graph before finding average force.",
    editorPick: true,
    diagramKey: "B3"
  },
  {
    number: 4,
    stem: "A cyclist rides directly towards a wall at 10 m s⁻¹. When 175 m from the wall, the cyclist sounds a horn. The speed of sound is 350 m s⁻¹. How long after sounding the horn does the cyclist hear the echo?",
    options: {
      A: "1.00 s",
      B: "0.94 s",
      C: "0.50 s",
      D: "2.0 s",
      E: "0.97 s",
      F: "1.03 s"
    },
    answer: "E",
    answerText: "0.97 s",
    topicCode: "P6.4",
    topicName: "Sound waves",
    difficulty: "4/4 Very challenging",
    targetSeconds: 100,
    targetDisplay: "100 s",
    tip: "Treat the outward and return journeys separately because the cyclist moves.",
    solution: "The sound reaches the wall in 175/350 = 0.50 s. The cyclist has then moved 5 m, leaving 170 m. On return, sound and cyclist approach at 350 + 10 = 360 m s⁻¹, so this takes 170/360 = 0.472 s. Total time is 0.972 s, about 0.97 s.",
    distractors: {
      A: "Assumes a stationary cyclist and simply doubles 0.50 s.",
      B: "Uses the cyclist's motion in the wrong part of the journey or rounds too early.",
      C: "Counts only the outward journey to the wall.",
      D: "Doubles the stationary round-trip time again.",
      F: "Uses a closing speed of 340 m s⁻¹ on the return journey."
    },
    benchmarkNote: "NSAA 2022 Q22 and ESAT-style kinematics: an echo with a moving listener.",
    editorPick: true,
    diagramKey: "B4"
  },
  {
    number: 5,
    stem: "Two long parallel wires carry currents upwards. The current in the right-hand wire is twice the current in the left-hand wire. Point M is halfway between them. What is the direction of the resultant magnetic field at M?",
    options: {
      A: "out of the page",
      B: "upwards",
      C: "downwards",
      D: "towards the left wire",
      E: "zero",
      F: "into the page"
    },
    answer: "A",
    answerText: "out of the page",
    topicCode: "P2.2",
    topicName: "Magnetic field due to a current",
    difficulty: "2/4 Standard",
    targetSeconds: 70,
    targetDisplay: "70 s",
    tip: "Use the right-hand grip rule for each wire separately.",
    solution: "At M, the left wire produces a field into the page. The right wire produces a field out of the page. The distances are equal, but the right-hand current is twice as large, so its out-of-page field wins.",
    distractors: {
      B: "Confuses the current direction with the field direction.",
      C: "Reverses the current direction rather than applying the grip rule.",
      D: "Treats magnetic field as pointing directly towards a current-carrying wire.",
      E: "Notices the opposing fields but ignores the unequal currents.",
      F: "Uses only the field from the left wire."
    },
    benchmarkNote: "ESAT Physics Guide P2.2 and historic ENGAA field-pattern questions.",
    editorPick: false,
    diagramKey: "B5"
  },
  {
    number: 6,
    stem: "A 0.30 kg metal block at 140 °C is placed in 0.20 kg of water at 20 °C. The final temperature is reached with no energy loss. What is the final temperature? (cmetal = 500 J kg⁻¹ °C⁻¹; cwater = 4200 J kg⁻¹ °C⁻¹)",
    options: {
      A: "80 °C",
      B: "56 °C",
      C: "44 °C",
      D: "38 °C",
      E: "32 °C",
      F: "110 °C"
    },
    answer: "D",
    answerText: "38 °C",
    topicCode: "P4.4",
    topicName: "Heat capacity",
    difficulty: "3/4 Challenging",
    targetSeconds: 90,
    targetDisplay: "90 s",
    tip: "Energy lost by the metal equals energy gained by the water.",
    solution: "Let the final temperature be T. Then 0.30 × 500(140 - T) = 0.20 × 4200(T - 20). This gives 21,000 - 150T = 840T - 16,800, so T = 38.2 °C, closest to 38 °C.",
    distractors: {
      A: "Takes the simple mean of 140 and 20 °C.",
      B: "Averages the temperatures using mass alone.",
      C: "Treats the two heat capacities as more similar than they are.",
      E: "Uses an incorrect water mass or heat-capacity ratio.",
      F: "Assumes the smaller metal block dominates the final temperature."
    },
    benchmarkNote: "NSAA 2022 Q35: calorimetry with unequal masses and specific heat capacities.",
    editorPick: false
  },
  {
    number: 7,
    stem: "A neutral atom Q has 8 protons and 9 neutrons. Which option represents a positive ion of a different isotope of the same element?",
    options: {
      A: "8 protons, 9 neutrons, 7 electrons",
      B: "9 protons, 9 neutrons, 8 electrons",
      C: "8 protons, 10 neutrons, 9 electrons",
      D: "8 protons, 8 neutrons, 8 electrons",
      E: "8 protons, 10 neutrons, 7 electrons",
      F: "7 protons, 10 neutrons, 6 electrons"
    },
    answer: "E",
    answerText: "8 protons, 10 neutrons, 7 electrons",
    topicCode: "P7.1",
    topicName: "Atomic structure",
    difficulty: "2/4 Standard",
    targetSeconds: 65,
    targetDisplay: "65 s",
    tip: "Same element means same protons. Different isotope means different neutrons. Positive means fewer electrons than protons.",
    solution: "Option B has 8 protons, so it is the same element; 10 neutrons, so it is a different isotope; and 7 electrons, so its charge is +1.",
    distractors: {
      A: "It is a positive ion of the same nuclide, not a different isotope.",
      B: "It is positive, but nine protons make it a different element.",
      C: "It is a different isotope but has one extra electron, so it is negative.",
      D: "It is a different isotope but is neutral, not a positive ion.",
      F: "It is positive and has a different neutron count, but seven protons make it a different element."
    },
    benchmarkNote: "NSAA 2020 Q22 and NSAA 2022 Q33: combine isotope identity with ionic charge.",
    editorPick: false
  },
  {
    number: 8,
    stem: "A 3.0 kg trolley moves right at 6.0 m s⁻¹ and collides with a 1.0 kg trolley moving left at 2.0 m s⁻¹. They stick together. How much kinetic energy is transferred to other forms?",
    options: {
      A: "56 J",
      B: "24 J",
      C: "40 J",
      D: "32 J",
      E: "16 J",
      F: "8 J"
    },
    answer: "B",
    answerText: "24 J",
    topicCode: "P3.6",
    topicName: "Momentum",
    difficulty: "3/4 Challenging",
    targetSeconds: 85,
    targetDisplay: "85 s",
    tip: "Use momentum to find the shared final speed before comparing kinetic energies.",
    solution: "Taking right as positive, total momentum is 3 × 6 - 1 × 2 = 16 kg m s⁻¹, so final speed is 16/4 = 4 m s⁻¹. Initial kinetic energy is 54 + 2 = 56 J; final kinetic energy is 1/2 × 4 × 4² = 32 J. The loss is 24 J.",
    distractors: {
      A: "Gives the initial kinetic energy and assumes all of it is lost.",
      C: "Uses an incorrect final speed or subtracts momenta without signs.",
      D: "Gives the final kinetic energy rather than the energy transferred.",
      E: "Gives the total momentum numerically as though it were energy.",
      F: "Uses the difference between speeds directly as an energy."
    },
    benchmarkNote: "NSAA 2020 Q32: inelastic collision followed by an energy comparison.",
    editorPick: false
  },
  {
    number: 9,
    stem: "Two identical resistors are connected in parallel across a 6.0 V battery and dissipate a total power of 12 W. One resistor is then connected alone across a 9.0 V battery for 20 s. What charge passes through it?",
    options: {
      A: "40 C",
      B: "60 C",
      C: "6 C",
      D: "12 C",
      E: "20 C",
      F: "30 C"
    },
    answer: "F",
    answerText: "30 C",
    topicCode: "P1.2",
    topicName: "Electric circuits",
    difficulty: "3/4 Challenging",
    targetSeconds: 80,
    targetDisplay: "80 s",
    tip: "The original total power is shared equally between identical parallel resistors.",
    solution: "Each resistor dissipates 6 W at 6 V, so R = V²/P = 36/6 = 6 Ω. At 9 V, I = 9/6 = 1.5 A. Thus Q = It = 1.5 × 20 = 30 C.",
    distractors: {
      A: "Uses the original total current or an incorrect resistance.",
      B: "Fails to split the original power between the two resistors.",
      C: "Uses the original power of one resistor as though it were charge.",
      D: "Uses the original total power numerically as charge.",
      E: "Assumes a current of 1 A in the second circuit."
    },
    benchmarkNote: "NSAA 2022 Q24: infer resistance from a parallel-power condition, then find charge.",
    editorPick: false
  },
  {
    number: 10,
    stem: "Air at pressure 1.00 × 10^5 Pa and density 1.20 kg m⁻³ is trapped beneath a freely moving piston. The piston has mass 40 kg and area 0.010 m². It settles slowly and the air remains at constant temperature. What is the final air density? (g = 10 N kg⁻¹)",
    options: {
      A: "0.86 kg m⁻³",
      B: "6.0 kg m⁻³",
      C: "1.68 kg m⁻³",
      D: "4.8 kg m⁻³",
      E: "1.40 kg m⁻³",
      F: "1.20 kg m⁻³"
    },
    answer: "C",
    answerText: "1.68 kg m⁻³",
    topicCode: "P5.2",
    topicName: "Ideal gases",
    difficulty: "3/4 Challenging",
    targetSeconds: 85,
    targetDisplay: "85 s",
    tip: "The final gas pressure includes atmospheric pressure as well as the piston's pressure.",
    solution: "The piston adds mg/A = 40 × 10/0.010 = 4.0 × 10⁴ Pa. Final pressure is 1.40 × 10^5 Pa. At constant temperature, density is proportional to pressure, so rho = 1.20 × 1.40 = 1.68 kg m⁻³.",
    distractors: {
      A: "Uses the inverse pressure ratio for density.",
      B: "Treats area or g as a direct density multiplier.",
      D: "Uses only the piston pressure and mishandles the atmospheric contribution.",
      E: "Uses the pressure ratio as the density itself.",
      F: "Assumes compression does not change density."
    },
    benchmarkNote: "NSAA 2022 Q38: piston equilibrium, Boyle's law and density scaling.",
    editorPick: false
  },
  {
    number: 11,
    stem: "A transverse wave travels to the right at 200 m s⁻¹. Its wavelength is 4.0 m. At t = 0, point P is at equilibrium on a section of the wave that rises as position increases. What is P's displacement 5.0 ms later if the amplitude is A?",
    options: {
      A: "-A",
      B: "between 0 and -A",
      C: "+A",
      D: "between 0 and +A",
      E: "0"
    },
    answer: "A",
    answerText: "-A",
    topicCode: "P6.1",
    topicName: "Wave properties",
    difficulty: "4/4 Very challenging",
    targetSeconds: 95,
    targetDisplay: "95 s",
    tip: "A right-moving wave shifts its existing shape to the right. Track what lies just to the left of P.",
    solution: "The period is T = λ/v = 4.0/200 = 0.020 s. Five milliseconds is T/4. Because the wave rises with position at P and travels right, P initially moves downward. After a quarter-cycle it reaches -A.",
    distractors: {
      B: "Recognises downward motion but does not use the exact quarter-period timing.",
      C: "Chooses the opposite initial motion direction.",
      D: "Moves P upward for less than a quarter-cycle.",
      E: "Assumes a point at equilibrium remains there or uses half a cycle incorrectly."
    },
    benchmarkNote: "NSAA 2022 Q32: combine the spatial wave profile, propagation direction and elapsed time.",
    editorPick: true,
    diagramKey: "B11"
  },
  {
    number: 12,
    stem: "A power station supplies 1.2 MW at 12 kV to the primary of an ideal step-up transformer. The secondary has five times as many turns as the primary and feeds transmission cables of total resistance 5.0 Ω. What power is dissipated in the cables?",
    options: {
      A: "0.40 kW",
      B: "0.08 kW",
      C: "200 kW",
      D: "2.0 kW",
      E: "50 kW",
      F: "10 kW"
    },
    answer: "D",
    answerText: "2.0 kW",
    topicCode: "P2.5",
    topicName: "Transformers",
    difficulty: "3/4 Challenging",
    targetSeconds: 90,
    targetDisplay: "90 s",
    tip: "Step up the voltage, use P = VI for cable current, then I²R for loss.",
    solution: "The transmission voltage is 5 × 12 kV = 60 kV. Current is 1.2 MW/60 kV = 20 A. Cable loss is I²R = 20² × 5.0 = 2000 W = 2.0 kW.",
    distractors: {
      A: "Calculates IR rather than I²R or misses a factor of current.",
      B: "Uses the transformed current ratio in the wrong direction and squares it again.",
      C: "Uses primary current and also mishandles the resistance or units.",
      E: "Uses the primary current of 100 A after the step-up transformer.",
      F: "Uses an incorrect cable current or treats voltage drop as power."
    },
    benchmarkNote: "ENGAA 2019 Q8 and ENGAA 2023 Q14: transformer ratio followed by transmission loss.",
    editorPick: false
  },
  {
    number: 13,
    stem: "A 500 kg rollercoaster car starts from rest 20 m above the bottom of a track. It reaches the bottom at 16 m s⁻¹ after travelling 60 m along the track. What is the average resistive force during the descent? (g = 10 N kg⁻¹)",
    options: {
      A: "300 N",
      B: "800 N",
      C: "1070 N",
      D: "1600 N",
      E: "2000 N",
      F: "600 N"
    },
    answer: "F",
    answerText: "600 N",
    topicCode: "P3.7",
    topicName: "Energy",
    difficulty: "3/4 Challenging",
    targetSeconds: 80,
    targetDisplay: "80 s",
    tip: "The energy not appearing as kinetic energy is work done against resistance.",
    solution: "The car loses mgh = 500 × 10 × 20 = 100,000 J of gravitational energy. It gains 1/2 mv² = 64,000 J of kinetic energy, so 36,000 J is dissipated. Average resistance = 36,000/60 = 600 N.",
    distractors: {
      A: "Divides by twice the track distance or uses half the dissipated energy.",
      B: "Uses the kinetic energy change alone with an incorrect distance.",
      C: "Divides the kinetic energy, rather than the dissipated energy, by 60 m.",
      D: "Uses the full gravitational energy over a shortened distance.",
      E: "Treats mgh/height as the resistance and ignores the gained kinetic energy."
    },
    benchmarkNote: "NSAA 2020 Q38 and ENGAA 2023 Q26: infer work against resistance from an energy shortfall.",
    editorPick: false
  },
  {
    number: 14,
    stem: "A radiator is below a window in a closed room. Which description gives the main convection current in the room?",
    options: {
      A: "Air moves only horizontally because warm air and cold air have equal density",
      B: "Air sinks at both the radiator and the window and meets at the floor",
      C: "Air rises at both the radiator and the window and meets at the ceiling",
      D: "Air sinks at the radiator, crosses the floor, rises at the window and returns along the ceiling",
      E: "Air rises at the radiator, crosses the ceiling, sinks at the window and returns along the floor"
    },
    answer: "E",
    answerText: "Air rises at the radiator, crosses the ceiling, sinks at the window and returns along the floor",
    topicCode: "P4.2",
    topicName: "Convection",
    difficulty: "1/4 Foundation",
    targetSeconds: 55,
    targetDisplay: "55 s",
    tip: "Heating reduces air density; cooling increases it.",
    solution: "Air heated by the radiator expands, becomes less dense and rises. It moves across the ceiling, cools near the window, becomes denser and sinks, then returns along the floor.",
    distractors: {
      A: "Temperature changes air density and therefore drives vertical flow.",
      B: "Correctly makes cooled air sink but incorrectly makes heated air sink too.",
      C: "Correctly treats the radiator but incorrectly makes cooled air rise at the window.",
      D: "Reverses both the heating and cooling density effects."
    },
    benchmarkNote: "ESAT Physics Guide P4.2: explain convection through temperature-dependent density.",
    editorPick: false,
    diagramKey: "B14"
  },
  {
    number: 15,
    stem: "Five identical resistors form two parallel branches across a battery. The top branch contains two resistors in series; the bottom branch contains three in series. A voltmeter across one top resistor reads 3.0 V. What is the battery voltage?",
    options: {
      A: "5.0 V",
      B: "6.0 V",
      C: "8.0 V",
      D: "9.0 V",
      E: "15 V",
      F: "3.0 V"
    },
    answer: "B",
    answerText: "6.0 V",
    topicCode: "P1.2",
    topicName: "Electric circuits",
    difficulty: "3/4 Challenging",
    targetSeconds: 85,
    targetDisplay: "85 s",
    tip: "Each parallel branch has the full battery voltage.",
    solution: "The two identical top resistors share that branch's voltage equally. One has 3.0 V, so the complete top branch, and therefore the battery, has 6.0 V.",
    distractors: {
      A: "Counts all five resistors as though each contributed 1 V.",
      C: "Combines branch resistor counts rather than using parallel voltage equality.",
      D: "Uses the three-resistor branch and assumes each has the same 3 V as a top resistor.",
      E: "Treats all five resistors as one series chain.",
      F: "Uses the voltage across one resistor as the battery voltage."
    },
    benchmarkNote: "ENGAA 2019 Q16 and ENGAA 2023 Q28: identical-resistor networks solved by symmetry and voltage rules.",
    editorPick: false,
    diagramKey: "B15"
  },
  {
    number: 16,
    stem: "For a spring obeying Hooke's law, a graph of stored energy E against extension squared x² passes through E = 0.040 J when x² = 16 cm². What force stretches the spring to this point?",
    options: {
      A: "2.0 N",
      B: "5.0 N",
      C: "4.0 N",
      D: "1.0 N",
      E: "0.50 N",
      F: "20 N"
    },
    answer: "A",
    answerText: "2.0 N",
    topicCode: "P3.3",
    topicName: "Force and extension",
    difficulty: "3/4 Challenging",
    targetSeconds: 80,
    targetDisplay: "80 s",
    tip: "Convert × from centimetres before using E = 1/2 kx², then use F = kx.",
    solution: "Here × = 4.0 cm = 0.040 m. From 0.040 = 1/2 k(0.040)², k = 50 N m⁻¹. Hence F = kx = 50 × 0.040 = 2.0 N.",
    distractors: {
      B: "Treats 4 cm as 4 m in one step and compensates inconsistently.",
      C: "Uses 2E/x but then doubles the force again.",
      D: "Uses E/x rather than 2E/x.",
      E: "Uses the graph gradient without accounting for the factor 1/2 or the unit conversion.",
      F: "Fails to convert cm² to m² correctly."
    },
    benchmarkNote: "ENGAA 2023 Q6: read an energy-versus-extension-squared graph and recover force.",
    editorPick: false,
    diagramKey: "B16"
  },
  {
    number: 17,
    stem: "A rider moves rapidly towards a rigid wall while sounding a horn. The rider hears the reflected sound. Compared with the sound emitted at the horn, how do the amplitude and frequency of the echo heard by the rider compare?",
    options: {
      A: "unchanged amplitude; lower frequency",
      B: "unchanged amplitude; higher frequency",
      C: "lower amplitude; higher frequency",
      D: "higher amplitude; higher frequency",
      E: "lower amplitude; lower frequency",
      F: "lower amplitude; unchanged frequency"
    },
    answer: "C",
    answerText: "lower amplitude; higher frequency",
    topicCode: "P6.2",
    topicName: "Wave behaviour",
    difficulty: "2/4 Standard",
    targetSeconds: 65,
    targetDisplay: "65 s",
    tip: "Reflection weakens the wave. Motion towards the wall compresses the arriving wavefronts.",
    solution: "Some energy is lost or spreads before the echo returns, so its amplitude is lower. The rider and wall approach one another during emission and the rider then moves towards the reflected wave, so the heard frequency is higher.",
    distractors: {
      A: "Misses the amplitude loss and reverses the frequency change.",
      B: "Gets the frequency change but assumes reflection preserves the detected amplitude.",
      D: "Gets the frequency change but assumes reflection makes the wave stronger.",
      E: "Uses the amplitude change correctly but applies the Doppler shift in the wrong direction.",
      F: "Ignores relative motion in the Doppler effect."
    },
    benchmarkNote: "NSAA 2022 Q22: combine reflection loss with the qualitative Doppler effect.",
    editorPick: false
  },
  {
    number: 18,
    stem: "A simple ac generator produces a sinusoidal output with peak voltage 6.0 V and period 20 ms. The coil's rotation speed is doubled while the magnetic field strength is halved. What are the new peak voltage and period?",
    options: {
      A: "12 V; 40 ms",
      B: "12 V; 10 ms",
      C: "6.0 V; 20 ms",
      D: "6.0 V; 10 ms",
      E: "3.0 V; 20 ms",
      F: "3.0 V; 10 ms"
    },
    answer: "D",
    answerText: "6.0 V; 10 ms",
    topicCode: "P2.4",
    topicName: "Electromagnetic induction",
    difficulty: "3/4 Challenging",
    targetSeconds: 85,
    targetDisplay: "85 s",
    tip: "Peak voltage depends on both field strength and rotation speed. Period depends only on rotation speed here.",
    solution: "Doubling speed doubles the induced peak voltage, while halving field strength halves it, so the effects cancel and the peak remains 6.0 V. Doubling rotation frequency halves the period to 10 ms.",
    distractors: {
      A: "Ignores the weaker field and changes period in the wrong direction.",
      B: "Applies the speed increase to amplitude but ignores the weaker field.",
      C: "Gets the amplitude cancellation but leaves the period unchanged.",
      E: "Ignores the faster rotation for both amplitude and period.",
      F: "Applies the halved field strength but ignores the faster rotation's effect on amplitude."
    },
    benchmarkNote: "NSAA 2022 Q36 and ESAT Guide P2.4: interpret how generator changes affect amplitude and period.",
    editorPick: true,
    diagramKey: "B18"
  },
  {
    number: 19,
    stem: "A 2.0 kW heater boils water for 5.0 minutes. During this time, 80% of the electrical energy reaches the water. What mass of water is vaporised? (specific latent heat of vaporisation = 2.4 × 10⁶ J kg⁻¹)",
    options: {
      A: "1.6 kg",
      B: "0.20 kg",
      C: "2.0 kg",
      D: "0.020 kg",
      E: "0.16 kg",
      F: "0.25 kg"
    },
    answer: "B",
    answerText: "0.20 kg",
    topicCode: "P5.3",
    topicName: "State changes",
    difficulty: "2/4 Standard",
    targetSeconds: 70,
    targetDisplay: "70 s",
    tip: "Convert minutes to seconds and use only the useful fraction of the heater energy.",
    solution: "Useful energy = 0.80 × 2000 × 300 = 480,000 J. Thus m = E/L = 480,000/(2.4 × 10⁶) = 0.20 kg.",
    distractors: {
      A: "Uses minutes as seconds or mishandles the kilo prefix.",
      C: "Drops both the efficiency factor and a power-of-ten conversion.",
      D: "Misses a factor of 10 in time, power or latent heat.",
      E: "Applies the efficiency after finding mass in the wrong direction.",
      F: "Ignores the 80% efficiency."
    },
    benchmarkNote: "NSAA 2022 Q28 and ESAT Guide P5.3: electrical input, efficiency and latent heat.",
    editorPick: false
  },
  {
    number: 20,
    stem: "A cart is pulled by a constant horizontal resultant force while ballast leaks out at a constant mass per second. Each piece of ballast leaves with the cart's horizontal velocity, so it gives no extra horizontal push. How does the cart's acceleration change as time passes?",
    options: {
      A: "It increases at a constant rate",
      B: "It decreases at a constant rate",
      C: "It decreases at an increasing rate",
      D: "It remains constant",
      E: "It increases at an increasing rate",
      F: "It increases at a decreasing rate"
    },
    answer: "E",
    answerText: "It increases at an increasing rate",
    topicCode: "P3.4",
    topicName: "Newton's laws",
    difficulty: "4/4 Very challenging",
    targetSeconds: 85,
    targetDisplay: "85 s",
    tip: "The force is constant but a = F/m, and equal mass losses matter more when little mass remains.",
    solution: "As ballast leaks, the mass decreases, so F/m increases. Removing the same mass from a smaller remaining mass produces a larger fractional change than before, so the acceleration increases at an increasing rate.",
    distractors: {
      A: "Assumes a constant mass-loss rate produces a constant acceleration increase despite the reciprocal relationship.",
      B: "Assumes acceleration follows mass directly rather than inversely.",
      C: "Reverses the effect of decreasing mass and also gives the wrong trend rate.",
      D: "Uses constant force without accounting for decreasing mass.",
      F: "Recognises increasing acceleration but gets the curvature of F/m wrong."
    },
    benchmarkNote: "NSAA 2020 Q40: constant force acting on a steadily decreasing mass, spun into a cart context.",
    editorPick: true
  },
  {
    number: 21,
    stem: "A negatively charged rod is brought close to the left side of a neutral metal sphere on an insulating stand. While the rod remains, the right side of the sphere is briefly earthed. The earth connection is removed before the rod is taken away. What is the sphere's final charge, and which way did electrons move during earthing?",
    options: {
      A: "positive; from sphere to Earth",
      B: "neutral; electrons moved both ways equally",
      C: "positive; from Earth to sphere",
      D: "negative; from sphere to Earth",
      E: "negative; from Earth to sphere",
      F: "neutral; no electrons moved"
    },
    answer: "A",
    answerText: "positive; from sphere to Earth",
    topicCode: "P1.1",
    topicName: "Electrostatics",
    difficulty: "2/4 Standard",
    targetSeconds: 65,
    targetDisplay: "65 s",
    tip: "The negative rod repels mobile electrons away from the near side of the sphere.",
    solution: "The rod pushes electrons towards the earthed side, so some leave the sphere for Earth. Removing the earth first traps an electron deficit. Once the rod is removed, the sphere remains positively charged.",
    distractors: {
      B: "Earthing permits a net electron transfer under the rod's electric influence.",
      C: "Gets the final sign but reverses the electron flow.",
      D: "Uses the correct electron-flow direction but assigns the charge sign backwards.",
      E: "Describes what a positive rod would cause rather than a negative rod.",
      F: "Ignores charge movement through the temporary earth connection."
    },
    benchmarkNote: "ESAT Physics Guide P1.1: charging a conductor by induction and earthing.",
    editorPick: false,
    diagramKey: "B21"
  },
  {
    number: 22,
    stem: "A person stands 2.0 m in front of a plane mirror. The person walks 0.75 m towards the mirror while the mirror moves 0.25 m towards the person. What is the final distance between the person and their image?",
    options: {
      A: "1.0 m",
      B: "0.50 m",
      C: "4.0 m",
      D: "3.0 m",
      E: "1.5 m",
      F: "2.0 m"
    },
    answer: "F",
    answerText: "2.0 m",
    topicCode: "P6.3",
    topicName: "Optics",
    difficulty: "2/4 Standard",
    targetSeconds: 65,
    targetDisplay: "65 s",
    tip: "The image is as far behind the mirror as the person is in front.",
    solution: "The person-mirror separation falls by 0.75 + 0.25 = 1.0 m, from 2.0 m to 1.0 m. The image is 1.0 m behind the mirror, so the person-image distance is 2.0 m.",
    distractors: {
      A: "Gives the final person-mirror separation rather than person-image separation.",
      B: "Uses only the mirror's movement as the final separation.",
      C: "Uses the initial person-image separation.",
      D: "Accounts for one movement but not the doubled mirror-image distance.",
      E: "Subtracts only the person's movement from the original separation."
    },
    benchmarkNote: "ESAT Physics Guide P6.3: plane-mirror geometry with a changing object-mirror separation.",
    editorPick: false,
    diagramKey: "B22"
  },
  {
    number: 23,
    stem: "A 0.050 kg bar can slide without friction on horizontal rails in a 0.40 T magnetic field. A 0.20 m section is perpendicular to the field. A current of 1.0 A drives it to the right for 2.0 s. The current is then reversed and reduced to 0.50 A for 4.0 s. Starting from rest, what are its final speed and total distance travelled?",
    options: {
      A: "0 m s⁻¹; 3.2 m",
      B: "0 m s⁻¹; 6.4 m",
      C: "0 m s⁻¹; 9.6 m",
      D: "3.2 m s⁻¹; 6.4 m",
      E: "3.2 m s⁻¹; 9.6 m",
      F: "6.4 m s⁻¹; 12.8 m"
    },
    answer: "C",
    answerText: "0 m s⁻¹; 9.6 m",
    topicCode: "P2.3",
    topicName: "The motor effect",
    difficulty: "4/4 Very challenging",
    targetSeconds: 105,
    targetDisplay: "105 s",
    tip: "Find each magnetic acceleration, then treat the two constant-acceleration stages separately.",
    solution: "First, F = BIL = 0.40 × 1.0 × 0.20 = 0.080 N, so a = 1.6 m s⁻². After 2.0 s, v = 3.2 m s⁻¹ and distance is 3.2 m. Reversing a 0.50 A current gives acceleration 0.80 m s⁻² left for 4.0 s, exactly bringing the bar to rest. Its average speed in this stage is 1.6 m s⁻¹, so it travels 6.4 m. Total distance is 9.6 m.",
    distractors: {
      A: "Counts only the first stage's distance.",
      B: "Counts only the second stage's distance.",
      D: "Assumes the second current causes no velocity change and undercounts distance.",
      E: "Gets the distance but not the cancellation of velocity.",
      F: "Treats the reversed current as accelerating in the original direction."
    },
    benchmarkNote: "NSAA 2020 Q30: motor force combined with a two-stage motion problem.",
    editorPick: true,
    diagramKey: "B23"
  },
  {
    number: 24,
    stem: "A parachutist is falling at terminal velocity. Immediately after the parachute opens, the drag force is greater than the parachutist's weight. Which statement describes the motion immediately after opening and later at the new terminal velocity?",
    options: {
      A: "Initially accelerates upward and speeds up; later weight is greater than drag",
      B: "Initially accelerates downward; later drag is greater than weight",
      C: "Initially stops instantly; later there is no drag",
      D: "Initially accelerates upward and slows; later drag equals weight",
      E: "Initially has zero acceleration; later drag is less than weight"
    },
    answer: "D",
    answerText: "Initially accelerates upward and slows; later drag equals weight",
    topicCode: "P3.5",
    topicName: "Mass and weight",
    difficulty: "1/4 Foundation",
    targetSeconds: 55,
    targetDisplay: "55 s",
    tip: "Acceleration follows resultant force, not necessarily velocity.",
    solution: "The parachutist is still moving downward, but the resultant force is upward, so the downward speed decreases. At the new lower terminal velocity, acceleration is zero and drag again equals weight.",
    distractors: {
      A: "An upward acceleration while moving downward makes the parachutist slow, not speed up.",
      B: "Reverses the initial resultant force and misunderstands terminal balance.",
      C: "Opening the parachute changes acceleration, not velocity instantaneously, and drag remains present.",
      E: "Drag greater than weight gives a non-zero upward resultant force."
    },
    benchmarkNote: "ESAT Physics Guide P3.5: force balance and acceleration during a terminal-speed transition.",
    editorPick: false
  },
  {
    number: 25,
    stem: "A composite conductor has two sections in series, made from the same material. Section X has length L and area 2A. Section Y has length 2L and area A. Its hot end is at 80 °C and cold end at 30 °C. At steady state, what is the temperature at the boundary between X and Y? (conduction rate is proportional to area × temperature difference / length)",
    options: {
      A: "50 °C",
      B: "70 °C",
      C: "60 °C",
      D: "75 °C",
      E: "78 °C",
      F: "40 °C"
    },
    answer: "B",
    answerText: "70 °C",
    topicCode: "P4.1",
    topicName: "Conduction",
    difficulty: "4/4 Very challenging",
    targetSeconds: 100,
    targetDisplay: "100 s",
    tip: "The same rate passes through both sections, so compare their length/area values.",
    solution: "For the same rate, temperature drop is proportional to L/A. X has relative thermal resistance L/(2A) = 0.5, while Y has 2L/A = 2, a ratio 1:4. The total 50-degree drop therefore splits 10 degrees across X and 40 degrees across Y. The boundary is 80 - 10 = 70 °C.",
    distractors: {
      A: "Splits the total temperature interval in an incorrect 3:2 ratio.",
      C: "Uses only the length ratio and ignores cross-sectional area.",
      D: "Uses an exaggerated 1:9 resistance ratio.",
      E: "Assumes almost no drop across X without applying the given proportionality.",
      F: "Places most of the temperature drop across the wider, shorter section X."
    },
    benchmarkNote: "ENGAA 2023 Q12: infer a temperature profile across materials with different conduction resistance.",
    editorPick: true,
    diagramKey: "B25"
  },
  {
    number: 26,
    stem: "The graph shows the amount of stable isotope Y in a sample as radioactive isotope X decays to Y. Initially the sample contains 60 units of X and 20 units of Y. After 6 minutes it contains 65 units of Y. What is the half-life of X?",
    options: {
      A: "6.0 min",
      B: "4.0 min",
      C: "2.0 min",
      D: "1.5 min",
      E: "3.0 min",
      F: "12 min"
    },
    answer: "E",
    answerText: "3.0 min",
    topicCode: "P7.4",
    topicName: "Half-life",
    difficulty: "3/4 Challenging",
    targetSeconds: 80,
    targetDisplay: "80 s",
    tip: "Use the increase in Y to find how much X remains.",
    solution: "Y has increased by 45 units, so X has fallen from 60 to 15 units. This is one quarter of the original amount, corresponding to two half-lives. Two half-lives take 6 minutes, so one half-life is 3.0 minutes.",
    distractors: {
      A: "Treats the full elapsed time as one half-life.",
      B: "Uses the final 15 units as though it represented a one-third fraction.",
      C: "Uses three half-lives instead of two.",
      D: "Treats four equal fractions as four half-lives.",
      F: "Doubles the elapsed time rather than dividing it between two half-lives."
    },
    benchmarkNote: "NSAA 2022 Q34 and ENGAA 2019 Q20: infer half-life from growth of a stable daughter product.",
    editorPick: false,
    diagramKey: "B26"
  },
  {
    number: 27,
    stem: "A slider of mass 0.30 kg is launched up a frictionless slope by a spring compressed 4.0 cm and reaches vertical height h. The same spring is then compressed 6.0 cm to launch a 0.20 kg slider. What maximum vertical height does the second slider reach?",
    options: {
      A: "9h/2",
      B: "27h/4",
      C: "27h/8",
      D: "9h",
      E: "3h/2",
      F: "9h/4"
    },
    answer: "C",
    answerText: "27h/8",
    topicCode: "P3.7",
    topicName: "Energy",
    difficulty: "4/4 Very challenging",
    targetSeconds: 95,
    targetDisplay: "95 s",
    tip: "Spring energy scales with compression squared, while gravitational energy scales with mass and height.",
    solution: "Since 1/2 kx² = mgh, height is proportional to x²/m. The ratio is (6/4)² × (0.30/0.20) = 9/4 × 3/2 = 27/8. The new height is 27h/8.",
    distractors: {
      A: "Uses a linear compression ratio together with the wrong mass factor.",
      B: "Squares both the compression and mass ratios.",
      D: "Uses the compression ratio and mass ratio as though both should be squared and multiplied further.",
      E: "Uses only the inverse mass ratio and ignores the changed compression.",
      F: "Uses the compression-squared ratio but ignores the lower mass."
    },
    benchmarkNote: "NSAA 2022 Q37: scale a spring launch using energy, mass and compression.",
    editorPick: true
  }
];
