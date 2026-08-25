import { api, bar, clear, el, flagLabel, paperLabel, pct, qs, stateTag } from "./common.js";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "image", label: "Still image" },
  { id: "text", label: "Converted" },
  { id: "failed", label: "Failed" },
  { id: "review", label: "Needs review" },
  { id: "diagram", label: "Has diagram" },
  { id: "unreviewed", label: "Not hand-checked" },
];

const paperId = Number(qs("paperId"));
const state = { data: null, filter: "all" };

function matches(question) {
  switch (state.filter) {
    case "image":
      return !question.converted;
    case "text":
      return question.converted;
    case "failed":
      return question.conversionStatus === "failed";
    case "review":
      return question.needsReview;
    case "diagram":
      return question.hasDiagram || question.hasTable;
    case "unreviewed":
      return !question.studioReviewed;
    default:
      return true;
  }
}

function dotClass(question) {
  if (question.conversionStatus === "failed") return "dot red";
  if (question.needsReview) return "dot violet";
  if (question.converted) return question.studioReviewed ? "dot green" : "dot amber";
  return "dot";
}

function tile(question) {
  const sub = [];
  if (question.hasDiagram) sub.push("diagram");
  else if (question.hasTable) sub.push("table");
  if (question.studioReviewed) sub.push("checked");
  else if (question.converted) sub.push("text");
  else sub.push("image");

  return el("a", { class: "q-tile", href: `/review?questionId=${question.questionId}` }, [
    el("div", { class: "num", text: String(question.questionNumber) }),
    el("div", { class: "sub" }, [
      el("span", { class: dotClass(question) }),
      el("span", { text: sub.join(" · ") }),
    ]),
  ]);
}

function renderSummary() {
  const { paper } = state.data;
  const stats = paper.stats;
  document.getElementById("crumb").innerHTML =
    `<b>${paperLabel(paper)}</b> · paper ${paper.paperId}`;
  document.title = `${paperLabel(paper)} · Conversion Studio`;

  const host = clear(document.getElementById("summary"));
  host.appendChild(
    el("div", { class: "row", style: "margin-bottom:12px" }, [
      el("div", { class: "grow" }, [
        el("div", { style: "font-size:17px;font-weight:660" }, [paperLabel(paper)]),
        el("div", { class: "muted", style: "font-size:13px" }, [
          `${stats.converted} of ${stats.total} questions converted to text`,
        ]),
      ]),
      stateTag(paper.state, stats),
    ]),
  );
  host.appendChild(bar(stats.converted, stats.total));

  const flagCounts = new Map();
  for (const question of state.data.questions) {
    for (const flag of question.flags) {
      flagCounts.set(flag, (flagCounts.get(flag) || 0) + 1);
    }
  }
  const chips = [
    el("span", { class: "tag info", text: `${pct(stats.converted, stats.total)}% text` }),
    stats.failed ? el("span", { class: "tag bad", text: `${stats.failed} failed` }) : null,
    stats.needsReview
      ? el("span", { class: "tag review", text: `${stats.needsReview} need review` })
      : null,
    el("span", { class: "tag", text: `${stats.reviewed}/${stats.total} hand-checked` }),
    ...[...flagCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([flag, count]) => el("span", { class: "tag", text: `${flagLabel(flag)} ${count}` })),
  ];
  host.appendChild(el("div", { class: "chips", style: "margin-top:16px" }, chips));
}

function renderFilters() {
  const host = clear(document.getElementById("filters"));
  for (const filter of FILTERS) {
    const count = state.data.questions.filter((question) => {
      const previous = state.filter;
      state.filter = filter.id;
      const result = matches(question);
      state.filter = previous;
      return result;
    }).length;
    host.appendChild(
      el("button", {
        class: `chip ${state.filter === filter.id ? "on" : ""}`,
        text: `${filter.label} ${count}`,
        onclick: () => {
          state.filter = filter.id;
          renderFilters();
          renderGrid();
        },
      }),
    );
  }
}

function renderGrid() {
  const host = clear(document.getElementById("grid"));
  host.className = "";
  const questions = state.data.questions.filter(matches);
  if (!questions.length) {
    host.appendChild(el("div", { class: "empty", text: "Nothing in this filter." }));
    return;
  }

  const parts = new Map();
  for (const question of questions) {
    const key = String(question.partLetter || "").trim();
    if (!parts.has(key)) parts.set(key, []);
    parts.get(key).push(question);
  }

  // A paper is split into parts (for example "Part A") and question numbers
  // restart in each, so keep them visually separate.
  if (parts.size <= 1) {
    host.appendChild(el("div", { class: "q-grid" }, questions.map(tile)));
    return;
  }

  for (const [part, group] of parts) {
    host.appendChild(
      el("div", { class: "row", style: "margin:14px 0 8px" }, [
        el("h3", { style: "margin:0;font-size:14px;font-weight:650", text: part || "Unsectioned" }),
        el("span", {
          class: "muted",
          style: "font-size:12.5px",
          text: `${group.filter((item) => item.converted).length}/${group.length} converted`,
        }),
      ]),
    );
    host.appendChild(el("div", { class: "q-grid" }, group.map(tile)));
  }
}

async function load() {
  if (!paperId) {
    document.getElementById("summary").innerHTML =
      '<div class="banner err">Missing paperId in the URL.</div>';
    return;
  }
  try {
    state.data = await api(`/api/paper/${paperId}`);
    renderSummary();
    renderFilters();
    renderGrid();
    document.getElementById("open-first").onclick = () => {
      const list = state.data.questions.filter(matches);
      const target = list[0] || state.data.questions[0];
      if (target) window.location.href = `/review?questionId=${target.questionId}`;
    };
  } catch (error) {
    clear(document.getElementById("summary")).appendChild(
      el("div", { class: "banner err", text: `Could not load paper: ${error.message}` }),
    );
  }
}

load();
