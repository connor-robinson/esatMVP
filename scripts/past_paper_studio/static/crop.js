/* Drag-to-crop editor.

   Coordinates are normalized against the source screenshot and are allowed to
   go below 0 or above 1, so a crop can be extended past the page edge. The
   stage keeps a wide margin of empty space around the image for exactly that. */

import { clear, debounce, el, round } from "./common.js";

const PAD = 0.5;
const MIN_SIZE = 0.004;
const HANDLES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

function clampBox(box) {
  return {
    x: box.x,
    y: box.y,
    w: Math.max(MIN_SIZE, box.w),
    h: Math.max(MIN_SIZE, box.h),
  };
}

function boxFromArray(bbox) {
  if (Array.isArray(bbox) && bbox.length === 4 && bbox.every((v) => Number.isFinite(Number(v)))) {
    return clampBox({ x: Number(bbox[0]), y: Number(bbox[1]), w: Number(bbox[2]), h: Number(bbox[3]) });
  }
  return { x: 0.12, y: 0.2, w: 0.76, h: 0.4 };
}

export function openCropEditor({ questionId, title, bbox, source, onApply }) {
  const original = boxFromArray(bbox);
  let box = { ...original };
  let zoom = 1;

  const sourceSrc = `/api/question/${questionId}/source.png`;
  const img = el("img", { class: "crop-img", src: sourceSrc, alt: "" });
  const rect = el("div", { class: "crop-rect" });
  for (const handle of HANDLES) rect.appendChild(el("div", { class: `handle ${handle}`, "data-handle": handle }));
  rect.appendChild(el("div", { class: "grid-line", style: "left:33.3%;top:0;bottom:0;width:1px" }));
  rect.appendChild(el("div", { class: "grid-line", style: "left:66.6%;top:0;bottom:0;width:1px" }));
  rect.appendChild(el("div", { class: "grid-line", style: "top:33.3%;left:0;right:0;height:1px" }));
  rect.appendChild(el("div", { class: "grid-line", style: "top:66.6%;left:0;right:0;height:1px" }));

  const stage = el("div", { class: "crop-stage" }, [img, rect]);
  const scroll = el("div", { class: "crop-scroll" }, [stage]);

  const previewBox = el("div", { class: "preview-box" }, [
    el("span", { class: "muted", text: "preview" }),
  ]);
  const readout = el("div", { class: "mono muted", style: "font-size:12px;margin-top:8px" });
  const inputs = {};
  const numGrid = el("div", { class: "num-grid" });
  for (const key of ["x", "y", "w", "h"]) {
    const input = el("input", { type: "number", step: "0.005", value: String(round(box[key])) });
    input.addEventListener("change", () => {
      const value = Number(input.value);
      if (Number.isFinite(value)) {
        box[key] = value;
        box = clampBox(box);
        draw();
        schedulePreview();
      }
    });
    inputs[key] = input;
    numGrid.appendChild(el("div", {}, [el("label", { text: key }), input]));
  }

  const side = el("div", { class: "crop-side" }, [
    el("div", { class: "field" }, [el("label", { text: "Live crop preview" }), previewBox]),
    el("div", { class: "field" }, [el("label", { text: "Normalized box" }), numGrid, readout]),
    el("div", { class: "field" }, [
      el("label", { text: "Nudge edges" }),
      el("div", { class: "chips" }, [
        el("button", { class: "chip", text: "Grow all", onclick: () => grow(0.02) }),
        el("button", { class: "chip", text: "Shrink all", onclick: () => grow(-0.02) }),
        el("button", { class: "chip", text: "Full width", onclick: () => { box.x = 0; box.w = 1; apply(); } }),
        el("button", { class: "chip", text: "Whole page", onclick: () => { box = { x: 0, y: 0, w: 1, h: 1 }; apply(); } }),
        el("button", { class: "chip", text: "Reset", onclick: () => { box = { ...original }; apply(); } }),
      ]),
    ]),
    el("div", { class: "field" }, [
      el("label", { text: "Zoom" }),
      el("div", { class: "chips" }, [
        el("button", { class: "chip", text: "−", onclick: () => setZoom(zoom / 1.25) }),
        el("button", { class: "chip", text: "Fit", onclick: () => setZoom(1) }),
        el("button", { class: "chip", text: "+", onclick: () => setZoom(zoom * 1.25) }),
      ]),
    ]),
    el("div", { class: "banner info" }, [
      "Drag inside to move, drag a handle to resize, or drag on empty space to draw a new box. " +
        "The box may extend past the page: anything outside becomes white padding. " +
        "Arrow keys nudge, hold Shift for bigger steps.",
    ]),
  ]);

  const applyButton = el("button", { class: "primary", text: "Use this crop" });
  const head = el("div", { class: "modal-head" }, [
    el("div", { class: "grow" }, [
      el("div", { style: "font-weight:650", text: title || "Recrop diagram" }),
      el("div", {
        class: "muted",
        style: "font-size:12.5px",
        text: source && source.width ? `source ${source.width}×${source.height}px` : "",
      }),
    ]),
    el("button", { class: "ghost", text: "Cancel", onclick: close }),
    applyButton,
  ]);

  const card = el("div", { class: "modal-card" }, [
    head,
    el("div", { class: "modal-body" }, [scroll, side]),
  ]);
  const modal = el("div", { class: "modal" }, [card]);

  let displayW = 0;
  let displayH = 0;

  function layout() {
    const natural = img.naturalWidth || (source && source.width) || 1000;
    const naturalH = img.naturalHeight || (source && source.height) || 1400;
    const available = Math.max(320, scroll.clientWidth - 40);
    displayW = (available / (1 + 2 * PAD)) * zoom;
    displayH = displayW * (naturalH / natural);

    stage.style.width = `${displayW * (1 + 2 * PAD)}px`;
    stage.style.height = `${displayH * (1 + 2 * PAD)}px`;
    img.style.left = `${PAD * displayW}px`;
    img.style.top = `${PAD * displayH}px`;
    img.style.width = `${displayW}px`;
    img.style.height = `${displayH}px`;
    draw();
  }

  function draw() {
    const left = (PAD + box.x) * displayW;
    const top = (PAD + box.y) * displayH;
    rect.style.left = `${left}px`;
    rect.style.top = `${top}px`;
    rect.style.width = `${box.w * displayW}px`;
    rect.style.height = `${box.h * displayH}px`;
    for (const key of ["x", "y", "w", "h"]) {
      if (document.activeElement !== inputs[key]) inputs[key].value = String(round(box[key]));
    }
    const px = source && source.width
      ? `${Math.round(box.w * source.width)}×${Math.round(box.h * source.height)}px`
      : "";
    const outside =
      box.x < 0 || box.y < 0 || box.x + box.w > 1 || box.y + box.h > 1
        ? " · extends past the page (white padding)"
        : "";
    readout.textContent = `${px}${outside}`;
  }

  function setZoom(next) {
    zoom = Math.min(6, Math.max(0.3, next));
    layout();
  }

  function grow(delta) {
    box.x -= delta;
    box.y -= delta;
    box.w += delta * 2;
    box.h += delta * 2;
    apply();
  }

  function apply() {
    box = clampBox(box);
    draw();
    schedulePreview();
  }

  const schedulePreview = debounce(async () => {
    const url =
      `/api/question/${questionId}/crop-preview.png?x=${round(box.x)}&y=${round(box.y)}` +
      `&w=${round(box.w)}&h=${round(box.h)}`;
    const image = el("img", { src: url, alt: "crop preview" });
    image.addEventListener("error", () => {
      clear(previewBox).appendChild(
        el("span", { class: "muted", text: "preview unavailable, nudge the box to retry" }),
      );
    });
    clear(previewBox).appendChild(image);
  }, 260);

  function pointToNorm(event) {
    const bounds = stage.getBoundingClientRect();
    return {
      nx: (event.clientX - bounds.left) / displayW - PAD,
      ny: (event.clientY - bounds.top) / displayH - PAD,
    };
  }

  let drag = null;

  stage.addEventListener("pointerdown", (event) => {
    const handle = event.target.getAttribute && event.target.getAttribute("data-handle");
    const start = pointToNorm(event);
    if (handle) {
      drag = { mode: "resize", handle, start, box: { ...box } };
    } else if (rect.contains(event.target)) {
      drag = { mode: "move", start, box: { ...box } };
    } else {
      // A stray click outside the box must not wipe a good crop, so drawing a
      // replacement only begins once the pointer has actually travelled.
      drag = { mode: "pending", start, box: { ...box }, origin: { x: event.clientX, y: event.clientY } };
    }
    stage.setPointerCapture(event.pointerId);
    event.preventDefault();
  });

  stage.addEventListener("pointermove", (event) => {
    if (!drag) return;
    if (drag.mode === "pending") {
      const travelled =
        Math.abs(event.clientX - drag.origin.x) + Math.abs(event.clientY - drag.origin.y);
      if (travelled < 5) return;
      box = { x: drag.start.nx, y: drag.start.ny, w: MIN_SIZE, h: MIN_SIZE };
      drag = { mode: "resize", handle: "se", start: drag.start, box: { ...box } };
    }
    const now = pointToNorm(event);
    const dx = now.nx - drag.start.nx;
    const dy = now.ny - drag.start.ny;
    const base = drag.box;

    if (drag.mode === "move") {
      box = { ...base, x: base.x + dx, y: base.y + dy };
    } else {
      let { x, y, w, h } = base;
      if (drag.handle.includes("w")) {
        x = base.x + dx;
        w = base.w - dx;
      }
      if (drag.handle.includes("n")) {
        y = base.y + dy;
        h = base.h - dy;
      }
      if (drag.handle.includes("e")) w = base.w + dx;
      if (drag.handle.includes("s")) h = base.h + dy;
      if (w < MIN_SIZE) {
        x = drag.handle.includes("w") ? base.x + base.w - MIN_SIZE : x;
        w = MIN_SIZE;
      }
      if (h < MIN_SIZE) {
        y = drag.handle.includes("n") ? base.y + base.h - MIN_SIZE : y;
        h = MIN_SIZE;
      }
      box = { x, y, w, h };
    }
    draw();
  });

  const endDrag = () => {
    if (!drag) return;
    drag = null;
    apply();
  };
  stage.addEventListener("pointerup", endDrag);
  stage.addEventListener("pointercancel", endDrag);

  function onKey(event) {
    if (event.key === "Escape") {
      close();
      return;
    }
    const step = event.shiftKey ? 0.02 : 0.004;
    const map = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const move = map[event.key];
    if (!move || document.activeElement.tagName === "INPUT") return;
    event.preventDefault();
    if (event.altKey) {
      box.w = Math.max(MIN_SIZE, box.w + move[0]);
      box.h = Math.max(MIN_SIZE, box.h + move[1]);
    } else {
      box.x += move[0];
      box.y += move[1];
    }
    apply();
  }

  function close() {
    window.removeEventListener("keydown", onKey);
    window.removeEventListener("resize", layout);
    modal.remove();
  }

  applyButton.addEventListener("click", () => {
    const value = [round(box.x), round(box.y), round(box.w), round(box.h)];
    onApply(value, {
      previewUrl:
        `/api/question/${questionId}/crop-preview.png?x=${value[0]}&y=${value[1]}` +
        `&w=${value[2]}&h=${value[3]}`,
    });
    close();
  });

  modal.addEventListener("pointerdown", (event) => {
    if (event.target === modal) close();
  });

  document.body.appendChild(modal);
  window.addEventListener("keydown", onKey);
  window.addEventListener("resize", layout);
  const failure = el("div", { class: "banner err", style: "display:none" }, [
    el("span", { text: "Could not load the source screenshot. " }),
    el("button", {
      class: "ghost",
      text: "Retry",
      onclick: () => {
        failure.style.display = "none";
        img.src = `${sourceSrc}?t=${Date.now()}`;
      },
    }),
  ]);
  scroll.insertBefore(failure, stage);

  if (img.complete && img.naturalWidth) layout();
  img.addEventListener("load", () => {
    failure.style.display = "none";
    layout();
  });
  img.addEventListener("error", () => {
    failure.style.display = "block";
  });
  schedulePreview();
}
