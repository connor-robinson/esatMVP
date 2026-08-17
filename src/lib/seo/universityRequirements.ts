export const HISTORICAL_AVERAGE_NOTE =
  "Historical average, not a cut-off. Small cohorts and contextual admissions mean these numbers should not be treated as college-specific requirements.";

export const CAMBRIDGE_DASHBOARD_HREF =
  "https://www.undergraduate.study.cam.ac.uk/apply/before/application-statistics";

export const IMPERIAL_SCORE_DASHBOARD_HREF =
  "https://www.imperial.ac.uk/study/apply/undergraduate/process/admissions-tests/understanding-your-esat-and-tmua-scores/";

export const COMPARISON_COLUMNS = [
  "University",
  "Course",
  "ESAT modules",
  "Normal 2027 sitting",
] as const;

export const COMPARISON_ROWS: readonly (readonly string[])[] = [
  ["Cambridge", "Engineering", "Maths 1, Maths 2, Physics", "October"],
  [
    "Cambridge",
    "Natural Sciences",
    "Maths 1 + any 2 of Biology, Chemistry, Physics, Maths 2",
    "October",
  ],
  [
    "Cambridge",
    "Chemical Engineering & Biotechnology",
    "Maths 1 + any 2 of Biology, Chemistry, Physics, Maths 2",
    "October",
  ],
  [
    "Cambridge",
    "Veterinary Medicine",
    "Maths 1 + any 2 of Biology, Chemistry, Physics, Maths 2",
    "October",
  ],
  ["Oxford", "Engineering Science", "Maths 1, Maths 2, Physics", "October"],
  ["Oxford", "Physics", "Maths 1, Maths 2, Physics", "October"],
  ["Oxford", "Physics & Philosophy", "Maths 1, Maths 2, Physics", "October"],
  [
    "Oxford",
    "Biomedical Sciences",
    "Maths 1 + any 2 of Biology, Chemistry, Physics, Maths 2",
    "October",
  ],
  ["Imperial", "Various Engineering/Science courses", "Course dependent", "Check course"],
  [
    "UCL",
    "Electronic & Electrical Engineering",
    "Maths 1 + any 2 of Physics, Maths 2, Chemistry, Biology",
    "October or January where permitted",
  ],
];

export const CAMBRIDGE_MODULE_ROWS: readonly (readonly string[])[] = [
  ["Engineering", "Mathematics 1 + Mathematics 2 + Physics"],
  [
    "Natural Sciences",
    "Mathematics 1 + any 2 of Biology, Chemistry, Physics, Mathematics 2",
  ],
  [
    "Chemical Engineering & Biotechnology",
    "Mathematics 1 + any 2 of Biology, Chemistry, Physics, Mathematics 2",
  ],
  [
    "Veterinary Medicine",
    "Mathematics 1 + any 2 of Biology, Chemistry, Physics, Mathematics 2",
  ],
];

export const CAMBRIDGE_ACADEMIC_ROWS: readonly (readonly string[])[] = [
  [
    "Engineering",
    "A*A*A",
    "Mathematics and Physics; Further Mathematics to AS or A level if available",
  ],
  [
    "Natural Sciences",
    "A*A*A",
    "Mathematics and two other science/mathematics subjects",
  ],
  [
    "Veterinary Medicine",
    "A*AA",
    "Chemistry plus at least one of Biology, Mathematics or Physics",
  ],
  [
    "Chemical Engineering & Biotechnology",
    "Check official course page",
    "Follow current course-specific subject requirements",
  ],
];

export const ENGINEERING_COLLEGE_COLUMNS = [
  "College",
  "Applicant M1",
  "Applicant Physics",
  "Applicant M2",
  "Offer-holder M1",
  "Offer-holder Physics",
  "Offer-holder M2",
] as const;

export const ENGINEERING_COLLEGE_ROWS: readonly (readonly string[])[] = [
  ["Christ's", "5.00", "4.79", "5.03", "7.05", "6.60", "6.42"],
  ["Churchill", "4.80", "4.77", "4.83", "5.98", "5.90", "5.91"],
  ["Clare", "4.86", "4.87", "4.71", "6.18", "7.34", "6.80"],
  ["Corpus Christi", "4.66", "4.78", "4.57", "5.98", "6.48", "5.88"],
  ["Downing", "4.61", "4.57", "4.38", "6.94", "6.47", "6.65"],
  ["Emmanuel", "4.56", "4.75", "4.58", "5.81", "6.28", "5.93"],
  ["Fitzwilliam", "5.64", "5.28", "5.47", "6.31", "6.25", "6.21"],
  ["Girton", "4.74", "4.38", "4.60", "5.79", "6.24", "5.78"],
  ["Gonville and Caius", "4.57", "4.65", "4.54", "6.68", "6.67", "6.43"],
  ["Homerton", "5.01", "4.69", "4.87", "6.42", "6.59", "6.33"],
  ["Hughes Hall", "6.15", "5.65", "5.52", "7.85", "5.50", "7.00"],
  ["Jesus", "4.30", "4.39", "4.28", "6.42", "6.65", "6.38"],
  ["King's", "4.34", "4.34", "4.48", "5.82", "5.63", "5.80"],
  ["Lucy Cavendish", "5.18", "5.01", "5.07", "6.14", "6.10", "6.03"],
  ["Magdalene", "5.26", "5.27", "5.30", "6.05", "6.35", "6.22"],
  ["Murray Edwards", "5.06", "4.50", "4.94", "7.08", "6.64", "6.95"],
  ["Newnham", "4.61", "4.54", "4.67", "6.40", "5.95", "5.88"],
  ["Pembroke", "4.59", "4.61", "4.42", "6.38", "6.46", "6.48"],
  ["Peterhouse", "5.00", "4.84", "4.97", "6.41", "5.92", "6.11"],
  ["Queens'", "4.82", "4.64", "4.78", "6.58", "6.57", "6.40"],
  ["Robinson", "5.72", "5.37", "5.58", "6.54", "6.58", "6.99"],
  ["Selwyn", "4.58", "4.51", "4.47", "6.23", "7.06", "5.79"],
  ["Sidney Sussex", "5.28", "5.09", "5.19", "5.98", "6.02", "5.97"],
  ["St Catharine's", "4.75", "4.74", "4.51", "5.60", "5.86", "5.70"],
  ["St Edmund's", "6.84", "6.37", "6.49", "5.93", "5.79", "5.98"],
  ["St John's", "4.38", "4.41", "4.25", "5.84", "6.52", "5.85"],
  ["Trinity", "4.61", "4.40", "4.66", "6.36", "5.93", "6.24"],
  ["Trinity Hall", "5.15", "4.86", "5.15", "6.75", "7.00", "6.64"],
  ["Wolfson", "4.33", "3.92", "5.28", "6.45", "6.25", "6.53"],
];

export const ENGINEERING_HOME_INTL_COLUMNS = [
  "Group",
  "Applicant M1",
  "Applicant Physics",
  "Applicant M2",
  "Offer-holder M1",
  "Offer-holder Physics",
  "Offer-holder M2",
] as const;

export const ENGINEERING_HOME_INTL_ROWS: readonly (readonly string[])[] = [
  ["Home", "4.25", "4.32", "4.24", "5.67", "5.85", "5.67"],
  ["International / non-UK", "5.51", "5.19", "5.38", "7.41", "7.20", "7.21"],
];

export const OXFORD_COURSE_ROWS: readonly (readonly string[])[] = [
  ["Engineering Science", "Mathematics 1 + Mathematics 2 + Physics"],
  ["Physics", "Mathematics 1 + Mathematics 2 + Physics"],
  ["Physics and Philosophy", "Mathematics 1 + Mathematics 2 + Physics"],
  [
    "Biomedical Sciences",
    "Mathematics 1 + any 2 of Biology, Chemistry, Physics, Mathematics 2",
  ],
];

export const OXFORD_COMPETITION_ROWS: readonly (readonly string[])[] = [
  ["Engineering Science", "37%", "15%", "174", "3-year average 2023-25"],
  ["Physics", "31%", "11%", "173", "3-year average 2023-25"],
];

export const IMPERIAL_COURSE_ROWS: readonly (readonly string[])[] = [
  ["Aeronautics", "Maths 1 + Maths 2 + Physics"],
  ["Chemical Engineering", "Maths 1 + Maths 2 + Chemistry"],
  ["Civil & Environmental Engineering", "Maths 1 + Maths 2 + Physics"],
  ["Design Engineering", "Maths 1 + Maths 2"],
  ["Electrical & Electronic Engineering", "Maths 1 + Maths 2 + Physics"],
  ["Life Sciences", "Maths 1 + Chemistry + Biology"],
  ["Mechanical Engineering", "Maths 1 + Maths 2 + Physics"],
  ["Physics", "Maths 1 + Maths 2 + Physics"],
];
