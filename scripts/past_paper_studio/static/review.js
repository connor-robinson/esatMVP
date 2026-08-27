import { api, clear, debounce, el, flagLabel, qs, questionTitle, toast } from "./common.js";
import { katexReady, renderContent } from "./render.js";
import { openCropEditor } from "./crop.js";

const state = {
  questionId: Number(qs("questionId")),
  data: null,
  draft: null,
  dirty: false,
  loading: false,
  paperId: null,
  paperQuestions: null,
  paperPromise: null,
  loadToken: 0,
};

/** In-flight / resolved neighbor payloads so Next/Prev do not wait on Supabase. */
const prefetchCache = new Map();

/** Background saves: navigate immediately, persist without blocking the UI. */
const saveJobs = new Map();
const saveOrder = [];
let savePumpRunning = false;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pendingSaveCount() {
  let count = 0;
  for (const job of saveJobs.values()) {
    if (job.status === "queued" || job.status === "inflight") count += 1;
  }
  return count;
}

function updateSaveStatus() {
  const node = document.getElementById("save-status");
  const button = document.getElementById("save");
  if (!node || !button) return;
  const pending = pendingSaveCount();
  const failed = [...saveJobs.values()].filter((job) => job.status === "failed").length;
  if (failed) {
    node.textContent = failed === 1 ? "1 save failed" : `${failed} saves failed`;
    node.style.color = "#ff6f6f";
  } else if (pending) {
    node.textContent = pending === 1 ? "Saving…" : `Saving ${pending}…`;
    node.style.color = "";
  } else {
    node.textContent = "";
    node.style.color = "";
  }
  if (state.dirty) {
    button.textContent = "Save & next *";
  } else {
    button.textContent = "Save & next";
  }
}

function warmImage(url) {
  if (!url) return;
  const img = new Image();
  img.decoding = "async";
  img.src = url;
}

function warmQuestionAssets(data) {
  if (!data) return;
  const questionId = data.question && data.question.questionId;
  const bust = data.source && data.source.cacheBust;
  if (questionId) warmImage(sourceImageSrc(questionId, bust));
  for (const asset of (data.draft && data.draft.diagramAssets) || []) {
    warmImage(asset.previewUrl || asset.url);
  }
}

function prefetchQuestion(questionId) {
  const id = Number(questionId);
  if (!id || prefetchCache.has(id)) return prefetchCache.get(id);
  const entry = {
    data: null,
    promise: api(`/api/question/${id}`)
      .then((data) => {
        entry.data = data;
        warmQuestionAssets(data);
        return data;
      })
      .catch((error) => {
        prefetchCache.delete(id);
        throw error;
      }),
  };
  prefetchCache.set(id, entry);
  return entry;
}

function rememberQuestion(questionId, data) {
  const id = Number(questionId);
  prefetchCache.set(id, { data, promise: Promise.resolve(data) });
  warmQuestionAssets(data);
}

function prefetchNeighbors(data) {
  const neighbors = (data && data.neighbors) || {};
  if (neighbors.nextId) {
    const entry = prefetchQuestion(neighbors.nextId);
    // Look one step further so a fast Next-Next still hits cache.
    entry.promise
      .then((nextData) => {
        const further = nextData && nextData.neighbors && nextData.neighbors.nextId;
        if (further) prefetchQuestion(further);
      })
      .catch(() => {});
  }
  if (neighbors.prevId) prefetchQuestion(neighbors.prevId);
}

function railDotClass(question) {
  if (question.conversionStatus === "failed") return "dot red";
  if (question.needsReview) return "dot violet";
  if (question.converted) return question.studioReviewed ? "dot green" : "dot amber";
  return "dot";
}

function railLabel(question) {
  const part = String(question.partLetter || "").trim();
  if (part && !/^part\s+/i.test(part) && part.length <= 2) {
    return `${question.questionNumber}${part}`;
  }
  return String(question.questionNumber);
}

function syncPaperListFromDraft() {
  if (!state.paperQuestions || !state.draft) return;
  const current = state.paperQuestions.find((item) => item.questionId === state.questionId);
  if (!current) return;
  const count = state.draft.assets.length;
  if (count > 0) {
    current.hasDiagram = true;
    current.diagramCount = count;
  }
  current.studioEdited = true;
  if (document.getElementById("mark-reviewed").checked) {
    current.studioReviewed = true;
  }
}

function renderQuestionRail() {
  const host = document.getElementById("q-rail-list");
  const countHost = document.getElementById("q-rail-count");
  if (!host) return;

  const questions = state.paperQuestions || [];
  countHost.textContent = questions.length ? String(questions.length) : "";

  if (!questions.length) {
    clear(host).appendChild(
      el("div", {
        class: "muted",
        style: "padding:10px 8px;font-size:12.5px",
        text: state.paperPromise ? "Loading…" : "No questions",
      }),
    );
    return;
  }

  clear(host);
  let lastPart = null;
  const parts = new Set(questions.map((item) => String(item.partLetter || "").trim()).filter(Boolean));
  const showParts = parts.size > 1;

  for (const question of questions) {
    const part = String(question.partLetter || "").trim();
    if (showParts && part && part !== lastPart) {
      host.appendChild(el("div", { class: "q-rail-part", text: part }));
      lastPart = part;
    }

    const badges = [];
    if (question.hasDiagram) {
      badges.push(
        el("span", {
          class: "badge diagram",
          text: question.diagramCount > 1 ? `diagram ×${question.diagramCount}` : "diagram",
        }),
      );
    } else if (question.hasTable) {
      badges.push(el("span", { class: "badge table", text: "table" }));
    }

    const item = el(
      "button",
      {
        class: `q-rail-item${question.questionId === state.questionId ? " current" : ""}`,
        type: "button",
        title: questionTitle(question),
        "data-question-id": String(question.questionId),
        onmouseenter: () => prefetchQuestion(question.questionId),
        onclick: () => {
          if (question.questionId === state.questionId) return;
          go(question.questionId);
        },
      },
      [
        el("span", { class: "num", text: railLabel(question) }),
        el("span", { class: "meta" }, badges),
        el("span", { class: railDotClass(question) }),
      ],
    );
    host.appendChild(item);
  }

  const current = host.querySelector(".q-rail-item.current");
  if (current && typeof current.scrollIntoView === "function") {
    current.scrollIntoView({ block: "nearest", inline: "nearest" });
  }
}

async function ensurePaperList(paperId) {
  const id = Number(paperId);
  if (!id) return;
  if (state.paperId === id && state.paperQuestions) {
    renderQuestionRail();
    return;
  }
  if (state.paperId === id && state.paperPromise) {
    await state.paperPromise;
    renderQuestionRail();
    return;
  }

  state.paperId = id;
  state.paperQuestions = null;
  state.paperPromise = api(`/api/paper/${id}`)
    .then((data) => {
      if (state.paperId !== id) return;
      state.paperQuestions = data.questions || [];
      renderQuestionRail();
    })
    .catch((error) => {
      if (state.paperId !== id) return;
      state.paperQuestions = [];
      const host = clear(document.getElementById("q-rail-list"));
      host.appendChild(
        el("div", {
          class: "muted",
          style: "padding:10px 8px;font-size:12.5px",
          text: `Could not load list: ${error.message}`,
        }),
      );
    })
    .finally(() => {
      if (state.paperId === id) state.paperPromise = null;
    });

  renderQuestionRail();
  await state.paperPromise;
}

function setNavBusy(busy) {
  state.loading = busy;
  const next = document.getElementById("next");
  const prev = document.getElementById("prev");
  if (next) next.classList.toggle("busy", busy);
  if (prev) prev.classList.toggle("busy", busy);
}

function letters() {
  const question = state.data.question;
  const set = new Set(question.expectedLetters || []);
  for (const letter of Object.keys(state.draft.options)) set.add(letter);
  for (const asset of state.draft.assets) {
    if (asset.option_letter) set.add(asset.option_letter);
  }
  return [...set].sort();
}

function assetUrl(asset) {
  return asset.previewUrl || asset.url || "";
}

function buildDraft(data) {
  return {
    stem: data.draft.questionStem || "",
    options: { ...(data.draft.options || {}) },
    answerLetter: data.question.answerLetter || "",
    assets: (data.draft.diagramAssets || []).map((asset) => ({
      id: asset.id,
      url: asset.url,
      alt: asset.alt || "",
      role: asset.role || (asset.option_letter ? "graphical_option" : "stem_diagram"),
      option_letter: asset.option_letter || "",
      bbox_norm: asset.bbox_norm || null,
      recrop: false,
    })),
  };
}

function markDirty() {
  state.dirty = true;
  updateSaveStatus();
}

/* ---------- rendering ---------- */

function renderHeader() {
  const { question, neighbors, conversion } = state.data;
  document.getElementById("crumb").innerHTML =
    `<b>${question.examName} ${question.examYear} ${question.paperName}</b> · ${questionTitle(question)}` +
    (neighbors.position ? ` · ${neighbors.position} of ${neighbors.count}` : "");
  document.title = `Q${question.questionNumber} ${question.examName} ${question.examYear} · Studio`;
  document.getElementById("back").href = `/paper?paperId=${question.paperId}`;

  const tags = clear(document.getElementById("status-tags"));
  const status = (conversion && conversion.status) || "none";
  const statusTone =
    status === "auto_approved" ? "done" : status === "failed" ? "bad" : "none";
  tags.appendChild(el("span", { class: `tag ${statusTone}`, text: status.replace(/_/g, " ") }));
  tags.appendChild(
    el("span", {
      class: `tag ${question.contentFormat === "text" ? "info" : "partial"}`,
      text: question.contentFormat === "text" ? "live as text" : "live as image",
    }),
  );
  if (conversion && conversion.report && conversion.report.studio_reviewed) {
    tags.appendChild(el("span", { class: "tag done", text: "hand-checked" }));
  }

  const prev = document.getElementById("prev");
  const next = document.getElementById("next");
  prev.disabled = !neighbors.prevId;
  next.disabled = !neighbors.nextId;
  prev.onclick = () => go(neighbors.prevId);
  next.onclick = () => go(neighbors.nextId);
}

function renderBanners() {
  const host = clear(document.getElementById("banners"));
  const { conversion, source } = state.data;
  if (!katexReady()) {
    host.appendChild(
      el("div", {
        class: "banner err",
        text: "KaTeX failed to load, so math is showing as raw LaTeX. Check /vendor/katex or your network, then refresh.",
      }),
    );
  }
  if (source.error) {
    host.appendChild(
      el("div", {
        class: "banner err",
        text: `Source screenshot could not be loaded: ${source.error}`,
      }),
    );
  }
  const flags = (conversion && conversion.flags) || [];
  if (flags.length) {
    host.appendChild(
      el("div", { class: "banner warn" }, [`Pipeline flags: ${flags.map(flagLabel).join(", ")}`]),
    );
  }
  const katexErrors = (conversion && conversion.report && conversion.report.katex_errors) || [];
  if (katexErrors.length) {
    const detail = katexErrors
      .map((item) => (typeof item === "string" ? item : `${item.field}: ${item.error}`))
      .join(" · ");
    host.appendChild(el("div", { class: "banner err", text: `KaTeX: ${detail}` }));
  }
}

function sourceImageSrc(questionId, bust) {
  const base = `/api/question/${questionId}/source.png?refresh=1`;
  return bust ? `${base}&t=${bust}` : base;
}

function renderSource() {
  const host = clear(document.getElementById("source-pane"));
  const { question, source } = state.data;
  document.getElementById("source-meta").textContent =
    source.width ? `${source.width}×${source.height}px` : "";
  if (!source.url) {
    host.appendChild(el("div", { class: "empty", text: "This question has no screenshot." }));
    return;
  }
  host.appendChild(
    el("img", {
      class: "source-shot",
      src: sourceImageSrc(question.questionId, source.cacheBust),
      alt: "original question screenshot",
    }),
  );
}

async function replaceSourceImage(file) {
  if (!file || !state.data) return;
  const button = document.getElementById("replace-source");
  const questionId = state.data.question.questionId;
  button.disabled = true;
  button.classList.add("busy");
  try {
    const body = new FormData();
    body.append("image", file);
    const response = await fetch(`/api/question/${questionId}/source`, {
      method: "POST",
      body,
    });
    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (error) {
      throw new Error(`Bad response: ${text.slice(0, 200)}`);
    }
    if (!response.ok) {
      throw new Error((data && data.error) || `${response.status} ${response.statusText}`);
    }
    if (data.source) {
      data.source.cacheBust =
        data.source.cacheBust || Date.now();
    }
    // Keep local text edits; only refresh question/source metadata.
    if (state.draft) {
      data.draft = {
        questionStem: state.draft.stem,
        options: { ...state.draft.options },
        diagramAssets: state.draft.assets,
      };
    }
    rememberQuestion(questionId, data);
    state.data = data;
    renderSource();
    renderMeta();
    renderHeader();
    toast("Base screenshot updated.", "ok");
  } catch (error) {
    toast(error.message || String(error), "err");
  } finally {
    button.disabled = false;
    button.classList.remove("busy");
  }
}

function renderPreview() {
  const host = clear(document.getElementById("preview-pane"));
  const { question } = state.data;
  const highlight = document.getElementById("show-answer").checked;
  const stemDiagrams = state.draft.assets.filter((asset) => !asset.option_letter);
  const optionAssets = new Map(
    state.draft.assets.filter((asset) => asset.option_letter).map((a) => [a.option_letter, a]),
  );

  const options = letters()
    .map((letter) => {
      const text = state.draft.options[letter];
      const asset = optionAssets.get(letter);
      if (!text && !asset) return null;
      const correct = highlight && letter === state.draft.answerLetter;
      return el("div", { class: `opt ${correct ? "correct" : ""}` }, [
        el("span", { class: "letter", text: letter }),
        el("div", { class: "body" }, [
          text ? el("span", { html: renderContent(text) }) : null,
          asset ? el("img", { src: assetUrl(asset), alt: asset.alt || `option ${letter}` }) : null,
        ]),
      ]);
    })
    .filter(Boolean);

  host.appendChild(
    el("div", { class: "qrender" }, [
      el("div", { class: "qnum", text: `${question.questionNumber}.` }),
      el("div", { class: "stem", html: renderContent(state.draft.stem) }),
      ...stemDiagrams.map((asset) =>
        el("div", { class: "diagram" }, [
          el("img", { src: assetUrl(asset), alt: asset.alt || "diagram" }),
        ]),
      ),
      options.length
        ? el("div", { class: "opts" }, options)
        : el("div", { class: "muted", style: "margin-top:14px", text: "No options yet." }),
    ]),
  );
}

function renderAnswerChips() {
  const host = clear(document.getElementById("answer-chips"));
  for (const letter of letters()) {
    host.appendChild(
      el("button", {
        class: `chip ${state.draft.answerLetter === letter ? "on" : ""}`,
        text: letter,
        onclick: () => {
          state.draft.answerLetter = letter;
          markDirty();
          renderAnswerChips();
          renderOptions();
          renderPreview();
        },
      }),
    );
  }
  host.appendChild(
    el("span", {
      class: "muted",
      style: "font-size:12.5px;align-self:center",
      text: state.data.question.answerLetter
        ? `stored: ${state.data.question.answerLetter}`
        : "no stored answer",
    }),
  );
}

function renderOptions() {
  const host = clear(document.getElementById("options"));
  for (const letter of letters()) {
    const input = el("input", { value: state.draft.options[letter] || "" });
    input.addEventListener("input", () => {
      state.draft.options[letter] = input.value;
      markDirty();
      schedulePreview();
    });
    const correct = state.draft.answerLetter === letter;
    host.appendChild(
      el("div", { class: `opt-edit ${correct ? "is-correct" : ""}` }, [
        el("div", { class: "letter-box", text: letter }),
        input,
        el("button", {
          class: "ghost",
          text: correct ? "✓ key" : "set key",
          onclick: () => {
            state.draft.answerLetter = letter;
            markDirty();
            renderAnswerChips();
            renderOptions();
            renderPreview();
          },
        }),
      ]),
    );
  }
}

function renderAssets() {
  const host = clear(document.getElementById("assets"));
  if (!state.draft.assets.length) {
    host.appendChild(el("div", { class: "muted", style: "font-size:13px", text: "No diagram assets." }));
    return;
  }

  state.draft.assets.forEach((asset, index) => {
    const select = el("select", {}, [
      el("option", { value: "", text: "Stem diagram" }),
      ...letters().map((letter) =>
        el("option", { value: letter, text: `Option ${letter}` }),
      ),
    ]);
    select.value = asset.option_letter || "";
    select.addEventListener("change", () => {
      asset.option_letter = select.value;
      asset.role = select.value ? "graphical_option" : "stem_diagram";
      markDirty();
      renderPreview();
    });

    const alt = el("input", { value: asset.alt || "", placeholder: "alt text" });
    alt.addEventListener("input", () => {
      asset.alt = alt.value;
      markDirty();
    });

    host.appendChild(
      el("div", { class: "asset-row" }, [
        el("img", { src: assetUrl(asset), alt: asset.alt || "diagram" }),
        el("div", {}, [
          el("div", { class: "name" }, [
            `${asset.id || `new ${index + 1}`}`,
            asset.recrop ? el("span", { class: "tag partial", text: "recropped" }) : null,
          ]),
          el("div", { class: "row", style: "gap:6px;margin-top:6px" }, [select, alt]),
        ]),
        el("div", { class: "row", style: "gap:6px" }, [
          el("button", { class: "primary", text: "Recrop", onclick: () => editCrop(asset) }),
          el("button", {
            class: "danger",
            text: "Delete",
            onclick: () => {
              state.draft.assets.splice(index, 1);
              markDirty();
              renderAssets();
              renderPreview();
            },
          }),
        ]),
      ]),
    );
  });
}

function editCrop(asset) {
  openCropEditor({
    questionId: state.data.question.questionId,
    title: `Recrop ${asset.id || "new diagram"}`,
    bbox: asset.bbox_norm,
    source: state.data.source,
    onApply: (bbox, extra) => {
      asset.bbox_norm = bbox;
      asset.recrop = true;
      asset.previewUrl = extra.previewUrl;
      markDirty();
      renderAssets();
      renderPreview();
      toast("Crop staged. Save to upload it.", "ok");
    },
  });
}

function addAsset() {
  const asset = {
    id: null,
    url: null,
    alt: "diagram not to scale",
    role: "stem_diagram",
    option_letter: "",
    bbox_norm: [0.1, 0.25, 0.8, 0.35],
    recrop: true,
  };
  openCropEditor({
    questionId: state.data.question.questionId,
    title: "New diagram crop",
    bbox: asset.bbox_norm,
    source: state.data.source,
    onApply: (bbox, extra) => {
      asset.bbox_norm = bbox;
      asset.previewUrl = extra.previewUrl;
      state.draft.assets.push(asset);
      markDirty();
      renderAssets();
      renderPreview();
    },
  });
}

function renderMeta() {
  const { conversion, question, source } = state.data;
  const bits = [
    `question ${question.questionId}`,
    `paper ${question.paperId}`,
    conversion ? `conversion ${conversion.id}` : "no conversion row",
    conversion && conversion.modelUsed ? `model ${conversion.modelUsed}` : null,
    conversion && conversion.confidence !== null && conversion.confidence !== undefined
      ? `confidence ${conversion.confidence}`
      : null,
    conversion && conversion.updatedAt ? `updated ${conversion.updatedAt}` : null,
    source.url ? `source ${source.url}` : null,
  ].filter(Boolean);
  document.getElementById("meta").textContent = bits.join("  ·  ");
}

const schedulePreview = debounce(renderPreview, 180);

function renderAll() {
  renderHeader();
  renderBanners();
  renderSource();
  renderPreview();
  renderAnswerChips();
  renderOptions();
  renderAssets();
  renderMeta();
  renderQuestionRail();
}

/* ---------- data ---------- */

async function load(questionId, { preferCache = true } = {}) {
  const id = Number(questionId);
  const token = ++state.loadToken;
  state.questionId = id;
  setNavBusy(true);
  renderQuestionRail();
  try {
    // Never paint stale content over a save that is still writing.
    await waitForSave(id);
    if (token !== state.loadToken) return;

    let data = null;
    const forceRefresh = !preferCache || prefetchCache.get(id)?.stale;
    if (!forceRefresh && preferCache && prefetchCache.has(id)) {
      const entry = prefetchCache.get(id);
      data = entry.data || (await entry.promise);
    } else {
      data = await api(`/api/question/${id}${forceRefresh ? "?refresh=1" : ""}`);
      if (token !== state.loadToken) return;
      rememberQuestion(id, data);
    }
    if (token !== state.loadToken) return;
    state.data = data;
    state.draft = buildDraft(data);
    state.dirty = false;
    document.getElementById("mark-reviewed").checked = Boolean(
      data.conversion && data.conversion.report && data.conversion.report.studio_reviewed,
    );
    const stem = document.getElementById("stem");
    stem.value = state.draft.stem;
    renderAll();
    updateSaveStatus();
    prefetchNeighbors(data);
    ensurePaperList(data.question.paperId).catch(() => {});
  } finally {
    if (token === state.loadToken) setNavBusy(false);
  }
}

async function go(questionId, { skipDirtyCheck = false } = {}) {
  if (!questionId) return;
  if (Number(questionId) === state.questionId && state.data) return;
  if (!skipDirtyCheck && state.dirty) {
    // Default review flow: keep edits by saving in the background, then move on.
    queueSaveAndContinue(Number(questionId));
    return;
  }
  window.history.replaceState({}, "", `/review?questionId=${questionId}`);
  try {
    await load(questionId);
  } catch (error) {
    if (Number(questionId) === state.questionId) toast(error.message, "err", 8000);
  }
}

function buildSavePayload() {
  return {
    questionStem: state.draft.stem,
    options: { ...state.draft.options },
    answerLetter: state.draft.answerLetter,
    markReviewed: document.getElementById("mark-reviewed").checked,
    diagramAssets: state.draft.assets.map((asset) => ({
      id: asset.id,
      url: asset.url,
      alt: asset.alt,
      role: asset.role,
      option_letter: asset.option_letter || null,
      bbox_norm: asset.bbox_norm ? [...asset.bbox_norm] : null,
      recrop: Boolean(asset.recrop),
    })),
    light: true,
  };
}

function enqueueSave(questionId, payload, meta = {}) {
  const id = Number(questionId);
  const existing = saveJobs.get(id);
  const seq = (existing && existing.seq ? existing.seq : 0) + 1;
  let resolveDone;
  const done = new Promise((resolve) => {
    resolveDone = resolve;
  });
  const job = {
    seq,
    payload,
    attempts: 0,
    status: "queued",
    label: meta.label || `Q${id}`,
    done,
    resolveDone,
  };
  // Replace first so waiters that wake on the old done immediately see the new job.
  saveJobs.set(id, job);
  if (existing && typeof existing.resolveDone === "function") {
    existing.resolveDone();
  }
  if (!saveOrder.includes(id)) saveOrder.push(id);
  prefetchCache.delete(id);
  updateSaveStatus();
  pumpSaveQueue();
  return job;
}

function waitForSave(questionId) {
  const id = Number(questionId);
  return (async () => {
    while (true) {
      const job = saveJobs.get(id);
      if (!job || job.status === "failed") return;
      await job.done;
    }
  })();
}

function applyOptimisticRail(questionId, payload) {
  if (!state.paperQuestions) return;
  const current = state.paperQuestions.find((item) => item.questionId === questionId);
  if (!current) return;
  const assets = payload.diagramAssets || [];
  if (assets.length > 0) {
    current.hasDiagram = true;
    current.diagramCount = assets.length;
  }
  current.studioEdited = true;
  current.converted = true;
  if (payload.markReviewed) current.studioReviewed = true;
  renderQuestionRail();
}

function queueCurrentSave({ continueTo = null } = {}) {
  if (!state.draft || !state.questionId) return null;
  const questionId = state.questionId;
  const label =
    (state.data && state.data.question && questionTitle(state.data.question)) || `Q${questionId}`;
  const payload = buildSavePayload();
  applyOptimisticRail(questionId, payload);
  state.dirty = false;
  updateSaveStatus();
  const job = enqueueSave(questionId, payload, { label });
  if (continueTo) {
    go(continueTo, { skipDirtyCheck: true });
  }
  return job;
}

function queueSaveAndContinue(nextId) {
  queueCurrentSave({ continueTo: nextId || null });
}

async function pumpSaveQueue() {
  if (savePumpRunning) return;
  savePumpRunning = true;
  updateSaveStatus();
  while (saveOrder.length) {
    const questionId = saveOrder[0];
    const job = saveJobs.get(questionId);
    if (!job) {
      saveOrder.shift();
      continue;
    }
    if (job.status === "failed") {
      saveOrder.shift();
      continue;
    }
    job.status = "inflight";
    updateSaveStatus();
    const seq = job.seq;
    try {
      const data = await api(`/api/question/${questionId}/save`, {
        method: "POST",
        body: JSON.stringify(job.payload),
      });
      const current = saveJobs.get(questionId);
      if (!current || current.seq !== seq) {
        // A newer edit superseded this write; keep the question queued.
        if (current) current.status = "queued";
        continue;
      }
      saveJobs.delete(questionId);
      saveOrder.shift();
      job.resolveDone();
      handleBackgroundSaveSuccess(questionId, data, job);
    } catch (error) {
      const current = saveJobs.get(questionId);
      if (!current || current.seq !== seq) continue;
      current.attempts += 1;
      if (current.attempts < 3) {
        current.status = "queued";
        updateSaveStatus();
        await sleep(350 * current.attempts);
        continue;
      }
      current.status = "failed";
      saveOrder.shift();
      current.resolveDone();
      toast(`Save failed for ${job.label}: ${error.message}`, "err", 12000);
      if (state.questionId === questionId) {
        state.dirty = true;
        updateSaveStatus();
      }
    }
    updateSaveStatus();
  }
  savePumpRunning = false;
  updateSaveStatus();
}

function handleBackgroundSaveSuccess(questionId, data, job) {
  const result = (data && data.saveResult) || {};
  prefetchCache.delete(questionId);
  if (state.paperQuestions) {
    const row = state.paperQuestions.find((item) => item.questionId === questionId);
    if (row) {
      if (result.published) {
        row.converted = true;
        row.contentFormat = "text";
      }
      if (result.studioReviewed) row.studioReviewed = true;
      if (result.status === "failed") row.conversionStatus = "failed";
      else if (result.status) row.conversionStatus = result.status;
      renderQuestionRail();
    }
  }
  if (state.questionId === questionId && !state.dirty) {
    if (state.data && state.data.conversion) {
      state.data.conversion.status = result.status || state.data.conversion.status;
      state.data.conversion.report = {
        ...(state.data.conversion.report || {}),
        studio_reviewed: result.studioReviewed,
      };
      renderHeader();
      renderBanners();
    }
  }
  if (result.published) {
    toast(`Saved ${job.label}`, "ok", 2200);
  } else if ((result.warnings || []).length) {
    for (const warning of result.warnings) toast(`${job.label}: ${warning}`, "err", 9000);
  } else {
    toast(`Saved ${job.label}`, "ok", 2200);
  }
}

async function save({ continueToNext = true } = {}) {
  if (!state.draft) return;
  const nextId =
    continueToNext && state.data && state.data.neighbors
      ? state.data.neighbors.nextId
      : null;
  if (continueToNext && !state.dirty && nextId) {
    await go(nextId, { skipDirtyCheck: true });
    return;
  }
  if (!state.dirty && !continueToNext) {
    toast("Nothing to save.", "ok", 1800);
    return;
  }
  queueCurrentSave({ continueTo: continueToNext ? nextId : null });
  if (continueToNext && !nextId) {
    toast("Saved. End of paper.", "ok", 2200);
  }
}

document.getElementById("stem").addEventListener("input", (event) => {
  state.draft.stem = event.target.value;
  markDirty();
  schedulePreview();
});
document.getElementById("replace-source").addEventListener("click", () => {
  document.getElementById("replace-source-file").click();
});
document.getElementById("replace-source-file").addEventListener("change", (event) => {
  const file = event.target.files && event.target.files[0];
  event.target.value = "";
  if (file) replaceSourceImage(file);
});
document.getElementById("mark-reviewed").addEventListener("change", () => {
  markDirty();
});
document.getElementById("show-answer").addEventListener("change", renderPreview);
document.getElementById("add-asset").addEventListener("click", addAsset);
document.getElementById("save").addEventListener("click", () => save({ continueToNext: true }));

window.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
    event.preventDefault();
    // Stay on this question; still save in the background.
    save({ continueToNext: false });
    return;
  }
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
    event.preventDefault();
    save({ continueToNext: true });
    return;
  }
  if (event.altKey && event.key === "ArrowRight") {
    event.preventDefault();
    go(state.data && state.data.neighbors.nextId);
  }
  if (event.altKey && event.key === "ArrowLeft") {
    event.preventDefault();
    go(state.data && state.data.neighbors.prevId);
  }
});

window.addEventListener("beforeunload", (event) => {
  if (state.dirty || pendingSaveCount() > 0) {
    event.preventDefault();
    event.returnValue = "";
  }
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden" && state.dirty) {
    queueCurrentSave();
  }
});

if (!state.questionId) {
  document.getElementById("banners").innerHTML =
    '<div class="banner err">Missing questionId in the URL.</div>';
} else {
  load(state.questionId).catch((error) => {
    document.getElementById("banners").innerHTML =
      `<div class="banner err">Could not load question: ${error.message}</div>`;
  });
}

window.addEventListener("katex-ready", () => {
  if (state.draft) {
    renderBanners();
    renderPreview();
  }
});

if (!katexReady()) {
  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    if (katexReady()) {
      clearInterval(timer);
      if (state.draft) {
        renderBanners();
        renderPreview();
      }
    } else if (attempts > 40) {
      clearInterval(timer);
      if (state.draft) renderBanners();
    }
  }, 100);
}
