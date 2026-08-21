/**
 * Fermi estimation question bank.
 *
 * Each question has a true `answer` (a single positive number) and an optional
 * `unit` for display. `answers` are approximate real-world figures - the game
 * scores on order-of-magnitude closeness, so rough sourced values are fine.
 */

export type FermiCategory =
  | "nature"
  | "geography"
  | "history"
  | "science"
  | "economy"
  | "tech"
  | "human body"
  | "everyday"
  | "sports"
  | "astronomy"
  | "landmarks"
  | "physics"
  | "space"
  | (string & {});

export interface FermiQuestion {
  id: string;
  question: string;
  answer: number;
  unit?: string;
  category: FermiCategory;
  /** One-line context shown after guessing. */
  note?: string;
}

/** In-play question - answer omitted for server-scheduled rounds. */
export type PlayableFermiQuestion = Omit<FermiQuestion, "answer"> & {
  answer?: number;
};

export const FERMI_QUESTIONS: FermiQuestion[] = [
  {
    id: "piano-tuners-chicago",
    question: "How many piano tuners are there in Chicago?",
    answer: 100,
    unit: "tuners",
    category: "everyday",
    note: "The classic Fermi problem. Estimates land around ~100 working piano tuners.",
  },
  {
    id: "heartbeats-lifetime",
    question: "How many times does a human heart beat in an average lifetime?",
    answer: 2.5e9,
    unit: "beats",
    category: "human body",
    note: "~70 bpm × 60 × 24 × 365 × ~80 years ≈ 2.5 billion beats.",
  },
  {
    id: "breaths-per-day",
    question: "How many breaths does an average person take in one day?",
    answer: 20000,
    unit: "breaths",
    category: "human body",
    note: "~12–16 breaths/min × 60 × 24 ≈ 17,000–23,000 per day.",
  },
  {
    id: "earth-circumference",
    question: "What is the circumference of the Earth at the equator, in metres?",
    answer: 4.0075e7,
    unit: "m",
    category: "geography",
    note: "About 40,075 km. The metre was originally defined from this.",
  },
  {
    id: "grains-of-sand",
    question: "Roughly how many grains of sand are on all of Earth's beaches and deserts?",
    answer: 7.5e18,
    unit: "grains",
    category: "nature",
    note: "A commonly cited estimate is ~7.5 × 10^18 grains.",
  },
  {
    id: "cells-human-body",
    question: "How many cells are in the human body?",
    answer: 3.7e13,
    unit: "cells",
    category: "human body",
    note: "Modern estimates put it around 30–40 trillion cells.",
  },
  {
    id: "seconds-in-year",
    question: "How many seconds are there in one year?",
    answer: 3.15e7,
    unit: "seconds",
    category: "science",
    note: "365 × 24 × 60 × 60 ≈ 31.5 million (a handy ~π × 10^7).",
  },
  {
    id: "distance-to-moon",
    question: "What is the average distance from the Earth to the Moon, in metres?",
    answer: 3.84e8,
    unit: "m",
    category: "science",
    note: "About 384,400 km on average.",
  },
  {
    id: "speed-of-light",
    question: "What is the speed of light in a vacuum, in metres per second?",
    answer: 2.998e8,
    unit: "m/s",
    category: "science",
    note: "Exactly 299,792,458 m/s by definition.",
  },
  {
    id: "atoms-in-body",
    question: "Roughly how many atoms are in the human body?",
    answer: 7e27,
    unit: "atoms",
    category: "science",
    note: "On the order of 10^27 atoms, mostly hydrogen and oxygen.",
  },
  {
    id: "google-searches-per-day",
    question: "How many Google searches happen worldwide per day?",
    answer: 8.5e9,
    unit: "searches",
    category: "tech",
    note: "Estimated at roughly 8.5 billion searches per day.",
  },
  {
    id: "emails-per-day",
    question: "How many emails are sent worldwide each day?",
    answer: 3.5e11,
    unit: "emails",
    category: "tech",
    note: "Estimates are around 300–360 billion emails daily.",
  },
  {
    id: "world-population",
    question: "What is the current world population?",
    answer: 8.1e9,
    unit: "people",
    category: "geography",
    note: "About 8.1 billion people as of the mid-2020s.",
  },
  {
    id: "hairs-on-head",
    question: "How many hairs are on a typical human head?",
    answer: 100000,
    unit: "hairs",
    category: "human body",
    note: "Around 100,000–150,000 scalp hairs.",
  },
  {
    id: "libraries-uk",
    question: "How many public libraries are there in the UK?",
    answer: 3200,
    unit: "libraries",
    category: "geography",
    note: "Roughly 3,000–3,600 public libraries across the UK.",
  },
  {
    id: "big-macs-per-year",
    question: "How many Big Macs does McDonald's sell worldwide each year?",
    answer: 1.3e9,
    unit: "Big Macs",
    category: "economy",
    note: "Estimated at around 1.3 billion Big Macs a year.",
  },
  {
    id: "words-in-english",
    question: "Roughly how many words are in the English language?",
    answer: 1.7e5,
    unit: "words",
    category: "everyday",
    note: "The Oxford English Dictionary lists ~170,000 words in current use.",
  },
  {
    id: "ants-on-earth",
    question: "Approximately how many ants are alive on Earth right now?",
    answer: 2e16,
    unit: "ants",
    category: "nature",
    note: "A 2022 study estimated ~20 quadrillion (2 × 10^16) ants.",
  },
  {
    id: "blinks-per-day",
    question: "How many times does an average person blink in a day?",
    answer: 20000,
    unit: "blinks",
    category: "human body",
    note: "~15–20 blinks per minute while awake ≈ 15,000–20,000 a day.",
  },
  {
    id: "commercial-flights-per-day",
    question: "How many commercial flights take off worldwide on a typical day?",
    answer: 100000,
    unit: "flights",
    category: "tech",
    note: "Roughly 100,000 commercial flights per day globally.",
  },
  {
    id: "stars-milky-way",
    question: "How many stars are in the Milky Way galaxy?",
    answer: 2e11,
    unit: "stars",
    category: "science",
    note: "Estimates range from 100–400 billion stars.",
  },
  {
    id: "gdp-usa",
    question: "What is the annual GDP of the United States, in US dollars?",
    answer: 2.7e13,
    unit: "USD",
    category: "economy",
    note: "About $27 trillion per year in the mid-2020s.",
  },
  {
    id: "trees-on-earth",
    question: "How many trees are there on Earth?",
    answer: 3e12,
    unit: "trees",
    category: "nature",
    note: "A 2015 study estimated roughly 3 trillion trees.",
  },
  {
    id: "words-spoken-per-day",
    question: "How many words does an average person speak per day?",
    answer: 16000,
    unit: "words",
    category: "everyday",
    note: "Research suggests around 16,000 words per day on average.",
  },
  {
    id: "raindrops-in-storm",
    question: "How many litres of water fall on 1 km² during 10 mm of rainfall?",
    answer: 1e7,
    unit: "litres",
    category: "nature",
    note: "10 mm over 1,000,000 m² = 10,000 m³ = 10 million litres.",
  },
];
