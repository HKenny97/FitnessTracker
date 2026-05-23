import { config } from "./config.js";
import * as auth from "./auth.js";
import { route, dispatch, onRender, currentHash } from "./router.js";
import * as dashboard from "./views/dashboard.js";
import * as meso from "./views/meso.js";
import * as workout from "./views/workout.js";
import * as cardio from "./views/cardio.js";
import * as history from "./views/history.js";
import * as settings from "./views/settings.js";
import * as sheets from "./sheets.js";
import { el, clear, toast } from "./ui.js";

const view = document.getElementById("view");
const authSlot = document.getElementById("auth-slot");

function setActiveTab() {
  const hash = currentHash();
  const tab =
    hash.startsWith("#/meso") ? "meso" :
    hash.startsWith("#/workout") ? "workout" :
    hash.startsWith("#/cardio") ? "cardio" :
    hash.startsWith("#/history") ? "history" :
    hash.startsWith("#/settings") ? "settings" : "dashboard";
  for (const a of document.querySelectorAll(".tabs a")) {
    a.classList.toggle("active", a.dataset.route === tab);
  }
}

function renderAuth(state) {
  clear(authSlot);
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
      view.append(
        el("div", { class: "banner error" },
          e?.result?.error?.message || e?.message || "Something went wrong"),
      );
    }
  };
}

route("/", wrap(async (root, _p, state) => dashboard.render(root, state)));
route("/meso", wrap(async (root) => meso.renderList(root)));
route("/meso/new", wrap(async (root) => meso.renderNew(root)));
route("/meso/:id", wrap(async (root, p) => meso.renderDetail(root, p.id)));
route("/workout", wrap(async (root) => workout.render(root)));
route("/cardio", wrap(async (root) => cardio.render(root)));
route("/history", wrap(async (root) => history.render(root)));
route("/settings", wrap(async (root) => settings.render(root)));

onRender((handler, params) => handler(params));

document.addEventListener("click", (e) => {
  const btn = e.target.closest("#sign-in-btn, #sign-in-btn-2");
  if (btn) {
    e.preventDefault();
    auth.signIn();
  }
});

(async () => {
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
  }
  auth.onAuthChange((state) => {
    renderAuth(state);
    dispatch();
  });
  if (!location.hash) location.hash = "#/";
  dispatch();

  const loader = document.getElementById("gama-loader");
  if (loader) {
    loader.style.transition = "opacity 0.4s";
    loader.style.opacity = "0";
    setTimeout(() => loader.remove(), 400);
  }
})();
