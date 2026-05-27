import { config } from "./config.js";
import * as auth from "./auth.js";
import { route, dispatch, onRender, currentHash } from "./router.js";
import * as dashboard from "./views/dashboard.js";
import * as meso from "./views/meso.js";
import * as goals from "./views/goals.js";
import * as profile from "./views/profile.js";
import * as workout from "./views/workout.js";
import * as history from "./views/history.js";
import * as settings from "./views/settings.js";
import * as insights from "./views/insights.js";
import * as sheets from "./sheets.js";
import { el, clear, toast } from "./ui.js";

const view = document.getElementById("view");
const authSlot = document.getElementById("auth-slot");

let lastAuthState = auth.getState();
let syncCount = 0;

function setActiveTab() {
  const hash = currentHash();
  const tab =
    hash.startsWith("#/meso") || hash.startsWith("#/plan") ? "meso" :
    hash.startsWith("#/workout") ? "workout" :
    hash.startsWith("#/history") ? "history" :
    hash.startsWith("#/settings") || hash.startsWith("#/profile") ? "settings" : "dashboard";
  for (const a of document.querySelectorAll(".tabs a")) {
    a.classList.toggle("active", a.dataset.route === tab);
  }
}

function renderAuth(state) {
  lastAuthState = state;
  clear(authSlot);
  if (syncCount > 0) {
    authSlot.append(
      el("span", { class: "sync-pill", title: "Logged offline — will sync when you're back online" },
        `${syncCount} pending · will sync`),
    );
  }
  if (!config.googleClientId) {
    authSlot.append(
      el("a", { class: "auth-pill", href: "#/settings" },
        el("span", { class: "dot off" }), "Setup needed"),
    );
    return;
  }
  if (state.signedIn) {
    authSlot.append(
      el("span", { class: "auth-pill" },
        el("span", { class: "dot" }),
        state.email || "Signed in",
      ),
      el("button", { class: "btn small ghost", onclick: () => auth.signOut() }, "Sign out"),
    );
  } else {
    authSlot.append(
      el("button", { class: "btn primary small", onclick: () => auth.signIn() }, "Sign in"),
    );
  }
}

function wrap(fn) {
  return async (params) => {
    clear(view);
    setActiveTab();
    view.append(el("p", { class: "muted" }, "Loading…"));
    try {
      const state = auth.getState();
      const newView = document.createElement("div");
      await fn(newView, params, state);
      clear(view);
      view.append(newView);
    } catch (e) {
      console.error(e);
      clear(view);
      const msg = e?.result?.error?.message || e?.message || "Something went wrong";
      // If the error is auth-related, prompt to sign in instead of a
      // generic error banner.
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        view.append(
          el("div", { class: "banner warn" },
            "You're offline. Any sets you log are saved on this device and will sync when you're back online. ",
            el("button", { class: "btn small", onclick: () => dispatch() }, "Retry"),
          ),
        );
      } else if (msg === "Not signed in" || e?.result?.error?.code === 401) {
        view.append(
          el("div", { class: "banner warn" },
            "Your session expired. ",
            el("button", { class: "btn primary small", onclick: () => auth.signIn() }, "Sign in again"),
          ),
        );
      } else {
        view.append(
          el("div", { class: "banner error" },
            msg,
            " ",
            el("button", { class: "btn small", onclick: () => location.reload() }, "Reload"),
          ),
        );
      }
    }
  };
}

route("/", wrap(async (root, _p, state) => dashboard.render(root, state)));
route("/meso", wrap(async (root) => meso.renderList(root)));
route("/plan/weekly", wrap(async (root) => goals.render(root)));
route("/meso/new", wrap(async (root) => meso.renderNew(root)));
route("/meso/:id", wrap(async (root, p) => meso.renderDetail(root, p.id)));
route("/workout", wrap(async (root) => workout.render(root)));
route("/history", wrap(async (root) => history.render(root)));
route("/settings", wrap(async (root) => settings.render(root)));
route("/profile", wrap(async (root) => profile.render(root)));
route("/link/:id", wrap(async (root, p) => settings.renderLink(root, p.id)));
route("/insights", wrap(async (root) => insights.render(root, {})));
route("/insights/:exercise", wrap(async (root, p) => insights.render(root, { exercise: p.exercise })));

onRender((handler, params) => handler(params));

document.addEventListener("click", (e) => {
  const btn = e.target.closest("#sign-in-btn, #sign-in-btn-2");
  if (btn) {
    e.preventDefault();
    auth.signIn();
  }
});

function hideLoader() {
  const loader = document.getElementById("gama-loader");
  if (!loader) return;
  loader.style.transition = "opacity 0.4s";
  loader.style.opacity = "0";
  setTimeout(() => loader.remove(), 400);
}

async function tryFlush() {
  try {
    const { sent } = await sheets.flushOutbox();
    if (sent > 0) {
      toast(`Synced ${sent} pending change${sent === 1 ? "" : "s"}`, "ok");
      dispatch();
    }
  } catch (e) {
    console.error("Outbox flush failed:", e);
  }
}

window.addEventListener("online", tryFlush);

(async () => {
  try {
    // Reflect any writes queued in a previous (offline) session immediately.
    sheets.onOutboxChange((n) => {
      syncCount = n;
      renderAuth(lastAuthState);
    });
    await auth.init();
    if (auth.didSilentRestoreFail()) {
      toast("Session expired — please sign in again", "warn");
    }
    const initState = auth.getState();
    if (initState.signedIn && sheets.getSpreadsheetId()) {
      try {
        await sheets.ensureTabs(sheets.getSpreadsheetId());
      } catch (e) {
        console.error("Failed to ensure tabs:", e);
      }
      tryFlush();
    }
    auth.onAuthChange((state) => {
      renderAuth(state);
      dispatch();
      if (state.signedIn) tryFlush();
    });
    if (!location.hash) location.hash = "#/";
    dispatch();
  } catch (e) {
    console.error("App initialization failed:", e);
    if (!location.hash) location.hash = "#/";
    try { dispatch(); } catch (e2) { console.error("Dispatch failed:", e2); }
    toast("Couldn't reach Google — some features unavailable", "warn");
  } finally {
    hideLoader();
  }
})();
