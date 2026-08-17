import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/JsonLd";
import { FaqGuideHub } from "@/components/tools/FaqGuideHub";
import {
  APP_ROUTES,
  SITE_URL,
  buildSeoMetadata,
} from "@/lib/seo/config";
import { FAQ_GUIDE_SECTIONS, SEO_LINKS } from "@/lib/seo/links";

const PATH = APP_ROUTES.faqs;
const TITLE = "ESAT Guides & FAQs | Dates, Modules, Papers and Scoring";
const DESCRIPTION =
  "Browse ESAT CAMP guides on test dates, Maths 1 and 2, Physics, past papers, calculator rules and what a good score looks like.";

export const metadata: Metadata = buildSeoMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  keywords: [
    "ESAT FAQ",
    "ESAT guides",
    "ESAT test dates",
    "ESAT past papers",
    "ESAT Maths 1",
    "ESAT score",
  ],
});

const GUIDES = FAQ_GUIDE_SECTIONS.flatMap((section) =>
  section.keys.map((key) => SEO_LINKS[key]),
);

const SCHEMA = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "ESAT guides",
  description: DESCRIPTION,
  url: `${SITE_URL}${PATH}`,
  mainEntity: {
    "@type": "ItemList",
    itemListElement: GUIDES.map((guide, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: guide.label,
      url: `${SITE_URL}${guide.href}`,
    })),
  },
};

export default function FaqsPage() {
  return (
    <>
      <JsonLd schema={SCHEMA} />
      <FaqGuideHub />
    </>
  );
}
