import {
  DEFAULT_GUIDE_MODULES,
  UNIQUE_ENGAA_PART_B_BY_YEAR,
  type GuideModuleId,
  type GuideProgressId,
} from "@/content/pastPapersGuide";

export type RouteNodeStatus = "active" | "skipped" | "partial";

export type RouteNode = {
  id: string;
  step: number;
  title: string;
  body: string;
  status: RouteNodeStatus;
  skipReason?: string;
  detail?: string;
};

export type BuildRouteInput = {
  modules: readonly GuideModuleId[];
  progress: GuideProgressId;
};

const hasModule = (
  modules: readonly GuideModuleId[],
  id: GuideModuleId,
): boolean => modules.includes(id);

const uniqueEngaaPartBSummary = (): string => {
  const lines = Object.entries(UNIQUE_ENGAA_PART_B_BY_YEAR).map(
    ([year, questions]) => `${year}: Q${questions.join(", Q")}`,
  );
  return lines.join(". ");
};

export function buildPaperRoute({
  modules,
  progress,
}: BuildRouteInput): RouteNode[] {
  const nodes: RouteNode[] = [];
  let step = 1;

  const push = (node: Omit<RouteNode, "step">) => {
    nodes.push({ ...node, step: step++ });
  };

  push({
    id: "esat-samples",
    title: "Official ESAT specimen and practice tests",
    body: "Do these first to learn the real computer interface, navigation and 27-questions-in-40-minutes format. Treat them as format practice, not a reliable score prediction.",
    status: progress === "esat_samples" ? "skipped" : "active",
    skipReason:
      progress === "esat_samples" ? "Already completed" : undefined,
  });

  if (hasModule(modules, "maths1")) {
    push({
      id: "nsaa-part-a",
      title: "NSAA Section 1 Part A",
      body: "The cleanest large official source for Mathematics 1. Use 2016–2023 and skip anything UAT-UK has crossed out.",
      status: "active",
    });
  }

  if (hasModule(modules, "physics")) {
    push({
      id: "nsaa-part-b",
      title: "NSAA Section 1 Part B",
      body: "Strong Physics practice in the same short, no-calculator style. Use 2016–2023.",
      status: "active",
    });
  }

  if (hasModule(modules, "chemistry")) {
    push({
      id: "nsaa-part-c",
      title: "NSAA Section 1 Part C",
      body: "Your main legacy source for Chemistry. ENGAA contains no Chemistry.",
      status: "active",
    });
  }

  if (hasModule(modules, "biology")) {
    push({
      id: "nsaa-part-d",
      title: "NSAA Section 1 Part D",
      body: "Your main legacy source for Biology. ENGAA contains no Biology.",
      status: "active",
    });
  }

  if (hasModule(modules, "maths2")) {
    const nsaaDone = progress === "nsaa_s1";
    push({
      id: "engaa-part-b",
      title: "ENGAA Section 1 Part B",
      body: nsaaDone
        ? "The most useful official legacy source for Mathematics 2. For 2016–2019, do only the unique ENGAA questions if you have already completed NSAA Part E. For 2020–2023, Part B is fresh material relative to NSAA Section 1."
        : "The most useful official legacy source for Mathematics 2. For 2016–2019, do only the unique ENGAA questions if you have already completed NSAA Part E. For 2020–2023, Part B is fresh material relative to NSAA Section 1.",
      status: nsaaDone ? "partial" : "active",
      detail: nsaaDone ? uniqueEngaaPartBSummary() : undefined,
    });
  }

  const scienceModules =
    hasModule(modules, "physics") ||
    hasModule(modules, "chemistry") ||
    hasModule(modules, "biology");

  if (scienceModules) {
    push({
      id: "nsaa-s2-2020",
      title: "NSAA Section 2, 2020–2023",
      body: "Useful harder Physics, Chemistry or Biology practice. Choose only your subject and skip questions outside the current ESAT specification.",
      status: progress === "nsaa_s2" ? "skipped" : "active",
      skipReason: progress === "nsaa_s2" ? "Already completed" : undefined,
    });
  }

  if (hasModule(modules, "physics")) {
    const skipEngaaS2 =
      progress === "nsaa_s2" && hasModule(modules, "physics");
    push({
      id: "engaa-s2-2016",
      title: "ENGAA Section 2, 2016–2019",
      body: "Harder Physics and less similar to current ESAT, but useful once the closer material is running low. The current UAT-UK archive does not include these papers.",
      status: "active",
    });
    if (skipEngaaS2) {
      push({
        id: "engaa-s2-2020",
        title: "ENGAA Section 2, 2020–2023",
        body: "Harder Physics practice, but duplicates NSAA Section 2 Part X Physics from the same year.",
        status: "skipped",
        skipReason: "Already covered in NSAA Section 2 Part X",
      });
    }
  }

  if (hasModule(modules, "maths2")) {
    push({
      id: "tmua-p1",
      title: "TMUA Paper 1",
      body: "Good extra Mathematics 2 problem solving. The questions are longer, so use roughly 2 to 2.5 minutes per question rather than the original TMUA timing.",
      status: "active",
    });
  }

  if (progress === "nsaa_s1") {
    push({
      id: "engaa-part-a-skip",
      title: "ENGAA Section 1 Part A",
      body: "Complete overlap with NSAA Section 1 Parts A and B from the same year.",
      status: "skipped",
      skipReason: "Already covered in NSAA",
    });
  }

  push({
    id: "full-mocks",
    title: "Full ESAT-format mocks",
    body: "Build 40-minute, 27-question modules. Then practise all required modules back-to-back so speed and concentration still hold in the final module.",
    status: "active",
  });

  return nodes;
}

export function routeToPlainText(nodes: readonly RouteNode[]): string {
  return nodes
    .map((node) => {
      const prefix =
        node.status === "skipped"
          ? "[Skip]"
          : node.status === "partial"
            ? "[Partial]"
            : "[Do]";
      const skip = node.skipReason ? ` (${node.skipReason})` : "";
      const detail = node.detail ? `\n   ${node.detail}` : "";
      return `${node.step}. ${prefix} ${node.title}${skip}\n   ${node.body}${detail}`;
    })
    .join("\n\n");
}

export function parseModulesParam(raw: string | null): GuideModuleId[] {
  if (!raw) return [...DEFAULT_GUIDE_MODULES];
  const valid = new Set<GuideModuleId>([
    "maths1",
    "maths2",
    "physics",
    "chemistry",
    "biology",
  ]);
  const parsed = raw
    .split(",")
    .map((part) => part.trim())
    .filter((part): part is GuideModuleId =>
      valid.has(part as GuideModuleId),
    );
  return parsed.length ? parsed : [...DEFAULT_GUIDE_MODULES];
}

export function parseProgressParam(raw: string | null): GuideProgressId {
  const valid: GuideProgressId[] = [
    "nothing",
    "esat_samples",
    "nsaa_s1",
    "engaa_s1",
    "nsaa_s2",
  ];
  if (raw && valid.includes(raw as GuideProgressId)) {
    return raw as GuideProgressId;
  }
  return "nothing";
}

export function modulesToParam(modules: readonly GuideModuleId[]): string {
  return modules.join(",");
}
