/**
 * Calendar hooks for FermiGuessr generation: observances, big holidays, on-this-day.
 * Dates are UTC calendar days (YYYY-MM-DD).
 */

export type DayContext = {
  dateKey: string;
  /** Human weekday, e.g. "Thursday". */
  weekday: string;
  observances: string[];
  onThisDay: string[];
  /** When set, generate all 5 questions in this themed edition. */
  editionTitle: string | null;
  /** One-line brief for the model. */
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

/** Fixed observances keyed by MM-DD. */
const FIXED: Record<string, { observances?: string[]; bigEdition?: string }> = {
  "01-01": { observances: ["New Year's Day"], bigEdition: "New Year Edition" },
  "02-02": { observances: ["Groundhog Day"] },
  "02-14": { observances: ["Valentine's Day"], bigEdition: "Valentine's Edition" },
  "03-14": { observances: ["Pi Day"], bigEdition: "Pi Day Edition" },
  "03-17": { observances: ["St Patrick's Day"] },
  "04-01": { observances: ["April Fools' Day"] },
  "04-22": { observances: ["Earth Day"], bigEdition: "Earth Day Edition" },
  "05-04": { observances: ["Star Wars Day"] },
  "05-25": { observances: ["Towel Day"] },
  "06-21": { observances: ["International Day of Yoga", "June solstice"] },
  "07-04": { observances: ["US Independence Day"], bigEdition: "Independence Day Edition" },
  "07-20": { observances: ["Moon Day (Apollo 11 landing anniversary)"] },
  "08-15": { observances: ["Assumption / mid-August holiday cue"] },
  "09-19": { observances: ["International Talk Like a Pirate Day"] },
  "09-21": { observances: ["International Day of Peace"] },
  "09-22": { observances: ["Autumn equinox (Northern Hemisphere, approx)"] },
  "09-29": { observances: ["World Heart Day (nearby late Sep)"] },
  "10-01": { observances: ["International Coffee Day"] },
  "10-04": { observances: ["World Animal Day"] },
  "10-05": { observances: ["World Teachers' Day"] },
  "10-09": { observances: ["World Post Day"] },
  "10-10": { observances: ["World Mental Health Day"] },
  "10-16": { observances: ["World Food Day"] },
  "10-24": { observances: ["United Nations Day"] },
  "10-31": { observances: ["Halloween"], bigEdition: "Halloween Edition" },
  "11-01": { observances: ["All Saints' Day", "Day of the Dead continues"] },
  "11-05": { observances: ["Guy Fawkes Night (UK)"] },
  "11-11": { observances: ["Armistice / Remembrance Day"] },
  "11-28": { observances: ["US Thanksgiving (floating; cue if near)"] },
  "12-24": { observances: ["Christmas Eve"] },
  "12-25": { observances: ["Christmas Day"], bigEdition: "Christmas Edition" },
  "12-31": { observances: ["New Year's Eve"] },
};

/** Fun / obscure / food days that make great Fermi hooks (MM-DD). */
const FUN_DAYS: Record<string, string[]> = {
  "09-15": ["Greenpeace founding anniversary vibes", "International Day of Democracy (nearby)"],
  "09-16": ["World Ozone Day", "Mexican Independence Day"],
  "09-18": ["National Cheeseburger Day (US food holiday)"],
  "09-20": ["National Punch Day (US food holiday)"],
  "09-23": ["Celebrate Bisexuality Day", "Autumnal astronomy week"],
  "09-24": ["National Punctuation Day"],
  "09-25": ["World Rivers Day (last Sunday of Sep often; cue)"],
  "09-26": ["European Day of Languages"],
  "09-27": ["World Tourism Day"],
  "09-28": ["World Rabies Day", "International Right to Know Day"],
  "09-30": ["International Podcast Day", "National Love People Day cues"],
  "10-02": ["International Day of Non-Violence (Gandhi's birthday)"],
  "10-03": ["World Architecture Day (early Oct Mondays often; cue)"],
  "10-06": ["National Noodle Day (US food holiday)"],
  "10-07": ["World Cotton Day"],
  "10-08": ["World Octopus Day"],
  "10-11": ["National Coming Out Day"],
  "10-12": ["World Egg Day (second Friday of Oct often; cue)", "Indigenous Peoples' Day / Columbus Day (US)"],
  "10-13": ["International Day for Disaster Risk Reduction", "National M&M's Day (US)"],
  "10-14": ["World Standards Day"],
  "10-15": ["Global Handwashing Day", "National Cheese Curd Day (US)"],
  "10-17": ["International Day for the Eradication of Poverty"],
  "10-18": ["World Menopause Day"],
  "10-20": ["World Statistics Day (every 5 years; still a stats cue)", "International Chefs Day"],
  "10-21": ["Apple Day (UK)", "Back to the Future Day (Oct 21, 2015 future-date lore)"],
  "10-22": ["International Stuttering Awareness Day", "Caps Lock Day"],
  "10-23": ["Mole Day (chemistry, 6:02×10^23 cue)"],
  "10-25": ["World Pasta Day"],
  "10-26": ["National Pumpkin Day (US)"],
  "10-27": ["World Day for Audiovisual Heritage"],
  "10-28": ["International Animation Day"],
  "10-29": ["National Cat Day (US)", "Internet Day / World Wide Web anniversary cues"],
  "10-30": ["National Candy Corn Day (US)", "checklist for Halloween eve"],
  "11-02": ["All Souls' Day", "National Deviled Egg Day (US)"],
  "11-03": ["World Jellyfish Day"],
  "11-04": ["National Candy Day (US)"],
  "11-06": ["Saxophone Day"],
  "11-07": ["International Inventions Day cues"],
  "11-08": ["World Radiography Day", "National Cappuccino Day (US)"],
  "11-09": ["World Freedom Day cues", "National Chaos Never Dies Day (odd fun day)"],
  "11-10": ["World Science Day for Peace and Development (nearby Nov 10)"],
  "11-12": ["World Pneumonia Day"],
  "11-13": ["World Kindness Day"],
  "11-14": ["World Diabetes Day"],
};

/**
 * Memorable "on this day" hooks (calendar anniversary, not year-specific).
 * Prefer vivid, estimable angles (crowds, machines, distances, money, time).
 */
const ON_THIS_DAY: Record<string, string[]> = {
  "09-15": ["1830: Liverpool & Manchester Railway opens (first inter-city passenger railway era)"],
  "09-16": ["1620: Mayflower departs Plymouth (voyage-scale estimation fodder)"],
  "09-17": ["1787: US Constitution signed"],
  "09-19": ["1991: Ötzi the Iceman discovered in the Alps"],
  "09-20": ["1973: Billie Jean King wins Battle of the Sexes"],
  "09-21": ["1937: The Hobbit first published"],
  "09-25": ["1959: First Xerox plain-paper copier introduced (914)"],
  "09-26": ["1580: Drake completes circumnavigation (Golden Hind)"],
  "09-27": ["1825: Stockton & Darlington Railway opens"],
  "09-28": ["1928: Fleming notices penicillin mold"],
  "09-29": ["1954: CERN founded"],
  "09-30": ["1962: Rachel Carson's Silent Spring published"],
  "10-01": ["1908: Ford Model T introduction era begins"],
  "10-03": ["1990: German reunification"],
  "10-04": ["1957: Sputnik 1 launches"],
  "10-05": ["1962: Beatles' first single Love Me Do released"],
  "10-08": ["1871: Great Chicago Fire begins (overnight into Oct 9)"],
  "10-09": ["1967: Che Guevara executed (historical scale, handle carefully) - prefer Post Day angle"],
  "10-10": ["1845: US Naval Academy opens"],
  "10-12": ["1492: Columbus reaches the Americas (handle carefully; prefer Indigenous Peoples angles)"],
  "10-14": ["1947: Chuck Yeager breaks the sound barrier"],
  "10-15": ["1997: Cassini launches toward Saturn"],
  "10-16": ["1923: Walt Disney Company founded (as Disney Brothers Studio era)"],
  "10-18": ["1967: Venera 4 reaches Venus"],
  "10-19": ["1781: Cornwallis surrenders at Yorktown"],
  "10-21": ["1805: Battle of Trafalgar", "2015: Back to the Future Day"],
  "10-22": ["1962: Cuban Missile Crisis address"],
  "10-24": ["1945: United Nations Charter enters into force"],
  "10-25": ["1415: Battle of Agincourt"],
  "10-27": ["1904: New York City subway opens"],
  "10-28": ["1886: Statue of Liberty dedicated"],
  "10-29": ["1929: Black Tuesday stock market crash"],
  "10-30": ["1938: War of the Worlds radio broadcast"],
  "10-31": ["1517: Luther posts the Ninety-five Theses (traditional date)", "Halloween"],
  "11-01": ["1755: Lisbon earthquake"],
  "11-03": ["1957: Sputnik 2 / Laika launch era"],
  "11-04": ["1922: Tutankhamun's tomb discovered"],
  "11-05": ["1605: Gunpowder Plot"],
  "11-07": ["1917: October Revolution (Julian calendar date lore)"],
  "11-08": ["1895: Röntgen discovers X-rays"],
  "11-09": ["1989: Berlin Wall opens"],
  "11-10": ["1969: Sesame Street premieres"],
  "11-11": ["1918: Armistice ends WWI fighting"],
  "11-12": ["2014: Philae lands on comet 67P"],
  "11-13": ["1985: Nevado del Ruiz eruption / Armero tragedy (sensitive; prefer Kindness Day)"],
  "11-14": ["1948: Prince Charles born (historical census-scale angles OK)"],
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
    `Date: ${dateKey} (${weekday}, UTC).`,
  ];
  if (editionTitle) {
    parts.push(
      `BIG HOLIDAY EDITION: "${editionTitle}". All 5 questions must fit this theme. Make it playful and cohesive.`,
    );
  } else if (observances.length) {
    parts.push(
      `Day hooks (use at least 1 question tied to one of these; others may be wildcards): ${observances.join("; ")}.`,
    );
  } else {
    parts.push(
      "No major observance listed. Invent a clever 'today-shaped' hook (season, weekday energy, or a surprising niche) OR use a classic Fermi wildcard.",
    );
  }
  if (onThisDay.length) {
    parts.push(
      `Optional "year ago / on this day" history hooks (estimable angles only): ${onThisDay.join("; ")}.`,
    );
  }
  parts.push(
    "Aim for SUPER CREATIVE, fun, out-of-the-box estimation prompts. Mix scales (tiny to planetary). Avoid dry textbook wording.",
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
