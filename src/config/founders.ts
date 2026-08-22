export const ABOUT_PATH = "/about";

export const FOUNDERS = {
  ewan: {
    id: "ewan-ellson",
    name: "Ewan Ellson",
    role: "Co-founder",
    credential:
      "Incoming Medicine student at Trinity College, University of Cambridge",
    homepageCredential:
      "Incoming Medicine student at Trinity College, Cambridge",
    bio: "Ewan is the public face of ESAT Camp and helps shape how we explain difficult ideas clearly. His focus is making admissions preparation feel approachable, structured and genuinely useful.",
    imageSrc: "/images/team/ewan-ellson.webp",
    imageAlt: "Portrait of Ewan Ellson, co-founder of ESAT Camp",
  },
  anson: {
    id: "anson-chan",
    name: "Anson Chan",
    role: "Co-founder & Product Lead",
    credential: "MSci Physics student at Imperial College London",
    homepageCredential:
      "Incoming MSci Physics student at Imperial College London",
    bio: "Anson leads the development of ESAT Camp’s question bank, preparation tools and data-driven resources, with a particular focus on mathematics and physics.",
    imageSrc: "/images/team/anson-chan.webp",
    imageAlt: "Portrait of Anson Chan, co-founder and product lead at ESAT Camp",
  },
} as const;

export type FounderKey = keyof typeof FOUNDERS;
