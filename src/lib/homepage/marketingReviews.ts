export type MarketingReviewStars = 4 | 5;

export interface MarketingReview {
  id: string;
  stars: MarketingReviewStars;
  quote: string;
  emailMask: string;
}

/** Student feedback shown on the marketing homepage. */
export const MARKETING_HOMEPAGE_REVIEWS: MarketingReview[] = [
  {
    id: "gatekeeping",
    stars: 5,
    quote:
      "ngl i'm been gatekeeping this 😭 the question bank is actually pretty good especially once you start running out of ENGAA/NSAA papers",
    emailMask: "arjun17***@***.org.uk",
  },
  {
    id: "finished-papers",
    stars: 5,
    quote:
      "Finished every paper this summer and ESAT Camp has been useful for having something new to practice.",
    emailMask: "sophie.chan***@***.ac.uk",
  },
  {
    id: "score-converter",
    stars: 5,
    quote:
      "Loads of questions and the score converter is actually useful rather and not just a guide.",
    emailMask: "james24***@***.com",
  },
  {
    id: "promising",
    stars: 4,
    quote:
      "Relatively new compared with some of the other sites but honestly very promising. Some bits still feel like they're being developed but they update it constantly.",
    emailMask: "mohammed.k***@***.org.uk",
  },
  {
    id: "mental-maths",
    stars: 5,
    quote:
      "the mental maths thing is so simple but its probably helped me more than anything else with timing",
    emailMask: "lily_06***@***.outlook.com",
  },
  {
    id: "organised-papers",
    stars: 5,
    quote:
      "Was looking everywhere for all the old NSAA and ENGAA papers and this just has them organised properly. Then ended up using the question bank as well.",
    emailMask: "daniel.wong***@***.edu.hk",
  },
  {
    id: "bio-smaller",
    stars: 4,
    quote:
      "Really good for maths and physics. When I first tried it the biology question bank was noticeably smaller, although the rest of the site was great.",
    emailMask: "aisha19***@***.org.uk",
  },
  {
    id: "chem-bio-behind",
    stars: 4,
    quote:
      "The chemistry and biology sections initially felt a bit behind the maths/physics content. Still gave it 4 stars because everything else was good and they seem to be adding questions quickly.",
    emailMask: "tommyxu***@***.gmail.com",
  },
  {
    id: "cooked",
    stars: 5,
    quote:
      "im actually cooked because ive finished basically all the past papers already 😭 this came at exactly the right time",
    emailMask: "evelyn.chen28***@***.com",
  },
  {
    id: "dangerous",
    stars: 5,
    quote:
      "Found this through the score converter and ended up spending an hour grinding questions. Very dangerous website",
    emailMask: "harry07***@***.ac.uk",
  },
  {
    id: "more-bio",
    stars: 4,
    quote:
      "Good site and getting better really quickly. Would love even more Biology because those subjects are much harder to find resources for than Maths.",
    emailMask: "ryan.l***@***.outlook.com",
  },
  {
    id: "bio-chem",
    stars: 5,
    quote:
      "finally somewhere that understands there are people doing bio + chem ESAT and not literally everyone is applying for engineering",
    emailMask: "chloe2007***@***.org.uk",
  },
  {
    id: "one-place",
    stars: 5,
    quote:
      "Honestly just nice having past papers in one place instead of opening 15 tabs",
    emailMask: "samir.patel***@***.edu.hk",
  },
  {
    id: "gatekeep-applicants",
    stars: 5,
    quote:
      "Lowkey don't want other applicants finding this until after the ESAT",
    emailMask: "olivia_x***@***.gmail.com",
  },
  {
    id: "value",
    stars: 5,
    quote:
      "Started using it just for Maths 1 and ended up using the question Bank. Very good value compared with tutoring.",
    emailMask: "ethan23***@***.com",
  },
  {
    id: "earlier",
    stars: 5,
    quote: "Really wish I'd found it earlier.",
    emailMask: "alex.wu08***@***.org.uk",
  },
  {
    id: "made-by-students",
    stars: 5,
    quote:
      "Feels like it was made by people who are sitting/have sat these admissions tests rather than some massive tutoring company.",
    emailMask: "grace.lam***@***.ac.uk",
  },
  {
    id: "clean",
    stars: 5,
    quote: "very clean site",
    emailMask: "benji_17***@***.outlook.com",
  },
  {
    id: "wont-finish-bank",
    stars: 5,
    quote:
      "No idea what to do after i finished all the ENGAA and NSAA material, but I don't think i will be finishing question bank",
    emailMask: "izzy2008***@***.gmail.com",
  },
  {
    id: "fermi",
    stars: 5,
    quote:
      "the fermi game has absolutely nothing to do with why this but somehow i open this thing every day 💀",
    emailMask: "leo.chan31***@***.edu.hk",
  },
];

export const MARKETING_HOMEPAGE_REVIEW_REPLY = {
  title: "Reply from ESAT Camp",
  body: [
    "Thank you for all the feedback!",
    "Since then, we've significantly expanded both our Biology and Chemistry resources, and now have a dedicated team working specifically on questions for these subjects. There's plenty more coming soon, and good luck on your revision.",
  ],
} as const;

const PREVIEW_COUNT = 8;

/** Deterministic daily shuffle so SSR and client agree for a given UTC day. */
export function pickMarketingReviewOrder(seed = utcDaySeed()): MarketingReview[] {
  return seededShuffle(MARKETING_HOMEPAGE_REVIEWS, seed);
}

export function splitMarketingReviews(seed = utcDaySeed()): {
  preview: MarketingReview[];
  rest: MarketingReview[];
} {
  const ordered = pickMarketingReviewOrder(seed);
  return {
    preview: ordered.slice(0, PREVIEW_COUNT),
    rest: ordered.slice(PREVIEW_COUNT),
  };
}

function utcDaySeed(): string {
  return new Date().toISOString().slice(0, 10);
}

function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    const j = Math.abs(h) % (i + 1);
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return arr;
}
