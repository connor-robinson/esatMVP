import type { EsatPracticePack } from "./types";

export const esatMaths1Practice: EsatPracticePack = {
  "schemaVersion": 1,
  "exam": "ESAT Mathematics 1",
  "contentSpecification": "October 2026 and January 2027",
  "rendering": {
    "notation": "MathJax",
    "inlineDelimiters": [
      [
        "\\(",
        "\\)"
      ]
    ],
    "displayDelimiters": [
      [
        "\\[",
        "\\]"
      ]
    ]
  },
  "sources": [
    {
      "title": "UAT-UK ESAT Content Specification for October 2026 and January 2027",
      "url": "https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/05/03165424/ESAT_Content_Specification.pdf"
    },
    {
      "title": "UAT-UK preparation guidance",
      "url": "https://esat-tmua.ac.uk/prepare/"
    },
    {
      "title": "Pearson VUE official ESAT specimen and sample tests",
      "url": "https://www.pearsonvue.com/us/en/uatuk.html"
    },
    {
      "title": "UAT-UK ESAT guide and past-paper archive",
      "url": "https://esat-tmua.ac.uk/esat-preparation-materials/"
    },
    {
      "title": "NSAA 2023 Section 1 question paper",
      "url": "https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/05/07120523/NSAA_2023_S1_QuestionPaper.pdf"
    },
    {
      "title": "NSAA 2023 Section 1 answer key",
      "url": "https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/05/07120531/NSAA_2023_S1_AnswerKey.pdf"
    },
    {
      "title": "NSAA 2022 Section 1 question paper",
      "url": "https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/05/07120525/NSAA_2022_S1_QuestionPaper.pdf"
    },
    {
      "title": "NSAA 2022 Section 1 answer key",
      "url": "https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/05/07120531/NSAA_2022_S1_AnswerKey.pdf"
    },
    {
      "title": "ENGAA 2018 Section 1 question paper",
      "url": "https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/05/07113017/ENGAA_2018_S1_QuestionPaper.pdf"
    },
    {
      "title": "ENGAA 2018 Section 1 answer key",
      "url": "https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/05/07113023/ENGAA_2018_S1_AnswerKey.pdf"
    }
  ],
  "modules": [
    {
      "id": "esat-maths1-practice-module-1",
      "moduleNumber": 1,
      "title": "ESAT Mathematics 1 Practice Module 1",
      "timeLimitSeconds": 2400,
      "calculatorAllowed": false,
      "questions": [
        {
          "id": "esat-m1-module-1-q01",
          "number": 1,
          "difficulty": "medium",
          "syllabus": {
            "code": "M1.2",
            "topic": "Units"
          },
          "estimatedSeconds": 60,
          "strongQuestion": false,
          "content": "A pump transfers 0.72 \\(m^{3}\\) of water in 8 minutes at a constant rate. What is the rate in litres per second?",
          "plainText": "A pump transfers 0.72 m³ of water in 8 minutes at a constant rate. What is the rate in litres per second?",
          "options": [
            {
              "id": "A",
              "content": "0.0015 L/s",
              "plainText": "0.0015 L/s",
              "distractorReason": "Finds 0.0015 m³/s but leaves the numerical value unchanged when relabelling it in litres."
            },
            {
              "id": "B",
              "content": "0.09 L/s",
              "plainText": "0.09 L/s",
              "distractorReason": "Calculates 0.72 / 8 and labels the result L/s."
            },
            {
              "id": "C",
              "content": "0.15 L/s",
              "plainText": "0.15 L/s",
              "distractorReason": "Uses 72 litres instead of 720 litres."
            },
            {
              "id": "D",
              "content": "1.5 L/s",
              "plainText": "1.5 L/s",
              "distractorReason": null
            },
            {
              "id": "E",
              "content": "9 L/s",
              "plainText": "9 L/s",
              "distractorReason": "Uses 80 seconds for 8 minutes."
            },
            {
              "id": "F",
              "content": "90 L/s",
              "plainText": "90 L/s",
              "distractorReason": "Divides 720 litres by 8 but forgets that the time is in minutes."
            }
          ],
          "correctOption": "D",
          "authorNotes": {
            "solution": "0.72 \\(m^{3}\\) = 720 litres and 8 minutes = 480 seconds. The rate is \\(\\frac{720}{480}\\) = 1.5 L/s.",
            "solutionPlainText": "0.72 m³ = 720 litres and 8 minutes = 480 seconds. The rate is 720 / 480 = 1.5 L/s.",
            "tip": "Convert both units before dividing.",
            "calibration": "NSAA 2023, Part A, Q11: short multi-stage rate calculation."
          }
        },
        {
          "id": "esat-m1-module-1-q02",
          "number": 2,
          "difficulty": "medium",
          "syllabus": {
            "code": "M2.9",
            "topic": "Number"
          },
          "estimatedSeconds": 75,
          "strongQuestion": false,
          "content": "Which fraction is equal to 0.2777...?",
          "plainText": "Which fraction is equal to 0.2777...?",
          "options": [
            {
              "id": "A",
              "content": "\\(\\frac{1}{4}\\)",
              "plainText": "1/4",
              "distractorReason": "Rounds the decimal to a familiar quarter."
            },
            {
              "id": "B",
              "content": "\\(\\frac{5}{18}\\)",
              "plainText": "5/18",
              "distractorReason": null
            },
            {
              "id": "C",
              "content": "\\(\\frac{7}{25}\\)",
              "plainText": "7/25",
              "distractorReason": "Rounds 0.2777... to 0.28 before converting."
            },
            {
              "id": "D",
              "content": "\\(\\frac{7}{27}\\)",
              "plainText": "7/27",
              "distractorReason": "Places the recurring digit over 27 without accounting for the non-recurring 2."
            },
            {
              "id": "E",
              "content": "\\(\\frac{25}{99}\\)",
              "plainText": "25/99",
              "distractorReason": "Treats both displayed digits as a two-digit recurring block."
            },
            {
              "id": "F",
              "content": "\\(\\frac{7}{20}\\)",
              "plainText": "7/20",
              "distractorReason": "Uses an incorrect denominator after multiplying by 10."
            }
          ],
          "correctOption": "B",
          "authorNotes": {
            "solution": "Let x = 0.2777.... Then 10x = 2.7777.... Subtracting gives 9x = 2.5, so x = 2.\\(\\frac{5}{9}\\) = \\(\\frac{5}{18}\\).",
            "solutionPlainText": "Let x = 0.2777.... Then 10x = 2.7777.... Subtracting gives 9x = 2.5, so x = 2.5 / 9 = 5/18.",
            "tip": "Shift until the recurring parts line up, then subtract.",
            "calibration": "NSAA 2023, Part A, Q2: rapid testing of numerical equivalence."
          }
        },
        {
          "id": "esat-m1-module-1-q03",
          "number": 3,
          "difficulty": "medium",
          "syllabus": {
            "code": "M2.3",
            "topic": "Number"
          },
          "estimatedSeconds": 60,
          "strongQuestion": false,
          "content": "Two warning lights flash together at 12:00:00. One flashes every 18 seconds and the other every 24 seconds. From 12:00:00 up to and including 12:06:00, how many times do they flash together?",
          "plainText": "Two warning lights flash together at 12:00:00. One flashes every 18 seconds and the other every 24 seconds. From 12:00:00 up to and including 12:06:00, how many times do they flash together?",
          "options": [
            {
              "id": "A",
              "content": "1",
              "plainText": "1",
              "distractorReason": "Counts only the initial flash."
            },
            {
              "id": "B",
              "content": "2",
              "plainText": "2",
              "distractorReason": "Uses a common interval that is too large."
            },
            {
              "id": "C",
              "content": "3",
              "plainText": "3",
              "distractorReason": "Uses 120 seconds as the common interval."
            },
            {
              "id": "D",
              "content": "4",
              "plainText": "4",
              "distractorReason": "Counts only the flashes strictly between the endpoints."
            },
            {
              "id": "E",
              "content": "5",
              "plainText": "5",
              "distractorReason": "Finds five 72-second intervals but forgets the initial flash."
            },
            {
              "id": "F",
              "content": "6",
              "plainText": "6",
              "distractorReason": null
            }
          ],
          "correctOption": "F",
          "authorNotes": {
            "solution": "The lowest common multiple of 18 and 24 is 72 seconds. In 360 seconds the common flashes occur at 0, 72, 144, 216, 288 and 360 seconds, giving 6 flashes.",
            "solutionPlainText": "The lowest common multiple of 18 and 24 is 72 seconds. In 360 seconds the common flashes occur at 0, 72, 144, 216, 288 and 360 seconds, giving 6 flashes.",
            "tip": "Check whether the starting and ending instants are included.",
            "calibration": "Official ESAT Mathematics 1 specimen: broader verified short number-structure style; no close archive item."
          }
        },
        {
          "id": "esat-m1-module-1-q04",
          "number": 4,
          "difficulty": "easy",
          "syllabus": {
            "code": "M2.7",
            "topic": "Number"
          },
          "estimatedSeconds": 45,
          "strongQuestion": false,
          "content": "What is the value of 27^(\\(\\frac{2}{3}\\)) × 9^(\\(\\frac{-1}{2}\\))?",
          "plainText": "What is the value of 27^(2/3) × 9^(-1/2)?",
          "options": [
            {
              "id": "A",
              "content": "3",
              "plainText": "3",
              "distractorReason": null
            },
            {
              "id": "B",
              "content": "\\(\\frac{1}{3}\\)",
              "plainText": "1/3",
              "distractorReason": "Applies the reciprocal to the whole product."
            },
            {
              "id": "C",
              "content": "1",
              "plainText": "1",
              "distractorReason": "Cancels the two bases as if they were equal."
            },
            {
              "id": "D",
              "content": "9",
              "plainText": "9",
              "distractorReason": "Treats 9^(-1/2) as 1."
            },
            {
              "id": "E",
              "content": "\\(\\sqrt{3}\\)",
              "plainText": "√3",
              "distractorReason": "Takes only one of the required roots."
            }
          ],
          "correctOption": "A",
          "authorNotes": {
            "solution": "27^(\\(\\frac{2}{3}\\)) = (cube root of 27)² = 9, while 9^(\\(\\frac{-1}{2}\\)) = \\(\\frac{1}{3}\\). Their product is 3.",
            "solutionPlainText": "27^(2/3) = (cube root of 27)² = 9, while 9^(-1/2) = 1/3. Their product is 3.",
            "tip": "Interpret a fractional power as a root and a negative power as a reciprocal.",
            "calibration": "NSAA 2022, Part A, Q1: fractional-index simplification."
          }
        },
        {
          "id": "esat-m1-module-1-q05",
          "number": 5,
          "difficulty": "hard",
          "syllabus": {
            "code": "M2.12",
            "topic": "Number"
          },
          "estimatedSeconds": 90,
          "strongQuestion": true,
          "content": "The length and width of a rectangle are measured as 7.2 cm and 3.0 cm, each to the nearest 0.1 cm. What is the upper bound for its area?",
          "plainText": "The length and width of a rectangle are measured as 7.2 cm and 3.0 cm, each to the nearest 0.1 cm. What is the upper bound for its area?",
          "options": [
            {
              "id": "A",
              "content": "21.6 cm²",
              "plainText": "21.6 cm²",
              "distractorReason": "Multiplies the stated measurements rather than their bounds."
            },
            {
              "id": "B",
              "content": "21.0925 cm²",
              "plainText": "21.0925 cm²",
              "distractorReason": "Uses both lower bounds: 7.15 × 2.95."
            },
            {
              "id": "C",
              "content": "21.75 cm²",
              "plainText": "21.75 cm²",
              "distractorReason": "Uses the upper length but the stated width."
            },
            {
              "id": "D",
              "content": "21.96 cm²",
              "plainText": "21.96 cm²",
              "distractorReason": "Uses the stated length but the upper width."
            },
            {
              "id": "E",
              "content": "22.1125 cm²",
              "plainText": "22.1125 cm²",
              "distractorReason": null
            },
            {
              "id": "F",
              "content": "22.5 cm²",
              "plainText": "22.5 cm²",
              "distractorReason": "Treats rounding to 0.1 cm as allowing an extra 0.5 cm."
            }
          ],
          "correctOption": "E",
          "authorNotes": {
            "solution": "The upper bounds are 7.25 cm and 3.05 cm. Their product is 7.25 × 3.05 = 22.1125 cm².",
            "solutionPlainText": "The upper bounds are 7.25 cm and 3.05 cm. Their product is 7.25 × 3.05 = 22.1125 cm².",
            "tip": "For a positive product, use both upper bounds.",
            "calibration": "Official ESAT Mathematics 1 specimen: broader verified numerical-accuracy style; no close archive item."
          }
        },
        {
          "id": "esat-m1-module-1-q06",
          "number": 6,
          "difficulty": "medium",
          "syllabus": {
            "code": "M3.5",
            "topic": "Ratio and proportion"
          },
          "estimatedSeconds": 75,
          "strongQuestion": true,
          "content": "A drink contains syrup and water in the ratio 2:7. After 6 litres of water are added, the ratio is 1:5. What was the original volume of the drink?",
          "plainText": "A drink contains syrup and water in the ratio 2:7. After 6 litres of water are added, the ratio is 1:5. What was the original volume of the drink?",
          "options": [
            {
              "id": "A",
              "content": "4 litres",
              "plainText": "4 litres",
              "distractorReason": "Gives the original amount of syrup only."
            },
            {
              "id": "B",
              "content": "14 litres",
              "plainText": "14 litres",
              "distractorReason": "Gives the original amount of water only."
            },
            {
              "id": "C",
              "content": "18 litres",
              "plainText": "18 litres",
              "distractorReason": null
            },
            {
              "id": "D",
              "content": "20 litres",
              "plainText": "20 litres",
              "distractorReason": "Gives the final volume after the extra water is added."
            },
            {
              "id": "E",
              "content": "16 litres",
              "plainText": "16 litres",
              "distractorReason": "Subtracts the added water from the original total."
            },
            {
              "id": "F",
              "content": "24 litres",
              "plainText": "24 litres",
              "distractorReason": "Uses the final ratio parts with the original scale factor."
            }
          ],
          "correctOption": "C",
          "authorNotes": {
            "solution": "Write the original amounts as 2k and 7k. Then 2k:(7k + 6) = 1:5, so 10k = 7k + 6 and k = 2. The original volume is 9k = 18 litres.",
            "solutionPlainText": "Write the original amounts as 2k and 7k. Then 2k:(7k + 6) = 1:5, so 10k = 7k + 6 and k = 2. The original volume is 9k = 18 litres.",
            "tip": "Keep the unchanged amount, syrup, fixed in both ratios.",
            "calibration": "NSAA 2023, Part A, Q14: linked proportional relationships with a hidden scale factor."
          }
        },
        {
          "id": "esat-m1-module-1-q07",
          "number": 7,
          "difficulty": "easy",
          "syllabus": {
            "code": "M3.8",
            "topic": "Ratio and proportion"
          },
          "estimatedSeconds": 45,
          "strongQuestion": false,
          "content": "A price is reduced by 20%. By what percentage must the reduced price be increased to return to the original price?",
          "plainText": "A price is reduced by 20%. By what percentage must the reduced price be increased to return to the original price?",
          "options": [
            {
              "id": "A",
              "content": "16%",
              "plainText": "16%",
              "distractorReason": "Takes 20% of the reduced value and mistakes that amount for the required percentage."
            },
            {
              "id": "B",
              "content": "20%",
              "plainText": "20%",
              "distractorReason": "Assumes equal percentage decreases and increases cancel."
            },
            {
              "id": "C",
              "content": "22.5%",
              "plainText": "22.5%",
              "distractorReason": "Uses 20/90 rather than 20/80."
            },
            {
              "id": "D",
              "content": "24%",
              "plainText": "24%",
              "distractorReason": "Uses an approximate adjustment instead of the exact ratio."
            },
            {
              "id": "E",
              "content": "40%",
              "plainText": "40%",
              "distractorReason": "Divides the remaining 80% by the lost 20%."
            },
            {
              "id": "F",
              "content": "80%",
              "plainText": "80%",
              "distractorReason": "Reports the remaining percentage rather than the required increase."
            },
            {
              "id": "G",
              "content": "25%",
              "plainText": "25%",
              "distractorReason": null
            }
          ],
          "correctOption": "G",
          "authorNotes": {
            "solution": "After the reduction, the price is 80% of the original. Returning from 80 to 100 is an increase of \\(\\frac{20}{80}\\) = 25%.",
            "solutionPlainText": "After the reduction, the price is 80% of the original. Returning from 80 to 100 is an increase of 20/80 = 25%.",
            "tip": "Percentage changes use the current value as the base.",
            "calibration": "ENGAA 2018, Part A, Q17: successive percentage multipliers."
          }
        },
        {
          "id": "esat-m1-module-1-q08",
          "number": 8,
          "difficulty": "medium",
          "syllabus": {
            "code": "M3.9",
            "topic": "Ratio and proportion"
          },
          "estimatedSeconds": 70,
          "strongQuestion": false,
          "content": "The positive variable y is inversely proportional to the square root of x. When x = 4, y = 12. What is y when x = 9?",
          "plainText": "The positive variable y is inversely proportional to the square root of x. When x = 4, y = 12. What is y when x = 9?",
          "options": [
            {
              "id": "A",
              "content": "4",
              "plainText": "4",
              "distractorReason": "Treats y as inversely proportional to x²."
            },
            {
              "id": "B",
              "content": "6",
              "plainText": "6",
              "distractorReason": "Uses the ratio 4:9 directly."
            },
            {
              "id": "C",
              "content": "8",
              "plainText": "8",
              "distractorReason": null
            },
            {
              "id": "D",
              "content": "9",
              "plainText": "9",
              "distractorReason": "Confuses the new x-value with y."
            },
            {
              "id": "E",
              "content": "18",
              "plainText": "18",
              "distractorReason": "Uses direct proportion to √x."
            },
            {
              "id": "F",
              "content": "27",
              "plainText": "27",
              "distractorReason": "Uses direct proportion to x."
            }
          ],
          "correctOption": "C",
          "authorNotes": {
            "solution": "Since y = k/\\(\\sqrt{x}\\), 12 = k/2 and k = 24. When x = 9, y = \\(\\frac{24}{3}\\) = 8.",
            "solutionPlainText": "Since y = k/√x, 12 = k/2 and k = 24. When x = 9, y = 24/3 = 8.",
            "tip": "Translate the words into a formula before substituting.",
            "calibration": "NSAA 2022, Part A, Q10: inverse-square proportional reasoning."
          }
        },
        {
          "id": "esat-m1-module-1-q09",
          "number": 9,
          "difficulty": "hard",
          "syllabus": {
            "code": "M3.10",
            "topic": "Ratio and proportion"
          },
          "estimatedSeconds": 85,
          "strongQuestion": true,
          "content": "Two bottles are mathematically similar. Their heights are in the ratio 3:5. The smaller bottle has volume 162 cm³. What is the volume of the larger bottle?",
          "plainText": "Two bottles are mathematically similar. Their heights are in the ratio 3:5. The smaller bottle has volume 162 cm³. What is the volume of the larger bottle?",
          "options": [
            {
              "id": "A",
              "content": "750 cm³",
              "plainText": "750 cm³",
              "distractorReason": null
            },
            {
              "id": "B",
              "content": "450 cm³",
              "plainText": "450 cm³",
              "distractorReason": "Uses the square of the scale factor, which is for area."
            },
            {
              "id": "C",
              "content": "270 cm³",
              "plainText": "270 cm³",
              "distractorReason": "Uses the length scale factor only."
            },
            {
              "id": "D",
              "content": "486 cm³",
              "plainText": "486 cm³",
              "distractorReason": "Multiplies the volume by 3."
            },
            {
              "id": "E",
              "content": "1250 cm³",
              "plainText": "1250 cm³",
              "distractorReason": "Applies an extra factor after cubing the scale factor."
            },
            {
              "id": "F",
              "content": "1620 cm³",
              "plainText": "1620 cm³",
              "distractorReason": "Multiplies by 10 rather than using a scale factor."
            }
          ],
          "correctOption": "A",
          "authorNotes": {
            "solution": "Volumes scale with the cube of the length scale factor. The larger volume is 162 × (\\(\\frac{5}{3}\\))³ = 162 × \\(\\frac{125}{27}\\) = 750 cm³.",
            "solutionPlainText": "Volumes scale with the cube of the length scale factor. The larger volume is 162 × (5/3)³ = 162 × 125/27 = 750 cm³.",
            "tip": "Length, area and volume use powers 1, 2 and 3 respectively.",
            "calibration": "ENGAA 2018, Part A, Q9: similar containers and cubic scaling."
          }
        },
        {
          "id": "esat-m1-module-1-q10",
          "number": 10,
          "difficulty": "medium",
          "syllabus": {
            "code": "M4.7",
            "topic": "Algebra"
          },
          "estimatedSeconds": 80,
          "strongQuestion": false,
          "content": "The variables satisfy p = (3x - q)/(x + r). Which expression makes x the subject?",
          "plainText": "The variables satisfy p = (3x - q)/(x + r). Which expression makes x the subject?",
          "options": [
            {
              "id": "A",
              "content": "(q - pr)/(3 - p)",
              "plainText": "(q - pr)/(3 - p)",
              "distractorReason": "Changes the sign of pr but not q."
            },
            {
              "id": "B",
              "content": "(q + pr)/(p - 3)",
              "plainText": "(q + pr)/(p - 3)",
              "distractorReason": "Keeps the numerator positive without reversing the denominator sign."
            },
            {
              "id": "C",
              "content": "(q - pr)/(p - 3)",
              "plainText": "(q - pr)/(p - 3)",
              "distractorReason": "Makes inconsistent sign changes when collecting terms."
            },
            {
              "id": "D",
              "content": "(p - q + r)/3",
              "plainText": "(p - q + r)/3",
              "distractorReason": "Divides each visible term by 3 before clearing the fraction."
            },
            {
              "id": "E",
              "content": "(q + r)/(3 - p)",
              "plainText": "(q + r)/(3 - p)",
              "distractorReason": "Fails to multiply r by p."
            },
            {
              "id": "F",
              "content": "(q + pr)/(3 - p)",
              "plainText": "(q + pr)/(3 - p)",
              "distractorReason": null
            }
          ],
          "correctOption": "F",
          "authorNotes": {
            "solution": "Multiply by x + r: px + pr = 3x - q. Hence x(p - 3) = -(q + pr), so x = (q + pr)/(3 - p).",
            "solutionPlainText": "Multiply by x + r: px + pr = 3x - q. Hence x(p - 3) = -(q + pr), so x = (q + pr)/(3 - p).",
            "tip": "Collect every x-term on one side before dividing.",
            "calibration": "NSAA 2023, Part A, Q3: rearrangement with the target variable inside a fraction."
          }
        },
        {
          "id": "esat-m1-module-1-q11",
          "number": 11,
          "difficulty": "hard",
          "syllabus": {
            "code": "M4.6",
            "topic": "Algebra"
          },
          "estimatedSeconds": 90,
          "strongQuestion": true,
          "content": "For x ≠ -3 and x ≠ 2, which expression is equal to (\\(x^{2}\\) - 9)/(\\(x^{2}\\) + x - 6)?",
          "plainText": "For x ≠ -3 and x ≠ 2, which expression is equal to (x² - 9)/(x² + x - 6)?",
          "options": [
            {
              "id": "A",
              "content": "(x + 3)/(x - 2)",
              "plainText": "(x + 3)/(x - 2)",
              "distractorReason": "Cancels x - 3 instead of the common factor x + 3."
            },
            {
              "id": "B",
              "content": "(x - 3)/(x - 2)",
              "plainText": "(x - 3)/(x - 2)",
              "distractorReason": null
            },
            {
              "id": "C",
              "content": "(x - 3)/(x + 3)",
              "plainText": "(x - 3)/(x + 3)",
              "distractorReason": "Cancels the wrong denominator factor."
            },
            {
              "id": "D",
              "content": "(x + 3)/(x + 2)",
              "plainText": "(x + 3)/(x + 2)",
              "distractorReason": "Factorises x² + x - 6 incorrectly as (x + 3)(x + 2)."
            },
            {
              "id": "E",
              "content": "1",
              "plainText": "1",
              "distractorReason": "Cancels every term across addition and subtraction."
            },
            {
              "id": "F",
              "content": "x - 3",
              "plainText": "x - 3",
              "distractorReason": "Cancels the entire denominator rather than only a common factor."
            }
          ],
          "correctOption": "B",
          "authorNotes": {
            "solution": "Factorise: \\(x^{2}\\) - 9 = (x - 3)(x + 3) and \\(x^{2}\\) + x - 6 = (x + 3)(x - 2). Cancelling x + 3 gives (x - 3)/(x - 2).",
            "solutionPlainText": "Factorise: x² - 9 = (x - 3)(x + 3) and x² + x - 6 = (x + 3)(x - 2). Cancelling x + 3 gives (x - 3)/(x - 2).",
            "tip": "Factorise both numerator and denominator fully before cancelling.",
            "calibration": "NSAA 2022, Part A, Q7: factorisation followed by rational-expression cancellation."
          }
        },
        {
          "id": "esat-m1-module-1-q12",
          "number": 12,
          "difficulty": "easy",
          "syllabus": {
            "code": "M4.15",
            "topic": "Algebra"
          },
          "estimatedSeconds": 60,
          "strongQuestion": false,
          "content": "Three adult tickets and two child tickets cost £42. Two adult tickets and five child tickets cost £50. What is the price of one adult ticket?",
          "plainText": "Three adult tickets and two child tickets cost £42. Two adult tickets and five child tickets cost £50. What is the price of one adult ticket?",
          "options": [
            {
              "id": "A",
              "content": "£6",
              "plainText": "£6",
              "distractorReason": "Finds the child price and reports it as the adult price."
            },
            {
              "id": "B",
              "content": "£8",
              "plainText": "£8",
              "distractorReason": "Averages the ticket prices without weighting the ticket counts correctly."
            },
            {
              "id": "C",
              "content": "£9",
              "plainText": "£9",
              "distractorReason": "Uses the difference in totals but ignores the changed numbers of both ticket types."
            },
            {
              "id": "D",
              "content": "£12",
              "plainText": "£12",
              "distractorReason": "Divides £42 by a rounded total of ticket types."
            },
            {
              "id": "E",
              "content": "£10",
              "plainText": "£10",
              "distractorReason": null
            },
            {
              "id": "F",
              "content": "£14",
              "plainText": "£14",
              "distractorReason": "Divides the first total by the number of adult tickets only."
            }
          ],
          "correctOption": "E",
          "authorNotes": {
            "solution": "Let the adult and child prices be a and c. The equations are 3a + 2c = 42 and 2a + 5c = 50. Eliminating c gives 11a = 110, so a = 10.",
            "solutionPlainText": "Let the adult and child prices be a and c. The equations are 3a + 2c = 42 and 2a + 5c = 50. Eliminating c gives 11a = 110, so a = 10.",
            "tip": "Scale the equations so one variable has matching coefficients.",
            "calibration": "ENGAA 2018, Part A, Q20: compact contextual modelling with two unknown quantities."
          }
        },
        {
          "id": "esat-m1-module-1-q13",
          "number": 13,
          "difficulty": "easy",
          "syllabus": {
            "code": "M4.16",
            "topic": "Algebra"
          },
          "estimatedSeconds": 55,
          "strongQuestion": false,
          "content": "A positive number x satisfies x + 6/x = 5. What is the greater possible value of x?",
          "plainText": "A positive number x satisfies x + 6/x = 5. What is the greater possible value of x?",
          "options": [
            {
              "id": "A",
              "content": "1",
              "plainText": "1",
              "distractorReason": "Uses the constant term as a solution."
            },
            {
              "id": "B",
              "content": "2",
              "plainText": "2",
              "distractorReason": "Chooses the smaller valid solution."
            },
            {
              "id": "C",
              "content": "\\(\\frac{5}{2}\\)",
              "plainText": "5/2",
              "distractorReason": "Uses the midpoint of the two roots."
            },
            {
              "id": "D",
              "content": "3",
              "plainText": "3",
              "distractorReason": null
            },
            {
              "id": "E",
              "content": "5",
              "plainText": "5",
              "distractorReason": "Uses the coefficient sum rather than solving the quadratic."
            },
            {
              "id": "F",
              "content": "6",
              "plainText": "6",
              "distractorReason": "Uses the numerator of the reciprocal term as the answer."
            }
          ],
          "correctOption": "D",
          "authorNotes": {
            "solution": "Multiplying by x gives \\(x^{2}\\) - 5x + 6 = 0, so (x - 2)(x - 3) = 0. The greater solution is 3.",
            "solutionPlainText": "Multiplying by x gives x² - 5x + 6 = 0, so (x - 2)(x - 3) = 0. The greater solution is 3.",
            "tip": "Turn the reciprocal equation into a quadratic.",
            "calibration": "NSAA 2023, Part A, Q8: extracting a required expression from quadratic roots."
          }
        },
        {
          "id": "esat-m1-module-1-q14",
          "number": 14,
          "difficulty": "medium",
          "syllabus": {
            "code": "M4.17",
            "topic": "Algebra"
          },
          "estimatedSeconds": 70,
          "strongQuestion": false,
          "content": "What is the complete set of values of x satisfying 3 - 2(4 - x) ≥ 5x + 1?",
          "plainText": "What is the complete set of values of x satisfying 3 - 2(4 - x) ≥ 5x + 1?",
          "options": [
            {
              "id": "A",
              "content": "x ≥ -2",
              "plainText": "x ≥ -2",
              "distractorReason": "Does not reverse the inequality after effectively dividing by -3."
            },
            {
              "id": "B",
              "content": "x < -2",
              "plainText": "x < -2",
              "distractorReason": "Finds the correct boundary but excludes equality."
            },
            {
              "id": "C",
              "content": "x > -2",
              "plainText": "x > -2",
              "distractorReason": "Both reverses the direction incorrectly and excludes equality."
            },
            {
              "id": "D",
              "content": "x ≤ 2",
              "plainText": "x ≤ 2",
              "distractorReason": "Loses the negative sign on the boundary."
            },
            {
              "id": "E",
              "content": "x ≥ 2",
              "plainText": "x ≥ 2",
              "distractorReason": "Loses the negative sign and reverses the direction."
            },
            {
              "id": "F",
              "content": "x < 2",
              "plainText": "x < 2",
              "distractorReason": "Loses the negative sign and excludes equality."
            },
            {
              "id": "G",
              "content": "x ≤ -2",
              "plainText": "x ≤ -2",
              "distractorReason": null
            }
          ],
          "correctOption": "G",
          "authorNotes": {
            "solution": "Expanding gives -5 + 2x ≥ 5x + 1. Therefore -6 ≥ 3x, so x ≤ -2.",
            "solutionPlainText": "Expanding gives -5 + 2x ≥ 5x + 1. Therefore -6 ≥ 3x, so x ≤ -2.",
            "tip": "When dividing an inequality by a negative number, reverse its direction.",
            "calibration": "NSAA 2022, Part A, Q3: multi-step linear inequality with a direction trap."
          }
        },
        {
          "id": "esat-m1-module-1-q15",
          "number": 15,
          "difficulty": "hard",
          "syllabus": {
            "code": "M4.19",
            "topic": "Algebra"
          },
          "estimatedSeconds": 85,
          "strongQuestion": true,
          "content": "The first four terms of a quadratic sequence are 2, 7, 14, 23. What is the 10th term?",
          "plainText": "The first four terms of a quadratic sequence are 2, 7, 14, 23. What is the 10th term?",
          "options": [
            {
              "id": "A",
              "content": "99",
              "plainText": "99",
              "distractorReason": "Uses n² - 1 and ignores the linear part."
            },
            {
              "id": "B",
              "content": "119",
              "plainText": "119",
              "distractorReason": null
            },
            {
              "id": "C",
              "content": "120",
              "plainText": "120",
              "distractorReason": "Uses n² + 2n but forgets the constant -1."
            },
            {
              "id": "D",
              "content": "121",
              "plainText": "121",
              "distractorReason": "Recognises a square-like pattern and chooses 11²."
            },
            {
              "id": "E",
              "content": "143",
              "plainText": "143",
              "distractorReason": "Continues the first differences with an incorrect step size."
            },
            {
              "id": "F",
              "content": "209",
              "plainText": "209",
              "distractorReason": "Adds all later differences incorrectly instead of finding the nth-term rule."
            }
          ],
          "correctOption": "B",
          "authorNotes": {
            "solution": "The first differences are 5, 7, 9, so the constant second difference is 2 and the \\(n^{2}\\) coefficient is 1. The rule is \\(n^{2}\\) + 2n - 1, giving 100 + 20 - 1 = 119.",
            "solutionPlainText": "The first differences are 5, 7, 9, so the constant second difference is 2 and the n² coefficient is 1. The rule is n² + 2n - 1, giving 100 + 20 - 1 = 119.",
            "tip": "A second difference of 2 means the n² coefficient is 1.",
            "calibration": "ENGAA 2018, Part A, Q25: identifying and using a quadratic sequence rule."
          }
        },
        {
          "id": "esat-m1-module-1-q16",
          "number": 16,
          "difficulty": "medium",
          "syllabus": {
            "code": "M4.11",
            "topic": "Algebra"
          },
          "estimatedSeconds": 55,
          "strongQuestion": false,
          "content": "What is the minimum value of \\(x^{2}\\) - 6x + 13?",
          "plainText": "What is the minimum value of x² - 6x + 13?",
          "options": [
            {
              "id": "A",
              "content": "-5",
              "plainText": "-5",
              "distractorReason": "Substitutes x = 3 but mishandles the signs."
            },
            {
              "id": "B",
              "content": "-4",
              "plainText": "-4",
              "distractorReason": "Reports the negative of the correct constant."
            },
            {
              "id": "C",
              "content": "0",
              "plainText": "0",
              "distractorReason": "Assumes any square-based expression can reach zero."
            },
            {
              "id": "D",
              "content": "3",
              "plainText": "3",
              "distractorReason": "Reports the x-coordinate of the turning point."
            },
            {
              "id": "E",
              "content": "13",
              "plainText": "13",
              "distractorReason": "Uses the constant term without considering the x-terms."
            },
            {
              "id": "F",
              "content": "4",
              "plainText": "4",
              "distractorReason": null
            }
          ],
          "correctOption": "F",
          "authorNotes": {
            "solution": "Complete the square: \\(x^{2}\\) - 6x + 13 = (x - 3)² + 4. The square is smallest at 0, so the minimum value is 4.",
            "solutionPlainText": "Complete the square: x² - 6x + 13 = (x - 3)² + 4. The square is smallest at 0, so the minimum value is 4.",
            "tip": "Complete the square to expose the minimum directly.",
            "calibration": "NSAA 2023, Part A, Q16: minimum of a quadratic expression."
          }
        },
        {
          "id": "esat-m1-module-1-q17",
          "number": 17,
          "difficulty": "medium",
          "syllabus": {
            "code": "M5.7",
            "topic": "Geometry"
          },
          "estimatedSeconds": 80,
          "strongQuestion": false,
          "content": "A cuboid has length 12 cm, depth 4 cm and height 6 cm. M is the midpoint of the vertical edge opposite A. What is AM?",
          "plainText": "A cuboid has length 12 cm, depth 4 cm and height 6 cm. M is the midpoint of the vertical edge opposite A. What is AM?",
          "options": [
            {
              "id": "A",
              "content": "5 cm",
              "plainText": "5 cm",
              "distractorReason": "Uses only the 3 cm by 4 cm end face."
            },
            {
              "id": "B",
              "content": "4√10 cm",
              "plainText": "4√10 cm",
              "distractorReason": "Finds the floor diagonal and ignores the vertical rise."
            },
            {
              "id": "C",
              "content": "13 cm",
              "plainText": "13 cm",
              "distractorReason": null
            },
            {
              "id": "D",
              "content": "14 cm",
              "plainText": "14 cm",
              "distractorReason": "Uses the full 6 cm height instead of the midpoint height."
            },
            {
              "id": "E",
              "content": "\\(\\sqrt{185}\\) cm",
              "plainText": "√185 cm",
              "distractorReason": "Uses 5 cm as the vertical component after forming a 3-4-5 triangle."
            },
            {
              "id": "F",
              "content": "19 cm",
              "plainText": "19 cm",
              "distractorReason": "Adds the three perpendicular lengths directly."
            }
          ],
          "correctOption": "C",
          "authorNotes": {
            "solution": "The vertical rise from A to M is 3 cm. Using three-dimensional Pythagoras, AM² = \\(12^{2}\\) + \\(4^{2}\\) + \\(3^{2}\\) = 169, so AM = 13 cm.",
            "solutionPlainText": "The vertical rise from A to M is 3 cm. Using three-dimensional Pythagoras, AM² = 12² + 4² + 3² = 169, so AM = 13 cm.",
            "tip": "Use the midpoint height, not the full height.",
            "calibration": "NSAA 2022, Part A, Q2: layered Pythagorean reasoning in a compact geometry problem."
          },
          "diagram": {
            "svg": "/esat/maths1-practice/m1-q17-cuboid.svg",
            "png": "/esat/maths1-practice/m1-q17-cuboid.png",
            "alt": "Cuboid of length 12 cm, depth 4 cm and height 6 cm, with M at the midpoint of the vertical edge opposite A and segment AM shown.",
            "notToScale": true
          }
        },
        {
          "id": "esat-m1-module-1-q18",
          "number": 18,
          "difficulty": "hard",
          "syllabus": {
            "code": "M5.9",
            "topic": "Geometry"
          },
          "estimatedSeconds": 90,
          "strongQuestion": true,
          "content": "The line through A is tangent to the circle with centre O. The angle between the tangent and chord AB is \\(38^{\\circ}\\). What is angle AOB?",
          "plainText": "The line through A is tangent to the circle with centre O. The angle between the tangent and chord AB is 38°. What is angle AOB?",
          "options": [
            {
              "id": "A",
              "content": "\\(76^{\\circ}\\)",
              "plainText": "76°",
              "distractorReason": null
            },
            {
              "id": "B",
              "content": "\\(38^{\\circ}\\)",
              "plainText": "38°",
              "distractorReason": "Copies the given tangent-chord angle."
            },
            {
              "id": "C",
              "content": "\\(52^{\\circ}\\)",
              "plainText": "52°",
              "distractorReason": "Stops after finding angle OAB."
            },
            {
              "id": "D",
              "content": "\\(90^{\\circ}\\)",
              "plainText": "90°",
              "distractorReason": "Uses only the radius-tangent fact."
            },
            {
              "id": "E",
              "content": "\\(104^{\\circ}\\)",
              "plainText": "104°",
              "distractorReason": "Adds the two equal base angles and reports their sum."
            },
            {
              "id": "F",
              "content": "\\(142^{\\circ}\\)",
              "plainText": "142°",
              "distractorReason": "Subtracts 38° from 180° directly."
            }
          ],
          "correctOption": "A",
          "authorNotes": {
            "solution": "OA is perpendicular to the tangent, so angle OAB = \\(90^{\\circ}\\) - \\(38^{\\circ}\\) = \\(52^{\\circ}\\). Since OA = OB, angle OBA is also \\(52^{\\circ}\\). Therefore angle AOB = \\(180^{\\circ}\\) - \\(104^{\\circ}\\) = \\(76^{\\circ}\\).",
            "solutionPlainText": "OA is perpendicular to the tangent, so angle OAB = 90° - 38° = 52°. Since OA = OB, angle OBA is also 52°. Therefore angle AOB = 180° - 104° = 76°.",
            "tip": "A radius meets a tangent at 90°, then use the isosceles triangle.",
            "calibration": "ENGAA 2018, Part A, Q21: circle theorem reasoning involving a tangent and radii."
          },
          "diagram": {
            "svg": "/esat/maths1-practice/m1-q18-circle-tangent.svg",
            "png": "/esat/maths1-practice/m1-q18-circle-tangent.png",
            "alt": "Circle with centre O, tangent at A, chord AB and central angle AOB; the tangent-chord angle at A is 38 degrees.",
            "notToScale": true
          }
        },
        {
          "id": "esat-m1-module-1-q19",
          "number": 19,
          "difficulty": "easy",
          "syllabus": {
            "code": "M5.16",
            "topic": "Geometry"
          },
          "estimatedSeconds": 60,
          "strongQuestion": false,
          "content": "An annular sector has angle \\(120^{\\circ}\\), outer radius 6 cm and inner radius 3 cm. What is its area?",
          "plainText": "An annular sector has angle 120°, outer radius 6 cm and inner radius 3 cm. What is its area?",
          "options": [
            {
              "id": "A",
              "content": "\\(3\\pi  cm^{2}\\)",
              "plainText": "3π cm²",
              "distractorReason": "Uses the difference of the radii only."
            },
            {
              "id": "B",
              "content": "\\(6\\pi  cm^{2}\\)",
              "plainText": "6π cm²",
              "distractorReason": "Uses 120/360 × π × 6."
            },
            {
              "id": "C",
              "content": "\\(12\\pi  cm^{2}\\)",
              "plainText": "12π cm²",
              "distractorReason": "Uses the difference 6² - 3² but divides by an incorrect angle factor."
            },
            {
              "id": "D",
              "content": "\\(27\\pi  cm^{2}\\)",
              "plainText": "27π cm²",
              "distractorReason": "Finds the full annulus area and forgets the 120° fraction."
            },
            {
              "id": "E",
              "content": "\\(9\\pi  cm^{2}\\)",
              "plainText": "9π cm²",
              "distractorReason": null
            },
            {
              "id": "F",
              "content": "\\(36\\pi  cm^{2}\\)",
              "plainText": "36π cm²",
              "distractorReason": "Uses the full outer circle only."
            }
          ],
          "correctOption": "E",
          "authorNotes": {
            "solution": "The area is \\(\\frac{120}{360}\\) × \\(\\pi\\)(\\(6^{2}\\) - \\(3^{2}\\)) = \\(\\frac{1}{3}\\) × \\(27\\pi\\) = \\(9\\pi  cm^{2}\\).",
            "solutionPlainText": "The area is 120/360 × π(6² - 3²) = 1/3 × 27π = 9π cm².",
            "tip": "Subtract the two sector areas, not the radii.",
            "calibration": "Official ESAT Mathematics 1 specimen: broader verified circle-mensuration style; no close archive item."
          },
          "diagram": {
            "svg": "/esat/maths1-practice/m1-q19-annular-sector.svg",
            "png": "/esat/maths1-practice/m1-q19-annular-sector.png",
            "alt": "Annular sector with angle 120 degrees, outer radius 6 cm and inner radius 3 cm.",
            "notToScale": true
          }
        },
        {
          "id": "esat-m1-module-1-q20",
          "number": 20,
          "difficulty": "medium",
          "syllabus": {
            "code": "M5.17",
            "topic": "Geometry"
          },
          "estimatedSeconds": 80,
          "strongQuestion": true,
          "content": "In triangle ABC, DE is parallel to BC. The area of triangle ADE is 36 cm² and the area of trapezium DBCE is 64 cm². If AD = 6 cm, what is AB?",
          "plainText": "In triangle ABC, DE is parallel to BC. The area of triangle ADE is 36 cm² and the area of trapezium DBCE is 64 cm². If AD = 6 cm, what is AB?",
          "options": [
            {
              "id": "A",
              "content": "7.5 cm",
              "plainText": "7.5 cm",
              "distractorReason": "Uses 36:64 as a direct length ratio."
            },
            {
              "id": "B",
              "content": "8 cm",
              "plainText": "8 cm",
              "distractorReason": "Uses the trapezium area as though it were the full triangle area."
            },
            {
              "id": "C",
              "content": "9 cm",
              "plainText": "9 cm",
              "distractorReason": "Adds half the given side without using similarity."
            },
            {
              "id": "D",
              "content": "10 cm",
              "plainText": "10 cm",
              "distractorReason": null
            },
            {
              "id": "E",
              "content": "12 cm",
              "plainText": "12 cm",
              "distractorReason": "Uses the area ratio 1:2 as a length ratio."
            },
            {
              "id": "F",
              "content": "\\(\\frac{50}{3}\\) cm",
              "plainText": "50/3 cm",
              "distractorReason": "Multiplies 6 by 100/36 without taking a square root."
            }
          ],
          "correctOption": "D",
          "authorNotes": {
            "solution": "The full triangle has area 36 + 64 = 100 cm². The linear scale factor from triangle ADE to triangle ABC is √(\\(\\frac{36}{100}\\)) = \\(\\frac{3}{5}\\). Thus 6/AB = \\(\\frac{3}{5}\\), so AB = 10 cm.",
            "solutionPlainText": "The full triangle has area 36 + 64 = 100 cm². The linear scale factor from triangle ADE to triangle ABC is √(36/100) = 3/5. Thus 6/AB = 3/5, so AB = 10 cm.",
            "tip": "Convert the area ratio into a length ratio by taking a square root.",
            "calibration": "NSAA 2022, Part A, Q16: parallel-line similarity with an algebraic scale factor."
          },
          "diagram": {
            "svg": "/esat/maths1-practice/m1-q20-similar-triangles.svg",
            "png": "/esat/maths1-practice/m1-q20-similar-triangles.png",
            "alt": "Triangle ABC with DE parallel to BC, showing a smaller similar triangle ADE inside the full triangle.",
            "notToScale": true
          }
        },
        {
          "id": "esat-m1-module-1-q21",
          "number": 21,
          "difficulty": "hard",
          "syllabus": {
            "code": "M5.18",
            "topic": "Geometry"
          },
          "estimatedSeconds": 90,
          "strongQuestion": true,
          "content": "In a right-angled triangle, the side opposite a \\(60^{\\circ}\\) angle has length x + 2 and the adjacent non-hypotenuse side has length x. What is x?",
          "plainText": "In a right-angled triangle, the side opposite a 60° angle has length x + 2 and the adjacent non-hypotenuse side has length x. What is x?",
          "options": [
            {
              "id": "A",
              "content": "\\(\\sqrt{3}\\) - 1",
              "plainText": "√3 - 1",
              "distractorReason": "Stops after rationalising with the wrong sign."
            },
            {
              "id": "B",
              "content": "1",
              "plainText": "1",
              "distractorReason": "Treats tan 60° as 3."
            },
            {
              "id": "C",
              "content": "\\(\\sqrt{3}\\)",
              "plainText": "√3",
              "distractorReason": "Reports tan 60° itself."
            },
            {
              "id": "D",
              "content": "2",
              "plainText": "2",
              "distractorReason": "Ignores the trigonometric ratio and uses the added length."
            },
            {
              "id": "E",
              "content": "2√3",
              "plainText": "2√3",
              "distractorReason": "Multiplies 2 by √3 instead of solving the linear equation."
            },
            {
              "id": "F",
              "content": "3",
              "plainText": "3",
              "distractorReason": "Uses tan 60° ≈ 2."
            },
            {
              "id": "G",
              "content": "1 + \\(\\sqrt{3}\\)",
              "plainText": "1 + √3",
              "distractorReason": null
            }
          ],
          "correctOption": "G",
          "authorNotes": {
            "solution": "tan \\(60^{\\circ}\\) = (x + 2)/x = \\(\\sqrt{3}\\). Hence x(\\(\\sqrt{3}\\) - 1) = 2, so x = 2/(\\(\\sqrt{3}\\) - 1) = 1 + \\(\\sqrt{3}\\).",
            "solutionPlainText": "tan 60° = (x + 2)/x = √3. Hence x(√3 - 1) = 2, so x = 2/(√3 - 1) = 1 + √3.",
            "tip": "Use tan because the two named sides are opposite and adjacent.",
            "calibration": "NSAA 2023, Part A, Q10: exact trigonometry embedded in an algebraic length problem."
          }
        },
        {
          "id": "esat-m1-module-1-q22",
          "number": 22,
          "difficulty": "easy",
          "syllabus": {
            "code": "M6.3",
            "topic": "Statistics"
          },
          "estimatedSeconds": 55,
          "strongQuestion": false,
          "content": "Eight students have a mean score of 12. A further twelve students have a mean score of 20. What is the mean score of all twenty students?",
          "plainText": "Eight students have a mean score of 12. A further twelve students have a mean score of 20. What is the mean score of all twenty students?",
          "options": [
            {
              "id": "A",
              "content": "16.8",
              "plainText": "16.8",
              "distractorReason": null
            },
            {
              "id": "B",
              "content": "16",
              "plainText": "16",
              "distractorReason": "Takes the unweighted mean of 12 and 20."
            },
            {
              "id": "C",
              "content": "17",
              "plainText": "17",
              "distractorReason": "Rounds the exact mean to the nearest whole number."
            },
            {
              "id": "D",
              "content": "20",
              "plainText": "20",
              "distractorReason": "Uses the larger group mean only."
            },
            {
              "id": "E",
              "content": "13.2",
              "plainText": "13.2",
              "distractorReason": "Uses an incorrect total of 264 before dividing by 20."
            },
            {
              "id": "F",
              "content": "17.5",
              "plainText": "17.5",
              "distractorReason": "Uses an incorrect weighting between the group means."
            }
          ],
          "correctOption": "A",
          "authorNotes": {
            "solution": "The total score is 8 × 12 + 12 × 20 = 336. Dividing by 20 gives 16.8.",
            "solutionPlainText": "The total score is 8 × 12 + 12 × 20 = 336. Dividing by 20 gives 16.8.",
            "tip": "Multiply each mean by its group size before combining.",
            "calibration": "NSAA 2023, Part A, Q4: linking mean and other summary information."
          }
        },
        {
          "id": "esat-m1-module-1-q23",
          "number": 23,
          "difficulty": "medium",
          "syllabus": {
            "code": "M7.5",
            "topic": "Probability"
          },
          "estimatedSeconds": 70,
          "strongQuestion": true,
          "content": "A two-digit number is formed by choosing two different digits from 1, 2, 3 and 4. Each ordered choice is equally likely. What is the probability that the number is divisible by 3?",
          "plainText": "A two-digit number is formed by choosing two different digits from 1, 2, 3 and 4. Each ordered choice is equally likely. What is the probability that the number is divisible by 3?",
          "options": [
            {
              "id": "A",
              "content": "\\(\\frac{1}{6}\\)",
              "plainText": "1/6",
              "distractorReason": "Counts only one unordered favourable pair."
            },
            {
              "id": "B",
              "content": "\\(\\frac{1}{4}\\)",
              "plainText": "1/4",
              "distractorReason": "Counts three favourable outcomes instead of four."
            },
            {
              "id": "C",
              "content": "\\(\\frac{2}{9}\\)",
              "plainText": "2/9",
              "distractorReason": "Uses 9 as the size of the sample space."
            },
            {
              "id": "D",
              "content": "\\(\\frac{1}{3}\\)",
              "plainText": "1/3",
              "distractorReason": null
            },
            {
              "id": "E",
              "content": "\\(\\frac{1}{2}\\)",
              "plainText": "1/2",
              "distractorReason": "Counts all numbers containing 3 as favourable."
            },
            {
              "id": "F",
              "content": "\\(\\frac{2}{3}\\)",
              "plainText": "2/3",
              "distractorReason": "Counts favourable digits rather than ordered two-digit outcomes."
            }
          ],
          "correctOption": "D",
          "authorNotes": {
            "solution": "There are 4 × 3 = 12 possible numbers. A number is divisible by 3 when its digit sum is divisible by 3. The favourable numbers are 12, 21, 24 and 42, so the probability is \\(\\frac{4}{12}\\) = \\(\\frac{1}{3}\\).",
            "solutionPlainText": "There are 4 × 3 = 12 possible numbers. A number is divisible by 3 when its digit sum is divisible by 3. The favourable numbers are 12, 21, 24 and 42, so the probability is 4/12 = 1/3.",
            "tip": "Use the digit-sum test before listing every number.",
            "calibration": "NSAA 2022, Part A, Q17: systematic selection from a small finite set."
          }
        },
        {
          "id": "esat-m1-module-1-q24",
          "number": 24,
          "difficulty": "medium",
          "syllabus": {
            "code": "M6.2",
            "topic": "Statistics"
          },
          "estimatedSeconds": 70,
          "strongQuestion": false,
          "content": "The histogram shows journey times for 36 people. In which class interval does the median lie?",
          "plainText": "The histogram shows journey times for 36 people. In which class interval does the median lie?",
          "options": [
            {
              "id": "A",
              "content": "0 ≤ t < 4",
              "plainText": "0 ≤ t < 4",
              "distractorReason": "Uses the tallest value on the vertical scale as the median position."
            },
            {
              "id": "B",
              "content": "0 ≤ t < 10",
              "plainText": "0 ≤ t < 10",
              "distractorReason": "Combines the first two classes instead of identifying the containing class."
            },
            {
              "id": "C",
              "content": "4 ≤ t < 10",
              "plainText": "4 ≤ t < 10",
              "distractorReason": null
            },
            {
              "id": "D",
              "content": "4 ≤ t < 20",
              "plainText": "4 ≤ t < 20",
              "distractorReason": "Uses a cumulative interval rather than one class."
            },
            {
              "id": "E",
              "content": "10 ≤ t < 20",
              "plainText": "10 ≤ t < 20",
              "distractorReason": "Treats the widest bar as containing the median."
            },
            {
              "id": "F",
              "content": "It cannot be determined",
              "plainText": "It cannot be determined",
              "distractorReason": "Assumes grouped data cannot locate a median class."
            }
          ],
          "correctOption": "C",
          "authorNotes": {
            "solution": "The class frequencies are 4 × 2 = 8, 6 × 3 = 18 and 10 × 1 = 10. The 18th and 19th values are both in the second class, 4 ≤ t < 10.",
            "solutionPlainText": "The class frequencies are 4 × 2 = 8, 6 × 3 = 18 and 10 × 1 = 10. The 18th and 19th values are both in the second class, 4 ≤ t < 10.",
            "tip": "In a histogram, frequency is bar area, not bar height.",
            "calibration": "Official ESAT Mathematics 1 specimen: broader verified grouped-data interpretation style; no close archive item."
          },
          "diagram": {
            "svg": "/esat/maths1-practice/m1-q24-histogram.svg",
            "png": "/esat/maths1-practice/m1-q24-histogram.png",
            "alt": "Histogram with three unequal class widths and frequency densities 2, 3 and 1.",
            "notToScale": false
          }
        },
        {
          "id": "esat-m1-module-1-q25",
          "number": 25,
          "difficulty": "medium",
          "syllabus": {
            "code": "M7.7",
            "topic": "Probability"
          },
          "estimatedSeconds": 70,
          "strongQuestion": false,
          "content": "A bag contains 3 red and 2 blue counters. Two counters are taken at random without replacement. What is the probability that exactly one is red?",
          "plainText": "A bag contains 3 red and 2 blue counters. Two counters are taken at random without replacement. What is the probability that exactly one is red?",
          "options": [
            {
              "id": "A",
              "content": "\\(\\frac{1}{5}\\)",
              "plainText": "1/5",
              "distractorReason": "Multiplies the counts rather than the probabilities."
            },
            {
              "id": "B",
              "content": "\\(\\frac{3}{10}\\)",
              "plainText": "3/10",
              "distractorReason": "Counts only red then blue."
            },
            {
              "id": "C",
              "content": "\\(\\frac{2}{5}\\)",
              "plainText": "2/5",
              "distractorReason": "Treats the second draw as if the first counter were replaced."
            },
            {
              "id": "D",
              "content": "\\(\\frac{1}{2}\\)",
              "plainText": "1/2",
              "distractorReason": "Assumes the two colours make the event equally likely."
            },
            {
              "id": "E",
              "content": "\\(\\frac{7}{10}\\)",
              "plainText": "7/10",
              "distractorReason": "Subtracts the probability of two reds only from 1."
            },
            {
              "id": "F",
              "content": "\\(\\frac{3}{5}\\)",
              "plainText": "3/5",
              "distractorReason": null
            }
          ],
          "correctOption": "F",
          "authorNotes": {
            "solution": "Exactly one red can occur as red then blue or blue then red. The probability is (\\(\\frac{3}{5}\\) × \\(\\frac{2}{4}\\)) + (\\(\\frac{2}{5}\\) × \\(\\frac{3}{4}\\)) = \\(\\frac{12}{20}\\) = \\(\\frac{3}{5}\\).",
            "solutionPlainText": "Exactly one red can occur as red then blue or blue then red. The probability is (3/5 × 2/4) + (2/5 × 3/4) = 12/20 = 3/5.",
            "tip": "Include both possible orders.",
            "calibration": "ENGAA 2018, Part A, Q27: dependent draws without replacement."
          }
        },
        {
          "id": "esat-m1-module-1-q26",
          "number": 26,
          "difficulty": "easy",
          "syllabus": {
            "code": "M1.2",
            "topic": "Units"
          },
          "estimatedSeconds": 55,
          "strongQuestion": false,
          "content": "A metal block has mass 1.26 kg and volume 150 cm³. What is its density in g/cm³?",
          "plainText": "A metal block has mass 1.26 kg and volume 150 cm³. What is its density in g/cm³?",
          "options": [
            {
              "id": "A",
              "content": "0.0084",
              "plainText": "0.0084",
              "distractorReason": "Divides 1.26 kg by 150 cm³ without converting kilograms to grams."
            },
            {
              "id": "B",
              "content": "8.4",
              "plainText": "8.4",
              "distractorReason": null
            },
            {
              "id": "C",
              "content": "84",
              "plainText": "84",
              "distractorReason": "Moves the decimal one place too far after division."
            },
            {
              "id": "D",
              "content": "0.84",
              "plainText": "0.84",
              "distractorReason": "Converts 1.26 kg to 126 g."
            },
            {
              "id": "E",
              "content": "840",
              "plainText": "840",
              "distractorReason": "Divides by 1.5 rather than 150."
            },
            {
              "id": "F",
              "content": "18.9",
              "plainText": "18.9",
              "distractorReason": "Multiplies the mass and volume instead of dividing."
            }
          ],
          "correctOption": "B",
          "authorNotes": {
            "solution": "1.26 kg = 1260 g. Density = mass/volume = \\(\\frac{1260}{150}\\) = 8.4 g/cm³.",
            "solutionPlainText": "1.26 kg = 1260 g. Density = mass/volume = 1260/150 = 8.4 g/cm³.",
            "tip": "Match the mass unit to the required density unit before dividing.",
            "calibration": "ENGAA 2018, Part A, Q20: density with unit-aware simultaneous quantities."
          }
        },
        {
          "id": "esat-m1-module-1-q27",
          "number": 27,
          "difficulty": "medium",
          "syllabus": {
            "code": "M4.14",
            "topic": "Algebra"
          },
          "estimatedSeconds": 85,
          "strongQuestion": true,
          "content": "The graph shows the speed of an object over 12 seconds. What is its average speed during the 12 seconds?",
          "plainText": "The graph shows the speed of an object over 12 seconds. What is its average speed during the 12 seconds?",
          "options": [
            {
              "id": "A",
              "content": "8.0 m/s",
              "plainText": "8.0 m/s",
              "distractorReason": "Averages selected labelled speeds without weighting by time."
            },
            {
              "id": "B",
              "content": "8.5 m/s",
              "plainText": "8.5 m/s",
              "distractorReason": "Finds the final trapezium area incorrectly."
            },
            {
              "id": "C",
              "content": "9.0 m/s",
              "plainText": "9.0 m/s",
              "distractorReason": "Rounds the total distance before division."
            },
            {
              "id": "D",
              "content": "9.125 m/s",
              "plainText": "9.125 m/s",
              "distractorReason": "Uses 109.5 m as the total area."
            },
            {
              "id": "E",
              "content": "9.25 m/s",
              "plainText": "9.25 m/s",
              "distractorReason": null
            },
            {
              "id": "F",
              "content": "10.0 m/s",
              "plainText": "10.0 m/s",
              "distractorReason": "Uses the mean of the maximum and final speeds."
            }
          ],
          "correctOption": "E",
          "authorNotes": {
            "solution": "Distance is the area under the graph: \\(\\frac{1}{2}\\) × 4 × 12 + 5 × 12 + \\(\\frac{1}{2}\\) × (12 + 6) × 3 = 24 + 60 + 27 = 111 m. Average speed = \\(\\frac{111}{12}\\) = 9.25 m/s.",
            "solutionPlainText": "Distance is the area under the graph: 1/2 × 4 × 12 + 5 × 12 + 1/2 × (12 + 6) × 3 = 24 + 60 + 27 = 111 m. Average speed = 111/12 = 9.25 m/s.",
            "tip": "Find total area first, then divide by total time.",
            "calibration": "NSAA 2022, Part A, Q12: average speed from unequal journey stages."
          },
          "diagram": {
            "svg": "/esat/maths1-practice/m1-q27-speed-time.svg",
            "png": "/esat/maths1-practice/m1-q27-speed-time.png",
            "alt": "Speed-time graph with a four-second rise to 12 metres per second, five seconds constant, then a three-second fall to 6 metres per second.",
            "notToScale": false
          }
        }
      ]
    },
    {
      "id": "esat-maths1-practice-module-2",
      "moduleNumber": 2,
      "title": "ESAT Mathematics 1 Practice Module 2",
      "timeLimitSeconds": 2400,
      "calculatorAllowed": false,
      "questions": [
        {
          "id": "esat-m1-module-2-q01",
          "number": 1,
          "difficulty": "medium",
          "syllabus": {
            "code": "M1.1",
            "topic": "Units"
          },
          "estimatedSeconds": 60,
          "strongQuestion": false,
          "content": "A 3D printer uses 18 g of filament every 30 minutes at a constant rate. How many kilograms of filament does it use in 25 hours?",
          "plainText": "A 3D printer uses 18 g of filament every 30 minutes at a constant rate. How many kilograms of filament does it use in 25 hours?",
          "options": [
            {
              "id": "A",
              "content": "0.09 kg",
              "plainText": "0.09 kg",
              "distractorReason": "Divides by 10 once too many when converting grams to kilograms."
            },
            {
              "id": "B",
              "content": "0.9 kg",
              "plainText": "0.9 kg",
              "distractorReason": null
            },
            {
              "id": "C",
              "content": "9 kg",
              "plainText": "9 kg",
              "distractorReason": "Divides grams by 100 instead of 1000."
            },
            {
              "id": "D",
              "content": "18 kg",
              "plainText": "18 kg",
              "distractorReason": "Uses the 18 g figure as if it were kilograms."
            },
            {
              "id": "E",
              "content": "36 kg",
              "plainText": "36 kg",
              "distractorReason": "Reports the hourly rate as a mass in kilograms."
            },
            {
              "id": "F",
              "content": "900 kg",
              "plainText": "900 kg",
              "distractorReason": "Finds 900 g but relabels it as kilograms."
            }
          ],
          "correctOption": "B",
          "authorNotes": {
            "solution": "The printer uses 36 g per hour. In 25 hours it uses 36 × 25 = 900 g = 0.9 kg.",
            "solutionPlainText": "The printer uses 36 g per hour. In 25 hours it uses 36 × 25 = 900 g = 0.9 kg.",
            "tip": "Convert the time rate first, then convert grams to kilograms.",
            "calibration": "NSAA 2023, Part A, Q11: efficient conversion within a rate problem."
          }
        },
        {
          "id": "esat-m1-module-2-q02",
          "number": 2,
          "difficulty": "easy",
          "syllabus": {
            "code": "M1.2",
            "topic": "Units"
          },
          "estimatedSeconds": 50,
          "strongQuestion": false,
          "content": "Water flows at 7200 cm³ per minute. What is this rate in litres per second?",
          "plainText": "Water flows at 7200 cm³ per minute. What is this rate in litres per second?",
          "options": [
            {
              "id": "A",
              "content": "0.002 L/s",
              "plainText": "0.002 L/s",
              "distractorReason": "Divides by both 60 and 60 again."
            },
            {
              "id": "B",
              "content": "0.012 L/s",
              "plainText": "0.012 L/s",
              "distractorReason": "Converts 7200 cm³ to 0.72 litres before dividing."
            },
            {
              "id": "C",
              "content": "0.072 L/s",
              "plainText": "0.072 L/s",
              "distractorReason": "Divides by 100 instead of 60."
            },
            {
              "id": "D",
              "content": "1.2 L/s",
              "plainText": "1.2 L/s",
              "distractorReason": "Moves the decimal one place too far after dividing."
            },
            {
              "id": "E",
              "content": "0.12 L/s",
              "plainText": "0.12 L/s",
              "distractorReason": null
            },
            {
              "id": "F",
              "content": "7.2 L/s",
              "plainText": "7.2 L/s",
              "distractorReason": "Converts the volume but leaves the rate per minute."
            }
          ],
          "correctOption": "E",
          "authorNotes": {
            "solution": "7200 cm³ = 7.2 litres. Dividing by 60 gives 0.12 L/s.",
            "solutionPlainText": "7200 cm³ = 7.2 litres. Dividing by 60 gives 0.12 L/s.",
            "tip": "Remember that 1000 cm³ equals 1 litre.",
            "calibration": "Official ESAT Mathematics 1 specimen: broader verified unit-conversion style; no close archive item."
          }
        },
        {
          "id": "esat-m1-module-2-q03",
          "number": 3,
          "difficulty": "medium",
          "syllabus": {
            "code": "M2.11",
            "topic": "Number"
          },
          "estimatedSeconds": 70,
          "strongQuestion": false,
          "content": "Which expression is equal to 4/(\\(\\sqrt{5}\\) - 1)?",
          "plainText": "Which expression is equal to 4/(√5 - 1)?",
          "options": [
            {
              "id": "A",
              "content": "\\(\\sqrt{5}\\) - 1",
              "plainText": "√5 - 1",
              "distractorReason": "Cancels the 4 without changing the sign in the conjugate."
            },
            {
              "id": "B",
              "content": "(\\(\\sqrt{5}\\) + 1)/4",
              "plainText": "(√5 + 1)/4",
              "distractorReason": "Multiplies the denominator by the conjugate but not the numerator."
            },
            {
              "id": "C",
              "content": "\\(\\sqrt{5}\\) + 1",
              "plainText": "√5 + 1",
              "distractorReason": null
            },
            {
              "id": "D",
              "content": "5 + \\(\\sqrt{5}\\)",
              "plainText": "5 + √5",
              "distractorReason": "Forgets to divide the expanded numerator by 4."
            },
            {
              "id": "E",
              "content": "4/(\\(\\sqrt{5}\\) + 1)",
              "plainText": "4/(√5 + 1)",
              "distractorReason": "Changes the sign in the denominator without rationalising."
            },
            {
              "id": "F",
              "content": "2 + \\(\\sqrt{5}\\)",
              "plainText": "2 + √5",
              "distractorReason": "Treats √5 as 3 during simplification."
            }
          ],
          "correctOption": "C",
          "authorNotes": {
            "solution": "Multiply top and bottom by \\(\\sqrt{5}\\) + 1. The denominator becomes 5 - 1 = 4, so the expression simplifies to \\(\\sqrt{5}\\) + 1.",
            "solutionPlainText": "Multiply top and bottom by √5 + 1. The denominator becomes 5 - 1 = 4, so the expression simplifies to √5 + 1.",
            "tip": "Use the conjugate of the denominator.",
            "calibration": "NSAA 2023, Part A, Q8: exact surd algebra within a short calculation."
          }
        },
        {
          "id": "esat-m1-module-2-q04",
          "number": 4,
          "difficulty": "medium",
          "syllabus": {
            "code": "M2.8",
            "topic": "Number"
          },
          "estimatedSeconds": 75,
          "strongQuestion": false,
          "content": "What is (6 × 10^7)(4 × 10^(-3))/(8 × \\(10^{2}\\)) in standard form?",
          "plainText": "What is (6 × 10^7)(4 × 10^(-3))/(8 × 10²) in standard form?",
          "options": [
            {
              "id": "A",
              "content": "3 × 10^(-2)",
              "plainText": "3 × 10^(-2)",
              "distractorReason": "Subtracts all exponents without respecting the negative exponent in the numerator."
            },
            {
              "id": "B",
              "content": "3 × 10^(-1)",
              "plainText": "3 × 10^(-1)",
              "distractorReason": "Combines the powers as 10^(-1)."
            },
            {
              "id": "C",
              "content": "3",
              "plainText": "3",
              "distractorReason": "Cancels all powers of ten."
            },
            {
              "id": "D",
              "content": "3 × 10",
              "plainText": "3 × 10",
              "distractorReason": "Leaves one power of ten after an exponent error."
            },
            {
              "id": "E",
              "content": "7.5 × 10",
              "plainText": "7.5 × 10",
              "distractorReason": "Divides 6 by 8 before multiplying by 4, but loses the power of ten."
            },
            {
              "id": "F",
              "content": "2.4 × \\(10^{2}\\)",
              "plainText": "2.4 × 10²",
              "distractorReason": "Multiplies 6 and 4 but does not divide the coefficient by 8."
            },
            {
              "id": "G",
              "content": "3 × \\(10^{2}\\)",
              "plainText": "3 × 10²",
              "distractorReason": null
            }
          ],
          "correctOption": "G",
          "authorNotes": {
            "solution": "The number part is 6 × \\(\\frac{4}{8}\\) = 3. The power is 10^(7 - 3 - 2) = \\(10^{2}\\). Therefore the result is 3 × \\(10^{2}\\).",
            "solutionPlainText": "The number part is 6 × 4 / 8 = 3. The power is 10^(7 - 3 - 2) = 10². Therefore the result is 3 × 10².",
            "tip": "Handle the number part and the powers of ten separately.",
            "calibration": "NSAA 2022, Part A, Q10: standard form combined with proportional reasoning."
          }
        },
        {
          "id": "esat-m1-module-2-q05",
          "number": 5,
          "difficulty": "easy",
          "syllabus": {
            "code": "M2.13",
            "topic": "Number"
          },
          "estimatedSeconds": 50,
          "strongQuestion": false,
          "content": "A positive number x rounds to 3.7 to the nearest 0.1. Which interval contains every possible value of x?",
          "plainText": "A positive number x rounds to 3.7 to the nearest 0.1. Which interval contains every possible value of x?",
          "options": [
            {
              "id": "A",
              "content": "3.65 ≤ x < 3.75",
              "plainText": "3.65 ≤ x < 3.75",
              "distractorReason": null
            },
            {
              "id": "B",
              "content": "3.65 < x ≤ 3.75",
              "plainText": "3.65 < x ≤ 3.75",
              "distractorReason": "Reverses which endpoint is included."
            },
            {
              "id": "C",
              "content": "3.6 ≤ x < 3.8",
              "plainText": "3.6 ≤ x < 3.8",
              "distractorReason": "Uses the displayed precision as the half-width."
            },
            {
              "id": "D",
              "content": "3.69 ≤ x < 3.71",
              "plainText": "3.69 ≤ x < 3.71",
              "distractorReason": "Uses 0.01 as the rounding half-width."
            },
            {
              "id": "E",
              "content": "3.7 ≤ x < 3.8",
              "plainText": "3.7 ≤ x < 3.8",
              "distractorReason": "Assumes all possible values must be at least the rounded value."
            }
          ],
          "correctOption": "A",
          "authorNotes": {
            "solution": "The half-unit is 0.05. Values from 3.65 up to, but not including, 3.75 round to 3.7.",
            "solutionPlainText": "The half-unit is 0.05. Values from 3.65 up to, but not including, 3.75 round to 3.7.",
            "tip": "The lower endpoint is included and the upper endpoint is excluded.",
            "calibration": "Official ESAT Mathematics 1 specimen: broader verified rounding-interval style; no close archive item."
          }
        },
        {
          "id": "esat-m1-module-2-q06",
          "number": 6,
          "difficulty": "medium",
          "syllabus": {
            "code": "M2.5",
            "topic": "Number"
          },
          "estimatedSeconds": 70,
          "strongQuestion": false,
          "content": "A four-digit code uses each of the digits 1, 2, 3 and 4 exactly once. How many of the possible codes are even?",
          "plainText": "A four-digit code uses each of the digits 1, 2, 3 and 4 exactly once. How many of the possible codes are even?",
          "options": [
            {
              "id": "A",
              "content": "4",
              "plainText": "4",
              "distractorReason": "Chooses only the final digit and one arrangement of the others."
            },
            {
              "id": "B",
              "content": "6",
              "plainText": "6",
              "distractorReason": "Counts arrangements after fixing one particular even final digit only."
            },
            {
              "id": "C",
              "content": "8",
              "plainText": "8",
              "distractorReason": "Uses 2³ for the remaining positions."
            },
            {
              "id": "D",
              "content": "12",
              "plainText": "12",
              "distractorReason": null
            },
            {
              "id": "E",
              "content": "16",
              "plainText": "16",
              "distractorReason": "Uses 4² without enforcing that all digits are used once."
            },
            {
              "id": "F",
              "content": "24",
              "plainText": "24",
              "distractorReason": "Counts all 4! codes without restricting the final digit."
            }
          ],
          "correctOption": "D",
          "authorNotes": {
            "solution": "The final digit must be 2 or 4, giving 2 choices. The remaining three digits can be arranged in 3! = 6 ways, so there are 2 × 6 = 12 codes.",
            "solutionPlainText": "The final digit must be 2 or 4, giving 2 choices. The remaining three digits can be arranged in 3! = 6 ways, so there are 2 × 6 = 12 codes.",
            "tip": "Choose the restricted final digit first.",
            "calibration": "NSAA 2022, Part A, Q17: systematic counting of selections from a small set."
          }
        },
        {
          "id": "esat-m1-module-2-q07",
          "number": 7,
          "difficulty": "hard",
          "syllabus": {
            "code": "M3.1",
            "topic": "Ratio and proportion"
          },
          "estimatedSeconds": 90,
          "strongQuestion": true,
          "content": "A map has scale 1:25 000. A lake has area 6 cm² on the map. What is its actual area in hectares?",
          "plainText": "A map has scale 1:25 000. A lake has area 6 cm² on the map. What is its actual area in hectares?",
          "options": [
            {
              "id": "A",
              "content": "0.0375 ha",
              "plainText": "0.0375 ha",
              "distractorReason": "Uses the length scale and then converts square metres to hectares twice."
            },
            {
              "id": "B",
              "content": "0.375 ha",
              "plainText": "0.375 ha",
              "distractorReason": "Misses a factor of 100 in the hectare conversion."
            },
            {
              "id": "C",
              "content": "3.75 ha",
              "plainText": "3.75 ha",
              "distractorReason": "Misses a factor of 10 in the final conversion."
            },
            {
              "id": "D",
              "content": "15 ha",
              "plainText": "15 ha",
              "distractorReason": "Uses 2500 m² for each map square centimetre."
            },
            {
              "id": "E",
              "content": "25 ha",
              "plainText": "25 ha",
              "distractorReason": "Uses the map denominator as the answer in hectares."
            },
            {
              "id": "F",
              "content": "37.5 ha",
              "plainText": "37.5 ha",
              "distractorReason": null
            },
            {
              "id": "G",
              "content": "375 ha",
              "plainText": "375 ha",
              "distractorReason": "Treats 1000 m² as one hectare."
            }
          ],
          "correctOption": "F",
          "authorNotes": {
            "solution": "One map centimetre represents 250 m, so 1 cm² represents \\(250^{2}\\) = 62 500 \\(m^{2}\\). Thus 6 cm² represents 375 000 \\(m^{2}\\) = 37.5 hectares.",
            "solutionPlainText": "One map centimetre represents 250 m, so 1 cm² represents 250² = 62 500 m². Thus 6 cm² represents 375 000 m² = 37.5 hectares.",
            "tip": "Square a length scale when converting area.",
            "calibration": "ENGAA 2018, Part A, Q13: scale modelling with cubic, rather than linear, conversion."
          }
        },
        {
          "id": "esat-m1-module-2-q08",
          "number": 8,
          "difficulty": "easy",
          "syllabus": {
            "code": "M3.8",
            "topic": "Ratio and proportion"
          },
          "estimatedSeconds": 50,
          "strongQuestion": false,
          "content": "After a 12% reduction, a jacket costs £176. What was its original price?",
          "plainText": "After a 12% reduction, a jacket costs £176. What was its original price?",
          "options": [
            {
              "id": "A",
              "content": "£200",
              "plainText": "£200",
              "distractorReason": null
            },
            {
              "id": "B",
              "content": "£197.12",
              "plainText": "£197.12",
              "distractorReason": "Adds 12% of £176 to the reduced price."
            },
            {
              "id": "C",
              "content": "£188",
              "plainText": "£188",
              "distractorReason": "Adds £12 rather than 12%."
            },
            {
              "id": "D",
              "content": "£155",
              "plainText": "£155",
              "distractorReason": "Subtracts 12% again."
            },
            {
              "id": "E",
              "content": "£211.20",
              "plainText": "£211.20",
              "distractorReason": "Uses 176 × 1.2 instead of reversing the 12% decrease."
            }
          ],
          "correctOption": "A",
          "authorNotes": {
            "solution": "The reduced price is 88% of the original, so the original price is \\(\\frac{176}{0}\\).88 = £200.",
            "solutionPlainText": "The reduced price is 88% of the original, so the original price is 176/0.88 = £200.",
            "tip": "Divide by the multiplier 0.88 rather than adding 12%.",
            "calibration": "NSAA 2022, Part A, Q5: reverse successive percentage changes."
          }
        },
        {
          "id": "esat-m1-module-2-q09",
          "number": 9,
          "difficulty": "hard",
          "syllabus": {
            "code": "M3.9",
            "topic": "Ratio and proportion"
          },
          "estimatedSeconds": 85,
          "strongQuestion": true,
          "content": "For positive variables, t is directly proportional to d and inversely proportional to \\(v^{2}\\). When d = 8 and v = 2, t = 6. What is t when d = 15 and v = 5?",
          "plainText": "For positive variables, t is directly proportional to d and inversely proportional to v². When d = 8 and v = 2, t = 6. What is t when d = 15 and v = 5?",
          "options": [
            {
              "id": "A",
              "content": "0.72",
              "plainText": "0.72",
              "distractorReason": "Uses v rather than v² and then inverts the final ratio."
            },
            {
              "id": "B",
              "content": "1.2",
              "plainText": "1.2",
              "distractorReason": "Uses inverse proportion to v rather than v²."
            },
            {
              "id": "C",
              "content": "1.5",
              "plainText": "1.5",
              "distractorReason": "Uses k = 2.5 from an incorrect rearrangement."
            },
            {
              "id": "D",
              "content": "1.8",
              "plainText": "1.8",
              "distractorReason": null
            },
            {
              "id": "E",
              "content": "3.0",
              "plainText": "3.0",
              "distractorReason": "Divides by v rather than v² after finding k."
            },
            {
              "id": "F",
              "content": "4.5",
              "plainText": "4.5",
              "distractorReason": "Uses direct proportion to v²."
            },
            {
              "id": "G",
              "content": "11.25",
              "plainText": "11.25",
              "distractorReason": "Scales t by d and v in the same direction."
            }
          ],
          "correctOption": "D",
          "authorNotes": {
            "solution": "Write t = kd/\\(v^{2}\\). From 6 = 8k/4, k = 3. Therefore t = 3 × \\(\\frac{15}{25}\\) = \\(\\frac{45}{25}\\) = 1.8.",
            "solutionPlainText": "Write t = kd/v². From 6 = 8k/4, k = 3. Therefore t = 3 × 15/25 = 45/25 = 1.8.",
            "tip": "Put every proportional relationship into one formula.",
            "calibration": "NSAA 2023, Part A, Q14: chained direct and inverse proportion."
          }
        },
        {
          "id": "esat-m1-module-2-q10",
          "number": 10,
          "difficulty": "medium",
          "syllabus": {
            "code": "M3.11",
            "topic": "Ratio and proportion"
          },
          "estimatedSeconds": 65,
          "strongQuestion": false,
          "content": "A population of 2500 increases by 20% in one year and then decreases by 10% in the next year. What is the population after the two changes?",
          "plainText": "A population of 2500 increases by 20% in one year and then decreases by 10% in the next year. What is the population after the two changes?",
          "options": [
            {
              "id": "A",
              "content": "2500",
              "plainText": "2500",
              "distractorReason": "Assumes a 20% rise and 10% fall cancel to no change."
            },
            {
              "id": "B",
              "content": "2700",
              "plainText": "2700",
              "distractorReason": null
            },
            {
              "id": "C",
              "content": "2750",
              "plainText": "2750",
              "distractorReason": "Applies a net 10% increase to the original value."
            },
            {
              "id": "D",
              "content": "2800",
              "plainText": "2800",
              "distractorReason": "Uses an incorrect combined multiplier of 1.12."
            },
            {
              "id": "E",
              "content": "3000",
              "plainText": "3000",
              "distractorReason": "Applies only the 20% increase."
            },
            {
              "id": "F",
              "content": "2250",
              "plainText": "2250",
              "distractorReason": "Applies only the 10% decrease."
            }
          ],
          "correctOption": "B",
          "authorNotes": {
            "solution": "Use successive multipliers: 2500 × 1.20 × 0.90 = 2500 × 1.08 = 2700.",
            "solutionPlainText": "Use successive multipliers: 2500 × 1.20 × 0.90 = 2500 × 1.08 = 2700.",
            "tip": "Apply percentage changes multiplicatively, in order.",
            "calibration": "ENGAA 2018, Part A, Q17: successive multiplicative percentage changes."
          }
        },
        {
          "id": "esat-m1-module-2-q11",
          "number": 11,
          "difficulty": "hard",
          "syllabus": {
            "code": "M4.6",
            "topic": "Algebra"
          },
          "estimatedSeconds": 90,
          "strongQuestion": true,
          "content": "For x ≠ -1 and x ≠ 1, which expression is equal to 1/(x - 1) - 1/(x + 1)?",
          "plainText": "For x ≠ -1 and x ≠ 1, which expression is equal to 1/(x - 1) - 1/(x + 1)?",
          "options": [
            {
              "id": "A",
              "content": "0",
              "plainText": "0",
              "distractorReason": "Cancels the two fractions because their numerators match."
            },
            {
              "id": "B",
              "content": "2/(x + 1)",
              "plainText": "2/(x + 1)",
              "distractorReason": "Cancels x - 1 across a subtraction."
            },
            {
              "id": "C",
              "content": "2/(x - 1)",
              "plainText": "2/(x - 1)",
              "distractorReason": "Cancels x + 1 across a subtraction."
            },
            {
              "id": "D",
              "content": "-2/(\\(x^{2}\\) - 1)",
              "plainText": "-2/(x² - 1)",
              "distractorReason": "Reverses the subtraction in the combined numerator."
            },
            {
              "id": "E",
              "content": "2/(\\(x^{2}\\) - 1)",
              "plainText": "2/(x² - 1)",
              "distractorReason": null
            },
            {
              "id": "F",
              "content": "1/(\\(x^{2}\\) - 1)",
              "plainText": "1/(x² - 1)",
              "distractorReason": "Finds the correct denominator but loses the numerator 2."
            }
          ],
          "correctOption": "E",
          "authorNotes": {
            "solution": "Using the common denominator (x - 1)(x + 1), the numerator is (x + 1) - (x - 1) = 2. Hence the result is 2/(\\(x^{2}\\) - 1).",
            "solutionPlainText": "Using the common denominator (x - 1)(x + 1), the numerator is (x + 1) - (x - 1) = 2. Hence the result is 2/(x² - 1).",
            "tip": "Keep brackets around each numerator when subtracting fractions.",
            "calibration": "NSAA 2022, Part A, Q7: rational-expression simplification with factorised denominators."
          }
        },
        {
          "id": "esat-m1-module-2-q12",
          "number": 12,
          "difficulty": "easy",
          "syllabus": {
            "code": "M4.10",
            "topic": "Algebra"
          },
          "estimatedSeconds": 60,
          "strongQuestion": false,
          "content": "A line passes through (2, 5) and is perpendicular to y = \\(\\frac{1}{2}\\) x - 3. What is the y-intercept of the line?",
          "plainText": "A line passes through (2, 5) and is perpendicular to y = 1/2 x - 3. What is the y-intercept of the line?",
          "options": [
            {
              "id": "A",
              "content": "-9",
              "plainText": "-9",
              "distractorReason": "Uses the correct magnitude but the wrong intercept sign."
            },
            {
              "id": "B",
              "content": "-1",
              "plainText": "-1",
              "distractorReason": "Uses only the negative reciprocal as the intercept."
            },
            {
              "id": "C",
              "content": "9",
              "plainText": "9",
              "distractorReason": null
            },
            {
              "id": "D",
              "content": "1",
              "plainText": "1",
              "distractorReason": "Uses the original gradient's reciprocal without its sign."
            },
            {
              "id": "E",
              "content": "5",
              "plainText": "5",
              "distractorReason": "Reports the given point's y-coordinate."
            },
            {
              "id": "F",
              "content": "13",
              "plainText": "13",
              "distractorReason": "Adds rather than subtracts the gradient contribution at x = 2."
            }
          ],
          "correctOption": "C",
          "authorNotes": {
            "solution": "The perpendicular gradient is -2. Using y - 5 = -2(x - 2) gives y = -2x + 9, so the y-intercept is 9.",
            "solutionPlainText": "The perpendicular gradient is -2. Using y - 5 = -2(x - 2) gives y = -2x + 9, so the y-intercept is 9.",
            "tip": "Perpendicular gradients multiply to -1.",
            "calibration": "NSAA 2023, Part A, Q12: perpendicular gradients with algebraic coordinates."
          }
        },
        {
          "id": "esat-m1-module-2-q13",
          "number": 13,
          "difficulty": "medium",
          "syllabus": {
            "code": "M4.15",
            "topic": "Algebra"
          },
          "estimatedSeconds": 80,
          "strongQuestion": true,
          "content": "The line y = x + 2 meets the circle \\(x^{2}\\) + \\(y^{2}\\) = 20 at two points. What is the positive x-coordinate of an intersection?",
          "plainText": "The line y = x + 2 meets the circle x² + y² = 20 at two points. What is the positive x-coordinate of an intersection?",
          "options": [
            {
              "id": "A",
              "content": "-4",
              "plainText": "-4",
              "distractorReason": "Chooses the negative intersection."
            },
            {
              "id": "B",
              "content": "-2",
              "plainText": "-2",
              "distractorReason": "Uses the negative of the line's constant term."
            },
            {
              "id": "C",
              "content": "0",
              "plainText": "0",
              "distractorReason": "Assumes the circle meets the line on the y-axis."
            },
            {
              "id": "D",
              "content": "1",
              "plainText": "1",
              "distractorReason": "Halves the positive root."
            },
            {
              "id": "E",
              "content": "4",
              "plainText": "4",
              "distractorReason": "Uses the magnitude of the negative root."
            },
            {
              "id": "F",
              "content": "6",
              "plainText": "6",
              "distractorReason": "Adds the magnitudes of the two roots."
            },
            {
              "id": "G",
              "content": "2",
              "plainText": "2",
              "distractorReason": null
            }
          ],
          "correctOption": "G",
          "authorNotes": {
            "solution": "Substitute y = x + 2: \\(x^{2}\\) + (x + 2)² = 20. This gives \\(x^{2}\\) + 2x - 8 = 0, so (x + 4)(x - 2) = 0. The positive x-coordinate is 2.",
            "solutionPlainText": "Substitute y = x + 2: x² + (x + 2)² = 20. This gives x² + 2x - 8 = 0, so (x + 4)(x - 2) = 0. The positive x-coordinate is 2.",
            "tip": "Substitute the linear equation into the quadratic equation.",
            "calibration": "NSAA 2023, Part A, Q8: a short quadratic created from another algebraic condition."
          }
        },
        {
          "id": "esat-m1-module-2-q14",
          "number": 14,
          "difficulty": "easy",
          "syllabus": {
            "code": "M4.3",
            "topic": "Algebra"
          },
          "estimatedSeconds": 50,
          "strongQuestion": false,
          "content": "The formula E = mv²/2 is used with m = 3 and v = 4. What is E?",
          "plainText": "The formula E = mv²/2 is used with m = 3 and v = 4. What is E?",
          "options": [
            {
              "id": "A",
              "content": "6",
              "plainText": "6",
              "distractorReason": "Calculates mv/2 without squaring v."
            },
            {
              "id": "B",
              "content": "8",
              "plainText": "8",
              "distractorReason": "Calculates v²/2 and omits m."
            },
            {
              "id": "C",
              "content": "12",
              "plainText": "12",
              "distractorReason": "Squares v, subtracts m, then halves approximately."
            },
            {
              "id": "D",
              "content": "16",
              "plainText": "16",
              "distractorReason": "Reports v² only."
            },
            {
              "id": "E",
              "content": "48",
              "plainText": "48",
              "distractorReason": "Calculates mv² but forgets to divide by 2."
            },
            {
              "id": "F",
              "content": "24",
              "plainText": "24",
              "distractorReason": null
            }
          ],
          "correctOption": "F",
          "authorNotes": {
            "solution": "E = 3 × \\(4^{2}\\) / 2 = 3 × \\(\\frac{16}{2}\\) = 24.",
            "solutionPlainText": "E = 3 × 4² / 2 = 3 × 16 / 2 = 24.",
            "tip": "Square v before multiplying by m.",
            "calibration": "ENGAA 2018, Part A, Q20: direct substitution into a contextual formula."
          }
        },
        {
          "id": "esat-m1-module-2-q15",
          "number": 15,
          "difficulty": "hard",
          "syllabus": {
            "code": "M4.16",
            "topic": "Algebra"
          },
          "estimatedSeconds": 90,
          "strongQuestion": true,
          "content": "The line y = 4x + k is tangent to the parabola y = \\(x^{2}\\). What is k?",
          "plainText": "The line y = 4x + k is tangent to the parabola y = x². What is k?",
          "options": [
            {
              "id": "A",
              "content": "-16",
              "plainText": "-16",
              "distractorReason": "Sets the discriminant to 16 rather than zero."
            },
            {
              "id": "B",
              "content": "-8",
              "plainText": "-8",
              "distractorReason": "Uses b² + 2ac instead of b² - 4ac."
            },
            {
              "id": "C",
              "content": "-4",
              "plainText": "-4",
              "distractorReason": null
            },
            {
              "id": "D",
              "content": "0",
              "plainText": "0",
              "distractorReason": "Assumes the standard parabola is tangent only to a line through the origin."
            },
            {
              "id": "E",
              "content": "4",
              "plainText": "4",
              "distractorReason": "Loses the negative sign when solving for k."
            },
            {
              "id": "F",
              "content": "8",
              "plainText": "8",
              "distractorReason": "Halves the wrong term in the discriminant equation."
            }
          ],
          "correctOption": "C",
          "authorNotes": {
            "solution": "At an intersection, \\(x^{2}\\) = 4x + k, so \\(x^{2}\\) - 4x - k = 0. Tangency means one repeated root, so the discriminant is 16 + 4k = 0. Hence k = -4.",
            "solutionPlainText": "At an intersection, x² = 4x + k, so x² - 4x - k = 0. Tangency means one repeated root, so the discriminant is 16 + 4k = 0. Hence k = -4.",
            "tip": "A tangent gives a quadratic with exactly one repeated solution.",
            "calibration": "NSAA 2022, Part A, Q14: using root structure to determine a quadratic parameter."
          }
        },
        {
          "id": "esat-m1-module-2-q16",
          "number": 16,
          "difficulty": "medium",
          "syllabus": {
            "code": "M4.11",
            "topic": "Algebra"
          },
          "estimatedSeconds": 65,
          "strongQuestion": false,
          "content": "What are the coordinates of the minimum point of y = (x - 2)² - 3?",
          "plainText": "What are the coordinates of the minimum point of y = (x - 2)² - 3?",
          "options": [
            {
              "id": "A",
              "content": "(-2, -3)",
              "plainText": "(-2, -3)",
              "distractorReason": "Uses x = -2 instead of x = 2."
            },
            {
              "id": "B",
              "content": "(2, 3)",
              "plainText": "(2, 3)",
              "distractorReason": "Changes the sign of the vertical shift."
            },
            {
              "id": "C",
              "content": "(-2, 3)",
              "plainText": "(-2, 3)",
              "distractorReason": "Changes both shift signs."
            },
            {
              "id": "D",
              "content": "(3, -2)",
              "plainText": "(3, -2)",
              "distractorReason": "Swaps the coordinate values."
            },
            {
              "id": "E",
              "content": "(2, -3)",
              "plainText": "(2, -3)",
              "distractorReason": null
            },
            {
              "id": "F",
              "content": "(0, 1)",
              "plainText": "(0, 1)",
              "distractorReason": "Substitutes x = 0 and reports that point instead of the minimum."
            }
          ],
          "correctOption": "E",
          "authorNotes": {
            "solution": "The square is smallest when x - 2 = 0, so x = 2. Then y = -3. The minimum point is (2, -3).",
            "solutionPlainText": "The square is smallest when x - 2 = 0, so x = 2. Then y = -3. The minimum point is (2, -3).",
            "tip": "Read the turning point directly from completed-square form.",
            "calibration": "NSAA 2022, Part A, Q20: interpreting the minimum point of a family of quadratics."
          }
        },
        {
          "id": "esat-m1-module-2-q17",
          "number": 17,
          "difficulty": "easy",
          "syllabus": {
            "code": "M5.4",
            "topic": "Geometry"
          },
          "estimatedSeconds": 50,
          "strongQuestion": false,
          "content": "In kite ABCD, AB = AD and CB = CD. Which congruence criterion proves that triangles ABC and ADC are congruent?",
          "plainText": "In kite ABCD, AB = AD and CB = CD. Which congruence criterion proves that triangles ABC and ADC are congruent?",
          "options": [
            {
              "id": "A",
              "content": "SSS",
              "plainText": "SSS",
              "distractorReason": null
            },
            {
              "id": "B",
              "content": "SAS",
              "plainText": "SAS",
              "distractorReason": "Uses two side pairs but assumes an equal included angle without proving it."
            },
            {
              "id": "C",
              "content": "ASA",
              "plainText": "ASA",
              "distractorReason": "No pair of equal angles is given initially."
            },
            {
              "id": "D",
              "content": "RHS",
              "plainText": "RHS",
              "distractorReason": "There is no given right angle or hypotenuse information."
            },
            {
              "id": "E",
              "content": "No standard criterion applies",
              "plainText": "No standard criterion applies",
              "distractorReason": "Misses that AC is a common third side."
            }
          ],
          "correctOption": "A",
          "authorNotes": {
            "solution": "AB = AD, BC = DC, and AC is common to both triangles. All three corresponding sides are equal, so SSS applies.",
            "solutionPlainText": "AB = AD, BC = DC, and AC is common to both triangles. All three corresponding sides are equal, so SSS applies.",
            "tip": "Remember to include the shared side AC.",
            "calibration": "Official ESAT Mathematics 1 specimen: broader verified short congruence style; no close archive item."
          },
          "diagram": {
            "svg": "/esat/maths1-practice/m2-q17-kite.svg",
            "png": "/esat/maths1-practice/m2-q17-kite.png",
            "alt": "Kite ABCD split by diagonal AC, with AB equal to AD and CB equal to CD.",
            "notToScale": true
          }
        },
        {
          "id": "esat-m1-module-2-q18",
          "number": 18,
          "difficulty": "medium",
          "syllabus": {
            "code": "M5.2",
            "topic": "Geometry"
          },
          "estimatedSeconds": 70,
          "strongQuestion": false,
          "content": "Each exterior angle of a regular polygon is \\(24^{\\circ}\\). How many sides does the polygon have?",
          "plainText": "Each exterior angle of a regular polygon is 24°. How many sides does the polygon have?",
          "options": [
            {
              "id": "A",
              "content": "8",
              "plainText": "8",
              "distractorReason": "Uses 180/24 and rounds up."
            },
            {
              "id": "B",
              "content": "10",
              "plainText": "10",
              "distractorReason": "Subtracts the exterior angle from 180, then uses the wrong relationship."
            },
            {
              "id": "C",
              "content": "12",
              "plainText": "12",
              "distractorReason": "Uses 360/30 after confusing 24° with a nearby standard angle."
            },
            {
              "id": "D",
              "content": "15",
              "plainText": "15",
              "distractorReason": null
            },
            {
              "id": "E",
              "content": "18",
              "plainText": "18",
              "distractorReason": "Uses 180/10 after an interior-angle detour."
            },
            {
              "id": "F",
              "content": "24",
              "plainText": "24",
              "distractorReason": "Reports the angle itself as the number of sides."
            }
          ],
          "correctOption": "D",
          "authorNotes": {
            "solution": "The exterior angles sum to \\(360^{\\circ}\\), so the number of sides is \\(\\frac{360}{24}\\) = 15.",
            "solutionPlainText": "The exterior angles sum to 360°, so the number of sides is 360/24 = 15.",
            "tip": "For a regular polygon, number of sides equals 360 divided by one exterior angle.",
            "calibration": "NSAA 2022, Part A, Q18: linked interior angles of regular polygons."
          }
        },
        {
          "id": "esat-m1-module-2-q19",
          "number": 19,
          "difficulty": "medium",
          "syllabus": {
            "code": "M5.12",
            "topic": "Geometry"
          },
          "estimatedSeconds": 75,
          "strongQuestion": false,
          "content": "The plan shows stacks of identical cubes. Each number is the height of a stack. Viewed from the south, what are the visible maximum heights from left to right?",
          "plainText": "The plan shows stacks of identical cubes. Each number is the height of a stack. Viewed from the south, what are the visible maximum heights from left to right?",
          "options": [
            {
              "id": "A",
              "content": "2, 1, 4",
              "plainText": "2, 1, 4",
              "distractorReason": "Reads only the north row."
            },
            {
              "id": "B",
              "content": "2, 3, 4",
              "plainText": "2, 3, 4",
              "distractorReason": null
            },
            {
              "id": "C",
              "content": "1, 3, 2",
              "plainText": "1, 3, 2",
              "distractorReason": "Reads only the south row."
            },
            {
              "id": "D",
              "content": "4, 3, 2",
              "plainText": "4, 3, 2",
              "distractorReason": "Finds the correct maxima but reverses their order."
            },
            {
              "id": "E",
              "content": "3, 4, 2",
              "plainText": "3, 4, 2",
              "distractorReason": "Takes maxima along rows instead of viewing columns."
            },
            {
              "id": "F",
              "content": "4, 1, 2",
              "plainText": "4, 1, 2",
              "distractorReason": "Mixes the two rows without taking maxima."
            }
          ],
          "correctOption": "B",
          "authorNotes": {
            "solution": "Looking north from the south, each visible column shows the greater height in its north-south pair. The maxima are max(2,1), max(1,3), max(4,2) = 2, 3, 4.",
            "solutionPlainText": "Looking north from the south, each visible column shows the greater height in its north-south pair. The maxima are max(2,1), max(1,3), max(4,2) = 2, 3, 4.",
            "tip": "For each line of sight, keep only the tallest stack.",
            "calibration": "Official ESAT Mathematics 1 specimen: broader verified plans-and-elevations style; no close archive item."
          },
          "diagram": {
            "svg": "/esat/maths1-practice/m2-q19-plan.svg",
            "png": "/esat/maths1-practice/m2-q19-plan.png",
            "alt": "Plan of six cube stacks in a two-by-three grid, with heights 2, 1, 4 on the north row and 1, 3, 2 on the south row.",
            "notToScale": false
          }
        },
        {
          "id": "esat-m1-module-2-q20",
          "number": 20,
          "difficulty": "medium",
          "syllabus": {
            "code": "M5.15",
            "topic": "Geometry"
          },
          "estimatedSeconds": 75,
          "strongQuestion": false,
          "content": "A running track is formed from a rectangle with a semicircle at each end. Its total length is 14 m and each semicircle has radius 3 m. What is the perimeter?",
          "plainText": "A running track is formed from a rectangle with a semicircle at each end. Its total length is 14 m and each semicircle has radius 3 m. What is the perimeter?",
          "options": [
            {
              "id": "A",
              "content": "14 + \\(3\\pi  m\\)",
              "plainText": "14 + 3π m",
              "distractorReason": "Uses the full 14 m twice incorrectly and only one semicircle arc."
            },
            {
              "id": "B",
              "content": "16 + \\(3\\pi  m\\)",
              "plainText": "16 + 3π m",
              "distractorReason": "Finds the straight sections correctly but includes only one semicircle arc."
            },
            {
              "id": "C",
              "content": "14 + \\(6\\pi  m\\)",
              "plainText": "14 + 6π m",
              "distractorReason": "Uses the full total length as the straight contribution."
            },
            {
              "id": "D",
              "content": "22 + \\(3\\pi  m\\)",
              "plainText": "22 + 3π m",
              "distractorReason": "Adds the diameter to the straight contribution and includes only one semicircle."
            },
            {
              "id": "E",
              "content": "22 + \\(6\\pi  m\\)",
              "plainText": "22 + 6π m",
              "distractorReason": "Uses 11 m for each straight section."
            },
            {
              "id": "F",
              "content": "28 + \\(6\\pi  m\\)",
              "plainText": "28 + 6π m",
              "distractorReason": "Counts the total length twice without removing the rounded ends."
            },
            {
              "id": "G",
              "content": "16 + \\(6\\pi  m\\)",
              "plainText": "16 + 6π m",
              "distractorReason": null
            }
          ],
          "correctOption": "G",
          "authorNotes": {
            "solution": "The two semicircles form a full circle, contributing \\(6\\pi  m\\). The straight part has length 14 - 2(3) = 8 m, and there are two such sides. The perimeter is 16 + \\(6\\pi  m\\).",
            "solutionPlainText": "The two semicircles form a full circle, contributing 6π m. The straight part has length 14 - 2(3) = 8 m, and there are two such sides. The perimeter is 16 + 6π m.",
            "tip": "Subtract both radii from the total length to get one straight section.",
            "calibration": "Official ESAT Mathematics 1 specimen: broader verified composite-shape mensuration style; no close archive item."
          },
          "diagram": {
            "svg": "/esat/maths1-practice/m2-q20-running-track.svg",
            "png": "/esat/maths1-practice/m2-q20-running-track.png",
            "alt": "Running track formed from a rectangle and two semicircular ends, total length 14 m and radius 3 m.",
            "notToScale": true
          }
        },
        {
          "id": "esat-m1-module-2-q21",
          "number": 21,
          "difficulty": "medium",
          "syllabus": {
            "code": "M5.10",
            "topic": "Geometry"
          },
          "estimatedSeconds": 85,
          "strongQuestion": false,
          "content": "The points A(2, 1) and B(6, 5) are joined. At what x-coordinate does the perpendicular bisector of AB cross the x-axis?",
          "plainText": "The points A(2, 1) and B(6, 5) are joined. At what x-coordinate does the perpendicular bisector of AB cross the x-axis?",
          "options": [
            {
              "id": "A",
              "content": "-1",
              "plainText": "-1",
              "distractorReason": "Uses the perpendicular gradient as the x-intercept."
            },
            {
              "id": "B",
              "content": "1",
              "plainText": "1",
              "distractorReason": "Uses the original gradient as the intercept."
            },
            {
              "id": "C",
              "content": "3",
              "plainText": "3",
              "distractorReason": "Reports the midpoint's y-coordinate."
            },
            {
              "id": "D",
              "content": "4",
              "plainText": "4",
              "distractorReason": "Reports the midpoint's x-coordinate."
            },
            {
              "id": "E",
              "content": "5",
              "plainText": "5",
              "distractorReason": "Uses the y-coordinate of B."
            },
            {
              "id": "F",
              "content": "7",
              "plainText": "7",
              "distractorReason": null
            },
            {
              "id": "G",
              "content": "9",
              "plainText": "9",
              "distractorReason": "Adds both midpoint coordinates and the gradient incorrectly."
            }
          ],
          "correctOption": "F",
          "authorNotes": {
            "solution": "The midpoint is (4, 3). AB has gradient 1, so the perpendicular gradient is -1. Its equation is y - 3 = -(x - 4), or y = -x + 7. At y = 0, x = 7.",
            "solutionPlainText": "The midpoint is (4, 3). AB has gradient 1, so the perpendicular gradient is -1. Its equation is y - 3 = -(x - 4), or y = -x + 7. At y = 0, x = 7.",
            "tip": "A perpendicular bisector needs both the midpoint and the negative reciprocal gradient.",
            "calibration": "ENGAA 2018, Part A, Q5 and NSAA 2023, Part A, Q12: line gradients constrained by parallel or perpendicular geometry."
          }
        },
        {
          "id": "esat-m1-module-2-q22",
          "number": 22,
          "difficulty": "medium",
          "syllabus": {
            "code": "M5.7",
            "topic": "Geometry"
          },
          "estimatedSeconds": 80,
          "strongQuestion": false,
          "content": "A right square-based pyramid has base side 12 cm and vertical height TO = 6 cm. O is the centre of the base and C is a base vertex. What is the sloping edge TC?",
          "plainText": "A right square-based pyramid has base side 12 cm and vertical height TO = 6 cm. O is the centre of the base and C is a base vertex. What is the sloping edge TC?",
          "options": [
            {
              "id": "A",
              "content": "6 cm",
              "plainText": "6 cm",
              "distractorReason": "Uses only the vertical height."
            },
            {
              "id": "B",
              "content": "6√2 cm",
              "plainText": "6√2 cm",
              "distractorReason": "Uses OC as the final answer."
            },
            {
              "id": "C",
              "content": "12 cm",
              "plainText": "12 cm",
              "distractorReason": "Uses a half-base and the height but misses the second horizontal dimension."
            },
            {
              "id": "D",
              "content": "6√3 cm",
              "plainText": "6√3 cm",
              "distractorReason": null
            },
            {
              "id": "E",
              "content": "12√2 cm",
              "plainText": "12√2 cm",
              "distractorReason": "Uses the full base diagonal instead of the half-diagonal."
            },
            {
              "id": "F",
              "content": "18 cm",
              "plainText": "18 cm",
              "distractorReason": "Adds the height and base side directly."
            }
          ],
          "correctOption": "D",
          "authorNotes": {
            "solution": "The centre-to-vertex distance is half the square's diagonal: OC = 6√2 cm. Then TC² = TO² + OC² = 36 + 72 = 108, so TC = 6√3 cm.",
            "solutionPlainText": "The centre-to-vertex distance is half the square's diagonal: OC = 6√2 cm. Then TC² = TO² + OC² = 36 + 72 = 108, so TC = 6√3 cm.",
            "tip": "Find the half-diagonal of the square base before using Pythagoras.",
            "calibration": "NSAA 2022, Part A, Q2: compact multi-stage Pythagorean geometry."
          },
          "diagram": {
            "svg": "/esat/maths1-practice/m2-q22-pyramid.svg",
            "png": "/esat/maths1-practice/m2-q22-pyramid.png",
            "alt": "Right square-based pyramid with base side 12 cm, centre O, vertical height TO of 6 cm and sloping edge TC.",
            "notToScale": true
          }
        },
        {
          "id": "esat-m1-module-2-q23",
          "number": 23,
          "difficulty": "hard",
          "syllabus": {
            "code": "M6.3",
            "topic": "Statistics"
          },
          "estimatedSeconds": 90,
          "strongQuestion": true,
          "content": "A set of seven numbers has median 8 and range 12. An eighth number, 30, is added. Which measures must increase?",
          "plainText": "A set of seven numbers has median 8 and range 12. An eighth number, 30, is added. Which measures must increase?",
          "options": [
            {
              "id": "A",
              "content": "The mean and range only",
              "plainText": "The mean and range only",
              "distractorReason": null
            },
            {
              "id": "B",
              "content": "The mean only",
              "plainText": "The mean only",
              "distractorReason": "Misses that 30 must exceed the old maximum."
            },
            {
              "id": "C",
              "content": "The range only",
              "plainText": "The range only",
              "distractorReason": "Misses that adding a value above every old value must raise the mean."
            },
            {
              "id": "D",
              "content": "The mean and median only",
              "plainText": "The mean and median only",
              "distractorReason": "Assumes the median must increase and misses the range."
            },
            {
              "id": "E",
              "content": "The median and range only",
              "plainText": "The median and range only",
              "distractorReason": "Assumes the median must increase and misses the mean."
            },
            {
              "id": "F",
              "content": "The mean, median and range",
              "plainText": "The mean, median and range",
              "distractorReason": "Assumes the new middle pair must have an average above 8."
            }
          ],
          "correctOption": "A",
          "authorNotes": {
            "solution": "The old maximum is at most 20 because the median is 8 and the range is 12. Thus 30 is a new maximum, so the range increases. Every old value is at most 20, so the old mean is below 30 and adding 30 increases the mean. The median may stay at 8 or increase, so it is not forced to increase.",
            "solutionPlainText": "The old maximum is at most 20 because the median is 8 and the range is 12. Thus 30 is a new maximum, so the range increases. Every old value is at most 20, so the old mean is below 30 and adding 30 increases the mean. The median may stay at 8 or increase, so it is not forced to increase.",
            "tip": "Ask what is forced, not what is merely possible.",
            "calibration": "NSAA 2023, Part A, Q4: combining constraints on mean, median and mode."
          }
        },
        {
          "id": "esat-m1-module-2-q24",
          "number": 24,
          "difficulty": "medium",
          "syllabus": {
            "code": "M6.4",
            "topic": "Statistics"
          },
          "estimatedSeconds": 65,
          "strongQuestion": false,
          "content": "The scatter graph shows practice time and score. Which statement is best supported?",
          "plainText": "The scatter graph shows practice time and score. Which statement is best supported?",
          "options": [
            {
              "id": "A",
              "content": "There is no correlation.",
              "plainText": "There is no correlation.",
              "distractorReason": "Ignores the clear upward pattern among most points."
            },
            {
              "id": "B",
              "content": "There is negative correlation.",
              "plainText": "There is negative correlation.",
              "distractorReason": "Lets the isolated point dominate the overall direction."
            },
            {
              "id": "C",
              "content": "Removing the isolated point would weaken the positive correlation.",
              "plainText": "Removing the isolated point would weaken the positive correlation.",
              "distractorReason": "Reverses the effect of the isolated point."
            },
            {
              "id": "D",
              "content": "The graph proves that extra practice causes a higher score.",
              "plainText": "The graph proves that extra practice causes a higher score.",
              "distractorReason": "Confuses correlation with proof of causation."
            },
            {
              "id": "E",
              "content": "There is positive correlation, and removing the isolated point would strengthen it.",
              "plainText": "There is positive correlation, and removing the isolated point would strengthen it.",
              "distractorReason": null
            },
            {
              "id": "F",
              "content": "A line of best fit must pass through the origin.",
              "plainText": "A line of best fit must pass through the origin.",
              "distractorReason": "Assumes a line of best fit has a compulsory intercept."
            }
          ],
          "correctOption": "E",
          "authorNotes": {
            "solution": "Most points follow an upward trend, so the correlation is positive. The isolated point at high practice time and low score works against that trend, so removing it would strengthen the correlation. Correlation alone does not prove causation.",
            "solutionPlainText": "Most points follow an upward trend, so the correlation is positive. The isolated point at high practice time and low score works against that trend, so removing it would strengthen the correlation. Correlation alone does not prove causation.",
            "tip": "Describe the trend, then test how the outlier affects it.",
            "calibration": "Official ESAT Mathematics 1 specimen: broader verified scatter-graph interpretation style; no close archive item."
          },
          "diagram": {
            "svg": "/esat/maths1-practice/m2-q24-scatter.svg",
            "png": "/esat/maths1-practice/m2-q24-scatter.png",
            "alt": "Scatter graph of practice time against score, with a positive trend and one low-score isolated point at high practice time.",
            "notToScale": false
          }
        },
        {
          "id": "esat-m1-module-2-q25",
          "number": 25,
          "difficulty": "medium",
          "syllabus": {
            "code": "M7.7",
            "topic": "Probability"
          },
          "estimatedSeconds": 75,
          "strongQuestion": false,
          "content": "In a group of 60 students, 35 study Physics, 20 study Music, and 12 study both. One student is chosen at random from those who study Physics. What is the probability that the student also studies Music?",
          "plainText": "In a group of 60 students, 35 study Physics, 20 study Music, and 12 study both. One student is chosen at random from those who study Physics. What is the probability that the student also studies Music?",
          "options": [
            {
              "id": "A",
              "content": "\\(\\frac{1}{5}\\)",
              "plainText": "1/5",
              "distractorReason": "Uses 12/60, the probability from the whole group."
            },
            {
              "id": "B",
              "content": "\\(\\frac{12}{35}\\)",
              "plainText": "12/35",
              "distractorReason": null
            },
            {
              "id": "C",
              "content": "\\(\\frac{3}{5}\\)",
              "plainText": "3/5",
              "distractorReason": "Uses 12/20, conditioning on Music instead of Physics."
            },
            {
              "id": "D",
              "content": "\\(\\frac{4}{7}\\)",
              "plainText": "4/7",
              "distractorReason": "Uses 20/35, treating every Music student as a Physics student."
            },
            {
              "id": "E",
              "content": "\\(\\frac{23}{60}\\)",
              "plainText": "23/60",
              "distractorReason": "Uses the number studying Physics only over the whole group."
            },
            {
              "id": "F",
              "content": "\\(\\frac{7}{12}\\)",
              "plainText": "7/12",
              "distractorReason": "Inverts the required conditional probability."
            }
          ],
          "correctOption": "B",
          "authorNotes": {
            "solution": "The sample space is now the 35 Physics students. Of these, 12 also study Music, so the conditional probability is \\(\\frac{12}{35}\\).",
            "solutionPlainText": "The sample space is now the 35 Physics students. Of these, 12 also study Music, so the conditional probability is 12/35.",
            "tip": "After 'from those who', change the denominator to that restricted group.",
            "calibration": "NSAA 2023, Part A, Q20: conditional probability after dependent information."
          }
        },
        {
          "id": "esat-m1-module-2-q26",
          "number": 26,
          "difficulty": "easy",
          "syllabus": {
            "code": "M7.6",
            "topic": "Probability"
          },
          "estimatedSeconds": 55,
          "strongQuestion": false,
          "content": "A fair six-sided die is rolled twice. What is the probability that the product of the two scores is even?",
          "plainText": "A fair six-sided die is rolled twice. What is the probability that the product of the two scores is even?",
          "options": [
            {
              "id": "A",
              "content": "\\(\\frac{1}{4}\\)",
              "plainText": "1/4",
              "distractorReason": "Finds the probability of an odd product and forgets to take the complement."
            },
            {
              "id": "B",
              "content": "\\(\\frac{1}{2}\\)",
              "plainText": "1/2",
              "distractorReason": "Assumes even and odd products are equally likely."
            },
            {
              "id": "C",
              "content": "\\(\\frac{3}{4}\\)",
              "plainText": "3/4",
              "distractorReason": null
            },
            {
              "id": "D",
              "content": "\\(\\frac{5}{6}\\)",
              "plainText": "5/6",
              "distractorReason": "Counts only outcomes containing a 1 as odd."
            },
            {
              "id": "E",
              "content": "\\(\\frac{2}{3}\\)",
              "plainText": "2/3",
              "distractorReason": "Adds the chance of an even score on each die without handling overlap."
            }
          ],
          "correctOption": "C",
          "authorNotes": {
            "solution": "The product is odd only if both scores are odd. That probability is \\(\\frac{3}{6}\\) × \\(\\frac{3}{6}\\) = \\(\\frac{1}{4}\\). Therefore the probability of an even product is 1 - \\(\\frac{1}{4}\\) = \\(\\frac{3}{4}\\).",
            "solutionPlainText": "The product is odd only if both scores are odd. That probability is 3/6 × 3/6 = 1/4. Therefore the probability of an even product is 1 - 1/4 = 3/4.",
            "tip": "The complement is quicker than listing all 36 outcomes.",
            "calibration": "NSAA 2022, Part A, Q4: a non-standard but finite two-dice sample space."
          }
        },
        {
          "id": "esat-m1-module-2-q27",
          "number": 27,
          "difficulty": "hard",
          "syllabus": {
            "code": "M5.9",
            "topic": "Geometry"
          },
          "estimatedSeconds": 90,
          "strongQuestion": true,
          "content": "A, B and C lie on a circle. The line through A is tangent to the circle. The angle between the tangent and chord AB is \\(42^{\\circ}\\), and angle BAC is \\(17^{\\circ}\\). What is angle ABC?",
          "plainText": "A, B and C lie on a circle. The line through A is tangent to the circle. The angle between the tangent and chord AB is 42°, and angle BAC is 17°. What is angle ABC?",
          "options": [
            {
              "id": "A",
              "content": "\\(17^{\\circ}\\)",
              "plainText": "17°",
              "distractorReason": "Copies angle BAC."
            },
            {
              "id": "B",
              "content": "\\(42^{\\circ}\\)",
              "plainText": "42°",
              "distractorReason": "Copies the tangent-chord angle."
            },
            {
              "id": "C",
              "content": "\\(59^{\\circ}\\)",
              "plainText": "59°",
              "distractorReason": "Adds the two known angles instead of subtracting from 180°."
            },
            {
              "id": "D",
              "content": "\\(79^{\\circ}\\)",
              "plainText": "79°",
              "distractorReason": "Subtracts 42° and 59° from 180° after double-counting 17°."
            },
            {
              "id": "E",
              "content": "\\(96^{\\circ}\\)",
              "plainText": "96°",
              "distractorReason": "Assumes the other two angles are both 42°."
            },
            {
              "id": "F",
              "content": "\\(121^{\\circ}\\)",
              "plainText": "121°",
              "distractorReason": null
            },
            {
              "id": "G",
              "content": "\\(138^{\\circ}\\)",
              "plainText": "138°",
              "distractorReason": "Subtracts only 42° from 180°."
            }
          ],
          "correctOption": "F",
          "authorNotes": {
            "solution": "By the alternate segment theorem, angle ACB equals the angle between the tangent and chord AB, so angle ACB = \\(42^{\\circ}\\). Therefore angle ABC = \\(180^{\\circ}\\) - \\(42^{\\circ}\\) - \\(17^{\\circ}\\) = \\(121^{\\circ}\\).",
            "solutionPlainText": "By the alternate segment theorem, angle ACB equals the angle between the tangent and chord AB, so angle ACB = 42°. Therefore angle ABC = 180° - 42° - 17° = 121°.",
            "tip": "Use the tangent-chord angle to create an angle inside the triangle.",
            "calibration": "ENGAA 2018, Part A, Q21: alternate-segment and circle-angle reasoning."
          },
          "diagram": {
            "svg": "/esat/maths1-practice/m2-q27-circle-tangent.svg",
            "png": "/esat/maths1-practice/m2-q27-circle-tangent.png",
            "alt": "Circle through A, B and C with a tangent at A; tangent-chord angle 42 degrees and angle BAC 17 degrees.",
            "notToScale": true
          }
        }
      ]
    }
  ]
};
