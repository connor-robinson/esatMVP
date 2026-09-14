/**
 * Calendar hooks for FermiGuessr generation: light observances + big holidays.
 * Soft, everyday themes only. No politics, disasters, or niche history essays.
 */

export type DayContext = {
  dateKey: string;
  weekday: string;
  observances: string[];
  onThisDay: string[];
  editionTitle: string | null;
  brief: string;
};

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/** Big holidays / universally known days only. */
const FIXED: Record<string, { observances?: string[]; bigEdition?: string }> = {
  "01-01": { observances: ["New Year's Day"], bigEdition: "New Year Edition" },
  "02-14": { observances: ["Valentine's Day"], bigEdition: "Valentine's Edition" },
  "03-14": { observances: ["Pi Day"], bigEdition: "Pi Day Edition" },
  "03-17": { observances: ["St Patrick's Day"] },
  "04-01": { observances: ["April Fools' Day"] },
  "04-22": { observances: ["Earth Day"], bigEdition: "Earth Day Edition" },
  "05-04": { observances: ["Star Wars Day"] },
  "07-04": { observances: ["US Independence Day food/fireworks vibe"] },
  "07-20": { observances: ["Moon landing anniversary"] },
  "10-01": { observances: ["International Coffee Day"] },
  "10-04": { observances: ["World Animal Day"] },
  "10-16": { observances: ["World Food Day"] },
  "10-31": { observances: ["Halloween"], bigEdition: "Halloween Edition" },
  "11-05": { observances: ["Bonfire Night / fireworks (UK)"] },
  "12-24": { observances: ["Christmas Eve"] },
  "12-25": { observances: ["Christmas Day"], bigEdition: "Christmas Edition" },
  "12-31": { observances: ["New Year's Eve"] },
};

/** Everyday / food / nature hooks teens and families get instantly. */
const FUN_DAYS: Record<string, string[]> = {
  "10-02": ["autumn walks", "hot drinks weather"],
  "10-03": ["weekend sports"],
  "10-05": ["school / uni Monday energy"],
  "10-06": ["noodles / comfort food"],
  "10-07": ["cotton / clothes / laundry"],
  "10-08": ["oceans / seafood"],
  "10-09": ["post / packages / delivery"],
  "10-10": ["sleep / rest"],
  "10-11": ["phones / scrolling"],
  "10-12": ["eggs / breakfast"],
  "10-13": ["candy / sweets"],
  "10-14": ["running / fitness"],
  "10-15": ["handwashing / soap"],
  "10-17": ["money / spending"],
  "10-18": ["space / planets"],
  "10-19": ["Monday coffee"],
  "10-20": ["cooking / kitchens"],
  "10-21": ["apples / orchards"],
  "10-22": ["typing / keyboards"],
  "10-23": ["huge numbers / science vibes"],
  "10-24": ["cities / crowds"],
  "10-25": ["pasta"],
  "10-26": ["pumpkins"],
  "10-27": ["music / headphones"],
  "10-28": ["animation / cartoons"],
  "10-29": ["cats / pets"],
  "10-30": ["Halloween eve sweets"],
};

/**
 * Soft pop-culture / science / everyday history only.
 * Skip wars, politics, disasters, revolutions, executions.
 */
const ON_THIS_DAY: Record<string, string[]> = {
  "10-01": ["coffee / cafes everywhere"],
  "10-04": ["Sputnik / space race vibe (keep light)"],
  "10-05": ["Beatles / music charts"],
  "10-14": ["sound barrier / jets (keep simple)"],
  "10-16": ["Disney / cartoons"],
  "10-21": ["Back to the Future Day lore"],
  "10-27": ["NYC subway opens (crowds / trains)"],
  "10-28": ["Statue of Liberty"],
  "10-30": ["War of the Worlds radio broadcast (fiction scare)"],
  "10-31": ["Halloween"],
  "11-04": ["Tutankhamun tomb discovery (treasure / museums)"],
  "11-08": ["X-rays discovered"],
  "11-10": ["Sesame Street premiere"],
};

function mmdd(dateKey: string): string {
  return dateKey.slice(5);
}

function parseUtcDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function listDateKeys(start: string, days: number): string[] {
  const out: string[] = [];
  const startDate = parseUtcDateKey(start);
  for (let i = 0; i < days; i++) {
    const d = new Date(startDate.getTime() + i * 86_400_000);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

export function getDayContext(dateKey: string): DayContext {
  const d = parseUtcDateKey(dateKey);
  const key = mmdd(dateKey);
  const fixed = FIXED[key];
  const fun = FUN_DAYS[key] ?? [];
  const onThisDay = ON_THIS_DAY[key] ?? [];
  const observances = [...(fixed?.observances ?? []), ...fun];
  const editionTitle = fixed?.bigEdition ?? null;
  const weekday = WEEKDAYS[d.getUTCDay()];

  const parts: string[] = [
    `Date: ${dateKey} (${weekday}).`,
    "Audience: friends and family, especially ages 18-24. Plain English. Dinner-table talk.",
  ];

  if (editionTitle) {
    parts.push(
      `BIG HOLIDAY EDITION: "${editionTitle}". All 5 questions fit the theme, still short and human.`,
    );
  } else if (observances.length) {
    parts.push(
      `Optional soft theme cues (at most ONE question may lightly nod to these; do NOT lecture the date): ${observances.join("; ")}.`,
    );
  } else {
    parts.push(
      "No special day required. Prefer surprising everyday estimates over holiday framing.",
    );
  }

  if (onThisDay.length) {
    parts.push(
      `Optional light pop/science cues (never politics/war/disaster): ${onThisDay.join("; ")}.`,
    );
  }

  parts.push(
    "Most questions should be surprising Fermi classics: ants, heartbeats, phones, pizza, rain, planes, hair, stars, money, body, food, sports. Short. Human. Fun.",
  );

  return {
    dateKey,
    weekday,
    observances,
    onThisDay,
    editionTitle,
    brief: parts.join(" "),
  };
}
