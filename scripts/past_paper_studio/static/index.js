import { api, bar, clear, debounce, el, paperLabel, pct, stateTag } from "./common.js";

const FILTERS = [
  { id: "all", label: "All papers" },
  { id: "incomplete", label: "Not fully processed" },
  { id: "complete", label: "Fully processed" },
  { id: "failed", label: "Has failures" },
  { id: "review", label: "Needs review" },
  { id: "unreviewed", label: "Not hand-checked" },
];

const state = { data: null, filter: "all", search: "" };

function statBlock(value, label, tone) {
  return el("div", { class: "stat" }, [
    el("div", { class: "value", text: String(value), style: tone ? `color:${tone}` : "" }),
    el("div", { class: "label", text: label }),
  ]);
}

function renderSummary() {
  const host = clear(document.getElementById("summary"));
  const totals = state.data.totals;
  host.appendChild(
    el("div", { class: "row", style: "margin-bottom:14px" }, [
      el("div", { class: "grow" }, [
        el("div", { style: "font-size:15px;font-weight:650" }, [
          `${totals.converted} of ${totals.total} questions are text`,
        ]),
        el("div", { class: "muted", style: "font-size:13px" }, [
          `${pct(totals.converted, totals.total)}% converted`,
        ]),
      ]),
      el("div", { style: "font-size:34px;font-weight:720;letter-spacing:-0.03em" }, [
        `${pct(totals.converted, totals.total)}%`,
      ]),
    ]),
  );
  host.appendChild(bar(totals.converted, totals.total));
  host.appendChild(
    el("div", { class: "hstats", style: "margin-top:18px" }, [
      statBlock(totals.total - totals.converted, "still image", "#ffb64d"),
      statBlock(totals.failed, "failed rows", totals.failed ? "#ff6f6f" : null),
      statBlock(totals.needsReview, "need review", totals.needsReview ? "#a98bff" : null),
      statBlock(totals.humanCrop, "manual crop"),
      statBlock(totals.reviewed, "hand-checked", "#32d59b"),
      statBlock(totals.withDiagram, "with diagram"),
    ]),
  );
}

function renderConverter() {
  const node = document.getElementById("converter");
  const status = (state.data && state.data.converterStatus) || {};
  if (status.status === "running") {
    node.textContent = `Converter running: ${status.completed || 0}/${status.total || 0}`;
    node.style.color = "#32d59b";
    return;
  }
  node.textContent = status.status ? `Converter ${status.status}` : "";
  node.style.color = "";
}

function paperMatches(paper) {
  const stats = paper.stats;
  if (state.search) {
    const haystack = paperLabel(paper).toLowerCase();
    if (!haystack.includes(state.search)) return false;
  }
  switch (state.filter) {
    case "incomplete":
      return stats.total > 0 && stats.converted < stats.total;
    case "complete":
      return stats.total > 0 && stats.converted >= stats.total;
    case "failed":
      return stats.failed > 0;
    case "review":
      return stats.needsReview > 0 || stats.humanCrop > 0;
    case "unreviewed":
      return stats.total > 0 && stats.reviewed < stats.total;
    default:
      return true;
  }
}

function paperCard(paper) {
  const stats = paper.stats;
  const tags = [stateTag(paper.state, stats)];
  if (stats.failed) tags.push(el("span", { class: "tag bad", text: `${stats.failed} failed` }));
  if (stats.needsReview) {
    tags.push(el("span", { class: "tag review", text: `${stats.needsReview} review` }));
  }
  if (stats.reviewed >= stats.total && stats.total > 0) {
    tags.push(el("span", { class: "tag info", text: "Hand-checked" }));
  }

  return el(
    "a",
    { class: "paper-card", href: `/paper?paperId=${paper.paperId}` },
    [
      el("div", { class: "title", text: paper.paperName || `Paper ${paper.paperId}` }),
      el("div", { class: "chips" }, tags),
      el("div", { class: "meta" }, [
        el("span", { text: `${stats.converted}/${stats.total} text` }),
        el("span", { text: `${pct(stats.converted, stats.total)}%` }),
      ]),
      bar(stats.converted, stats.total, true),
    ],
  );
}

function renderContent() {
  const host = clear(document.getElementById("content"));
  let shown = 0;

  for (const exam of state.data.exams) {
    const years = [];
    for (const year of exam.years) {
      const papers = year.papers.filter(paperMatches);
      if (!papers.length) continue;
      shown += papers.length;
      years.push(
        el("div", { class: "year-block" }, [
          el("div", { class: "year-head" }, [
            el("h3", { text: String(year.examYear) }),
            el("span", {
              class: "muted",
              style: "font-size:12.5px",
              text: `${year.stats.converted}/${year.stats.total} converted`,
            }),
            year.stats.converted >= year.stats.total && year.stats.total > 0
              ? el("span", { class: "tag done", text: "Complete" })
              : null,
          ]),
          el("div", { class: "paper-grid" }, papers.map(paperCard)),
        ]),
      );
    }
    if (!years.length) continue;
    host.appendChild(
      el("div", { class: "exam-head" }, [
        el("h2", { text: exam.examName }),
        el("span", {
          class: "muted",
          style: "font-size:13px",
          text: `${exam.stats.converted}/${exam.stats.total} questions as text`,
        }),
      ]),
    );
    host.append(...years);
  }

  if (!shown) {
    host.appendChild(el("div", { class: "empty", text: "No papers match this filter." }));
  }
}

function renderFilters() {
  const host = clear(document.getElementById("filters"));
  for (const filter of FILTERS) {
    host.appendChild(
      el("button", {
        class: `chip ${state.filter === filter.id ? "on" : ""}`,
        text: filter.label,
        onclick: () => {
          state.filter = filter.id;
          renderFilters();
          renderContent();
        },
      }),
    );
  }
}

async function load(refresh = false) {
  try {
    state.data = await api(`/api/overview${refresh ? "?refresh=1" : ""}`);
    renderSummary();
    renderConverter();
    renderFilters();
    renderContent();
  } catch (error) {
    clear(document.getElementById("summary")).appendChild(
      el("div", { class: "banner err", text: `Could not load progress: ${error.message}` }),
    );
  }
}

document.getElementById("refresh").addEventListener("click", () => load(true));
document.getElementById("search").addEventListener(
  "input",
  debounce((event) => {
    state.search = event.target.value.trim().toLowerCase();
    renderContent();
  }, 160),
);

load();
setInterval(async () => {
  try {
    const status = await api("/api/converter-status");
    if (state.data) state.data.converterStatus = status;
    renderConverter();
  } catch (error) {
    /* the banner already covers hard failures */
  }
}, 15000);
