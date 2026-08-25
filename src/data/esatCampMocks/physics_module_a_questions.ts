import type { EsatCampMockQuestion } from "./types";

/** Exact candidate + editor-key content from ESAT_Physics_Mock_Modules_A_B.docx */
export const PHYSICS_MODULE_A_QUESTIONS: EsatCampMockQuestion[] = [
  {
    number: 1,
    stem: "A tracking sensor draws a current of 0.30 A for the first 20 s of every minute. For the remaining 40 s, it draws 0.050 A. What total charge passes through the sensor in 10 minutes?",
    options: {
      A: "60 C",
      B: "210 C",
      C: "10 C",
      D: "16 C",
      E: "80 C",
      F: "35 C"
    },
    answer: "E",
    answerText: "80 C",
    topicCode: "P1.2",
    topicName: "Electric circuits",
    difficulty: "2/4 Standard",
    targetSeconds: 70,
    targetDisplay: "70 s",
    tip: "Find the charge used in one complete minute before multiplying by 10.",
    solution: "In one minute, Q = It = (0.30 × 20) + (0.050 × 40) = 6 + 2 = 8 C. In 10 minutes, the charge is 10 × 8 = 80 C.",
    distractors: {
      A: "Uses only the 0.30 A current for 20 s in each minute.",
      B: "Adds the currents and multiplies by 60 s, but does not respect the duty cycle.",
      C: "Uses only the 0.050 A standby current for part of the time.",
      D: "Finds 8 C per minute, then doubles it instead of multiplying by 10.",
      F: "Averages the two currents without weighting their different durations."
    },
    benchmarkNote: "NSAA 2022 Q21: short multi-unit current calculation.",
    editorPick: false
  },
  {
    number: 2,
    stem: "A robot moves 60 m east in 20 s, then 20 m west in 5 s. It remains stationary for the next 5 s. Which row gives its average speed and its average velocity over the full 30 s?",
    options: {
      A: "speed 1.3 m s⁻¹; velocity 1.3 m s⁻¹ east",
      B: "speed 2.7 m s⁻¹; velocity 1.3 m s⁻¹ east",
      C: "speed 3.2 m s⁻¹; velocity 3.2 m s⁻¹ east",
      D: "speed 3.2 m s⁻¹; velocity 1.6 m s⁻¹ east",
      E: "speed 2.7 m s⁻¹; velocity 2.7 m s⁻¹ east",
      F: "speed 2.0 m s⁻¹; velocity 1.3 m s⁻¹ east"
    },
    answer: "B",
    answerText: "speed 2.7 m s⁻¹; velocity 1.3 m s⁻¹ east",
    topicCode: "P3.1",
    topicName: "Kinematics",
    difficulty: "2/4 Standard",
    targetSeconds: 75,
    targetDisplay: "75 s",
    tip: "Average speed uses distance. Average velocity uses displacement.",
    solution: "The robot travels 80 m, so average speed = 80/30 = 2.7 m s⁻¹. Its displacement is 40 m east, so average velocity = 40/30 = 1.3 m s⁻¹ east.",
    distractors: {
      A: "Uses displacement for both averages.",
      C: "Ignores the stationary period and treats distance as displacement.",
      D: "Ignores the 5 s stationary period and mixes distance with displacement.",
      E: "Uses total distance for both speed and velocity.",
      F: "Uses the 40 m displacement but divides the total distance by an incorrect time."
    },
    benchmarkNote: "ENGAA and NSAA kinematics style: distinguish scalar and vector quantities.",
    editorPick: false
  },
  {
    number: 3,
    stem: "A 0.20 kg aluminium block is heated by a 60 W heater for 90 s. Its temperature rises by 25 °C. How much energy is transferred from the block to the surroundings during the heating? (specific heat capacity of aluminium = 900 J kg⁻¹ °C⁻¹)",
    options: {
      A: "9900 J",
      B: "90 J",
      C: "450 J",
      D: "4500 J",
      E: "5400 J",
      F: "900 J"
    },
    answer: "F",
    answerText: "900 J",
    topicCode: "P4.4",
    topicName: "Heat capacity",
    difficulty: "2/4 Standard",
    targetSeconds: 70,
    targetDisplay: "70 s",
    tip: "Compare the heater's total input with the increase in the block's thermal energy.",
    solution: "The heater supplies Pt = 60 × 90 = 5400 J. The block gains mc ΔT = 0.20 × 900 × 25 = 4500 J. The remaining 900 J is transferred to the surroundings.",
    distractors: {
      A: "Adds the input and stored energies instead of subtracting them.",
      B: "Uses the heating time as though it were an energy.",
      C: "Misses a factor of 2 in the block's temperature rise calculation.",
      D: "Gives the energy stored by the block rather than the energy lost.",
      E: "Gives the heater's total input rather than the energy lost."
    },
    benchmarkNote: "NSAA 2020 Q21: heater input compared with thermal energy gained.",
    editorPick: false
  },
  {
    number: 4,
    stem: "A small float oscillates vertically as water waves pass. The waves have amplitude 4.0 cm, frequency 2.5 Hz and wavelength 0.80 m. What is the average speed of the float over many complete oscillations?",
    options: {
      A: "0.20 m s⁻¹",
      B: "0.10 m s⁻¹",
      C: "0.40 m s⁻¹",
      D: "4.0 m s⁻¹",
      E: "2.0 m s⁻¹",
      F: "0.80 m s⁻¹"
    },
    answer: "C",
    answerText: "0.40 m s⁻¹",
    topicCode: "P6.1",
    topicName: "Wave properties",
    difficulty: "3/4 Challenging",
    targetSeconds: 80,
    targetDisplay: "80 s",
    tip: "In one cycle, the float travels four times the amplitude.",
    solution: "The float travels 4A = 16 cm = 0.16 m in each cycle. It completes 2.5 cycles per second, so its average speed is 0.16 × 2.5 = 0.40 m s⁻¹.",
    distractors: {
      A: "Uses twice the amplitude, counting only one up-and-down half of the motion.",
      B: "Uses the amplitude once per cycle instead of the full up-and-down distance.",
      D: "Multiplies the numerical amplitude in centimetres by the frequency without converting units.",
      E: "Calculates the horizontal wave speed f λ, not the float's speed.",
      F: "Uses the wavelength as the distance travelled by the float each cycle."
    },
    benchmarkNote: "ENGAA 2023 Q16: distinguish wave speed from the motion of a particle in the medium.",
    editorPick: true
  },
  {
    number: 5,
    stem: "A nucleus X has mass number 226 and atomic number 88. It decays by emitting four alpha particles and three beta-minus particles. What are the mass number and atomic number of the final nucleus?",
    options: {
      A: "mass 210; atomic number 83",
      B: "mass 210; atomic number 77",
      C: "mass 214; atomic number 83",
      D: "mass 210; atomic number 91",
      E: "mass 226; atomic number 83",
      F: "mass 214; atomic number 77"
    },
    answer: "A",
    answerText: "mass 210; atomic number 83",
    topicCode: "P7.2",
    topicName: "Radioactive decay",
    difficulty: "2/4 Standard",
    targetSeconds: 70,
    targetDisplay: "70 s",
    tip: "Each alpha changes A by -4 and Z by -2. Each beta-minus changes Z by +1 only.",
    solution: "Four alpha decays give A = 226 - 16 = 210 and Z = 88 - 8 = 80. Three beta-minus decays then give Z = 80 + 3 = 83.",
    distractors: {
      B: "Decreases the atomic number for beta-minus emission instead of increasing it.",
      C: "Subtracts only 12 from the mass number for four alpha particles.",
      D: "Applies the beta change but forgets the alpha change to atomic number.",
      E: "Changes atomic number correctly but assumes alpha emission does not change mass number.",
      F: "Uses the wrong mass change and reverses the beta-minus atomic-number change."
    },
    benchmarkNote: "ENGAA 2019 Q12 and NSAA 2020 Q25: multi-step alpha and beta decay bookkeeping.",
    editorPick: false
  },
  {
    number: 6,
    stem: "A diver seals a syringe containing ideal gas at the bottom of a lake. The gas volume is 60 cm³. At the surface, its volume is 240 cm³. The piston moves freely and the gas temperature is constant. What is the gas volume when the syringe is halfway from the surface to the bottom?",
    options: {
      A: "90 cm³",
      B: "80 cm³",
      C: "75 cm³",
      D: "96 cm³",
      E: "150 cm³",
      F: "120 cm³"
    },
    answer: "D",
    answerText: "96 cm³",
    topicCode: "P5.2",
    topicName: "Ideal gases",
    difficulty: "4/4 Very challenging",
    targetSeconds: 100,
    targetDisplay: "100 s",
    tip: "Hydrostatic pressure halves with depth, but atmospheric pressure does not.",
    solution: "At the surface the pressure is P and PV = P × 240. At the bottom, the volume is one quarter as large, so total pressure is 4P. The water contributes 3P. Halfway down it contributes 1.5P, giving total pressure 2.5P. Hence V = 240/2.5 = 96 cm³.",
    distractors: {
      A: "Treats the total pressure as varying in direct proportion to depth from zero.",
      B: "Uses a total pressure of 3P at halfway depth.",
      C: "Assumes the halfway pressure is the mean of 4P and zero rather than of the water-pressure contributions.",
      E: "Halves the pressure increase but then applies an incorrect inverse scaling.",
      F: "Simply averages the bottom and surface volumes."
    },
    benchmarkNote: "ENGAA 2023 Q20 and ENGAA 2019 Q6: ideal gas under atmospheric plus hydrostatic pressure.",
    editorPick: true
  },
  {
    number: 7,
    stem: "A metal rod of mass 0.060 kg lies on horizontal rails. A 0.15 m section carries a current of 2.5 A upwards through a uniform magnetic field of 0.80 T directed into the page. A constant resistive force of 0.10 N opposes the motion. What is the rod's initial acceleration and direction?",
    options: {
      A: "1.7 m s⁻² to the right",
      B: "3.3 m s⁻² to the right",
      C: "5.0 m s⁻² to the left",
      D: "5.0 m s⁻² to the right",
      E: "3.3 m s⁻² to the left",
      F: "1.7 m s⁻² to the left"
    },
    answer: "E",
    answerText: "3.3 m s⁻² to the left",
    topicCode: "P2.3",
    topicName: "The motor effect",
    difficulty: "3/4 Challenging",
    targetSeconds: 85,
    targetDisplay: "85 s",
    tip: "Use F = BIL, then subtract the resistive force before using F = ma.",
    solution: "The magnetic force is 0.80 × 2.5 × 0.15 = 0.30 N. The left-hand rule gives a force to the left. The resultant is 0.30 - 0.10 = 0.20 N, so a = 0.20/0.060 = 3.3 m s⁻² to the left.",
    distractors: {
      A: "Uses only the resistive force and also reverses the magnetic-force direction.",
      B: "Gets the magnitude right but reverses the left-hand-rule direction.",
      C: "Uses the magnetic force without subtracting resistance.",
      D: "Uses magnetic force alone and reverses its direction.",
      F: "Divides the resistive force alone by the mass."
    },
    benchmarkNote: "NSAA 2020 Q30 and NSAA 2022 Q21: combine F = BIL with mechanics and direction.",
    editorPick: true,
    diagramKey: "A7"
  },
  {
    number: 8,
    stem: "Blocks P and Q, of masses 2.0 kg and 3.0 kg, are in contact on a horizontal surface. A 20 N force pushes P to the right. Friction on P is 2.0 N and friction on Q is 3.0 N. What force does P exert on Q?",
    options: {
      A: "15 N",
      B: "10 N",
      C: "12 N",
      D: "9 N",
      E: "6 N",
      F: "18 N"
    },
    answer: "C",
    answerText: "12 N",
    topicCode: "P3.4",
    topicName: "Newton's laws",
    difficulty: "3/4 Challenging",
    targetSeconds: 85,
    targetDisplay: "85 s",
    tip: "Find the acceleration of both blocks, then consider Q by itself.",
    solution: "The total resultant force is 20 - 2 - 3 = 15 N on 5.0 kg, so a = 3.0 m s⁻². For Q, the contact force must provide ma plus its 3 N friction: F = 3.0 × 3.0 + 3.0 = 12 N.",
    distractors: {
      A: "Gives the resultant force on the complete two-block system.",
      B: "Splits the applied force in proportion to mass but ignores friction.",
      D: "Uses ma for Q but forgets Q's friction.",
      E: "Uses ma for P rather than analysing Q.",
      F: "Subtracts only P's friction from the applied force."
    },
    benchmarkNote: "ENGAA 2023 Q32: contact force inside an accelerating multi-block system.",
    editorPick: false,
    diagramKey: "A8"
  },
  {
    number: 9,
    stem: "A 200 Ω fixed resistor and an NTC thermistor are connected in series across a 12 V battery. A voltmeter is connected across the fixed resistor. The thermistor resistance is 400 Ω at 20 °C and 100 Ω at 80 °C. What are the voltmeter readings at these temperatures?",
    options: {
      A: "6 V at 20 °C; 8 V at 80 °C",
      B: "4 V at 20 °C; 8 V at 80 °C",
      C: "8 V at 20 °C; 4 V at 80 °C",
      D: "8 V at 20 °C; 10 V at 80 °C",
      E: "2 V at 20 °C; 4 V at 80 °C",
      F: "4 V at 20 °C; 2 V at 80 °C"
    },
    answer: "B",
    answerText: "4 V at 20 °C; 8 V at 80 °C",
    topicCode: "P1.2",
    topicName: "Electric circuits",
    difficulty: "3/4 Challenging",
    targetSeconds: 80,
    targetDisplay: "80 s",
    tip: "The fixed resistor's voltage is its fraction of the total series resistance.",
    solution: "At 20 °C, V = 12 × 200/(200 + 400) = 4 V. At 80 °C, V = 12 × 200/(200 + 100) = 8 V.",
    distractors: {
      A: "Treats the first circuit as two equal resistors.",
      C: "Assigns the thermistor's voltage to the fixed resistor at both temperatures.",
      D: "Uses an incorrect voltage split that does not add consistently to 12 V.",
      E: "Uses the thermistor's resistance fraction at one temperature and an incorrect total at the other.",
      F: "Assumes the fixed-resistor voltage falls as the thermistor resistance falls."
    },
    benchmarkNote: "NSAA 2020 Q29: thermistor characteristic embedded in a series circuit.",
    editorPick: false,
    diagramKey: "A9"
  },
  {
    number: 10,
    stem: "A motor takes an electrical input power of 5.0 kW and is 72% efficient. It lifts a 240 kg load vertically at constant speed. What is the speed of the load? (g = 10 N kg⁻¹)",
    options: {
      A: "3.6 m s⁻¹",
      B: "2.1 m s⁻¹",
      C: "1.2 m s⁻¹",
      D: "1.0 m s⁻¹",
      E: "0.75 m s⁻¹",
      F: "1.5 m s⁻¹"
    },
    answer: "F",
    answerText: "1.5 m s⁻¹",
    topicCode: "P3.7",
    topicName: "Energy",
    difficulty: "2/4 Standard",
    targetSeconds: 70,
    targetDisplay: "70 s",
    tip: "Useful power is mgv.",
    solution: "Useful power = 0.72 × 5000 = 3600 W. Since P = mgv, v = 3600/(240 × 10) = 1.5 m s⁻¹.",
    distractors: {
      A: "Treats 72% as a numerical factor of 72 rather than 0.72 in part of the calculation.",
      B: "Divides input power by the load weight and then applies efficiency in the wrong direction.",
      C: "Divides by the mass but not the weight.",
      D: "Uses a rounded useful power or an incorrect load weight.",
      E: "Applies the efficiency twice."
    },
    benchmarkNote: "ENGAA 2019 Q22 and ENGAA 2023 Q26: power, efficiency and motion in one short chain.",
    editorPick: false
  },
  {
    number: 11,
    stem: "An ultrasound probe sends a short pulse into a metal block. Reflections return from a crack after 0.12 ms and from the far surface after 0.20 ms. The speed of ultrasound in the metal is 4800 m s⁻¹. What is the distance between the crack and the far surface?",
    options: {
      A: "0.192 m",
      B: "0.384 m",
      C: "0.480 m",
      D: "0.096 m",
      E: "0.144 m",
      F: "0.288 m"
    },
    answer: "A",
    answerText: "0.192 m",
    topicCode: "P6.4",
    topicName: "Sound waves",
    difficulty: "3/4 Challenging",
    targetSeconds: 85,
    targetDisplay: "85 s",
    tip: "The time difference still represents a return journey.",
    solution: "The extra return time from crack to far surface is 0.20 - 0.12 = 0.08 ms. The one-way separation is vt/2 = 4800 × 0.000080 / 2 = 0.192 m.",
    distractors: {
      B: "Forgets that the pulse travels the separation twice.",
      C: "Uses the full far-surface return time but still applies a one-way interpretation incorrectly.",
      D: "Halves the time difference twice.",
      E: "Uses an incorrect difference of 0.06 ms.",
      F: "Uses the crack echo time rather than the difference between echoes."
    },
    benchmarkNote: "NSAA 2022 Q27 and ENGAA 2021 echo questions: infer an internal distance from reflected pulses.",
    editorPick: false,
    diagramKey: "A11"
  },
  {
    number: 12,
    stem: "Three cylindrical rods are made from the same material and connect the same hot and cold reservoirs. Rod A has length L and cross-sectional area S. Rod B has length 2L and area 3S. Rod C has length L/2 and area S/2. Which ordering gives their conduction rates from lowest to highest?",
    options: {
      A: "A = B = C",
      B: "B < C < A",
      C: "A < B < C",
      D: "A = C < B",
      E: "C < A < B",
      F: "B < A = C"
    },
    answer: "D",
    answerText: "A = C < B",
    topicCode: "P4.1",
    topicName: "Conduction",
    difficulty: "3/4 Challenging",
    targetSeconds: 80,
    targetDisplay: "80 s",
    tip: "For the same material and temperature difference, rate is proportional to area/length.",
    solution: "The relative rates are A: S/L = 1; B: 3S/(2L) = 1.5; C: (S/2)/(L/2) = 1. Therefore A and C are equal, and B is faster.",
    distractors: {
      A: "Ignores the larger area of B relative to its increase in length.",
      B: "Reverses the length effect and mishandles C's two cancelling changes.",
      C: "Assumes each geometric change independently makes the next rod faster.",
      E: "Considers C's smaller area but not its equally smaller length.",
      F: "Treats a longer rod as increasing conduction rather than reducing it."
    },
    benchmarkNote: "ENGAA 2019 Q10 and NSAA 2022 Q23: compare conduction using length, area and temperature difference.",
    editorPick: false
  },
  {
    number: 13,
    stem: "Two branches are connected in parallel across a 12 V battery. One branch contains a 6.0 Ω resistor and an ideal diode that is forward biased. The other contains a 3.0 Ω resistor and an ideal diode that is reverse biased. What is the total current supplied by the battery?",
    options: {
      A: "8 A",
      B: "0 A",
      C: "1 A",
      D: "4 A",
      E: "6 A",
      F: "2 A"
    },
    answer: "F",
    answerText: "2 A",
    topicCode: "P1.2",
    topicName: "Electric circuits",
    difficulty: "2/4 Standard",
    targetSeconds: 65,
    targetDisplay: "65 s",
    tip: "An ideal reverse-biased diode blocks its entire branch.",
    solution: "Only the 6.0 Ω branch conducts. Its current is I = V/R = 12/6.0 = 2 A.",
    distractors: {
      A: "Adds the currents that both branches would carry if both diodes conducted.",
      B: "Treats both diodes as blocking.",
      C: "Uses the two resistances as though they were in series.",
      D: "Uses only the reverse-biased 3.0 Ω branch.",
      E: "Adds the resistances numerically and mistakes the result for current."
    },
    benchmarkNote: "ENGAA 2019 Q2: diode behaviour combined with a short circuit calculation.",
    editorPick: false,
    diagramKey: "A13"
  },
  {
    number: 14,
    stem: "A sealed hollow metal object has an external volume of 100 cm³ and a mass of 540 g. It is fully submerged in water of density 1000 kg m⁻³. What is the downward resultant force on it? (g = 10 N kg⁻¹)",
    options: {
      A: "1.0 N",
      B: "0.54 N",
      C: "4.4 N",
      D: "9.0 N",
      E: "6.4 N",
      F: "5.4 N"
    },
    answer: "C",
    answerText: "4.4 N",
    topicCode: "P5.4",
    topicName: "Density",
    difficulty: "3/4 Challenging",
    targetSeconds: 85,
    targetDisplay: "85 s",
    tip: "Use the external volume for displaced water, not the volume of metal present.",
    solution: "The weight is 0.540 × 10 = 5.4 N. The displaced water has mass 1000 × 100 × 10^-6 = 0.10 kg, so upthrust is 1.0 N. The downward resultant is 5.4 - 1.0 = 4.4 N.",
    distractors: {
      A: "Gives the upthrust only.",
      B: "Converts the mass to kilograms but forgets to multiply by g correctly.",
      D: "Uses the density of the metal or a unit conversion as though it were a force.",
      E: "Adds upthrust to weight rather than subtracting it.",
      F: "Gives the object's weight and ignores upthrust."
    },
    benchmarkNote: "ENGAA 2023 Q8 and NSAA density/pressure questions: use geometry and density before a force balance.",
    editorPick: false
  },
  {
    number: 15,
    stem: "A 0.20 kg ball is moving vertically downward at 6.0 m s⁻¹ just before it strikes a bat. It leaves the bat moving vertically upward at 4.0 m s⁻¹. Contact lasts 0.10 s. What is the average upward contact force exerted by the bat? (g = 10 N kg⁻¹)",
    options: {
      A: "16 N",
      B: "18 N",
      C: "20 N",
      D: "24 N",
      E: "22 N",
      F: "40 N"
    },
    answer: "E",
    answerText: "22 N",
    topicCode: "P3.6",
    topicName: "Momentum",
    difficulty: "3/4 Challenging",
    targetSeconds: 85,
    targetDisplay: "85 s",
    tip: "Momentum gives the resultant force. The bat's contact force must also overcome weight.",
    solution: "Taking upward as positive, delta p = 0.20[4 - (-6)] = 2.0 N s. The average resultant force is 2.0/0.10 = 20 N upward. Since weight is 2 N downward, the contact force is 22 N upward.",
    distractors: {
      A: "Uses only the 4 m s⁻¹ rebound speed and then mishandles weight.",
      B: "Subtracts weight from the resultant force instead of adding it to find contact force.",
      C: "Finds the resultant force but forgets that weight also acts during contact.",
      D: "Adds weight twice or uses an incorrect momentum change.",
      F: "Treats the two speeds as separate forces and doubles the correct resultant."
    },
    benchmarkNote: "NSAA 2022 Q31: rebound momentum with weight acting during a finite contact time.",
    editorPick: true
  },
  {
    number: 16,
    stem: "An ideal transformer has 1200 turns on its 240 V primary coil and 60 turns on its secondary coil. Three identical lamps are connected in parallel across the secondary. Each lamp takes a current of 1.5 A. What current is drawn from the primary supply?",
    options: {
      A: "1.5 A",
      B: "0.225 A",
      C: "0.375 A",
      D: "0.075 A",
      E: "18 A",
      F: "4.5 A"
    },
    answer: "B",
    answerText: "0.225 A",
    topicCode: "P2.5",
    topicName: "Transformers",
    difficulty: "3/4 Challenging",
    targetSeconds: 85,
    targetDisplay: "85 s",
    tip: "First find the secondary voltage and total secondary current, then conserve power.",
    solution: "The secondary voltage is 240 × 60/1200 = 12 V. Its total current is 3 × 1.5 = 4.5 A, so output power is 54 W. For an ideal transformer, primary current = 54/240 = 0.225 A.",
    distractors: {
      A: "Uses the current of one secondary lamp as the primary current.",
      C: "Uses an incorrect turns ratio or lamp-current total.",
      D: "Uses one lamp's power but divides it across three lamps again.",
      E: "Applies the voltage ratio to current in the same direction rather than the inverse direction.",
      F: "Uses total secondary current without transforming it."
    },
    benchmarkNote: "NSAA 2020 Q27 and ENGAA 2023 Q14: ideal-transformer power across a multi-load circuit.",
    editorPick: false
  },
  {
    number: 17,
    stem: "Straight water waves pass from region X into region Y. Their wavelength changes from 6.0 cm in X to 4.0 cm in Y. The frequency is 5.0 Hz. Which row correctly gives the wave speeds and the change in direction for a ray that is not normal to the boundary?",
    options: {
      A: "X: 0.30 m s⁻¹; Y: 0.20 m s⁻¹; towards the normal",
      B: "X: 0.30 m s⁻¹; Y: 0.20 m s⁻¹; away from the normal",
      C: "X: 0.30 m s⁻¹; Y: 0.30 m s⁻¹; no change in direction",
      D: "X: 3.0 m s⁻¹; Y: 2.0 m s⁻¹; towards the normal",
      E: "X: 30 m s⁻¹; Y: 20 m s⁻¹; away from the normal",
      F: "X: 0.20 m s⁻¹; Y: 0.30 m s⁻¹; away from the normal"
    },
    answer: "A",
    answerText: "X: 0.30 m s⁻¹; Y: 0.20 m s⁻¹; towards the normal",
    topicCode: "P6.2",
    topicName: "Wave behaviour",
    difficulty: "3/4 Challenging",
    targetSeconds: 80,
    targetDisplay: "80 s",
    tip: "Frequency stays constant at the boundary. A slower wave bends towards the normal.",
    solution: "Using v = f λ, vX = 5.0 × 0.060 = 0.30 m s⁻¹ and vY = 5.0 × 0.040 = 0.20 m s⁻¹. The wave slows, so its direction bends towards the normal.",
    distractors: {
      B: "Gets both speeds right but reverses the refraction direction.",
      C: "Assumes the changed wavelength does not imply a changed speed.",
      D: "Fails to convert centimetres to metres correctly.",
      E: "Fails to convert centimetres to metres and also reverses the bending direction.",
      F: "Swaps the two wavelengths and therefore the speeds."
    },
    benchmarkNote: "NSAA 2020 Q24: connect wavefront spacing, speed and refraction direction.",
    editorPick: false,
    diagramKey: "A17"
  },
  {
    number: 18,
    stem: "Two springs with spring constants 100 N m⁻¹ and 300 N m⁻¹ are joined in series. Their combined extension is 0.40 m and both remain within their limits of proportionality. What is the total elastic energy stored?",
    options: {
      A: "12 J",
      B: "8 J",
      C: "4 J",
      D: "6 J",
      E: "2 J",
      F: "24 J"
    },
    answer: "D",
    answerText: "6 J",
    topicCode: "P3.3",
    topicName: "Force and extension",
    difficulty: "4/4 Very challenging",
    targetSeconds: 95,
    targetDisplay: "95 s",
    tip: "In series, both springs carry the same force, but their extensions are different.",
    solution: "For springs in series, 1/k = 1/100 + 1/300, so the effective spring constant is 75 N m⁻¹. The energy is 1/2 kx² = 0.5 × 75 × 0.40² = 6 J.",
    distractors: {
      A: "Uses an effective constant of 150 N m⁻¹, appropriate to neither series nor parallel.",
      B: "Uses a simple average of the two spring constants.",
      C: "Splits the extension equally despite the different spring constants.",
      E: "Uses only the stiffer spring or an incorrect shared extension.",
      F: "Adds the two spring constants as though the springs were in parallel."
    },
    benchmarkNote: "ENGAA 2023 Q40 and the 2026 ESAT Physics Guide P3.3: springs in combination and stored energy.",
    editorPick: true
  },
  {
    number: 19,
    stem: "Four identical hot metal plates are placed in identical sealed containers. Which plate loses thermal energy at the greatest initial rate?",
    options: {
      A: "A matt black plate in a vacuum",
      B: "All polished and black plates lose energy at the same rate",
      C: "A matt black plate in air",
      D: "A polished plate in a vacuum",
      E: "A polished plate in air"
    },
    answer: "C",
    answerText: "A matt black plate in air",
    topicCode: "P4.3",
    topicName: "Thermal radiation",
    difficulty: "1/4 Foundation",
    targetSeconds: 55,
    targetDisplay: "55 s",
    tip: "Compare both radiation from the surface and energy transfer through the gas.",
    solution: "A matt black surface is the best emitter of thermal radiation, while air also allows conduction and convection. The matt black plate in air therefore loses energy fastest.",
    distractors: {
      A: "Matt black emits well, but the vacuum removes conduction and convection through the gas.",
      B: "Surface finish and the presence of a gas both affect the rate of energy transfer.",
      D: "A polished surface is a poor emitter, and the vacuum removes conduction and convection.",
      E: "Air adds other transfer pathways, but the polished surface still emits less than matt black."
    },
    benchmarkNote: "NSAA 2020 Q26: combine surface finish with conduction, convection and radiation.",
    editorPick: false
  },
  {
    number: 20,
    stem: "The graph shows the current-voltage characteristic of a filament lamp. The lamp is connected in series with a 5.0 Ω resistor across a 10 V supply. What current flows?",
    options: {
      A: "2.0 A",
      B: "1.0 A",
      C: "0.60 A",
      D: "0.50 A",
      E: "0.40 A",
      F: "0.80 A"
    },
    answer: "F",
    answerText: "0.80 A",
    topicCode: "P1.2",
    topicName: "Electric circuits",
    difficulty: "4/4 Very challenging",
    targetSeconds: 100,
    targetDisplay: "100 s",
    tip: "For any trial current, the lamp voltage plus the resistor voltage must equal 10 V.",
    solution: "From the graph, at 0.80 A the lamp voltage is about 6.0 V. The resistor then has V = IR = 0.80 × 5.0 = 4.0 V. These add to the 10 V supply, so the current is 0.80 A.",
    distractors: {
      A: "Uses the series resistor alone and ignores the lamp's voltage drop.",
      B: "Assumes a convenient 5 V split, which the lamp graph does not support.",
      C: "Reads the lamp graph but does not make the two voltage drops sum to 10 V.",
      D: "Treats the lamp as though it had a constant 5 Ω resistance.",
      E: "Uses a low-current graph point without checking the series resistor's voltage."
    },
    benchmarkNote: "ENGAA 2019 Q2 and NSAA 2022 Q30: use a non-Ωic graph inside a circuit constraint.",
    editorPick: true,
    diagramKey: "A20"
  },
  {
    number: 21,
    stem: "A 0.20 kg block of ice at 0 °C is placed in 0.60 kg of water at 30 °C. No energy is transferred to the surroundings. What is the final temperature? (specific heat capacity of water = 4200 J kg⁻¹ °C⁻¹; specific latent heat of fusion of ice = 3.3 × 10^5 J kg⁻¹)",
    options: {
      A: "12 °C",
      B: "2.9 °C",
      C: "22.5 °C",
      D: "0 °C",
      E: "1.4 °C",
      F: "5.7 °C"
    },
    answer: "B",
    answerText: "2.9 °C",
    topicCode: "P5.3",
    topicName: "State changes",
    difficulty: "4/4 Very challenging",
    targetSeconds: 105,
    targetDisplay: "105 s",
    tip: "First check whether the warm water can melt all the ice.",
    solution: "Cooling the water to 0 °C releases 0.60 × 4200 × 30 = 75,600 J. Melting the ice needs 0.20 × 3.3 × 10^5 = 66,000 J, leaving 9600 J. This warms 0.80 kg of water by 9600/(0.80 × 4200) = 2.9 °C.",
    distractors: {
      A: "Ignores the latent heat needed to melt the ice.",
      C: "Averages the starting temperatures by mass and ignores latent heat.",
      D: "Assumes all available energy is used in melting without checking the surplus.",
      E: "Warms only part of the final water mass or halves the remaining energy.",
      F: "Uses only the original 0.40 kg or 0.60 kg water mass in the final warming step."
    },
    benchmarkNote: "NSAA 2022 Q35 and ESAT Guide P5.3: two-stage energy balance with a state change.",
    editorPick: true
  },
  {
    number: 22,
    stem: "Two solid spheres are made from the same material and fall through the same liquid. Sphere B has twice the radius of sphere A. At speed v, the drag is D = kr²v², where r is radius and k is constant. Upthrust may be ignored. What is the ratio of their terminal speeds vB/vA?",
    options: {
      A: "1/2",
      B: "4",
      C: "2",
      D: "1",
      E: "sqrt(2)",
      F: "1/sqrt(2)"
    },
    answer: "E",
    answerText: "sqrt(2)",
    topicCode: "P3.5",
    topicName: "Mass and weight",
    difficulty: "4/4 Very challenging",
    targetSeconds: 95,
    targetDisplay: "95 s",
    tip: "At terminal speed, drag equals weight. Remember how mass scales with radius.",
    solution: "Weight is proportional to volume, so it scales as r³. At terminal speed, kr²v² is proportional to r³, giving v² proportional to r. Doubling r therefore multiplies terminal speed by sqrt(2).",
    distractors: {
      A: "Assumes terminal speed is inversely proportional to radius.",
      B: "Uses the increase in cross-sectional area alone as the speed ratio.",
      C: "Assumes terminal speed is directly proportional to radius rather than its square root.",
      D: "Assumes the increased weight and drag area cancel completely.",
      F: "Uses the correct square-root relationship but reverses the ratio."
    },
    benchmarkNote: "NSAA 2020 Q37: derive a terminal-speed scaling from a supplied drag model.",
    editorPick: true
  },
  {
    number: 23,
    stem: "A bar magnet moves from X towards the centre of a coil at constant speed v, stops there, then returns from the centre to X at speed 2v. The first motion produces an induced pulse of peak magnitude E lasting time t. Which description fits the return pulse?",
    options: {
      A: "opposite polarity, peak 2E, duration t/2",
      B: "no return pulse",
      C: "same polarity, peak E/2, duration 2t",
      D: "same polarity, peak 2E, duration t/2",
      E: "opposite polarity, peak E/2, duration 2t",
      F: "opposite polarity, peak E, duration t"
    },
    answer: "A",
    answerText: "opposite polarity, peak 2E, duration t/2",
    topicCode: "P2.4",
    topicName: "Electromagnetic induction",
    difficulty: "3/4 Challenging",
    targetSeconds: 80,
    targetDisplay: "80 s",
    tip: "Reverse the motion for polarity. Double the speed for rate and time.",
    solution: "Moving away reverses the change in magnetic field, so the pulse polarity reverses. At twice the speed, the field changes twice as quickly, giving peak 2E, and the journey takes half as long, giving duration t/2.",
    distractors: {
      B: "An induced voltage is produced whenever the magnetic field through the coil changes.",
      C: "Reverses both speed effects and misses the polarity reversal.",
      D: "Gets the speed effects right but not the reversed polarity.",
      E: "Gets the polarity right but reverses the effects of doubling speed.",
      F: "Recognises reversed polarity but assumes speed has no effect."
    },
    benchmarkNote: "NSAA 2022 Q36: link magnet velocity, pulse polarity, magnitude and duration.",
    editorPick: false,
    diagramKey: "A23"
  },
  {
    number: 24,
    stem: "Radio wave P has wavelength 3.0 m. X-ray Q has frequency 1.0 × 10^18 Hz. Both travel through a vacuum. Which row gives speed(Q)/speed(P) and frequency(Q)/frequency(P)? (speed of light = 3.0 × 10^8 m s⁻¹)",
    options: {
      A: "10^10; 1",
      B: "1; 10⁻¹0",
      C: "3 × 10^9; 1",
      D: "1; 10^10",
      E: "1; 3 × 10^9",
      F: "10⁻¹0; 1"
    },
    answer: "D",
    answerText: "1; 10^10",
    topicCode: "P6.5",
    topicName: "Electromagnetic spectrum",
    difficulty: "2/4 Standard",
    targetSeconds: 70,
    targetDisplay: "70 s",
    tip: "All electromagnetic waves have the same vacuum speed. Find P's frequency from c/λ.",
    solution: "Both speed ratios equal 1. For P, f = 3.0 × 10^8 / 3.0 = 1.0 × 10^8 Hz. Therefore fQ/fP = 10^18/10^8 = 10^10.",
    distractors: {
      A: "Assigns the frequency ratio to the speeds.",
      B: "Inverts the frequency ratio.",
      C: "Treats the frequency calculation as a speed ratio.",
      E: "Uses the numerical speed of light divided by a power of ten incorrectly.",
      F: "Inverts the frequency ratio and also assigns it to the speeds."
    },
    benchmarkNote: "ENGAA 2019 Q4: electromagnetic-wave speed and frequency ratios across the spectrum.",
    editorPick: false
  },
  {
    number: 25,
    stem: "The velocity-time graph shows the motion of a 500 kg vehicle. Its velocity rises uniformly from 0 to 12 m s⁻¹ in 4 s, then falls uniformly to 4 m s⁻¹ at 8 s. Which row gives the total distance travelled and the average resultant force over the full 8 s?",
    options: {
      A: "32 m; 250 N",
      B: "56 m; 250 N",
      C: "56 m; 500 N",
      D: "64 m; 250 N",
      E: "56 m; 750 N",
      F: "80 m; 500 N"
    },
    answer: "B",
    answerText: "56 m; 250 N",
    topicCode: "P3.1",
    topicName: "Kinematics",
    difficulty: "3/4 Challenging",
    targetSeconds: 90,
    targetDisplay: "90 s",
    tip: "Distance is area under the graph. Average force over the whole interval uses total momentum change.",
    solution: "Distance = 1/2 × 4 × 12 + 1/2(12 + 4) × 4 = 24 + 32 = 56 m. Average force = delta p/delta t = 500(4 - 0)/8 = 250 N.",
    distractors: {
      A: "Counts only the second section's area.",
      C: "Uses an incorrect overall time of 4 s for the momentum change.",
      D: "Treats the first triangular area as a rectangle.",
      E: "Uses the initial acceleration as though it applied for all 8 s.",
      F: "Adds rectangle areas and uses an incorrect average-force interval."
    },
    benchmarkNote: "NSAA 2020 Q33: extract motion and average force from a graph.",
    editorPick: false,
    diagramKey: "A25"
  },
  {
    number: 26,
    stem: "A 12 V battery is connected to a 6.0 Ω resistor P in series with a branch containing a 6.0 Ω resistor Q. Closing a switch adds another 6.0 Ω resistor R in parallel with Q. With the switch closed, what is the total power supplied by the battery and the current in Q?",
    options: {
      A: "16 W; 1.3 A",
      B: "12 W; 1.0 A",
      C: "12 W; 0.50 A",
      D: "24 W; 1.0 A",
      E: "24 W; 0.67 A",
      F: "16 W; 0.67 A"
    },
    answer: "F",
    answerText: "16 W; 0.67 A",
    topicCode: "P1.2",
    topicName: "Electric circuits",
    difficulty: "4/4 Very challenging",
    targetSeconds: 100,
    targetDisplay: "100 s",
    tip: "The parallel pair has equal branch currents, but P carries their sum.",
    solution: "Q and R in parallel have equivalent resistance 3.0 Ω. Total resistance is 9.0 Ω, so battery current is 12/9 = 4/3 A and total power is 12 × 4/3 = 16 W. The parallel current splits equally, so IQ = 2/3 A = 0.67 A.",
    distractors: {
      A: "Fails to split the total current between Q and R.",
      B: "Uses the open-switch circuit throughout.",
      C: "Uses the open-switch power and then halves its current.",
      D: "Uses an incorrect total resistance and branch current.",
      E: "Treats all three resistors as parallel when finding total power."
    },
    benchmarkNote: "ENGAA 2023 Q4 and Q28: a switch changes a network's current and power.",
    editorPick: true,
    diagramKey: "A26"
  },
  {
    number: 27,
    stem: "A detector records 620 counts per minute from a radioactive source and background radiation. Two half-lives later it records 170 counts per minute. What is the background count rate, and what reading is expected after a further three half-lives?",
    options: {
      A: "50 cpm; 68 cpm",
      B: "100 cpm; 116 cpm",
      C: "20 cpm; 39 cpm",
      D: "150 cpm; 165 cpm",
      E: "170 cpm; 189 cpm",
      F: "20 cpm; 75 cpm"
    },
    answer: "C",
    answerText: "20 cpm; 39 cpm",
    topicCode: "P7.4",
    topicName: "Half-life",
    difficulty: "4/4 Very challenging",
    targetSeconds: 100,
    targetDisplay: "100 s",
    tip: "Background does not halve. Subtract the two readings to isolate the source change.",
    solution: "Let the initial source count be S and background be B. S + B = 620 and S/4 + B = 170, so 3S/4 = 450 and S = 600. Thus B = 20. After five half-lives in total, the reading is 600/32 + 20 = 38.75, about 39 cpm.",
    distractors: {
      A: "Uses an incorrect source-background split from the two readings.",
      B: "Assumes a simple difference between count rates gives the background.",
      D: "Treats most of the second reading as background without solving the simultaneous conditions.",
      E: "Treats the entire second reading as background.",
      F: "Finds the background correctly but applies only three half-lives in total."
    },
    benchmarkNote: "NSAA 2020 Q36: extract background count and predict a later reading.",
    editorPick: true
  }
];
