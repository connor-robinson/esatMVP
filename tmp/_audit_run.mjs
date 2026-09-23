
import { PUBLIC_SITEMAP_ENTRIES } from "./src/lib/seo/publicSitemap.ts";
const paths = PUBLIC_SITEMAP_ENTRIES.map(e => e.path);
console.log(JSON.stringify(paths, null, 2));
console.error("COUNT", paths.length);
