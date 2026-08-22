export const ABOUT_PATH = "/about";

export const FOUNDERS = {
  ewan: {
    id: "ewan-ellson",
    name: "Ewan Ellson",
    role: "Co-founder",
    credential: "Medical student at Trinity College, Cambridge",
    homepageCredential: "Medical student at Trinity College, Cambridge",
    bio: "Hi! My name is Ewan and I am a medical student at the University of Cambridge. I have lots of experience with standardised tests from doing the UCAT and of course the ESAT, so I know exactly what would  help future med and bioscience applicants taking the exam. Outside of ESAT CAMP, I love playing the guitar and listening to live music. ",
    imageSrc: "/images/team/ewan-ellson.png",
    imageAlt: "Ewan Ellson playing guitar, co-founder of ESAT Camp",
    imageScale: 1,
    imagePosition: "38% 32%",
  },
  anson: {
    id: "anson-chan",
    name: "Anson Chan",
    role: "Co-founder",
    credential: "MSci Physics student at Imperial College London",
    homepageCredential: "MSci Physics student at Imperial College London",
    bio: "Hi I'm Anson and I'm currently doing a Master's degree in Physics at Imperial College London. Having done the ESAT myself, I'm really passionate about building a tool for future Oxbridge applicants that I wish I had two years ago.",
    imageSrc: "/images/team/anson-chan.png",
    imageAlt: "Anson Chan playing saxophone, co-founder of ESAT Camp",
    imageScale: 1,
    imagePosition: "45% 35%",
  },
} as const;

export type FounderKey = keyof typeof FOUNDERS;
