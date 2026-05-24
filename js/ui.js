// Tiny DOM helpers + global toast.

export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === "class") node.className = v;
    else if (k === "style" && typeof v === "object") Object.assign(node.style, v);
    else if (k.startsWith("on") && typeof v === "function") {
      node.addEventListener(k.slice(2).toLowerCase(), v);
    } else node.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

let toastTimer = 0;
export function toast(msg, kind = "") {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.className = "toast show " + kind;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.className = "toast " + kind), 2200);
}

export function fmtDate(s) {
  if (!s) return "";
  const d = new Date(s);
  if (isNaN(d)) return s;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Case/whitespace-insensitive name key for matching free-text exercise names.
export const normalizeName = (s) => (s || "").trim().toLowerCase();

// Title-case a muscle/area name for display only (keys stay canonical):
// "Shoulders (side delts)" -> "Shoulders (Side Delts)". Idempotent.
export const formatMuscle = (name) =>
  (name || "").replace(/[A-Za-z]+/g, (w) => w[0].toUpperCase() + w.slice(1));

export function isoToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function run(promise, { ok, fail = "Something went wrong" } = {}) {
  try {
    const result = await promise;
    if (ok) toast(ok, "ok");
    return result;
  } catch (e) {
    console.error(e);
    const msg = e?.result?.error?.message || e?.message || fail;
    toast(msg, "bad");
    throw e;
  }
}

export function withLoading(btn, asyncFn) {
  return async () => {
    if (btn.disabled) return;
    btn.disabled = true;
    btn.classList.add("loading");
    try { await asyncFn(); } finally { btn.disabled = false; btn.classList.remove("loading"); }
  };
}

export function confirmModal(message, onConfirm) {
  const overlay = el("div", { class: "modal-overlay" });
  const cancel = el("button", { class: "btn small" }, "Cancel");
  const confirm = el("button", { class: "btn small danger" }, "Delete");
  cancel.onclick = () => overlay.remove();
  confirm.onclick = async () => {
    confirm.disabled = true;
    confirm.classList.add("loading");
    try { await onConfirm(); } finally { overlay.remove(); }
  };
  overlay.append(
    el("div", { class: "modal-card" },
      el("p", {}, message),
      el("div", { class: "btn-row" }, cancel, confirm),
    ),
  );
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  document.body.append(overlay);
}

export function defaultSessionState() {
  return {
    startTime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }),
    endTime: "",
    location: localStorage.getItem("gama.lastLocation") || localStorage.getItem("rp.lastLocation") || "",
    totalRPE: "",
    leafStatus: "No",
    notes: "",
  };
}

export function stat(value, label) {
  return el("div", { class: "summary-stat" },
    el("div", { class: "summary-stat-value" }, value),
    el("div", { class: "summary-stat-label" }, label),
  );
}

export function buildSessionMetaForm(session, onSave) {
  const card = el("section", { class: "card session-meta" },
    el("h3", {}, "Session info"),
    el("div", { class: "field-row four" },
      el("div", { class: "field" },
        el("label", {}, "Start time"),
        el("input", { type: "time", value: session.startTime, oninput: (e) => (session.startTime = e.target.value) }),
      ),
      el("div", { class: "field" },
        el("label", {}, "End time"),
        el("input", { type: "time", value: session.endTime, oninput: (e) => (session.endTime = e.target.value) }),
      ),
      el("div", { class: "field" },
        el("label", {}, "Location"),
        el("input", { type: "text", value: session.location, placeholder: "e.g. Home gym", oninput: (e) => (session.location = e.target.value) }),
      ),
      el("div", { class: "field" },
        el("label", {}, "Total RPE"),
        el("select", { onchange: (e) => (session.totalRPE = e.target.value) },
          el("option", { value: "", selected: !session.totalRPE ? "" : null }, "—"),
          ...[1,2,3,4,5,6,7,8,9,10].map((n) =>
            el("option", { value: n, selected: String(session.totalRPE) === String(n) ? "" : null }, String(n))),
        ),
      ),
    ),
    el("div", { class: "field-row" },
      el("div", { class: "field" },
        el("label", {}, "Leaf"),
        el("select", { onchange: (e) => (session.leafStatus = e.target.value) },
          el("option", { value: "No", selected: session.leafStatus !== "Yes" ? "" : null }, "No"),
          el("option", { value: "Yes", selected: session.leafStatus === "Yes" ? "" : null }, "Yes"),
        ),
      ),
      el("div", { class: "field" },
        el("label", {}, "Session notes"),
        el("input", { type: "text", value: session.notes, placeholder: "Optional", oninput: (e) => (session.notes = e.target.value) }),
      ),
    ),
  );
  const saveBtn = el("button", { class: "btn primary small" }, "Save session info");
  saveBtn.onclick = withLoading(saveBtn, onSave);
  card.append(saveBtn);
  return card;
}
