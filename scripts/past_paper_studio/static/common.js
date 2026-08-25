/* Shared helpers for the conversion studio pages. */

export async function api(path, options) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (error) {
    throw new Error(`Bad response from ${path}: ${text.slice(0, 200)}`);
  }
  if (!response.ok) {
    throw new Error((data && data.error) || `${response.status} ${response.statusText}`);
  }
  return data;
}

export function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === "class") node.className = value;
    else if (key === "html") node.innerHTML = value;
    else if (key === "text") node.textContent = value;
    else if (key.startsWith("on") && typeof value === "function") {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (value !== null && value !== undefined && value !== false) {
      node.setAttribute(key, value);
    }
  }
  for (const child of [].concat(children)) {
    if (child === null || child === undefined || child === false) continue;
    node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
  }
  return node;
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}

export function pct(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

export function bar(part, total, thin) {
  const fill = el("span");
  fill.style.width = `${pct(part, total)}%`;
  return el("div", { class: thin ? "bar thin" : "bar" }, [fill]);
}

export function toast(message, kind = "ok", ms = 4200) {
  let host = document.querySelector(".toast");
  if (!host) {
    host = el("div", { class: "toast" });
    document.body.appendChild(host);
  }
  const item = el("div", { class: kind, text: message });
  host.appendChild(item);
  setTimeout(() => item.remove(), ms);
}

export function paperLabel(paper) {
  return `${paper.examName} ${paper.examYear} ${paper.paperName}`.trim();
}

/** part_letter holds a section label like "Part A", so keep it separate. */
export function questionTitle(question) {
  const part = String(question.partLetter || "").trim();
  return part ? `Q${question.questionNumber} · ${part}` : `Q${question.questionNumber}`;
}

export function stateTag(state, stats) {
  if (state === "complete") {
    return el("span", { class: "tag done", text: "Fully processed" });
  }
  if (state === "not_started") {
    return el("span", { class: "tag none", text: "Not started" });
  }
  if (state === "empty") {
    return el("span", { class: "tag none", text: "No questions" });
  }
  const left = stats.total - stats.converted;
  return el("span", { class: "tag partial", text: `${left} left` });
}

export function flagLabel(flag) {
  return flag.replace(/_/g, " ");
}

export function debounce(fn, ms) {
  let timer = null;
  return (...args) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

export function qs(name) {
  return new URLSearchParams(window.location.search).get(name);
}

export function round(value, places = 5) {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}
