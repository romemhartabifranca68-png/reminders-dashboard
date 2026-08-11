import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAnalytics, isSupported as isAnalyticsSupported } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-analytics.js";
import { getDatabase, ref, get, set, remove } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

(function () {
  const firebaseConfig = {
    apiKey: "AIzaSyDOLgbNBg3-kIEC4rbO_Cgbrgo55fOQhTM",
    authDomain: "bscs-reviewer-arena.firebaseapp.com",
    databaseURL: "https://bscs-reviewer-arena-default-rtdb.firebaseio.com",
    projectId: "bscs-reviewer-arena",
    storageBucket: "bscs-reviewer-arena.firebasestorage.app",
    messagingSenderId: "992707582654",
    appId: "1:992707582654:web:6c578a8ff50e61eee69cef",
    measurementId: "G-PF14N9BGHY"
  };

  let app;
  let db;

  try {
    app = initializeApp(firebaseConfig);
    db = getDatabase(app);
    console.log("[Arena] Firebase initialized OK.");
  } catch (error) {
    console.error("[Arena] Firebase FAILED to initialize:", error);
  }

  isAnalyticsSupported()
    .then((supported) => {
      if (supported && app) {
        getAnalytics(app);
      }
    })
    .catch((error) => {
      console.warn("[Arena] Analytics not initialized:", error);
    });

  const STORAGE_KEY = "bscs1a_reviewer_arena_scores_v6";
  const FIREBASE_TABLE = "arena_scores";
  /* PHASE 2 */
  const MASTERY_STORAGE_KEY = "bscs1a_arena_mastery_v1";
  const DAILY_QUESTION_COUNT = 12;
  const DAILY_LEADERBOARD_PREFIX = "daily_";
  const LEADERBOARD_DAILY_ID = "__daily__";

  /* =====================================================================
     ACCESS CONTROL — Classmate roster (hashed passwords) vs Guest
     Note: GitHub Pages is static. This is a section privacy gate + UX split,
     not cryptographic server auth. Passwords are SHA-256 hashed at rest in
     the client bundle; still treat the private password list as confidential.
  ===================================================================== */
  const AUTH_SESSION_KEY = "bscs1a_hub_session_v1";
  const ADMIN_USERNAME = "tabifranca";
  const ADMIN_CODE_HASH = "0468c056fcc1b0b733d4df0731d0bbb2180ff90e764f4972b5c423e8642b406a"; // RST-ADMIN-HUB-2026
  const HUB_CONFIG_PATH = "hub_config";
  const ANNOUNCEMENT_PATH = "hub_config/announcement";
  const RESOURCE_REQ_PATH = "hub_config/resource_requests";
  const ANNOUNCEMENT_LOCAL_KEY = "bscs1a_admin_pin_v1";
  const GUEST_PASSES_PATH = "hub_config/guest_passes";
  const LOGIN_LOG_PATH = "hub_logins";
  const LOGIN_LOG_EVENTS_PATH = "hub_login_events";
  const LOGIN_LOG_LOCAL_KEY = "bscs1a_login_log_v1";
  const NOTEBOOK_KEY = "bscs1a_mistake_notebook_v1";
  const SEASON_MID_START = "2026-08-01";
  const SEASON_MID_END = "2026-10-15";
  const SEASON_FIN_START = "2026-10-16";
  const SEASON_FIN_END = "2027-01-15";
  const COMPANY_NAME = "RST";
  /* Duty channels officers may post to (classmates-only feed). */
  const OFFICER_ROLES = {
    oclarino: { title: "President", channels: ["announcements", "academics", "events"] },
    baldemor: { title: "Vice President", channels: ["announcements", "academics", "events"] },
    flores: { title: "Secretary", channels: ["events", "announcements"] },
    bacero: { title: "Treasurer", channels: ["events"] },
    lumacad: { title: "Auditor", channels: ["events", "academics"] },
    cainto: { title: "P.I.O.", channels: ["announcements"] },
    tabifranca: { title: "Technical Manager", channels: ["tech", "announcements", "academics", "events"] },
    cinena: { title: "Representative", channels: ["announcements", "academics"] },
    guia: { title: "P.O. Boy", channels: ["events"] },
    calamba: { title: "P.O. Girl", channels: ["events"] }
  };
  const OFFICER_UPDATES_PATH = "hub_config/officer_updates";
  const OFFICER_UPDATES_LOCAL = "bscs1a_officer_updates_v1";
  const CHANNEL_LABELS = {
    announcements: "Announcements",
    academics: "Academics / modules",
    events: "Events & docs",
    tech: "Hub / tech"
  };

  const STUDY_PLAN_COUNT = 10;
  const MISTAKES_STORAGE_KEY = "bscs1a_arena_recent_mistakes_v1";

  const CLASSMATE_ROSTER = [
    { username: "anggay", displayName: "ANGGAY, SHEIKH HASSAN G.", hash: "bb7aca0584643d8638d0a3fb543469293e1b24b3d6380a24030853c62a8c6641" },
    { username: "astrera", displayName: "ASTRERA, MARK ANGELO F.", hash: "75e1ecf8a0e7562f3abe8e3d0685f6b6dc33cd2319fc490be7c0687ec7d5f032" },
    { username: "bacero", displayName: "BACERO, TROY V.", hash: "5a6b36640c45b80f23991a2f7739453106fadecb93622ae754d20f0cd1becb0a" },
    { username: "baldemor", displayName: "BALDEMOR, ERNEST JOHN REU M.", hash: "6225ad79fe8378fe4df4b572d3f9edb5226c73d030ecf091ae5aa51cfbc2bbd2" },
    { username: "cainto", displayName: "CAINTO, MARIANNE ABBY V.", hash: "e9c774bff8675a035fecf103b8d06264e7046f0ea21b4f6639933dc6030ba4df" },
    { username: "calamba", displayName: "CALAMBA, ASHLEY NICOLE F.", hash: "297988abdcf28a79ef46e5817369d010fda9de1cd65b5d74696b42420e8b1923" },
    { username: "cinena", displayName: "CINENA, NASH RAEL M.", hash: "20b1b7a365525acd43c77a0e2b36b1c9285fea07a195e8e6443a7b065d50ac09" },
    { username: "coronacion", displayName: "CORONACION, LEENARD G.", hash: "2e7b82dbf72df3726e94307b1fb3e3d08d63eb87005025e13422cdb3b1ad78fe" },
    { username: "dolar", displayName: "DOLAR, NAZ LOUIE GONZALES", hash: "5001595800056b42769495572f23f261b996dfbb02ef906ea6434d21704d4ec9" },
    { username: "enciso", displayName: "ENCISO, PRINCE JAMES F.", hash: "83e03cc1487fac975e98636d235b599398a89b444a0e8e501bbb7fd523fd8c61" },
    { username: "flores", displayName: "FLORES, DEKADA A.", hash: "762117c1e0c0df468076b7ddd13d1146b15f78e4c8cfc5ab00e0b696b0fe7cc3" },
    { username: "gamayon", displayName: "GAMAYON, MATT LOUIS F.", hash: "d8b3c44085142731cc01dfd201ab7d8d637d082c139020ea7afc993422fa28e7" },
    { username: "guia", displayName: "GUIA, JOHN CHRISTIAN C.", hash: "58965dd229699d9dc790fca76fd56f3dbaa05e4179ef0f0b49d62c9e1053de1c" },
    { username: "lumacad", displayName: "LUMACAD, LORIEJANE V.", hash: "d1feebfda5c035a387529bc1622907a74edafb65d58f97577c61cf6de64f2ac8" },
    { username: "millarez", displayName: "MILLAREZ, RHYLIE B.", hash: "f047c40d5eeada8881d27fd985934197c7edcedc23c259c31573770c86f34361" },
    { username: "navarro", displayName: "NAVARRO, CEE JAY B.", hash: "cad9f32c631e3b4843532d3ad4e399f16dc416c612271fe09f72f3e80bd4db79" },
    { username: "oclarino", displayName: "OCLARINO, CHRAIST ALBERT D.", hash: "1a4b167f4119af6e5380b743f3d7ea1528f9a439de5ebec442fa036fb80d04f4" },
    { username: "persincula", displayName: "PERSINCULA, JOSIAH LEONEL J.", hash: "08d217fb1ce812e647f0506b1aeed24bdb3ac7171c69878cde0f441b4c9ad6b7" },
    { username: "recomo", displayName: "RECOMO, JOHN MARK", hash: "cbee362013d4ab4c6b3108aa453c602dfad73bddcc1f2d3b6ee2629ca71f6081" },
    { username: "tabifranca", displayName: "TABIFRANCA, ROME MHAR S.", hash: "cc264853858cc71334cdb4ad9b16b09fe73a38758a60f0b89b413876d1012f64" }
  ];

  const authState = {
    role: null, // "classmate" | "guest" | "admin"
    username: "",
    displayName: "",
    ready: false,
    isAdmin: false,
    officerTitle: "",
    officerChannels: [],
    guestPlayAllowed: false,
    guestPassCode: ""
  };

  async function sha256Hex(textValue) {
    const data = new TextEncoder().encode(String(textValue));
    if (window.crypto && window.crypto.subtle) {
      const buf = await window.crypto.subtle.digest("SHA-256", data);
      return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
    }
    // Extremely old browser fallback — not expected on modern phones
    return String(textValue);
  }

  function saveAuthSession(session) {
    // localStorage = stay signed in after app/tab close (phone home-screen PWA friendly).
    // We store role/session profile only — NEVER the raw password.
    try {
      const payload = {
        ...session,
        ts: session.ts || Date.now(),
        remember: true
      };
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(payload));
      // Clear any old sessionStorage copy so we don't dual-source
      try { sessionStorage.removeItem(AUTH_SESSION_KEY); } catch (e) { /* ignore */ }
    } catch (error) {
      console.warn("[Auth] session persist failed:", error);
    }
  }

  function loadAuthSession() {
    try {
      let raw = localStorage.getItem(AUTH_SESSION_KEY);
      // One-time migrate from older sessionStorage sessions
      if (!raw) {
        try {
          raw = sessionStorage.getItem(AUTH_SESSION_KEY);
          if (raw) {
            localStorage.setItem(AUTH_SESSION_KEY, raw);
            sessionStorage.removeItem(AUTH_SESSION_KEY);
          }
        } catch (e) {
          /* ignore */
        }
      }
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.role) return null;
      if (parsed.role !== "classmate" && parsed.role !== "guest" && parsed.role !== "admin") return null;
      // Optional: expire after 120 days of inactivity marker
      const maxAge = 120 * 24 * 60 * 60 * 1000;
      if (parsed.ts && Date.now() - Number(parsed.ts) > maxAge) {
        clearAuthSession();
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  function clearAuthSession() {
    try {
      localStorage.removeItem(AUTH_SESSION_KEY);
    } catch (error) {
      /* ignore */
    }
    try {
      sessionStorage.removeItem(AUTH_SESSION_KEY);
    } catch (error) {
      /* ignore */
    }
  }

  function isClassmate() {
    return authState.role === "classmate" || authState.role === "admin";
  }

  function isGuest() {
    return authState.role === "guest";
  }

  function isAdmin() {
    return !!authState.isAdmin || authState.role === "admin";
  }

  function isOfficer() {
    return isAdmin() || (authState.officerChannels && authState.officerChannels.length > 0);
  }

  /** Academics / tech duty (or full admin) may review resource requests. */
  function canManageResourceRequests() {
    if (isAdmin()) return true;
    const ch = authState.officerChannels || [];
    return ch.indexOf("academics") >= 0 || ch.indexOf("tech") >= 0;
  }


  function resolveOfficerProfile(username) {
    const key = String(username || "").toLowerCase();
    const row = OFFICER_ROLES[key];
    if (!row) return { title: "", channels: [] };
    if (key === ADMIN_USERNAME) {
      return { title: row.title, channels: ["tech", "announcements", "academics", "events"] };
    }
    return { title: row.title, channels: row.channels.slice() };
  }


  function canPlayArena() {
    if (isClassmate() || isAdmin()) return true;
    if (isGuest() && authState.guestPlayAllowed) return true;
    return false;
  }

  /** Classmate/admin arena name = roster surname (before comma) or username. */
  function classmateArenaName() {
    const dn = String(authState.displayName || "");
    if (dn.includes(",")) {
      return dn.split(",")[0].trim();
    }
    if (dn.trim()) return dn.trim().slice(0, 22);
    return String(authState.username || "").toUpperCase().slice(0, 22);
  }

  function syncArenaUsernameField() {
    const input = elements.usernameInput || $("usernameInput");
    const title = $("usernameFieldTitle");
    const hint = $("usernameFieldHint");
    if (!input) return;

    if (isClassmate() || isAdmin()) {
      const name = classmateArenaName();
      input.value = name;
      input.readOnly = true;
      input.classList.add("is-name-locked");
      input.setAttribute("aria-readonly", "true");
      if (title) title.textContent = "Your arena name (from login)";
      if (hint) {
        hint.textContent = "Locked to your classmate surname. Choose mode / run type, then START.";
      }
      input.blur();
    } else if (isGuest()) {
      input.readOnly = false;
      input.classList.remove("is-name-locked");
      input.removeAttribute("aria-readonly");
      if (!input.value) input.placeholder = "Guest display name";
      if (title) title.textContent = "Guest display name";
      if (hint) {
        hint.textContent = "Type a name, tap Done on the keyboard, then pick mode. Name stays fixed after Done.";
      }
    } else {
      input.readOnly = false;
      input.classList.remove("is-name-locked");
    }
  }

  /** Guest: confirm typed name, dismiss keyboard, lock field until they clear. */
  function confirmGuestDisplayName() {
    const input = elements.usernameInput || $("usernameInput");
    if (!input || !isGuest()) return;
    const cleaned = sanitizeUsername(input.value || "");
    if (!cleaned) {
      if (elements.loginStatus) {
        elements.loginStatus.textContent = "Ilagay muna ang guest display name, tapos Done.";
      }
      return;
    }
    input.value = cleaned;
    input.readOnly = true;
    input.classList.add("is-name-locked");
    input.blur();
    if (elements.loginStatus) {
      elements.loginStatus.textContent = "Name locked. Pumili ng mode / run type, then START.";
    }
  }



  function applyAuthUI() {
    document.body.classList.toggle("authed", !!authState.role);
    document.body.classList.toggle("role-classmate", authState.role === "classmate" || authState.role === "admin");
    document.body.classList.toggle("role-guest", authState.role === "guest");
    document.body.classList.toggle("role-admin", isAdmin());
    document.body.classList.toggle("role-officer", isOfficer());
    document.body.classList.toggle("guest-play-ok", !!(isGuest() && authState.guestPlayAllowed));

    const gate = $("authGate");
    if (gate) gate.hidden = !!authState.role;

    const chip = $("sessionChip");
    if (chip) {
      if (!authState.role) {
        chip.hidden = true;
      } else {
        chip.hidden = false;
        chip.classList.toggle("is-guest", authState.role === "guest");
        chip.classList.toggle("is-classmate", authState.role === "classmate" || authState.role === "admin");
        if (isAdmin()) {
          chip.textContent = "RST Admin";
          chip.title = `Admin · ${authState.displayName} · ${COMPANY_NAME}`;
        } else if (authState.role === "guest") {
          chip.textContent = authState.guestPlayAllowed ? "Guest · Pass OK" : "Guest · Browse";
          chip.title = authState.guestPlayAllowed
            ? "Guest with play permission"
            : "Guest browse-only — no arena play";
        } else {
          chip.textContent = authState.displayName.split(",")[0] || authState.username;
          chip.title = `Classmate · ${authState.displayName}`;
        }
      }
    }

    const logoutBtn = $("logoutBtn");
    if (logoutBtn) logoutBtn.hidden = !authState.role;
    const navLogout = $("navLogoutLink");
    if (navLogout) navLogout.hidden = !authState.role;

    // Lock resource request form for browse-only guests (no Guest Pass)
    const reqForm = $("resourceRequestForm");
    const browseOnlyGuest = authState.role === "guest" && !authState.guestPlayAllowed;
    if (reqForm) {
      const fields = reqForm.querySelectorAll("input, textarea, button");
      fields.forEach((el) => {
        el.disabled = browseOnlyGuest;
        if (browseOnlyGuest) el.setAttribute("tabindex", "-1");
        else el.removeAttribute("tabindex");
      });
      reqForm.setAttribute("aria-disabled", browseOnlyGuest ? "true" : "false");
    }

    const guestBanner = $("guestBanner");
    if (guestBanner) {
      guestBanner.hidden = authState.role !== "guest";
      if (authState.role === "guest") {
        if (authState.guestPlayAllowed) {
          guestBanner.innerHTML =
            '<span class="gb-title">Guest Pass active</span>' +
            "You may use <strong>Practice</strong> / <strong>Study Plan</strong> only." +
            '<ul class="gb-list">' +
            "<li>Locked: Ranked · Daily Challenge</li>" +
            "<li>Locked: Class Dashboard · Google Drive</li>" +
            "<li>Locked: Officer Updates board</li>" +
            "</ul>" +
            '<p class="gb-ok">Open for you: browse hub · Practice · Study Plan · resource request</p>';
        } else {
          guestBanner.innerHTML =
            '<span class="gb-title">Guest mode · browse only</span>' +
            "Arena is locked until Admin (RST) issues a Guest Pass." +
            '<ul class="gb-list">' +
            "<li>Locked: Reviewer Arena (all modes)</li>" +
            "<li>Locked: Class Dashboard · Google Drive</li>" +
            "<li>Locked: Officer Updates · Resource requests</li>" +
            "<li>Locked: Ranked scores / leaderboard play</li>" +
            "</ul>" +
            '<p class="gb-ok">Open for you: schedule · officers list · vision · freshmen directory · Freedom Wall · Section FB</p>';
        }
      }
    }

    const adminBtn = $("openAdminHubBtn");
    if (adminBtn) adminBtn.hidden = !isAdmin();
    const adminBtnTop = $("openAdminHubBtnTop");
    if (adminBtnTop) adminBtnTop.hidden = !isAdmin();
    const odLogin = $("openOfficerDeskBtnLogin");
    if (odLogin) odLogin.hidden = !isOfficer();
    document.querySelectorAll(".officer-desk-btn").forEach((btn) => {
      if (btn.id === "openOfficerDeskBtnLogin") return;
      // section button visible via CSS body.role-officer
    });
    if (typeof renderOfficerUpdates === "function") renderOfficerUpdates();

    // Show admin code field when username is tabifranca
    const adminField = $("adminCodeField");
    const userInput = $("authUsername");
    if (adminField && userInput && !authState.role) {
      const u = String(userInput.value || "").trim().toLowerCase();
      adminField.hidden = u !== ADMIN_USERNAME;
    }

    if (typeof renderScholarProfile === "function") renderScholarProfile();
    if (typeof syncArenaUsernameField === "function") syncArenaUsernameField();

    // Guests with play permission default to Practice; locked guests stay out of run types
    if (authState.role === "guest" && authState.guestPlayAllowed && typeof selectRunType === "function") {
      selectRunType("practice");
    }
  }

  async function tryClassmateLogin(usernameRaw, passwordRaw, adminCodeRaw) {
    const username = String(usernameRaw || "").trim().toLowerCase().replace(/[^a-z]/g, "");
    const password = String(passwordRaw || "");
    const adminCode = String(adminCodeRaw || "");
    if (!username || !password) {
      return { ok: false, message: "Ilagay ang username at password na assigned sa'yo." };
    }
    const entry = CLASSMATE_ROSTER.find((row) => row.username === username);
    if (!entry) {
      return { ok: false, message: "Hindi makita ang username sa classmate roster." };
    }
    const hash = await sha256Hex(password);
    if (hash !== entry.hash) {
      return { ok: false, message: "Maling password. I-check ulit ang credentials from RST / Tech Manager." };
    }

    let elevatedAdmin = false;
    if (username === ADMIN_USERNAME && adminCode) {
      const adminHash = await sha256Hex(adminCode);
      if (adminHash === ADMIN_CODE_HASH) {
        elevatedAdmin = true;
      } else {
        return { ok: false, message: "Admin secret code is incorrect." };
      }
    }

    authState.role = elevatedAdmin ? "admin" : "classmate";
    authState.isAdmin = elevatedAdmin;
    authState.username = entry.username;
    authState.displayName = entry.displayName;
    authState.ready = true;
    authState.guestPlayAllowed = true;
    const officer = resolveOfficerProfile(entry.username);
    authState.officerTitle = officer.title;
    authState.officerChannels = officer.channels;
    saveAuthSession({
      role: authState.role,
      isAdmin: elevatedAdmin,
      username: entry.username,
      displayName: entry.displayName,
      guestPlayAllowed: true,
      officerTitle: officer.title,
      officerChannels: officer.channels,
      ts: Date.now()
    });
    // Fire-and-forget login log for RST Admin dashboard
    recordClassmateLogin({
      username: entry.username,
      displayName: entry.displayName,
      role: elevatedAdmin ? "admin" : "classmate"
    }).catch((error) => console.warn("[Auth] login log failed:", error));
    return { ok: true, admin: elevatedAdmin };
  }

  function formatLoginStamp(ts) {
    try {
      const d = new Date(Number(ts) || Date.now());
      return d.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return String(ts);
    }
  }

  async function recordClassmateLogin(info) {
    const entry = {
      username: info.username,
      displayName: info.displayName || info.username,
      role: info.role || "classmate",
      ts: Date.now(),
      company: COMPANY_NAME
    };

    // Local mirror (always) — last login per username + recent event list
    try {
      const store = JSON.parse(localStorage.getItem(LOGIN_LOG_LOCAL_KEY) || "{}");
      if (!store.byUser || typeof store.byUser !== "object") store.byUser = {};
      if (!Array.isArray(store.events)) store.events = [];
      store.byUser[entry.username] = entry;
      store.events.unshift(entry);
      store.events = store.events.slice(0, 50);
      localStorage.setItem(LOGIN_LOG_LOCAL_KEY, JSON.stringify(store));
    } catch (error) {
      console.warn("[Auth] local login log failed:", error);
    }

    if (db && entry.username) {
      try {
        // Latest login per classmate
        await set(ref(db, `${LOGIN_LOG_PATH}/${entry.username}`), entry);
        // Full event history (append-style key)
        const eventId = `${entry.username}_${entry.ts}`;
        await set(ref(db, `${LOGIN_LOG_EVENTS_PATH}/${eventId}`), entry);
      } catch (error) {
        console.warn("[Auth] Firebase login log write failed:", error);
      }
    }
  }

  async function fetchClassmateLoginEvents(limitN) {
    const limit = Math.max(5, Math.min(80, Number(limitN) || 40));
    let events = [];
    if (db) {
      try {
        const snap = await get(ref(db, LOGIN_LOG_EVENTS_PATH));
        if (snap.exists()) {
          const val = snap.val();
          Object.keys(val).forEach((key) => {
            const row = val[key];
            if (row && typeof row === "object") events.push({ id: key, ...row });
          });
        }
      } catch (error) {
        console.warn("[Auth] events read failed:", error);
      }
    }
    if (!events.length) {
      try {
        const store = JSON.parse(localStorage.getItem(LOGIN_LOG_LOCAL_KEY) || "{}");
        events = Array.isArray(store.events) ? store.events.slice() : [];
      } catch (error) {
        events = [];
      }
    }
    return events
      .slice()
      .sort((a, b) => Number(b.ts || 0) - Number(a.ts || 0))
      .slice(0, limit);
  }

  function countActiveThisWeek(logRows) {
    const weekAgo = Date.now() - 7 * 86400000;
    const seen = new Set();
    (logRows || []).forEach((row) => {
      if (Number(row.ts || 0) >= weekAgo && row.username) seen.add(row.username);
    });
    return seen.size;
  }

  /* ---------------- Mistake Notebook (persistent) ---------------- */
  function loadNotebook() {
    try {
      const raw = JSON.parse(localStorage.getItem(NOTEBOOK_KEY) || "[]");
      return Array.isArray(raw) ? raw : [];
    } catch {
      return [];
    }
  }

  function saveNotebookEntry(question) {
    if (!question) return;
    try {
      const list = loadNotebook().filter((m) => !(m.s === question.s && m.q === question.q));
      list.unshift({
        s: question.s,
        q: question.q,
        a: question.answer,
        ts: Date.now()
      });
      localStorage.setItem(NOTEBOOK_KEY, JSON.stringify(list.slice(0, 60)));
    } catch (error) {
      /* ignore */
    }
  }

  function openMistakeNotebook() {
    const existing = document.querySelector(".admin-overlay.notebook-overlay");
    if (existing) existing.remove();
    const overlay = document.createElement("div");
    overlay.className = "admin-overlay notebook-overlay";
    const panel = document.createElement("div");
    panel.className = "admin-panel";
    const items = loadNotebook();
    panel.innerHTML = `
      <h3 style="margin:0 0 8px;font-size:1rem;">Mistake Notebook</h3>
      <p style="margin:0 0 10px;font-size:0.78rem;color:var(--muted);">Saved wrong answers on this device. Use for focused review.</p>
      <div class="notebook-list" id="notebookList"></div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;">
        <button type="button" class="lifeline-btn" id="notebookClear">Clear all</button>
        <button type="button" class="lifeline-btn" id="notebookClose">Close</button>
      </div>`;
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    const listEl = panel.querySelector("#notebookList");
    if (!items.length) {
      listEl.innerHTML = `<p style="color:var(--muted);font-size:0.84rem;">Wala pang saved mistakes. Magkamali sa Practice para mapuno ito.</p>`;
    } else {
      listEl.innerHTML = items.map((m) => `
        <div class="notebook-item">
          <strong style="color:#ffd7a3;">${escapeHtml(m.s || "")}</strong><br/>
          ${escapeHtml(m.q || "")}<br/>
          <span style="color:var(--accent);font-weight:800;">Answer: ${escapeHtml(m.a || "")}</span>
        </div>`).join("");
    }
    bindTap(panel.querySelector("#notebookClose"), (e) => { e.preventDefault(); overlay.remove(); });
    bindTap(overlay, (e) => { if (e.target === overlay) overlay.remove(); });
    bindTap(panel.querySelector("#notebookClear"), (e) => {
      e.preventDefault();
      if (window.confirm("Clear entire mistake notebook?")) {
        localStorage.removeItem(NOTEBOOK_KEY);
        overlay.remove();
        showShareToast && showShareToast("Notebook cleared");
      }
    });
  }

  function initNotebookButton() {
    const btn = $("openNotebookBtn");
    if (!btn) return;
    bindTap(btn, (event) => {
      event.preventDefault();
      openMistakeNotebook();
    });
  }

  function getCurrentSeasonKey() {
    const today = getLocalDateKey(); // YYYYMMDD
    const iso = `${today.slice(0,4)}-${today.slice(4,6)}-${today.slice(6,8)}`;
    if (iso >= SEASON_MID_START && iso <= SEASON_MID_END) return "season_midterms";
    if (iso >= SEASON_FIN_START && iso <= SEASON_FIN_END) return "season_finals";
    return null;
  }

  function getSeasonLabel(key) {
    if (key === "season_midterms") return "Season · Midterms";
    if (key === "season_finals") return "Season · Finals";
    return "Season";
  }


  async function fetchClassmateLoginLog() {
    const list = [];
    if (db) {
      try {
        const snap = await get(ref(db, LOGIN_LOG_PATH));
        if (snap.exists()) {
          const val = snap.val();
          Object.keys(val).forEach((key) => {
            const row = val[key];
            if (row && typeof row === "object") {
              list.push({ id: key, ...row });
            }
          });
        }
      } catch (error) {
        console.warn("[Auth] Firebase login log read failed:", error);
      }
    }
    if (!list.length) {
      try {
        const store = JSON.parse(localStorage.getItem(LOGIN_LOG_LOCAL_KEY) || "{}");
        const byUser = store.byUser || {};
        Object.keys(byUser).forEach((key) => list.push({ id: key, ...byUser[key] }));
      } catch (error) {
        /* ignore */
      }
    }
    return list
      .slice()
      .sort((a, b) => Number(b.ts || 0) - Number(a.ts || 0));
  }


  async function verifyGuestPass(passRaw) {
    const code = String(passRaw || "").trim().toUpperCase().replace(/[^A-Z0-9\-]/g, "");
    if (!code) return { ok: false, allowed: false };

    // Local fallback passes issued offline by admin panel (same device)
    try {
      const local = JSON.parse(localStorage.getItem("bscs1a_guest_passes_v1") || "{}");
      if (local[code] && local[code].active) {
        if (local[code].expiresAt && Number(local[code].expiresAt) < Date.now()) {
          return { ok: false, allowed: false, message: "Guest Pass expired. Ask RST Admin for a new one." };
        }
        return { ok: true, allowed: true, code, source: "local" };
      }
    } catch (error) {
      /* ignore */
    }

    if (db) {
      try {
        // Global toggle
        const cfgSnap = await get(ref(db, HUB_CONFIG_PATH));
        if (cfgSnap.exists() && cfgSnap.val() && cfgSnap.val().guestPlayEnabled === true) {
          return { ok: true, allowed: true, code: "GLOBAL", source: "global" };
        }
        const passSnap = await get(ref(db, `${GUEST_PASSES_PATH}/${code}`));
        if (passSnap.exists()) {
          const val = passSnap.val();
          if (val && val.active !== false) {
            if (val.expiresAt && Number(val.expiresAt) < Date.now()) {
              return { ok: false, allowed: false, message: "Guest Pass expired. Ask RST Admin for a new one." };
            }
            return { ok: true, allowed: true, code, source: "firebase" };
          }
        }
      } catch (error) {
        console.warn("[Auth] guest pass check failed:", error);
      }
    }
    return { ok: false, allowed: false, message: "Invalid or expired Guest Pass." };
  }

  async function enterAsGuest(passRaw) {
    const pass = String(passRaw || "").trim();
    let allowed = false;
    let code = "";
    if (pass) {
      const checked = await verifyGuestPass(pass);
      allowed = !!checked.allowed;
      code = checked.code || pass.toUpperCase();
      if (pass && !allowed) {
        return { ok: false, message: checked.message || "Invalid Guest Pass. Browse-only kung walang valid pass." };
      }
    }
    authState.role = "guest";
    authState.isAdmin = false;
    authState.username = "guest";
    authState.displayName = "Guest Visitor";
    authState.ready = true;
    authState.guestPlayAllowed = allowed;
    authState.guestPassCode = code;
    saveAuthSession({
      role: "guest",
      isAdmin: false,
      username: "guest",
      displayName: "Guest Visitor",
      guestPlayAllowed: allowed,
      guestPassCode: code,
      ts: Date.now()
    });
    return { ok: true, allowed };
  }


  function signOutHub() {
    clearAuthSession();
    authState.role = null;
    authState.username = "";
    authState.displayName = "";
    authState.ready = false;
    authState.isAdmin = false;
    authState.officerTitle = "";
    authState.officerChannels = [];
    authState.guestPlayAllowed = false;
    authState.guestPassCode = "";
    applyAuthUI();
    // Soft reset arena UI if mid-flow
    try {
      if (typeof stopTimer === "function") stopTimer();
      if (typeof setView === "function") setView("loginView");
    } catch (error) {
      /* ignore */
    }
    const gate = $("authGate");
    if (gate) {
      gate.hidden = false;
      document.body.classList.remove("authed", "role-guest", "role-classmate");
    }
  }

  function initAuthGate() {
    const existing = loadAuthSession();
    if (existing) {
      authState.role = existing.role === "admin" ? "admin" : existing.role;
      authState.username = existing.username || "";
      authState.displayName = existing.displayName || "";
      authState.isAdmin = !!existing.isAdmin || existing.role === "admin";
      if (authState.isAdmin) authState.role = "admin";
      authState.guestPlayAllowed = !!existing.guestPlayAllowed || authState.role === "classmate" || authState.role === "admin";
      authState.guestPassCode = existing.guestPassCode || "";
      authState.officerTitle = existing.officerTitle || resolveOfficerProfile(existing.username).title;
      authState.officerChannels = Array.isArray(existing.officerChannels)
        ? existing.officerChannels
        : resolveOfficerProfile(existing.username).channels;
      authState.ready = true;
      applyAuthUI();
      // Refresh saved session timestamp so recurring opens keep stay-signed-in alive
      saveAuthSession({
        role: authState.role,
        isAdmin: authState.isAdmin,
        username: authState.username,
        displayName: authState.displayName,
        guestPlayAllowed: authState.guestPlayAllowed,
        guestPassCode: authState.guestPassCode || "",
        officerTitle: authState.officerTitle || "",
        officerChannels: authState.officerChannels || [],
        ts: Date.now(),
        remember: true
      });
    } else {
      applyAuthUI();
    }

    const loginBtn = $("authLoginBtn");
    const guestBtn = $("authGuestBtn");
    const userInput = $("authUsername");
    const passInput = $("authPassword");
    const adminInput = $("authAdminCode");
    const guestPassInput = $("authGuestPass");
    const errEl = $("authError");
    const logoutBtn = $("logoutBtn");
    const adminHubBtn = $("openAdminHubBtn");

    const showErr = (msg) => { if (errEl) errEl.textContent = msg || ""; };

    if (userInput) {
      userInput.addEventListener("input", () => {
        const adminField = $("adminCodeField");
        if (adminField) {
          const u = String(userInput.value || "").trim().toLowerCase();
          adminField.hidden = u !== ADMIN_USERNAME;
        }
      });
    }

    if (loginBtn) {
      bindTap(loginBtn, async (event) => {
        event.preventDefault();
        showErr("");
        loginBtn.disabled = true;
        loginBtn.textContent = "Verifying…";
        try {
          const result = await tryClassmateLogin(
            userInput && userInput.value,
            passInput && passInput.value,
            adminInput && adminInput.value
          );
          if (!result.ok) {
            showErr(result.message);
            return;
          }
          applyAuthUI();
          if (result.admin) {
            showShareToast && showShareToast("RST Admin session active");
          }
        } finally {
          loginBtn.disabled = false;
          loginBtn.textContent = "Sign in as Classmate";
        }
      });
    }

    if (guestBtn) {
      bindTap(guestBtn, async (event) => {
        event.preventDefault();
        showErr("");
        guestBtn.disabled = true;
        try {
          const result = await enterAsGuest(guestPassInput && guestPassInput.value);
          if (!result.ok) {
            showErr(result.message);
            return;
          }
          applyAuthUI();
        } finally {
          guestBtn.disabled = false;
        }
      });
    }

    if (passInput) {
      passInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          if (loginBtn) loginBtn.click();
        }
      });
    }
    if (userInput) {
      userInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          if (passInput) passInput.focus();
        }
      });
    }

    if (logoutBtn) {
      bindTap(logoutBtn, (event) => {
        event.preventDefault();
        if (window.confirm("Sign out of the Section Hub?")) {
          signOutHub();
        }
      });
    }

    const navLogoutLink = $("navLogoutLink");
    if (navLogoutLink) {
      bindTap(navLogoutLink, (event) => {
        event.preventDefault();
        if (window.confirm("Sign out of the Section Hub?")) {
          const navLinks = $("navLinks");
          if (navLinks) navLinks.classList.remove("open");
          const navToggle = $("navToggle");
          if (navToggle) navToggle.setAttribute("aria-expanded", "false");
          signOutHub();
        }
      });
    }

    if (adminHubBtn) {
      bindTap(adminHubBtn, (event) => {
        event.preventDefault();
        openRstAdminPanel();
      });
    }
    const adminHubBtnTop = $("openAdminHubBtnTop");
    if (adminHubBtnTop) {
      bindTap(adminHubBtnTop, (event) => {
        event.preventDefault();
        openRstAdminPanel();
      });
    }
  }

  /* ---------------- RST Admin Panel: guest play control ---------------- */
  function openRstAdminPanel() {
    if (!isAdmin()) {
      showShareToast && showShareToast("Admin only");
      return;
    }
    const existing = document.querySelector(".admin-overlay");
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.className = "admin-overlay";
    const panel = document.createElement("div");
    panel.className = "admin-panel";
    panel.innerHTML = `
      <h3 style="margin:0 0 8px;font-size:1rem;">RST Admin Panel</h3>
      <p style="margin:0 0 10px;font-size:0.78rem;color:var(--muted);">
        ${COMPANY_NAME} Admin · Pin, deadlines, guests, login activity.
      </p>
      <h4 style="margin:0 0 6px;font-size:0.82rem;color:#ffd27d;letter-spacing:0.04em;">SECTION PIN (home announcement)</h4>
      <textarea id="adminPinInput" maxlength="240" placeholder="Short announcement visible on home…" style="width:100%;min-height:72px;border-radius:12px;border:1px solid rgba(255,255,255,0.14);background:rgba(0,0,0,0.28);color:var(--text);padding:0.65rem;margin-bottom:0.45rem;"></textarea>
      <button type="button" class="lifeline-btn" id="adminSavePin" style="margin-bottom:0.75rem;">Publish pin</button>
      <h4 style="margin:0 0 6px;font-size:0.82rem;color:#ffd27d;letter-spacing:0.04em;">LIVE DEADLINES</h4>
      <div class="deadline-add-row">
        <input id="adminDeadlineName" type="text" maxlength="80" placeholder="Deadline title" />
        <input id="adminDeadlineDate" type="date" />
        <button type="button" class="lifeline-btn" id="adminAddDeadline">Add</button>
      </div>
      <div id="adminDeadlineList" style="max-height:22vh;overflow:auto;margin-bottom:0.75rem;font-size:0.8rem;"><span style="color:var(--muted)">Loading…</span></div>
      <h4 style="margin:0 0 6px;font-size:0.82rem;color:#ffd27d;letter-spacing:0.04em;">RESOURCE REQUESTS</h4>
      <div id="adminRequestList" style="max-height:28vh;overflow:auto;margin-bottom:0.75rem;font-size:0.8rem;"><span style="color:var(--muted)">Loading…</span></div>
      <h4 style="margin:0 0 6px;font-size:0.82rem;color:#ffd27d;letter-spacing:0.04em;">CLASSMATE LOGIN LOG</h4>
      <div id="adminLoginLog" style="max-height:220px;overflow-y:auto;-webkit-overflow-scrolling:touch;border:1px solid rgba(100,255,218,0.14);border-radius:12px;padding:0.55rem 0.65rem;margin-bottom:0.85rem;background:rgba(0,0,0,0.2);font-size:0.78rem;">
        Loading login activity…
      </div>
      <label style="display:flex;gap:0.5rem;align-items:center;font-size:0.85rem;margin-bottom:0.75rem;">
        <input type="checkbox" id="adminGuestGlobal" /> Enable guest play globally (all guests)
      </label>
      <div class="auth-field">
        <label for="adminNewPass">Issue / revoke Guest Pass code</label>
        <input id="adminNewPass" type="text" maxlength="16" placeholder="e.g. RST-GUEST-01" style="width:100%;padding:0.7rem;border-radius:10px;border:1px solid rgba(255,255,255,0.16);background:rgba(0,0,0,0.3);color:var(--text);" />
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;">
        <button type="button" class="lifeline-btn" id="adminIssuePass">Issue Pass</button>
        <button type="button" class="lifeline-btn admin-danger" id="adminRevokePass">Revoke Pass</button>
        <button type="button" class="lifeline-btn" id="adminSaveGlobal">Save Global Toggle</button>
        <button type="button" class="lifeline-btn" id="adminRefreshLog">Refresh Log</button>
        <button type="button" class="lifeline-btn" id="adminCloseHub">Close</button>
      </div>
      <p id="adminHubStatus" style="margin:10px 0 0;font-size:0.78rem;color:var(--accent);"></p>
      <p style="margin:10px 0 0;font-size:0.72rem;color:var(--muted);">Login log = last sign-in per classmate (date &amp; time). Guests are not listed.</p>
    `;
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    const status = panel.querySelector("#adminHubStatus");
    const globalBox = panel.querySelector("#adminGuestGlobal");
    const passInput = panel.querySelector("#adminNewPass");

    const logHost = panel.querySelector("#adminLoginLog");

    async function renderAdminLoginLog() {
      if (!logHost) return;
      logHost.textContent = "Loading login activity…";
      const latest = await fetchClassmateLoginLog();
      const events = await fetchClassmateLoginEvents(40);
      const weekly = countActiveThisWeek(events.length ? events : latest);
      const statsHtml = `<div class="admin-stat-row">
          <div class="admin-stat"><b>${weekly}</b><span>Active this week</span></div>
          <div class="admin-stat"><b>${latest.length}</b><span>Unique logins</span></div>
        </div>`;
      if (!events.length && !latest.length) {
        logHost.innerHTML = statsHtml + `<span style="color:var(--muted)">No classmate logins recorded yet.</span>`;
        return;
      }
      const eventHtml = (events.length ? events : latest).map((row) => {
        const when = formatLoginStamp(row.ts);
        const role = row.role === "admin" ? "ADMIN" : "CLASSMATE";
        const name = escapeHtml(row.displayName || row.username || "Unknown");
        const user = escapeHtml(row.username || "");
        return `<div style="padding:0.45rem 0;border-bottom:1px solid rgba(255,255,255,0.06);">
          <div style="font-weight:800;color:#eafffb;">${name}</div>
          <div style="color:var(--muted);margin-top:0.15rem;">@${user} · ${role}</div>
          <div style="color:var(--accent);margin-top:0.15rem;font-weight:700;">${escapeHtml(when)}</div>
        </div>`;
      }).join("");
      logHost.innerHTML = statsHtml +
        `<div style="font-size:0.72rem;font-weight:800;color:#ffd27d;margin:0.35rem 0 0.25rem;letter-spacing:0.05em;">FULL HISTORY (newest first)</div>` +
        eventHtml;
    }

    // Load global flag + login log
    (async () => {
      try {
        if (db) {
          const snap = await get(ref(db, HUB_CONFIG_PATH));
          if (snap.exists() && snap.val()) {
            globalBox.checked = snap.val().guestPlayEnabled === true;
          }
        }
      } catch (error) {
        status.textContent = "Could not load hub_config (check Firebase rules).";
      }
      await renderAdminLoginLog();
    })();

    bindTap(panel.querySelector("#adminRefreshLog"), async (e) => {
      e.preventDefault();
      await renderAdminLoginLog();
      status.textContent = "Login log refreshed.";
    });

    const pinInput = panel.querySelector("#adminPinInput");
    try {
      const localPin = localStorage.getItem(ANNOUNCEMENT_LOCAL_KEY) || "";
      if (pinInput && localPin) pinInput.value = localPin;
    } catch (error) { /* ignore */ }
    (async () => {
      try {
        if (db && pinInput) {
          const snap = await get(ref(db, ANNOUNCEMENT_PATH));
          if (snap.exists()) {
            const val = snap.val();
            pinInput.value = typeof val === "string" ? val : (val && val.text) || pinInput.value;
          }
        }
      } catch (error) { /* ignore */ }
    })();

    bindTap(panel.querySelector("#adminSavePin"), async (e) => {
      e.preventDefault();
      try {
        await saveAdminPin(pinInput ? pinInput.value : "");
        status.textContent = "Section pin published on home.";
      } catch (error) {
        status.textContent = "Pin saved locally (cloud write failed).";
        console.warn(error);
      }
    });

    const dlHost = panel.querySelector("#adminDeadlineList");
    const renderAdminDeadlines = async () => {
      if (!dlHost) return;
      const rows = await fetchLiveDeadlines();
      if (!rows.length) {
        dlHost.innerHTML = `<span style="color:var(--muted)">No live deadlines yet. Fallback list still shows on home.</span>`;
        return;
      }
      dlHost.innerHTML = rows
        .slice()
        .sort((a, b) => String(a.date).localeCompare(String(b.date)))
        .map((d) => `<div style="padding:0.35rem 0;border-bottom:1px solid rgba(255,255,255,0.06);display:flex;justify-content:space-between;gap:0.5rem;"><span>${escapeHtml(d.name)}</span><strong style="color:#ffd27d;white-space:nowrap;">${escapeHtml(d.date)}</strong></div>`)
        .join("");
    };
    renderAdminDeadlines();
    bindTap(panel.querySelector("#adminAddDeadline"), async (e) => {
      e.preventDefault();
      const nameEl = panel.querySelector("#adminDeadlineName");
      const dateEl = panel.querySelector("#adminDeadlineDate");
      try {
        await saveLiveDeadline(nameEl && nameEl.value, dateEl && dateEl.value);
        if (nameEl) nameEl.value = "";
        status.textContent = "Deadline added to live board.";
        await renderAdminDeadlines();
        renderTodayStrip();
      } catch (error) {
        status.textContent = error && error.message ? error.message : "Failed to add deadline.";
      }
    });

    const reqHost = panel.querySelector("#adminRequestList");
    if (reqHost) {
      (async () => {
        const rows = await fetchResourceRequests();
        reqHost.innerHTML = renderRequestRowsHtml(rows.slice(0, 40));
        const bindDone = () => {
          reqHost.querySelectorAll(".req-done-btn").forEach((btn) => {
            bindTap(btn, async (ev) => {
              ev.preventDefault();
              await markResourceRequestDone(btn.getAttribute("data-req-id"));
              const refreshed = await fetchResourceRequests();
              reqHost.innerHTML = renderRequestRowsHtml(refreshed.slice(0, 40));
              bindDone();
            });
          });
        };
        bindDone();
      })();
    }


    bindTap(panel.querySelector("#adminCloseHub"), (e) => { e.preventDefault(); overlay.remove(); });
    bindTap(overlay, (e) => { if (e.target === overlay) overlay.remove(); });

    bindTap(panel.querySelector("#adminSaveGlobal"), async (e) => {
      e.preventDefault();
      const enabled = !!globalBox.checked;
      try {
        if (db) {
          await set(ref(db, `${HUB_CONFIG_PATH}/guestPlayEnabled`), enabled);
        }
        // local mirror
        localStorage.setItem("bscs1a_guest_global_v1", enabled ? "1" : "0");
        status.textContent = enabled ? "Global guest play ENABLED." : "Global guest play DISABLED.";
      } catch (error) {
        status.textContent = "Save failed — update Firebase rules for hub_config writes (admin only is client-enforced).";
        console.warn(error);
      }
    });

    bindTap(panel.querySelector("#adminIssuePass"), async (e) => {
      e.preventDefault();
      let code = String(passInput.value || "").trim().toUpperCase().replace(/[^A-Z0-9\-]/g, "");
      if (!code) {
        code = `RST-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
        passInput.value = code;
      }
      const payload = {
        active: true,
        createdBy: ADMIN_USERNAME,
        company: COMPANY_NAME,
        ts: Date.now(),
        expiresAt: Date.now() + 7 * 86400000 // 7 days
      };
      try {
        const local = JSON.parse(localStorage.getItem("bscs1a_guest_passes_v1") || "{}");
        local[code] = payload;
        localStorage.setItem("bscs1a_guest_passes_v1", JSON.stringify(local));
      } catch (error) {
        /* ignore */
      }
      try {
        if (db) {
          await set(ref(db, `${GUEST_PASSES_PATH}/${code}`), payload);
        }
        status.textContent = `Guest Pass issued: ${code} — give this to the visitor.`;
      } catch (error) {
        status.textContent = `Local pass saved: ${code} (Firebase write failed — still works on this device).`;
        console.warn(error);
      }
    });

    bindTap(panel.querySelector("#adminRevokePass"), async (e) => {
      e.preventDefault();
      let code = String(passInput.value || "").trim().toUpperCase().replace(/[^A-Z0-9\-]/g, "");
      if (!code) {
        status.textContent = "Type the Guest Pass code to revoke.";
        return;
      }
      try {
        const local = JSON.parse(localStorage.getItem("bscs1a_guest_passes_v1") || "{}");
        if (local[code]) {
          local[code].active = false;
          localStorage.setItem("bscs1a_guest_passes_v1", JSON.stringify(local));
        }
      } catch (error) {
        /* ignore */
      }
      try {
        if (db) {
          await set(ref(db, `${GUEST_PASSES_PATH}/${code}`), {
            active: false,
            revokedBy: ADMIN_USERNAME,
            company: COMPANY_NAME,
            ts: Date.now()
          });
        }
        status.textContent = `Guest Pass revoked: ${code}`;
      } catch (error) {
        status.textContent = `Revoked locally: ${code} (Firebase update failed).`;
        console.warn(error);
      }
    });
  }

  function renderScholarProfile() {
    const host = $("scholarProfileCard");
    if (!host) return;
    if (!authState.role || authState.role === "guest" && !authState.guestPlayAllowed) {
      host.hidden = true;
      return;
    }
    host.hidden = false;
    const mastery = loadMastery();
    const subjects = Object.keys(mastery);
    let avg = 0;
    if (subjects.length) {
      avg = Math.round(subjects.reduce((sum, s) => {
        const e = mastery[s];
        return sum + (e.total ? (e.correct / e.total) * 100 : 0);
      }, 0) / subjects.length);
    }
    const roleLabel = isAdmin() ? "RST Admin" : isGuest() ? "Guest (Pass)" : "Classmate";
    host.innerHTML = `<h4>Scholar Profile · ${COMPANY_NAME}</h4>
      <p style="margin:0;font-size:0.84rem;line-height:1.5;color:rgba(230,241,255,0.88);">
        <strong>${escapeHtml(authState.displayName || authState.username)}</strong><br/>
        Role: ${roleLabel}<br/>
        Mastery coverage: ${subjects.length} subject(s) · avg ${avg}%
      </p>`;
    renderMyDesk();
  }

  function loadBadges() {
    try {
      const raw = JSON.parse(localStorage.getItem(BADGES_KEY) || "{}");
      return raw && typeof raw === "object" ? raw : {};
    } catch {
      return {};
    }
  }

  function unlockBadge(id) {
    const badges = loadBadges();
    if (badges[id]) return;
    badges[id] = { ts: Date.now() };
    try {
      localStorage.setItem(BADGES_KEY, JSON.stringify(badges));
    } catch (error) {
      /* ignore */
    }
  }

  function evaluateBadgesOnEnd() {
    if (state.isDaily && state.score > 0) unlockBadge("daily_clear");
    if ((state.bestStreak || 0) >= 5) unlockBadge("streak_5");
    if ((state.bestStreak || 0) >= 10) unlockBadge("streak_10");
    if (!state.isPractice && !state.isDaily && state.score >= 150) unlockBadge("ranked_150");
    const mastery = loadMastery();
    Object.keys(mastery).forEach((s) => {
      const e = mastery[s];
      if (e && e.total >= 5 && e.correct / e.total >= 0.8) unlockBadge("mastery_80");
    });
    try {
      const key = "bscs1a_daily_streak_v1";
      const today = getLocalDateKey();
      const prev = JSON.parse(localStorage.getItem(key) || "null");
      if (state.isDaily) {
        let streak = 1;
        if (prev && prev.date) {
          // naive consecutive calendar day check via stored last date
          const y = Number(prev.date.slice(0,4)), m = Number(prev.date.slice(4,6))-1, d = Number(prev.date.slice(6,8));
          const last = new Date(y,m,d);
          const now = new Date();
          const diff = Math.round((Date.UTC(now.getFullYear(),now.getMonth(),now.getDate()) - Date.UTC(last.getFullYear(),last.getMonth(),last.getDate()))/86400000);
          if (diff === 1) streak = Number(prev.streak || 1) + 1;
          else if (diff === 0) streak = Number(prev.streak || 1);
        }
        localStorage.setItem(key, JSON.stringify({ date: today, streak }));
        if (streak >= 7) unlockBadge("daily_7");
      }
    } catch (error) {
      /* ignore */
    }
  }

  function renderBadgeRow(host) {
    if (!host) return;
    const owned = loadBadges();
    const defs = [
      { id: "daily_clear", label: "Daily Clear" },
      { id: "daily_7", label: "7-Day Daily" },
      { id: "streak_5", label: "Streak 5" },
      { id: "streak_10", label: "Streak 10" },
      { id: "ranked_150", label: "Ranked 150+" },
      { id: "mastery_80", label: "Mastery 80%" }
    ];
    host.innerHTML = defs.map((b) =>
      `<span class="badge-pill${owned[b.id] ? "" : " is-locked"}">${escapeHtml(b.label)}</span>`
    ).join("");
  }

  function renderMyDesk() {
    const card = $("myDeskCard");
    const grid = $("myDeskGrid");
    const badges = $("badgeRow");
    if (!card || !grid) return;
    if (!authState.role || (authState.role === "guest" && !authState.guestPlayAllowed)) {
      card.hidden = true;
      return;
    }
    card.hidden = false;
    const nextClass = getNextClassInfo();
    const daily = getDailyStatusInfo();
    const mastery = loadMastery();
    const subjects = Object.keys(mastery);
    let avg = 0;
    if (subjects.length) {
      avg = Math.round(subjects.reduce((sum, s) => {
        const e = mastery[s];
        return sum + (e.total ? (e.correct / e.total) * 100 : 0);
      }, 0) / subjects.length);
    }
    grid.innerHTML = `
      <div class="my-desk-tile"><span class="k">Next class</span><span class="v">${escapeHtml(nextClass.value)}</span></div>
      <div class="my-desk-tile"><span class="k">Daily</span><span class="v">${escapeHtml(daily.value)}</span></div>
      <div class="my-desk-tile"><span class="k">Mastery avg</span><span class="v">${avg}%</span></div>
      <div class="my-desk-tile"><span class="k">Notebook</span><span class="v">${loadNotebook().length} saved</span></div>`;
    renderBadgeRow(badges);
  }

  function initStudyRooms() {
    const host = $("studyRooms");
    if (!host) return;
    host.innerHTML = "";
    const rooms = (typeof AVAILABLE_SUBJECTS !== "undefined" ? AVAILABLE_SUBJECTS : []).slice();
    // Prefer common course codes first if present
    rooms.sort((a, b) => String(a).localeCompare(String(b)));
    rooms.forEach((subject) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "study-room-btn";
      btn.textContent = subject;
      btn.dataset.subject = subject;
      bindTap(btn, (event) => {
        event.preventDefault();
        // Map subject label to mode id when possible
        const mode = (GAME_MODES || []).find((m) =>
          m.id === subject || m.label === subject || String(m.label).includes(subject) || String(m.id).toLowerCase() === String(subject).toLowerCase().replace(/\s+/g, "_")
        );
        if (mode) selectMode(mode.id);
        else {
          // Fuzzy: mode id from subject string
          const guess = String(subject).toLowerCase().replace(/[^a-z0-9]+/g, "_");
          const mode2 = (GAME_MODES || []).find((m) => m.id === guess || m.id.includes(guess.slice(0, 6)));
          if (mode2) selectMode(mode2.id);
        }
        if (authState.role === "guest") selectRunType("practice");
        else selectRunType(state.runType === "ranked" ? "ranked" : "practice");
        host.querySelectorAll(".study-room-btn").forEach((b) => b.classList.toggle("selected", b === btn));
        if (elements.loginStatus) {
          elements.loginStatus.textContent = `Study Room: ${subject}. Choose Ranked/Practice/Study Plan then start.`;
        }
      });
      host.appendChild(btn);
    });
  }

  function initExamModeToggle() {
    const toggle = $("examModeToggle");
    if (!toggle) return;
    try {
      toggle.checked = localStorage.getItem("bscs1a_exam_mode_v1") === "1";
      document.body.classList.toggle("exam-mode", toggle.checked);
    } catch (error) {
      /* ignore */
    }
    toggle.addEventListener("change", () => {
      const on = !!toggle.checked;
      document.body.classList.toggle("exam-mode", on);
      try {
        localStorage.setItem("bscs1a_exam_mode_v1", on ? "1" : "0");
      } catch (error) {
        /* ignore */
      }
      showShareToast && showShareToast(on ? "Exam Mode on" : "Exam Mode off");
    });
  }



  /* SECURITY: no hardcoded admin passcode lives in the frontend anymore.
     Score writes go straight to Firebase; write validation (correct data
     shape, no overwriting/deleting other players' entries) is enforced
     server-side by the Firebase Realtime Database Rules instead. */
  const SCORE_PER_CORRECT = 2;
  const STREAK_TARGET = 5;
  const STREAK_BONUS = 1;
  const MAX_LIVES = 3;
  const QUESTION_TIME_LIMIT = 25;
  const WIN_SCORE = 500;

  /* ============ NEW FEATURE: ⚔️ Boss Question subject-hack ============
     At these exact score checkpoints, the next question is force-pulled
     from the hardest subject pool and the timer is slashed. */
  const BOSS_THRESHOLDS = [50, 150, 250, 350, 450];
  const BOSS_SUBJECT = "ITEC 102";
  const BOSS_TIME_LIMIT = 15;
  const BOSS_SCORE_PER_CORRECT = 4;
  const BOSS_FLASH_DURATION_MS = 1500;

  /* ============ NEW FEATURE: 🔊 Retro Web Audio FX ============
     Pure OscillatorNode chiptune blips — zero external audio files,
     zero mobile-data loading delay. */
  const SOUND_MUTE_KEY = "bscs1a_arena_sound_muted_v1";
  const MILESTONE_FANFARE_SCORE_STEP = 25;
  /* Older deployments of the arena awarded 5 points per correct answer with
     no streak bonus. The current formula awards 2 (+1 every 5-streak), so
     any leaderboard entry saved under the old rules reads roughly 2.5x too
     high. SCORE_MIGRATION_VERSION lets us convert each legacy entry exactly
     once -- entries already tagged with this version (or higher) are left
     untouched on every later load. */
  const SCORE_MIGRATION_VERSION = 2;
  const LEGACY_POINTS_PER_CORRECT = 5;
  const LEGACY_TO_CURRENT_RATIO = SCORE_PER_CORRECT / LEGACY_POINTS_PER_CORRECT;
  const AVATARS = ["\u{1F916}", "\u{1F4BB}", "\u{1F680}", "\u{1F47E}", "\u{1F3AF}", "\u{1F575}\uFE0F\u200D\u2642\uFE0F"];

  const badWords = [
    "fuck", "shit", "bitch", "asshole", "puta", "putangina", "gago", "ulol",
    "tanga", "bobo", "tarantado", "hindot", "leche", "bwisit", "pakyu", "pokpok"
  ];

  // In-game encouragement quotes shown on the game-over screen.
  const motivationalQuotes = [
    { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
    { text: "The expert in anything was once a beginner.", author: "Helen Hayes" },
    { text: "Don't let what you cannot do interfere with what you can do.", author: "John Wooden" },
    { text: "Mistakes are proof that you are trying.", author: "" },
    { text: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin" },
    { text: "It's not that I'm so smart, it's just that I stay with problems longer.", author: "Albert Einstein" },
    { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
    { text: "Failure is simply the opportunity to begin again, this time more intelligently.", author: "Henry Ford" },
    { text: "Consistency is the key. Bawi tayo sa susunod na round, Scholar!", author: "" },
    { text: "Algorithms aren't built in a day. Debug your mistakes and try again!", author: "" }
  ];

  // Cyberpunk / developer greeting quotes shown once in the welcome modal.
  const cyberpunkGreetingQuotes = [
    { text: "Code hard, debug harder, and never let a semicolon decide your fate.", author: "Anonymous Dev" },
    { text: "In a world full of bugs, be the fix.", author: "Anonymous Dev" },
    { text: "Talk is cheap. Show me the code.", author: "Linus Torvalds" },
    { text: "The best error message is the one that never shows up.", author: "Thomas Fuchs" },
    { text: "First, solve the problem. Then, write the code.", author: "John Johnson" },
    { text: "Every expert was once a disaster who refused to stop compiling.", author: "Anonymous Dev" },
    { text: "Your future runtime starts with today's commit.", author: "Anonymous Dev" },
    { text: "We are all beta versions of ourselves, pushing updates every day.", author: "Anonymous Dev" },
    { text: "Ctrl+Z doesn't exist in real life, so make every keystroke count.", author: "Anonymous Dev" },
    { text: "The obstacle is just an unhandled exception waiting for your logic.", author: "Anonymous Dev" }
  ];

  const questionBank = [
    { s: "ITEC 101", q: "What does CPU stand for?", choices: ["Central Processing Unit", "Computer Power Utility", "Central Program Upload", "Control Processing User"], answer: "Central Processing Unit" },
    { s: "ITEC 101", q: "Which of the following is an input device?", choices: ["Keyboard", "Monitor", "Speaker", "Projector"], answer: "Keyboard" },
    { s: "ITEC 101", q: "Binary numbers are composed of which digits?", choices: ["0 and 1", "1 and 2", "2 and 3", "0 and 9"], answer: "0 and 1" },
    { s: "ITEC 101", q: "RAM is best described as what type of memory?", choices: ["Temporary memory", "Permanent memory", "Optical memory", "External memory"], answer: "Temporary memory" },
    { s: "ITEC 101", q: "Which device is commonly used for long-term storage?", choices: ["SSD", "RAM", "Cache", "Register"], answer: "SSD" },
    { s: "ITEC 101", q: "What does URL stand for?", choices: ["Uniform Resource Locator", "Universal Routing Link", "Unified Resource Loader", "User Resource Locator"], answer: "Uniform Resource Locator" },
    { s: "ITEC 101", q: "Which is an example of system software?", choices: ["Operating System", "Spreadsheet", "Photo Editor", "Music Player"], answer: "Operating System" },
    { s: "ITEC 101", q: "Processor speed is commonly measured in what unit?", choices: ["GHz", "Volts", "Pixels", "Bytes"], answer: "GHz" },
    { s: "ITEC 101", q: "Which of the following is a web browser?", choices: ["Google Chrome", "Microsoft Word", "Adobe Photoshop", "WinRAR"], answer: "Google Chrome" },
    { s: "ITEC 101", q: "Which network topology uses a central hub or switch?", choices: ["Star", "Bus", "Ring", "Mesh"], answer: "Star" },
    { s: "ITEC 101", q: "What does LAN stand for?", choices: ["Local Area Network", "Large Access Node", "Linked Area Number", "Local Access Network"], answer: "Local Area Network" },
    { s: "ITEC 101", q: "Which memory keeps data even when power is off?", choices: ["ROM", "RAM", "Cache", "Register"], answer: "ROM" },
    { s: "ITEC 101", q: "What is the main purpose of an IP address?", choices: ["To identify a device on a network", "To increase battery life", "To clean a hard drive", "To print documents"], answer: "To identify a device on a network" },
    { s: "ITEC 101", q: "Which of the following is an output device?", choices: ["Monitor", "Scanner", "Keyboard", "Mouse"], answer: "Monitor" },
    { s: "ITEC 101", q: "What does a PSU do in a computer system?", choices: ["Supplies power to components", "Processes data", "Stores files online", "Connects to a projector"], answer: "Supplies power to components" },

    { s: "ITEC 102", q: "What is a program?", choices: ["A set of instructions that tells a computer what to do", "A physical part of the computer", "A type of computer virus", "A brand of laptop"], answer: "A set of instructions that tells a computer what to do" },
    { s: "ITEC 102", q: "What is a programming language?", choices: ["A formal language used to write instructions for a computer", "A spoken human language", "A type of operating system", "A network protocol"], answer: "A formal language used to write instructions for a computer" },
    { s: "ITEC 102", q: "Who is a programmer?", choices: ["A person who writes and develops computer programs", "A person who repairs computer hardware", "A person who sells computers", "A person who designs furniture"], answer: "A person who writes and develops computer programs" },
    { s: "ITEC 102", q: "What is an algorithm?", choices: ["A step-by-step procedure for solving a problem", "A computer virus", "A hardware upgrade", "A file compression tool"], answer: "A step-by-step procedure for solving a problem" },
    { s: "ITEC 102", q: "What is pseudocode?", choices: ["A plain-language way to describe program steps", "An antivirus program", "Final compiled machine code", "A spreadsheet formula"], answer: "A plain-language way to describe program steps" },
    { s: "ITEC 102", q: "What is a flowchart?", choices: ["A diagram that shows the steps of a process using symbols", "A type of computer chip", "A programming language", "A file storage format"], answer: "A diagram that shows the steps of a process using symbols" },
    { s: "ITEC 102", q: "Which flowchart symbol is used to represent a decision?", choices: ["Diamond", "Circle", "Rectangle", "Oval"], answer: "Diamond" },
    { s: "ITEC 102", q: "Which flowchart symbol represents the start or end of a process?", choices: ["Oval/Terminator", "Diamond", "Parallelogram", "Rectangle"], answer: "Oval/Terminator" },
    { s: "ITEC 102", q: "Which flowchart symbol represents a process or action step?", choices: ["Rectangle", "Diamond", "Circle", "Triangle"], answer: "Rectangle" },
    { s: "ITEC 102", q: "Which flowchart symbol represents input or output?", choices: ["Parallelogram", "Rectangle", "Oval", "Diamond"], answer: "Parallelogram" },
    { s: "ITEC 102", q: "What is the first step in problem solving using programming?", choices: ["Understanding the problem", "Writing the code", "Testing the program", "Debugging the program"], answer: "Understanding the problem" },
    { s: "ITEC 102", q: "Which of the following is the correct general order in problem solving?", choices: ["Analyze problem, design algorithm, code, test", "Code, analyze problem, test, design algorithm", "Test, code, design algorithm, analyze problem", "Design algorithm, test, code, analyze problem"], answer: "Analyze problem, design algorithm, code, test" },
    { s: "ITEC 102", q: "What does it mean to 'debug' a program?", choices: ["To find and fix errors in the program", "To delete the entire program", "To install a new browser", "To format the hard drive"], answer: "To find and fix errors in the program" },
    { s: "ITEC 102", q: "Why is planning an algorithm before coding important?", choices: ["It helps organize the logical steps before implementation", "It makes the program run faster automatically", "It removes the need for testing", "It compiles the code for you"], answer: "It helps organize the logical steps before implementation" },
    { s: "ITEC 102", q: "What is a step-by-step written description of a solution called before it is coded?", choices: ["Algorithm", "Compiler", "Debugger", "Syntax"], answer: "Algorithm" },
    { s: "ITEC 102", q: "C# was developed primarily by which company?", choices: ["Microsoft", "Apple", "Google", "Oracle"], answer: "Microsoft" },
    { s: "ITEC 102", q: "C# is often associated with which development framework?", choices: [".NET Framework", "React Native", "Django", "Laravel"], answer: ".NET Framework" },
    { s: "ITEC 102", q: "What is an IDE used for in programming?", choices: ["Writing, editing, and running code in one environment", "Browsing the internet", "Designing logos", "Editing videos"], answer: "Writing, editing, and running code in one environment" },
    { s: "ITEC 102", q: "Which of the following is a commonly used IDE for C# development?", choices: ["Visual Studio", "Photoshop", "Excel", "Chrome"], answer: "Visual Studio" },
    { s: "ITEC 102", q: "Before writing a C# program, what must typically be installed first?", choices: [".NET SDK", "A web browser", "An antivirus", "A media player"], answer: ".NET SDK" },
    { s: "ITEC 102", q: "In C#, which keyword is commonly used to output text to the console?", choices: ["Console.WriteLine", "Console.Input", "System.Print", "Output.Show"], answer: "Console.WriteLine" },
    { s: "ITEC 102", q: "Which C# method is commonly used to read input from the user in the console?", choices: ["Console.ReadLine", "Console.WriteLine", "Console.Print", "Input.Get"], answer: "Console.ReadLine" },
    { s: "ITEC 102", q: "What is the purpose of the Main method in a C# program?", choices: ["It is the entry point where program execution begins", "It stores all variables permanently", "It compiles the program", "It connects to the internet"], answer: "It is the entry point where program execution begins" },
    { s: "ITEC 102", q: "Every statement in C# typically ends with what character?", choices: ["Semicolon (;)", "Colon (:)", "Comma (,)", "Period (.)"], answer: "Semicolon (;)" },
    { s: "ITEC 102", q: "Curly braces { } in C# are mainly used to do what?", choices: ["Define a block of code", "Store a single number", "End a program", "Import a library"], answer: "Define a block of code" },
    { s: "ITEC 102", q: "What is basic syntax in programming?", choices: ["The set of rules that defines correctly structured code", "A type of algorithm", "A hardware component", "A file extension"], answer: "The set of rules that defines correctly structured code" },
    { s: "ITEC 102", q: "What does simple I/O refer to in programming?", choices: ["Basic input and output operations", "Installing and operating hardware", "Internal optimization", "Image output only"], answer: "Basic input and output operations" },
    { s: "ITEC 102", q: "Which term describes taking data from the user through the keyboard?", choices: ["Input", "Output", "Compilation", "Debugging"], answer: "Input" },
    { s: "ITEC 102", q: "Which term describes displaying results to the screen?", choices: ["Output", "Input", "Compilation", "Syntax"], answer: "Output" },
    { s: "ITEC 102", q: "What is a compiler mainly responsible for?", choices: ["Translating source code into machine-executable code", "Designing the user interface", "Connecting to the internet", "Storing files permanently"], answer: "Translating source code into machine-executable code" },
    { s: "ITEC 102", q: "Which of the following best describes a comment in C# code?", choices: ["A note in the code ignored by the compiler", "A required syntax element", "A type of variable", "A loop structure"], answer: "A note in the code ignored by the compiler" },
    { s: "ITEC 102", q: "In C#, how do you write a single-line comment?", choices: ["// comment", "<!-- comment -->", "# comment", "/* comment"], answer: "// comment" },
    { s: "ITEC 102", q: "Data types in C# are generally classified into which two categories?", choices: ["Primitive and Non-primitive", "Static and Dynamic only", "Local and Global only", "Public and Private only"], answer: "Primitive and Non-primitive" },
    { s: "ITEC 102", q: "Which of the following is an example of a value type in C#?", choices: ["int", "string", "object", "class"], answer: "int" },
    { s: "ITEC 102", q: "Which of the following is an example of a reference type in C#?", choices: ["string", "int", "bool", "double"], answer: "string" },
    { s: "ITEC 102", q: "What best describes a Value Type in C#?", choices: ["A type that directly holds its data", "A type that stores only a reference to data", "A type only used for text", "A type that cannot store numbers"], answer: "A type that directly holds its data" },
    { s: "ITEC 102", q: "What best describes a Reference Type in C#?", choices: ["A type that stores a reference to the memory location of the data", "A type that always stores whole numbers", "A type used only for constants", "A type with no memory allocation"], answer: "A type that stores a reference to the memory location of the data" },
    { s: "ITEC 102", q: "Which C# data type is used to represent decimal numbers with high precision?", choices: ["decimal", "int", "bool", "char"], answer: "decimal" },
    { s: "ITEC 102", q: "Which C# data type is used to represent true or false values?", choices: ["bool", "int", "char", "string"], answer: "bool" },
    { s: "ITEC 102", q: "Which C# data type is used to store a single character?", choices: ["char", "string", "int", "bool"], answer: "char" },
    { s: "ITEC 102", q: "Which data type is best suited for storing text such as names?", choices: ["string", "char", "int", "bool"], answer: "string" },
    { s: "ITEC 102", q: "What is the 'object' type in C# considered to be?", choices: ["The base type from which all other types derive", "A type only for numbers", "A type only for booleans", "An invalid data type"], answer: "The base type from which all other types derive" },
    { s: "ITEC 102", q: "What does the 'dynamic' type in C# allow?", choices: ["Bypassing compile-time type checking, resolved at runtime", "Storing only static values", "Preventing all runtime errors", "Deleting variables automatically"], answer: "Bypassing compile-time type checking, resolved at runtime" },
    { s: "ITEC 102", q: "What does a pointer type in C# store?", choices: ["The memory address of a variable", "The value of a variable directly", "A text string only", "A boolean result"], answer: "The memory address of a variable" },
    { s: "ITEC 102", q: "What is a variable in programming?", choices: ["A named storage location that holds a value that can change", "A fixed value that never changes", "A type of loop", "A programming error"], answer: "A named storage location that holds a value that can change" },
    { s: "ITEC 102", q: "What does it mean to 'define' a variable?", choices: ["To declare its name and data type", "To permanently delete it", "To convert it into a constant", "To compile the program"], answer: "To declare its name and data type" },
    { s: "ITEC 102", q: "What does it mean to 'initialize' a variable?", choices: ["To assign it an initial value", "To delete its declaration", "To change its data type at runtime", "To make it a constant automatically"], answer: "To assign it an initial value" },
    { s: "ITEC 102", q: "How can a program accept a value from the user in C#?", choices: ["Using Console.ReadLine()", "Using Console.WriteLine()", "Using a for loop", "Using a class definition"], answer: "Using Console.ReadLine()" },
    { s: "ITEC 102", q: "What is a constant in programming?", choices: ["A value that cannot be changed once assigned", "A value that changes every second", "A type of loop", "A kind of array"], answer: "A value that cannot be changed once assigned" },
    { s: "ITEC 102", q: "Which keyword is used to declare a constant in C#?", choices: ["const", "var", "static", "readonly only"], answer: "const" },
    { s: "ITEC 102", q: "Which of the following is an example of a basic arithmetic computation?", choices: ["Addition of two numbers", "Opening a file", "Declaring a class", "Creating an object"], answer: "Addition of two numbers" },
    { s: "ITEC 102", q: "Which symbol is used for addition in C#?", choices: ["+", "-", "*", "/"], answer: "+" },
    { s: "ITEC 102", q: "Which symbol is used for subtraction in C#?", choices: ["-", "+", "*", "%"], answer: "-" },
    { s: "ITEC 102", q: "Which symbol is used for multiplication in C#?", choices: ["*", "+", "-", "/"], answer: "*" },
    { s: "ITEC 102", q: "Which symbol is used for division in C#?", choices: ["/", "*", "+", "%"], answer: "/" },
    { s: "ITEC 102", q: "What does the modulus operator (%) return?", choices: ["The remainder of a division", "The sum of two numbers", "The square root of a number", "The product of two numbers"], answer: "The remainder of a division" },
    { s: "ITEC 102", q: "Which operator is used to check if two values are equal in C#?", choices: ["==", "=", "!=", "<>"], answer: "==" },
    { s: "ITEC 102", q: "Which operator is used to check if a value is not equal to another in C#?", choices: ["!=", "==", "=", "<>"], answer: "!=" },
    { s: "ITEC 102", q: "Which operator checks if one value is greater than another?", choices: [">", "<", "==", "!="], answer: ">" },
    { s: "ITEC 102", q: "Which operator checks if one value is less than or equal to another?", choices: ["<=", ">=", "==", "!="], answer: "<=" },
    { s: "ITEC 102", q: "Which logical operator represents AND in C#?", choices: ["&&", "||", "!", "%%"], answer: "&&" },
    { s: "ITEC 102", q: "Which logical operator represents OR in C#?", choices: ["||", "&&", "!", "=="], answer: "||" },
    { s: "ITEC 102", q: "Which logical operator represents NOT in C#?", choices: ["!", "&&", "||", "=="], answer: "!" },
    { s: "ITEC 102", q: "What does a comparison operator do?", choices: ["It compares two values and returns a Boolean result", "It stores a value permanently", "It creates a new class", "It deletes a variable"], answer: "It compares two values and returns a Boolean result" },
    { s: "ITEC 102", q: "What is the single assignment operator in C# used for?", choices: ["Assigning a value to a variable", "Comparing two values", "Looping through data", "Declaring a class"], answer: "Assigning a value to a variable" },
    { s: "ITEC 102", q: "Which of these is considered a non-primitive data type?", choices: ["Array", "int", "bool", "char"], answer: "Array" },
    { s: "ITEC 102", q: "What is the correct term for combining two strings together?", choices: ["Concatenation", "Division", "Iteration", "Instantiation"], answer: "Concatenation" },
    { s: "ITEC 102", q: "What is the purpose of a conditional statement?", choices: ["To make decisions based on a condition", "To repeat a block of code", "To store multiple values", "To define a class"], answer: "To make decisions based on a condition" },
    { s: "ITEC 102", q: "Which keyword starts a basic conditional statement in C#?", choices: ["if", "loop", "switch case only", "for"], answer: "if" },
    { s: "ITEC 102", q: "What does an 'if-else' statement allow a program to do?", choices: ["Execute one block if a condition is true, another if false", "Repeat code infinitely", "Store multiple data types", "Skip all conditions"], answer: "Execute one block if a condition is true, another if false" },
    { s: "ITEC 102", q: "What is a 'nested if' statement?", choices: ["An if statement placed inside another if statement", "A loop inside another loop", "A class inside another class", "An array inside another array"], answer: "An if statement placed inside another if statement" },
    { s: "ITEC 102", q: "What is the main use of a 'switch case' statement?", choices: ["To select one of many code blocks to execute based on a value", "To repeat a block of code indefinitely", "To declare variables", "To create objects"], answer: "To select one of many code blocks to execute based on a value" },
    { s: "ITEC 102", q: "In a switch statement, what does the 'default' case represent?", choices: ["The block executed when no other case matches", "The first case checked", "An error in the program", "A required loop"], answer: "The block executed when no other case matches" },
    { s: "ITEC 102", q: "In a switch statement, what keyword is used to prevent fall-through to the next case?", choices: ["break", "continue", "return only", "exit"], answer: "break" },
    { s: "ITEC 102", q: "What is an array?", choices: ["A structure that stores multiple values of the same type", "A single variable holding one value", "A type of loop", "A programming error"], answer: "A structure that stores multiple values of the same type" },
    { s: "ITEC 102", q: "In many programming languages including C#, an array index typically starts at what number?", choices: ["0", "1", "2", "10"], answer: "0" },
    { s: "ITEC 102", q: "What is required to declare an array in C#?", choices: ["The data type and array size or initial values", "Only the array name", "A loop statement", "A class definition"], answer: "The data type and array size or initial values" },
    { s: "ITEC 102", q: "How do you access a specific element in an array?", choices: ["Using its index number inside square brackets", "Using its name only", "Using a switch statement", "Using a constructor"], answer: "Using its index number inside square brackets" },
    { s: "ITEC 102", q: "What is a multidimensional array?", choices: ["An array that has more than one dimension, like rows and columns", "An array that stores only strings", "An array with no elements", "An array that cannot be modified"], answer: "An array that has more than one dimension, like rows and columns" },
    { s: "ITEC 102", q: "Which of the following is considered an array operation?", choices: ["Sorting the elements of an array", "Declaring a class", "Creating a constructor", "Reading a file"], answer: "Sorting the elements of an array" },
    { s: "ITEC 102", q: "What is an iterative statement used for?", choices: ["To repeat a block of code multiple times", "To declare a variable once", "To end a program", "To create a class"], answer: "To repeat a block of code multiple times" },
    { s: "ITEC 102", q: "Which loop is best used when the number of iterations is already known?", choices: ["for loop", "while loop", "do-while loop", "if statement"], answer: "for loop" },
    { s: "ITEC 102", q: "Which loop is commonly used to iterate through each element of a collection or array?", choices: ["foreach loop", "if-else", "switch case", "constructor"], answer: "foreach loop" },
    { s: "ITEC 102", q: "Which loop checks its condition before executing the loop body?", choices: ["while loop", "do-while loop", "foreach loop", "switch case"], answer: "while loop" },
    { s: "ITEC 102", q: "Which loop guarantees that the loop body executes at least once?", choices: ["do-while loop", "while loop", "for loop", "if statement"], answer: "do-while loop" },
    { s: "ITEC 102", q: "What is an infinite loop?", choices: ["A loop that never meets its stopping condition", "A loop used only for arrays", "A loop that runs exactly once", "A loop that stores images"], answer: "A loop that never meets its stopping condition" },
    { s: "ITEC 102", q: "In a for loop, which part usually controls when the loop stops?", choices: ["The condition", "The initialization only", "The increment only", "The loop body only"], answer: "The condition" },
    { s: "ITEC 102", q: "What does the 'break' keyword do inside a loop?", choices: ["It exits the loop immediately", "It restarts the loop from the beginning", "It skips only the current iteration", "It declares a new variable"], answer: "It exits the loop immediately" },
    { s: "ITEC 102", q: "What does the 'continue' keyword do inside a loop?", choices: ["It skips the rest of the current iteration and moves to the next", "It stops the loop completely", "It deletes the loop variable", "It creates a new array"], answer: "It skips the rest of the current iteration and moves to the next" },
    { s: "ITEC 102", q: "Which control structure would best handle multiple discrete options like a menu selection?", choices: ["Switch case", "For loop", "While loop", "Array declaration"], answer: "Switch case" },
    { s: "ITEC 102", q: "What is the term for the process of repeating a set of instructions?", choices: ["Iteration", "Instantiation", "Inheritance", "Initialization"], answer: "Iteration" },
    { s: "ITEC 102", q: "Which of the following best distinguishes a while loop from a do-while loop?", choices: ["A while loop may not execute at all if the condition is false from the start", "A while loop always executes at least once", "A do-while loop never checks a condition", "A do-while loop cannot use a Boolean condition"], answer: "A while loop may not execute at all if the condition is false from the start" },
    { s: "ITEC 102", q: "What must be true for a for loop's condition to keep the loop running?", choices: ["The condition must evaluate to true", "The condition must evaluate to false", "The loop body must be empty", "The array must be sorted"], answer: "The condition must evaluate to true" },
    { s: "ITEC 102", q: "How many dimensions does a standard single-dimensional array have?", choices: ["One", "Two", "Three", "Zero"], answer: "One" },
    { s: "ITEC 102", q: "What is typically used to traverse and print all elements of an array?", choices: ["A loop", "A single if statement", "A constructor", "A switch case only"], answer: "A loop" },
    { s: "ITEC 102", q: "What does OOP stand for?", choices: ["Object-Oriented Programming", "Only One Program", "Open Operating Protocol", "Organized Output Procedure"], answer: "Object-Oriented Programming" },
    { s: "ITEC 102", q: "What is the main idea behind Object-Oriented Programming?", choices: ["Organizing code around objects that combine data and behavior", "Writing code without any structure", "Using only loops for everything", "Avoiding the use of variables"], answer: "Organizing code around objects that combine data and behavior" },
    { s: "ITEC 102", q: "Which of the following is considered a benefit of OOP?", choices: ["Improved code reusability and maintainability", "Slower program execution always", "Elimination of all bugs automatically", "Removal of the need for testing"], answer: "Improved code reusability and maintainability" },
    { s: "ITEC 102", q: "Which of the following is a core concept of OOP?", choices: ["Encapsulation", "Compilation", "Debugging", "Formatting"], answer: "Encapsulation" },
    { s: "ITEC 102", q: "What is a class in OOP?", choices: ["A blueprint or template for creating objects", "A single instance of data", "A type of loop", "A file storage method"], answer: "A blueprint or template for creating objects" },
    { s: "ITEC 102", q: "What is the main purpose of a class?", choices: ["To define the structure and behavior that objects of that type will have", "To store a single number permanently", "To connect to a database only", "To compile the program"], answer: "To define the structure and behavior that objects of that type will have" },
    { s: "ITEC 102", q: "What are fields (attributes) in a class used for?", choices: ["To store the data or state of an object", "To define loops", "To create comments", "To import libraries"], answer: "To store the data or state of an object" },
    { s: "ITEC 102", q: "What is a constructor in a class?", choices: ["A special method used to initialize a new object", "A loop that repeats forever", "A variable that never changes", "A file reading method"], answer: "A special method used to initialize a new object" },
    { s: "ITEC 102", q: "What is an object in OOP?", choices: ["An instance of a class", "A type of loop", "A syntax error", "A comment in code"], answer: "An instance of a class" },
    { s: "ITEC 102", q: "What does it mean to instantiate an object?", choices: ["To create a new instance of a class", "To delete a class permanently", "To compile the source code", "To read a file"], answer: "To create a new instance of a class" },
    { s: "ITEC 102", q: "What is a reference variable in OOP?", choices: ["A variable that holds the memory address of an object", "A variable that stores only text", "A variable used only in loops", "A constant value"], answer: "A variable that holds the memory address of an object" },
    { s: "ITEC 102", q: "What is a method in a class?", choices: ["A block of code that defines an action or behavior of an object", "A single stored number", "A type of array", "A kind of file format"], answer: "A block of code that defines an action or behavior of an object" },
    { s: "ITEC 102", q: "What is the main purpose of a method?", choices: ["To perform a specific task or operation", "To store the class name only", "To end the program automatically", "To create comments"], answer: "To perform a specific task or operation" },
    { s: "ITEC 102", q: "Which of the following is part of a method declaration syntax?", choices: ["Return type, method name, and parameters", "Only the method name", "Only the class name", "Only a loop statement"], answer: "Return type, method name, and parameters" },
    { s: "ITEC 102", q: "Which OOP concept allows a class to hide its internal details from outside access?", choices: ["Encapsulation", "Iteration", "Compilation", "Instantiation"], answer: "Encapsulation" },
    { s: "ITEC 102", q: "Which OOP concept allows a new class to acquire properties of an existing class?", choices: ["Inheritance", "Encapsulation", "Iteration", "Instantiation"], answer: "Inheritance" },
    { s: "ITEC 102", q: "Which OOP concept allows objects to take on many forms?", choices: ["Polymorphism", "Encapsulation", "Instantiation", "Iteration"], answer: "Polymorphism" },
    { s: "ITEC 102", q: "Which OOP concept focuses on hiding complex implementation details and showing only necessary features?", choices: ["Abstraction", "Iteration", "Instantiation", "Compilation"], answer: "Abstraction" },
    { s: "ITEC 102", q: "What is file streaming used for in programming?", choices: ["Reading data from or writing data to files", "Compiling source code", "Creating classes", "Declaring variables"], answer: "Reading data from or writing data to files" },
    { s: "ITEC 102", q: "Which class is commonly used to read files character by character in a buffered way?", choices: ["BufferedReader", "PrintWriter", "FileWriter", "Scanner only"], answer: "BufferedReader" },
    { s: "ITEC 102", q: "Which class is commonly used along with FileReader to efficiently read text files?", choices: ["BufferedReader", "FileOutputStream", "DataOutputStream", "PrintWriter"], answer: "BufferedReader" },
    { s: "ITEC 102", q: "Which class allows reading files as a stream of raw bytes?", choices: ["FileInputStream", "FileWriter", "PrintWriter", "BufferedWriter"], answer: "FileInputStream" },
    { s: "ITEC 102", q: "Which class is used together with FileInputStream to read primitive data types from a file?", choices: ["DataInputStream", "FileWriter", "PrintWriter", "BufferedWriter"], answer: "DataInputStream" },
    { s: "ITEC 102", q: "Which class is commonly used to read input including files in a simple, convenient way?", choices: ["Scanner", "PrintWriter", "FileOutputStream", "DataOutputStream"], answer: "Scanner" },
    { s: "ITEC 102", q: "Which class is commonly used to write character data to a file?", choices: ["FileWriter", "FileReader", "Scanner", "DataInputStream"], answer: "FileWriter" },
    { s: "ITEC 102", q: "Which class is commonly used together with FileWriter to efficiently write text to files?", choices: ["BufferedWriter", "FileInputStream", "DataInputStream", "Scanner"], answer: "BufferedWriter" },
    { s: "ITEC 102", q: "Which class allows writing raw byte data to a file?", choices: ["FileOutputStream", "FileReader", "BufferedReader", "Scanner"], answer: "FileOutputStream" },
    { s: "ITEC 102", q: "Which class is used together with FileOutputStream to write primitive data types to a file?", choices: ["DataOutputStream", "FileReader", "BufferedReader", "Scanner"], answer: "DataOutputStream" },
    { s: "ITEC 102", q: "Which class provides a convenient way to write formatted text to a file?", choices: ["PrintWriter", "FileInputStream", "DataInputStream", "BufferedReader"], answer: "PrintWriter" },
    { s: "ITEC 102", q: "What does 'file searching' in a directory typically involve?", choices: ["Locating files based on criteria such as name or type", "Deleting all files permanently", "Compiling the source code", "Creating a new class"], answer: "Locating files based on criteria such as name or type" },
    { s: "ITEC 102", q: "What does searching for specific content within files involve?", choices: ["Scanning file contents to find matching text or data", "Formatting the hard drive", "Declaring new variables", "Creating a constructor"], answer: "Scanning file contents to find matching text or data" },
    { s: "ITEC 102", q: "What are command line arguments?", choices: ["Values passed to a program when it is executed from the command line", "Variables declared inside a class", "Errors found during compilation", "Files created automatically by the IDE"], answer: "Values passed to a program when it is executed from the command line" },
    { s: "ITEC 102", q: "Why are command line arguments useful?", choices: ["They allow a program to receive input without modifying its source code", "They automatically fix bugs in the program", "They compile the program faster", "They replace the need for methods"], answer: "They allow a program to receive input without modifying its source code" },
    { s: "ITEC 102", q: "Which is generally true about file reading and file writing operations?", choices: ["They both require handling the file's connection properly, such as opening and closing it", "They can never be used in the same program", "They do not require any file path", "They can only be used with arrays"], answer: "They both require handling the file's connection properly, such as opening and closing it" },
    { s: "ITEC 102", q: "What is a key reason to close a file stream after use?", choices: ["To free up system resources and ensure data is properly saved", "To automatically delete the file", "To convert the file into an array", "To create a new class from it"], answer: "To free up system resources and ensure data is properly saved" },
    { s: "ITEC 102", q: "Between FileReader and FileInputStream, which is more appropriate for reading character/text data?", choices: ["FileReader", "FileInputStream", "FileOutputStream", "DataOutputStream"], answer: "FileReader" },
    { s: "ITEC 102", q: "Between FileWriter and FileOutputStream, which is more appropriate for writing character/text data?", choices: ["FileWriter", "FileOutputStream", "FileInputStream", "DataInputStream"], answer: "FileWriter" },
    { s: "ITEC 102", q: "What is the general term for errors that occur while a program is running (not during compilation)?", choices: ["Runtime errors", "Syntax errors", "Compilation warnings", "Logic diagrams"], answer: "Runtime errors" },
    { s: "ITEC 102", q: "What is the general term for errors caused by breaking the rules of the programming language?", choices: ["Syntax errors", "Runtime errors", "Logic diagrams", "Compilation success"], answer: "Syntax errors" },
    { s: "ITEC 102", q: "What is a logic error in programming?", choices: ["An error where the program runs but produces incorrect results", "An error that prevents the program from compiling", "An error caused by hardware failure", "An error found only in arrays"], answer: "An error where the program runs but produces incorrect results" },
    { s: "ITEC 102", q: "What best describes 'scope' in programming?", choices: ["The region of code where a variable can be accessed", "The size of the hard drive", "The speed of the processor", "The color scheme of the IDE"], answer: "The region of code where a variable can be accessed" },
    { s: "ITEC 102", q: "What is the difference between a local variable and a global variable?", choices: ["A local variable is accessible only within its defined block, a global variable is accessible throughout the program", "A local variable never has a value", "A global variable cannot store numbers", "There is no difference"], answer: "A local variable is accessible only within its defined block, a global variable is accessible throughout the program" },
    { s: "ITEC 102", q: "What is the purpose of indentation and white space in coding standards?", choices: ["To make code more readable and organized", "To make the program run faster", "To reduce file size significantly", "To prevent all syntax errors"], answer: "To make code more readable and organized" },
    { s: "ITEC 102", q: "What is meant by a 'magic number' in coding, which is generally discouraged?", choices: ["An unexplained numeric value used directly in code instead of a named constant", "A number that changes the color of the screen", "A required part of every loop", "A number used only in arrays"], answer: "An unexplained numeric value used directly in code instead of a named constant" },
    { s: "ITEC 102", q: "Why are meaningful/ambiguous-free variable identifiers important?", choices: ["They make the code easier to read and understand", "They make the program compile faster", "They are required for loops to work", "They automatically fix bugs"], answer: "They make the code easier to read and understand" },
    { s: "ITEC 102", q: "What is procedural abstraction mainly about?", choices: ["Hiding the implementation details of a procedure while exposing its purpose", "Making a program run without any functions", "Removing all variables from a program", "Preventing loops from being used"], answer: "Hiding the implementation details of a procedure while exposing its purpose" },
    { s: "ITEC 102", q: "Which term refers to testing a program using different input values to check correctness?", choices: ["Test cases", "Constants", "Comments", "Class definitions"], answer: "Test cases" },
    { s: "ITEC 102", q: "Which of the following would most likely cause an endless loop?", choices: ["A loop condition that never becomes false", "A for loop with a defined end value", "A switch case with a default", "A properly initialized array"], answer: "A loop condition that never becomes false" },
    { s: "ITEC 102", q: "Which best defines efficient code according to good programming practice?", choices: ["Code that produces correct results using minimal, well-organized steps", "Code with the most lines possible", "Code with no comments", "Code that ignores user input"], answer: "Code that produces correct results using minimal, well-organized steps" },
    { s: "ITEC 102", q: "Which of the following would generally be considered part of good coding standards?", choices: ["Consistent indentation and clear variable names", "Random spacing and unclear names", "No comments at all", "Skipping program testing"], answer: "Consistent indentation and clear variable names" },
    { s: "ITEC 102", q: "Which control structure would you use to validate user input before proceeding?", choices: ["Conditional (if) statement", "Class declaration", "Constructor", "Array declaration only"], answer: "Conditional (if) statement" },
    { s: "ITEC 102", q: "What data structure would best store a list of 30 student grades of the same type?", choices: ["Array", "Single variable", "Constant", "Method"], answer: "Array" },
    { s: "ITEC 102", q: "Which of the following would you use to repeatedly prompt a user until valid input is given?", choices: ["A loop (e.g., while or do-while)", "A single if statement", "A class definition", "A constructor only"], answer: "A loop (e.g., while or do-while)" },
    { s: "ITEC 102", q: "Which best describes the relationship between a class and an object?", choices: ["A class is the blueprint, an object is an instance created from that blueprint", "An object is the blueprint, a class is an instance of it", "They are exactly the same thing", "A class can only exist without objects"], answer: "A class is the blueprint, an object is an instance created from that blueprint" },
    { s: "ITEC 102", q: "Which programming component would you use to avoid repeating the same block of code in multiple places?", choices: ["A function/method", "A constant", "A comment", "A syntax error"], answer: "A function/method" },
    { s: "ITEC 102", q: "Which of the following best describes 'parameter passing'?", choices: ["Sending values into a function or method for it to use", "Deleting a function permanently", "Compiling a class", "Declaring a constant"], answer: "Sending values into a function or method for it to use" },
    { s: "ITEC 102", q: "What is recursion in programming?", choices: ["A function calling itself to solve a smaller instance of a problem", "A loop that never runs", "A type of data type", "A file reading method"], answer: "A function calling itself to solve a smaller instance of a problem" },
    { s: "ITEC 102", q: "Why does a recursive function need a base case?", choices: ["To stop the recursive calls and prevent infinite recursion", "To make the function run faster", "To avoid declaring variables", "To skip parameter passing"], answer: "To stop the recursive calls and prevent infinite recursion" },

    /* ===== ITEC 102 · Module: Introduction to C# Programming (Relevo) ===== */
    { s: "ITEC 102", q: "What is C# (C-Sharp)?", choices: ["A modern, general-purpose programming language developed by Microsoft", "A database management system", "A type of computer hardware", "An operating system by Apple"], answer: "A modern, general-purpose programming language developed by Microsoft" },
    { s: "ITEC 102", q: "Which company developed the C# programming language?", choices: ["Microsoft", "Google", "Apple", "Oracle"], answer: "Microsoft" },
    { s: "ITEC 102", q: "Which of the following is a key characteristic of C#?", choices: ["Object-oriented programming language", "Only used for web design", "Not type-safe", "Cannot work with .NET"], answer: "Object-oriented programming language" },
    { s: "ITEC 102", q: "C# is described as which of the following?", choices: ["Strongly typed", "Weakly typed only", "Not typed at all", "Assembly language only"], answer: "Strongly typed" },
    { s: "ITEC 102", q: "C# was designed to work primarily with which platform?", choices: [".NET platform", "Only Android SDK", "Only iOS Cocoa", "Only WordPress"], answer: ".NET platform" },
    { s: "ITEC 102", q: "Who led the development team of C#?", choices: ["Anders Hejlsberg", "Bill Gates", "Linus Torvalds", "James Gosling"], answer: "Anders Hejlsberg" },
    { s: "ITEC 102", q: "Around what year was C# introduced?", choices: ["2000", "1990", "2010", "1985"], answer: "2000" },
    { s: "ITEC 102", q: "When was the first official version, C# 1.0, released?", choices: ["2002", "1999", "2012", "2008"], answer: "2002" },
    { s: "ITEC 102", q: "C# development began in which period?", choices: ["Late 1990s", "Early 1980s", "2015 only", "1970s"], answer: "Late 1990s" },
    { s: "ITEC 102", q: "C# was created as part of which Microsoft initiative?", choices: [".NET initiative", "Windows Phone only", "Xbox Live only", "MS-DOS initiative"], answer: ".NET initiative" },
    { s: "ITEC 102", q: "In the relationship between C# and .NET, what is C#?", choices: ["A programming language used to write source code", "The runtime that executes all apps", "A hardware driver", "A file compression tool"], answer: "A programming language used to write source code" },
    { s: "ITEC 102", q: "In the relationship between C# and .NET, what is .NET?", choices: ["A development platform with libraries, runtime, and tools", "Only a text editor", "A single keyword in C#", "A type of variable"], answer: "A development platform with libraries, runtime, and tools" },
    { s: "ITEC 102", q: "What does IDE stand for?", choices: ["Integrated Development Environment", "Internal Data Engine", "Internet Download Extension", "Independent Design Element"], answer: "Integrated Development Environment" },
    { s: "ITEC 102", q: "What is an IDE?", choices: ["A software application that helps programmers write, test, and debug code in one place", "A computer virus scanner only", "A type of printer", "A network cable standard"], answer: "A software application that helps programmers write, test, and debug code in one place" },
    { s: "ITEC 102", q: "Which of the following is typically included in an IDE?", choices: ["Code editor", "Only a web browser", "Only a calculator", "Only a music player"], answer: "Code editor" },
    { s: "ITEC 102", q: "In an IDE, what does the compiler or interpreter do?", choices: ["Converts your code into a program that can run", "Deletes all errors automatically without rules", "Connects only to social media", "Formats PowerPoint slides"], answer: "Converts your code into a program that can run" },
    { s: "ITEC 102", q: "What is the debugger used for in an IDE?", choices: ["Helping find and fix errors", "Increasing screen brightness", "Installing games", "Compressing images"], answer: "Helping find and fix errors" },
    { s: "ITEC 102", q: "What is SharpDevelop (#develop)?", choices: ["A free and open-source IDE for .NET and C# development", "A Microsoft Office app", "A type of C# keyword", "A database server only"], answer: "A free and open-source IDE for .NET and C# development" },
    { s: "ITEC 102", q: "What is Microsoft Visual Studio?", choices: ["An Integrated Development Environment (IDE) developed by Microsoft", "A social media platform", "A programming language itself", "A type of computer monitor"], answer: "An Integrated Development Environment (IDE) developed by Microsoft" },
    { s: "ITEC 102", q: "Visual Studio is commonly used for which kind of programming?", choices: ["C# and .NET programming", "Only HTML coloring", "Only spreadsheet macros", "Only photo editing"], answer: "C# and .NET programming" },
    { s: "ITEC 102", q: "Which is a correct step when installing Visual Studio?", choices: ["Run the Visual Studio Installer and select a development workload", "Only download a random .txt file", "Install without selecting any components", "Avoid launching Visual Studio after install"], answer: "Run the Visual Studio Installer and select a development workload" },
    { s: "ITEC 102", q: "Where can you download Visual Studio?", choices: ["https://visualstudio.microsoft.com/downloads/", "Only from a USB without official site", "From random email attachments", "Only from mobile app stores as games"], answer: "https://visualstudio.microsoft.com/downloads/" },
    { s: "ITEC 102", q: "When creating a C# Console Application in Visual Studio, what should you select first after opening Visual Studio?", choices: ["Create a new project", "Delete all templates", "Close the IDE immediately", "Only open Paint"], answer: "Create a new project" },
    { s: "ITEC 102", q: "Which project template is used for a basic text-based C# program?", choices: ["Console App", "Empty Excel sheet", "Photoshop document", "PowerPoint template"], answer: "Console App" },
    { s: "ITEC 102", q: "When creating a Console App, which programming language should you select?", choices: ["C#", "Only Python always", "Only JavaScript always", "Only assembly always"], answer: "C#" },
    { s: "ITEC 102", q: "After choosing the Console App template, what do you typically enter next?", choices: ["Project name and location", "Your Wi-Fi password only", "A random phone number", "Nothing; it auto-finishes"], answer: "Project name and location" },
    { s: "ITEC 102", q: "What does 'syntax' refer to in programming?", choices: ["The rules that determine how a programming language must be written", "The speed of the computer fan", "The color of the desktop wallpaper", "The brand of the keyboard"], answer: "The rules that determine how a programming language must be written" },
    { s: "ITEC 102", q: "Which of the following is part of C# syntax elements?", choices: ["Statements, keywords, identifiers, variables, methods, classes", "Only images and videos", "Only network cables", "Only printer drivers"], answer: "Statements, keywords, identifiers, variables, methods, classes" },
    { s: "ITEC 102", q: "What is a statement in C#?", choices: ["An instruction that tells the computer to perform an action", "A type of monitor", "A folder on the desktop", "A Wi-Fi standard"], answer: "An instruction that tells the computer to perform an action" },
    { s: "ITEC 102", q: "What are keywords in C#?", choices: ["Special words with predefined meaning that cannot normally be used as names", "Any random username online", "Folder names only", "Mouse click patterns"], answer: "Special words with predefined meaning that cannot normally be used as names" },
    { s: "ITEC 102", q: "Which of the following is a C# keyword?", choices: ["int", "helloWorldVar", "myAge123", "studentNameX"], answer: "int" },
    { s: "ITEC 102", q: "Which of these is also a C# keyword?", choices: ["class", "myClassNameOnly", "dataHolder99", "valueBox"], answer: "class" },
    { s: "ITEC 102", q: "Which keyword is commonly used for the entry-point method return type in console samples?", choices: ["void", "wifi", "folder", "monitor"], answer: "void" },
    { s: "ITEC 102", q: "What are identifiers in C#?", choices: ["Names given by the programmer to variables, methods, classes, and other elements", "Only Microsoft product serial numbers", "Only IP addresses", "Only file sizes"], answer: "Names given by the programmer to variables, methods, classes, and other elements" },
    { s: "ITEC 102", q: "What is a variable?", choices: ["A named storage location used to hold data", "A type of computer virus", "A permanent unchangeable hardware chip only", "A network topology"], answer: "A named storage location used to hold data" },
    { s: "ITEC 102", q: "A variable is best compared to which everyday idea?", choices: ["A labeled container that stores information", "A locked empty room with no label", "A random internet meme", "A broken keyboard key"], answer: "A labeled container that stores information" },
    { s: "ITEC 102", q: "What is a method in C#?", choices: ["A block of code that performs a specific task", "A type of hard disk", "A Wi-Fi password", "A monitor resolution setting"], answer: "A block of code that performs a specific task" },
    { s: "ITEC 102", q: "What are braces { } used for in C#?", choices: ["To define a block of code", "To end every statement only", "To name variables only", "To connect to the internet"], answer: "To define a block of code" },
    { s: "ITEC 102", q: "What are parentheses ( ) commonly used for in C#?", choices: ["Passing information to methods and writing conditions", "Only drawing circles on screen", "Only closing the IDE", "Only naming projects"], answer: "Passing information to methods and writing conditions" },
    { s: "ITEC 102", q: "What does a semicolon (;) usually mark in C#?", choices: ["The end of a statement", "The start of a class only", "A comment block only", "A new project template"], answer: "The end of a statement" },
    { s: "ITEC 102", q: "What does the line 'using System;' do in a basic C# program?", choices: ["Allows the program to use members of the System namespace", "Deletes the System folder", "Installs Visual Studio", "Creates a new user account"], answer: "Allows the program to use members of the System namespace" },
    { s: "ITEC 102", q: "What does 'class Program' define in a basic C# console structure?", choices: ["A class named Program", "A variable named Program only", "A keyword that ends the app", "A folder path"], answer: "A class named Program" },
    { s: "ITEC 102", q: "What is Main() in a traditional C# console program?", choices: ["The traditional entry point of the program", "A type of loop only", "A data type for numbers only", "A debugger tool outside the code"], answer: "The traditional entry point of the program" },
    { s: "ITEC 102", q: "What does Console.WriteLine() do?", choices: ["Displays information in the console", "Deletes console history permanently", "Opens Visual Studio settings", "Compiles the entire .NET runtime"], answer: "Displays information in the console" },
    { s: "ITEC 102", q: "Which rule is true about C#?", choices: ["C# is case-sensitive", "C# ignores letter case completely", "C# does not use semicolons", "C# cannot use braces"], answer: "C# is case-sensitive" },
    { s: "ITEC 102", q: "How do C# statements usually end?", choices: ["With a semicolon ;", "With a colon only", "With a period only", "With a hashtag only"], answer: "With a semicolon ;" },
    { s: "ITEC 102", q: "What do code blocks in C# use?", choices: ["Curly braces { }", "Square brackets only for all blocks", "Angle brackets only", "No symbols at all"], answer: "Curly braces { }" },
    { s: "ITEC 102", q: "Methods and conditions in C# typically use which symbols?", choices: ["Parentheses ( )", "Only curly braces with no parentheses", "Only quotation marks", "Only commas"], answer: "Parentheses ( )" },
    { s: "ITEC 102", q: "File names in C# projects usually follow which naming style?", choices: ["Pascal Case (e.g., ComputerScience)", "alllowercasewithnospacesonly", "ONLY_SNAKE_WITH_NUMBERS_999", "random!!!symbols"], answer: "Pascal Case (e.g., ComputerScience)" },
    { s: "ITEC 102", q: "Which statement correctly displays text on the console?", choices: ["Console.WriteLine(\"Hello\");", "print Hello", "echo Hello;", "System.out.println Hello"], answer: "Console.WriteLine(\"Hello\");" },
    { s: "ITEC 102", q: "If age is an integer variable, which declaration uses a keyword correctly?", choices: ["int age;", "integer age;", "num age;", "varInteger age;"], answer: "int age;" },
    { s: "ITEC 102", q: "Why can you not normally use 'class' as a variable name in C#?", choices: ["Because class is a keyword with a predefined meaning", "Because class is too short", "Because C# bans all short names", "Because variables cannot store data"], answer: "Because class is a keyword with a predefined meaning" },
    { s: "ITEC 102", q: "Which pair correctly matches language vs platform?", choices: ["C# = language; .NET = platform", "C# = platform; .NET = language", "Both are only hardware", "Both are only databases"], answer: "C# = language; .NET = platform" },
    { s: "ITEC 102", q: "Which IDE is developed by Microsoft and widely used for C#?", choices: ["Visual Studio", "SharpPaint", "Only Notepad with no tools", "Photoshop"], answer: "Visual Studio" },
    { s: "ITEC 102", q: "Which free/open-source IDE is mentioned for .NET and C# development?", choices: ["SharpDevelop", "Microsoft Word", "Excel Online", "PowerPoint"], answer: "SharpDevelop" },
    { s: "ITEC 102", q: "Which step comes after selecting the Console App template in Visual Studio?", choices: ["Click Next, then enter project name and location", "Uninstall Visual Studio", "Delete the template", "Switch to a different language only"], answer: "Click Next, then enter project name and location" },
    { s: "ITEC 102", q: "Before clicking Create for a new Console App, you typically choose what?", choices: ["The framework", "The desktop wallpaper", "The default printer", "The system volume"], answer: "The framework" },
    { s: "ITEC 102", q: "Which is NOT a typical part of an IDE?", choices: ["A kitchen recipe book", "Code editor", "Debugger", "Build and run tools"], answer: "A kitchen recipe book" },
    { s: "ITEC 102", q: "C# supports which programming styles mentioned in the module?", choices: ["Structured and object-oriented programming", "Only pure assembly with no structure", "Only drag-and-drop with no code", "Only spreadsheet formulas"], answer: "Structured and object-oriented programming" },
    { s: "ITEC 102", q: "Which best summarizes why C# is called versatile?", choices: ["It can be used to create different types of applications", "It only prints Hello World forever", "It only runs on one abandoned OS", "It cannot use libraries"], answer: "It can be used to create different types of applications" },

    { s: "GEC 101", q: "According to Socrates, what is the self synonymous with?", choices: ["The soul", "The body", "The government", "The community"], answer: "The soul" },
    { s: "GEC 101", q: "What is Socrates' famous statement about self-examination?", choices: ["An unexamined life is not worth living", "I think, therefore I am", "The self is a blank slate", "There is no self"], answer: "An unexamined life is not worth living" },
    { s: "GEC 101", q: "According to Socrates, what does the soul strive for?", choices: ["Wisdom and perfection", "Wealth and power", "Fame and pleasure", "Speed and strength"], answer: "Wisdom and perfection" },
    { s: "GEC 101", q: "According to Socrates, what happens to the soul if it remains tied to the body?", choices: ["It continues to wander and be confused", "It becomes perfectly wise instantly", "It disappears completely", "It becomes another person's soul"], answer: "It continues to wander and be confused" },
    { s: "GEC 101", q: "For Plato, what Greek word refers to the soul?", choices: ["Psyche", "Cogito", "Logos", "Ethos"], answer: "Psyche" },
    { s: "GEC 101", q: "According to Plato, the soul is composed of how many parts?", choices: ["Three", "One", "Two", "Four"], answer: "Three" },
    { s: "GEC 101", q: "Which of the following is one of Plato's three parts of the soul?", choices: ["Reason", "Wi-Fi", "Algorithm", "Currency"], answer: "Reason" },
    { s: "GEC 101", q: "According to Plato, which part of the soul is the divine essence that enables wise choices?", choices: ["Reason", "Physical Appetite", "Spirit", "Ego"], answer: "Reason" },
    { s: "GEC 101", q: "According to Plato, which part of the soul refers to basic biological needs like hunger and thirst?", choices: ["Physical Appetite", "Reason", "Spirit", "Consciousness"], answer: "Physical Appetite" },
    { s: "GEC 101", q: "According to Plato, which part of the soul refers to emotions such as love, anger, and ambition?", choices: ["Spirit or passion", "Reason", "Physical Appetite", "Impression"], answer: "Spirit or passion" },
    { s: "GEC 101", q: "According to Plato, who is responsible for sorting out conflict among the three parts of the soul?", choices: ["Reason", "Physical Appetite", "Spirit", "The body"], answer: "Reason" },
    { s: "GEC 101", q: "According to Plato, genuine happiness is achieved when what is in control of Spirit and Appetites?", choices: ["Reason", "Money", "Fame", "Technology"], answer: "Reason" },
    { s: "GEC 101", q: "Which philosopher combined Plato's ideas with Christian teachings and is regarded as a saint?", choices: ["St. Augustine", "Rene Descartes", "John Locke", "David Hume"], answer: "St. Augustine" },
    { s: "GEC 101", q: "According to St. Augustine, self-knowledge is a consequence of what?", choices: ["Knowledge of God", "Knowledge of mathematics", "Knowledge of politics", "Knowledge of technology"], answer: "Knowledge of God" },
    { s: "GEC 101", q: "According to St. Augustine, what governs and defines a man?", choices: ["The soul", "The body", "Wealth", "Social status"], answer: "The soul" },
    { s: "GEC 101", q: "Which philosopher is known for the phrase 'Cogito ergo sum'?", choices: ["Rene Descartes", "Socrates", "Plato", "Immanuel Kant"], answer: "Rene Descartes" },
    { s: "GEC 101", q: "What does 'Cogito ergo sum' mean?", choices: ["I think, therefore I am", "I feel, therefore I exist", "I am, therefore I think", "I doubt, therefore I fail"], answer: "I think, therefore I am" },
    { s: "GEC 101", q: "Rene Descartes is considered the father of what field?", choices: ["Modern philosophy", "Modern chemistry", "Modern biology", "Modern astronomy"], answer: "Modern philosophy" },
    { s: "GEC 101", q: "For Descartes, what proves that there is a self?", choices: ["The act of thinking about self / being self-conscious", "Physical appearance", "Having many possessions", "Being praised by others"], answer: "The act of thinking about self / being self-conscious" },
    { s: "GEC 101", q: "For Descartes, the human self is essentially what kind of entity?", choices: ["A thinking entity that doubts, understands, analyzes, questions, and reasons", "A purely physical entity with no thought", "An entity defined only by wealth", "An entity created by government"], answer: "A thinking entity that doubts, understands, analyzes, questions, and reasons" },
    { s: "GEC 101", q: "Which philosopher believed the human mind at birth is a 'tabula rasa' or blank slate?", choices: ["John Locke", "Rene Descartes", "David Hume", "Socrates"], answer: "John Locke" },
    { s: "GEC 101", q: "According to John Locke, the self is constructed primarily from what?", choices: ["Sense experiences", "Divine revelation", "Government laws", "Mathematical formulas"], answer: "Sense experiences" },
    { s: "GEC 101", q: "According to Locke, what shapes and molds the self throughout a person's life?", choices: ["Experiences", "Physical strength", "Family wealth", "Nationality"], answer: "Experiences" },
    { s: "GEC 101", q: "According to Locke, what is necessary to have a coherent personal identity?", choices: ["Self-consciousness", "Wealth", "Physical beauty", "Fame"], answer: "Self-consciousness" },
    { s: "GEC 101", q: "Which philosopher suggested that there is no self, only impressions and ideas?", choices: ["David Hume", "John Locke", "Rene Descartes", "Immanuel Kant"], answer: "David Hume" },
    { s: "GEC 101", q: "According to David Hume, through what process do people discover there is no self?", choices: ["Introspection", "Meditation only", "Formal education", "Physical exercise"], answer: "Introspection" },
    { s: "GEC 101", q: "According to Hume, what are the two distinct entities found when examining experience?", choices: ["Impressions and ideas", "Reason and Appetite", "Mind and Machine", "Logic and Emotion"], answer: "Impressions and ideas" },
    { s: "GEC 101", q: "According to Hume, which are the basic, vivid, and lively sensations of experience?", choices: ["Impressions", "Ideas", "Constants", "Variables"], answer: "Impressions" },
    { s: "GEC 101", q: "According to Hume, which are the thoughts and images derived from impressions, less lively and vivid?", choices: ["Ideas", "Impressions", "Constants", "Reasons"], answer: "Ideas" },
    { s: "GEC 101", q: "Which philosopher proposed the concept of the Transcendental Unity of Apperception?", choices: ["Immanuel Kant", "David Hume", "John Locke", "Socrates"], answer: "Immanuel Kant" },
    { s: "GEC 101", q: "According to Immanuel Kant, where is being or the self located?", choices: ["Outside the body, transcendent", "Only inside the brain", "Only inside the heart", "Nowhere; the self does not exist"], answer: "Outside the body, transcendent" },
    { s: "GEC 101", q: "According to Kant, the self is an organizing principle that makes what possible?", choices: ["A unified and intelligible experience", "Only physical movement", "Only emotional reactions", "Only financial success"], answer: "A unified and intelligible experience" },
    { s: "GEC 101", q: "According to Kant, how does the self transcend experience?", choices: ["Through rationality, grasping ideas beyond the senses", "By avoiding all thinking", "By relying only on physical senses", "By ignoring reality completely"], answer: "Through rationality, grasping ideas beyond the senses" },
    { s: "GEC 101", q: "Which philosopher's concept of self is most associated with 'the self is consciousness'?", choices: ["John Locke", "St. Augustine", "Socrates", "Plato"], answer: "John Locke" },
    { s: "GEC 101", q: "Which philosopher's concept of self is most associated with 'the self is an immortal soul'?", choices: ["Plato", "David Hume", "John Locke", "Immanuel Kant"], answer: "Plato" },
    { s: "GEC 101", q: "Which philosopher's concept of self is most associated with 'there is no self; only impressions and ideas'?", choices: ["David Hume", "Plato", "Socrates", "St. Augustine"], answer: "David Hume" },
    { s: "GEC 101", q: "Which philosopher's concept of self is most associated with 'the self is always transcendental'?", choices: ["Immanuel Kant", "Socrates", "John Locke", "St. Augustine"], answer: "Immanuel Kant" },
    { s: "GEC 101", q: "Which nationality is Rene Descartes?", choices: ["French", "Scottish", "German", "English"], answer: "French" },
    { s: "GEC 101", q: "Which nationality is David Hume?", choices: ["Scottish", "French", "German", "Greek"], answer: "Scottish" },
    { s: "GEC 101", q: "Which nationality is John Locke?", choices: ["English", "French", "Scottish", "German"], answer: "English" },
    { s: "GEC 101", q: "Which nationality is Immanuel Kant?", choices: ["German", "French", "English", "Scottish"], answer: "German" },

    { s: "GEC 102", q: "What is a primary source?", choices: ["A source created by participants or eyewitnesses giving firsthand information", "A summary written by a modern author", "A textbook explaining several other sources", "An encyclopedia entry"], answer: "A source created by participants or eyewitnesses giving firsthand information" },
    { s: "GEC 102", q: "Which of the following is an example of a primary source?", choices: ["Diaries and letters", "A history textbook", "A journal article reviewing an event", "An encyclopedia summary"], answer: "Diaries and letters" },
    { s: "GEC 102", q: "Which of the following is also considered a primary source?", choices: ["Oral interviews with eyewitnesses", "A biography written decades later", "A textbook chapter summary", "A bibliography of sources"], answer: "Oral interviews with eyewitnesses" },
    { s: "GEC 102", q: "What is a secondary source?", choices: ["A material written to interpret, discuss, analyze, and comment on a primary source", "An eyewitness account of an event", "An original government document", "A personal diary entry"], answer: "A material written to interpret, discuss, analyze, and comment on a primary source" },
    { s: "GEC 102", q: "Which of the following is an example of a secondary source?", choices: ["A textbook", "A diary", "An artifact", "An autobiography"], answer: "A textbook" },
    { s: "GEC 102", q: "Which of the following is also an example of a secondary source?", choices: ["A journal article", "A photograph taken during the event", "A speech given during the event", "A legal document from that time"], answer: "A journal article" },
    { s: "GEC 102", q: "Tertiary sources consist of information that is what?", choices: ["A collection of primary and secondary sources", "Only fictional stories", "Only handwritten letters", "Only government laws"], answer: "A collection of primary and secondary sources" },
    { s: "GEC 102", q: "Which of the following is an example of a tertiary source?", choices: ["An encyclopedia", "A diary entry", "A photograph", "An eyewitness interview"], answer: "An encyclopedia" },
    { s: "GEC 102", q: "Which of the following is also an example of a tertiary source?", choices: ["A bibliography", "A speech recording", "An artifact", "A letter"], answer: "A bibliography" },
    { s: "GEC 102", q: "The word 'History' came from what Greek word?", choices: ["Historia", "Historieo", "Histor", "Historicus"], answer: "Historia" },
    { s: "GEC 102", q: "What does the Greek word 'Historia' mean?", choices: ["Learning, inquiry, or investigation", "Recording numbers", "Building monuments", "Predicting the future"], answer: "Learning, inquiry, or investigation" },
    { s: "GEC 102", q: "History is a branch of what field of study?", choices: ["Social Sciences", "Natural Sciences", "Mathematics", "Fine Arts"], answer: "Social Sciences" },
    { s: "GEC 102", q: "Why is History described as a 'systematic' study?", choices: ["It follows a methodology to validate facts and evidence", "It only studies numbers", "It ignores all past events", "It is based purely on opinion"], answer: "It follows a methodology to validate facts and evidence" },
    { s: "GEC 102", q: "What does 'significant past' mean in the definition of History?", choices: ["Past events that affected the political, cultural, social, or economic aspects of society", "Any random event that happened yesterday", "Only events involving famous people", "Events that happened only in Europe"], answer: "Past events that affected the political, cultural, social, or economic aspects of society" },
    { s: "GEC 102", q: "Why is 'Juan threw a ball of paper in the trashcan' NOT considered part of Philippine History?", choices: ["It did not affect the political, cultural, social, or economic aspects of society", "It happened too recently", "It was not written in English", "It happened outside the Philippines"], answer: "It did not affect the political, cultural, social, or economic aspects of society" },
    { s: "GEC 102", q: "Why is 'History' considered a western concept with a limitation?", choices: ["It failed to account for unrecorded or unwritten sources like oral tradition", "It only focuses on modern events", "It cannot be studied by Filipinos", "It excludes all written documents"], answer: "It failed to account for unrecorded or unwritten sources like oral tradition" },
    { s: "GEC 102", q: "According to E. Kent Rogers, one reason we study History is to know more about what?", choices: ["The roots of our current culture", "The price of gold", "Modern technology trends", "Future weather patterns"], answer: "The roots of our current culture" },
    { s: "GEC 102", q: "According to E. Kent Rogers, studying History also helps us learn about what?", choices: ["Human nature by looking at trends that repeat through history", "Only mathematical formulas", "Foreign languages", "Computer programming"], answer: "Human nature by looking at trends that repeat through history" },
    { s: "GEC 102", q: "What is the main difference between 'History' and 'the Past'?", choices: ["History is the interpretation of evidence from the past in a thoughtful way, while the past is everything that has happened", "They mean exactly the same thing", "History is only about wars", "The past only refers to prehistoric times"], answer: "History is the interpretation of evidence from the past in a thoughtful way, while the past is everything that has happened" },
    { s: "GEC 102", q: "What is the main difference between 'History' and 'Prehistory'?", choices: ["The existence of written records", "The number of people involved", "The location of events", "The length of time studied"], answer: "The existence of written records" },
    { s: "GEC 102", q: "Prehistory refers to what period?", choices: ["Human activity before the invention of the writing system", "The period after World War II", "Any event before the year 2000", "The digital age"], answer: "Human activity before the invention of the writing system" },
    { s: "GEC 102", q: "How is History related to other disciplines?", choices: ["No discipline is an island; methods of studying history are influenced by other disciplines", "History has no connection to any other field", "History replaced all other disciplines", "History and other disciplines never interact"], answer: "No discipline is an island; methods of studying history are influenced by other disciplines" },
    { s: "GEC 102", q: "History is basically described as what?", choices: ["A chronology used to study and evaluate past events", "A list of famous quotes", "A prediction of future events", "A collection of myths only"], answer: "A chronology used to study and evaluate past events" },
    { s: "GEC 102", q: "What is Historicity?", choices: ["The documentation of characters in history, as opposed to legend or myth", "The writing style of a historian", "The study of future events", "A type of primary source"], answer: "The documentation of characters in history, as opposed to legend or myth" },
    { s: "GEC 102", q: "What is Historiography?", choices: ["The writing of history and how interpretations of historians change over time", "The study of prehistoric fossils", "A method of measuring time", "A tool for internal criticism"], answer: "The writing of history and how interpretations of historians change over time" },
    { s: "GEC 102", q: "What is Herstory?", choices: ["History written from a feminist perspective emphasizing the role of women", "A shortened version of history", "A history written only by men", "The history of Filipino heroes"], answer: "History written from a feminist perspective emphasizing the role of women" },
    { s: "GEC 102", q: "What does Historical Research consist of?", choices: ["Techniques and guidelines historians use to research and write histories using primary sources and evidence", "Only reading history textbooks", "Interviewing only living people", "Predicting the outcome of future elections"], answer: "Techniques and guidelines historians use to research and write histories using primary sources and evidence" },
    { s: "GEC 102", q: "What is the main purpose of Historical Research?", choices: ["To illustrate and assess events of the past, acknowledge the present, and precede possible future effects", "To create fictional stories", "To memorize dates only", "To replace textbooks with videos"], answer: "To illustrate and assess events of the past, acknowledge the present, and precede possible future effects" },
    { s: "GEC 102", q: "Why are histories described as dominant in shaping identity?", choices: ["They produce and strengthen collective identities", "They are required by law", "They are the only school subject", "They replace personal memory"], answer: "They produce and strengthen collective identities" },
    { s: "GEC 102", q: "Historical Research involves the careful study and analysis of what?", choices: ["Data about past events", "Only current events", "Future predictions", "Fictional literature"], answer: "Data about past events" },
    { s: "GEC 102", q: "Historical Research is best described as what kind of investigation?", choices: ["A critical investigation of events, their development, and experiences of the past", "A casual guess about the past", "An investigation limited to oral stories only", "A study focused only on numbers"], answer: "A critical investigation of events, their development, and experiences of the past" },
    { s: "GEC 102", q: "Aside from written materials, what else may historical research include?", choices: ["Oral documentation", "Only movies", "Only social media posts", "Only government seals"], answer: "Oral documentation" },
    { s: "GEC 102", q: "According to the Cyclical View of History, how did the Greeks see events?", choices: ["Events recurred on a regular basis", "Events never repeated", "Events were random and meaningless", "Events only happened in a straight line"], answer: "Events recurred on a regular basis" },
    { s: "GEC 102", q: "Herodotus viewed history as the story of men and states as what?", choices: ["Recurring cycles", "A single straight timeline", "God's divine plan", "A collection of myths only"], answer: "Recurring cycles" },
    { s: "GEC 102", q: "Thucydides envisioned time as recurring in what fashion?", choices: ["A cyclical fashion which men are unable to control", "A linear fashion controlled by leaders", "A random fashion with no pattern", "A digital fashion using data"], answer: "A cyclical fashion which men are unable to control" },
    { s: "GEC 102", q: "Who revived the cyclical concept of history in the 14th century?", choices: ["Petrarch", "Machiavelli", "Toynbee", "Spengler"], answer: "Petrarch" },
    { s: "GEC 102", q: "Machiavelli suggested that history could be seen as what?", choices: ["A casebook of political strategy", "A religious text", "A scientific manual", "A form of entertainment only"], answer: "A casebook of political strategy" },
    { s: "GEC 102", q: "Arnold Toynbee and Oswald Spengler based their work on the premise that history is cyclical, meaning what?", choices: ["Civilizations rise and fall, each new one rising to a greater level", "History repeats exactly the same events forever", "Only kings can shape history", "History has no pattern at all"], answer: "Civilizations rise and fall, each new one rising to a greater level" },
    { s: "GEC 102", q: "The Linear View of History views history as what?", choices: ["Progressive, moving forward and not having a cyclical return", "Repeating in endless circles", "Controlled entirely by fate", "Random and directionless"], answer: "Progressive, moving forward and not having a cyclical return" },
    { s: "GEC 102", q: "The Great God View of History associates the origin of the world with what?", choices: ["A Lord God who worked on a six-day schedule", "Natural selection", "Alien intervention", "Human invention"], answer: "A Lord God who worked on a six-day schedule" },
    { s: "GEC 102", q: "According to the Great Man View of History, what determines the course of history?", choices: ["Dominant personalities such as rulers, warriors, and statesmen", "Random natural disasters", "The weather", "Ordinary citizens only"], answer: "Dominant personalities such as rulers, warriors, and statesmen" },
    { s: "GEC 102", q: "The Best People View of History believes that history is made by whom?", choices: ["Some elite, the best race, the favored nation, or the ruling class", "Everyone equally", "Only children", "Only foreigners"], answer: "Some elite, the best race, the favored nation, or the ruling class" },
    { s: "GEC 102", q: "In the Ideas or Great Mind View of History, what is the driving force in history?", choices: ["People's ideas", "Weather patterns", "Military weapons", "Natural disasters"], answer: "People's ideas" },
    { s: "GEC 102", q: "The Human Nature View of History believes history has been determined by what?", choices: ["The qualities of human nature, whether good or bad", "Purely random chance", "Divine punishment only", "Technology alone"], answer: "The qualities of human nature, whether good or bad" },
    { s: "GEC 102", q: "Gender History looks at the past from what perspective?", choices: ["The perspective of gender", "The perspective of economics only", "The perspective of geography only", "The perspective of religion only"], answer: "The perspective of gender" },
    { s: "GEC 102", q: "The Postmodern View of History believes that history has what kind of purpose?", choices: ["No ultimate purpose", "A divine purpose only", "A purely scientific purpose", "A purpose set by one nation"], answer: "No ultimate purpose" },
    { s: "GEC 102", q: "What does External Criticism refer to?", choices: ["The genuineness or authenticity of the documents used in a historical study", "The accuracy of the content written in the document", "The number of pages in a document", "The color of the ink used"], answer: "The genuineness or authenticity of the documents used in a historical study" },
    { s: "GEC 102", q: "What does Internal Criticism refer to?", choices: ["The accuracy of the contents of the document", "The physical age of the paper", "The type of ink used", "The handwriting style only"], answer: "The accuracy of the contents of the document" },
    { s: "GEC 102", q: "Why is it important to validate historical sources through criticism?", choices: ["Because unverified or falsified sources can lead to false conclusions", "Because it makes the document heavier", "Because it changes the language of the document", "Because it is required for printing"], answer: "Because unverified or falsified sources can lead to false conclusions" },
    { s: "GEC 102", q: "An old photograph with a handwritten inscription found in a library book is what type of source?", choices: ["Primary source", "Secondary source", "Tertiary source", "Not a historical source"], answer: "Primary source" },
    { s: "GEC 102", q: "A biography of a student activist written using interviews with friends and family plus primary documents is what type of source?", choices: ["Secondary source", "Primary source", "Tertiary source", "Not a historical source"], answer: "Secondary source" },
    { s: "GEC 102", q: "A textbook that compiles works from several known historians like Agoncillo and Camagay is what type of source?", choices: ["Tertiary source", "Primary source", "Secondary source", "Not a historical source"], answer: "Tertiary source" },
    { s: "GEC 102", q: "A golden artifact like 'The Golden Tara' displayed in a museum, believed to be made before Spanish colonization, is what type of source?", choices: ["Primary source", "Secondary source", "Tertiary source", "Not a historical source"], answer: "Primary source" },
    { s: "GEC 102", q: "A travel brochure produced by a tourism office with basic historical information about a place is what type of source?", choices: ["Tertiary source", "Primary source", "Secondary source", "Not a historical source"], answer: "Tertiary source" },
    { s: "GEC 102", q: "What is Content Analysis?", choices: ["A research method for studying documents and communication artifacts", "A method for repairing old documents", "A way to translate documents into other languages", "A method for printing documents"], answer: "A research method for studying documents and communication artifacts" },
    { s: "GEC 102", q: "According to Klaus Krippendorff, content analysis must address which data are what?", choices: ["Analyzed", "Destroyed", "Copied", "Translated"], answer: "Analyzed" },
    { s: "GEC 102", q: "According to Krippendorff, one item that must be addressed in content analysis is: how are the data what?", choices: ["Defined", "Erased", "Sold", "Hidden"], answer: "Defined" },
    { s: "GEC 102", q: "According to Krippendorff, content analysis must also identify what?", choices: ["From what population the data is drawn", "The price of the material", "The author's nationality only", "The publisher's address"], answer: "From what population the data is drawn" },
    { s: "GEC 102", q: "According to Krippendorff, content analysis must determine what is relevant?", choices: ["Context", "Currency", "Weather", "Location of storage"], answer: "Context" },
    { s: "GEC 102", q: "According to Krippendorff, content analysis must define the boundaries of what?", choices: ["The Analysis", "The library", "The classroom", "The internet"], answer: "The Analysis" },
    { s: "GEC 102", q: "According to Krippendorff, content analysis must decide what is to be what?", choices: ["Measured", "Destroyed", "Ignored", "Sold"], answer: "Measured" },
    { s: "GEC 102", q: "Which of the following is one of the five kinds of text in content analysis?", choices: ["Written text, such as books and papers", "Digital currency", "Musical instruments", "Physical exercise routines"], answer: "Written text, such as books and papers" },
    { s: "GEC 102", q: "Oral text in content analysis refers to what?", choices: ["Speech and theatrical performance", "Written books only", "Paintings and drawings", "Internet websites only"], answer: "Speech and theatrical performance" },
    { s: "GEC 102", q: "Iconic text in content analysis includes what?", choices: ["Drawings, paintings, and icons", "Only spoken speeches", "Only television shows", "Only handwritten letters"], answer: "Drawings, paintings, and icons" },
    { s: "GEC 102", q: "Audio-visual text in content analysis includes what?", choices: ["TV programs, movies, and videos", "Only ancient scrolls", "Only oral speeches", "Only maps"], answer: "TV programs, movies, and videos" },
    { s: "GEC 102", q: "Hypertexts in content analysis refer to what?", choices: ["Text found on the Internet", "Only printed books", "Only handwritten diaries", "Only stone carvings"], answer: "Text found on the Internet" },
    { s: "GEC 102", q: "What does Conceptual Analysis help establish?", choices: ["The existence and frequency of concepts in the text", "The price of the document", "The physical weight of a book", "The color of the ink"], answer: "The existence and frequency of concepts in the text" },
    { s: "GEC 102", q: "What does Relational Analysis examine?", choices: ["The relationship among concepts in the text", "The location where the text was printed", "The number of pages in a book", "The author's birthday"], answer: "The relationship among concepts in the text" },
    { s: "GEC 102", q: "What is Contextual Analysis?", choices: ["An analysis that assesses a text within its historical and cultural setting", "A method of translating a text", "A way to count words in a text", "A method to destroy fake documents"], answer: "An analysis that assesses a text within its historical and cultural setting" },
    { s: "GEC 102", q: "One key question in Contextual Analysis asks what the text reveals about itself, referring to what?", choices: ["Description of the language and arrangement of words", "The price of publishing", "The weight of the paper", "The type of printer used"], answer: "Description of the language and arrangement of words" },
    { s: "GEC 102", q: "One key question in Contextual Analysis asks about the text's apparent intended audience, referring to what?", choices: ["Kinds and number of audience", "The author's income", "The publisher's logo", "The size of the font"], answer: "Kinds and number of audience" },
    { s: "GEC 102", q: "One key question in Contextual Analysis asks about the author's intention, referring to what?", choices: ["What the author said or did not say, and how he said it", "The author's favorite color", "The author's birthday", "The author's home address"], answer: "What the author said or did not say, and how he said it" },
    { s: "GEC 102", q: "One key question in Contextual Analysis asks about the occasion for the text, referring to what?", choices: ["A particular event or the author's general observation about it", "The number of pages printed", "The cost of ink used", "The size of the book cover"], answer: "A particular event or the author's general observation about it" },
    { s: "GEC 102", q: "One key question in Contextual Analysis asks whether the text is intended as what?", choices: ["A call to-or for-action", "A form of currency", "A type of artifact", "A government seal"], answer: "A call to-or for-action" },
    { s: "GEC 102", q: "One key question in Contextual Analysis asks about non-textual circumstances, which may include what?", choices: ["Political events, economic factors, and cultural practices", "The font size used", "The type of paper used", "The number of copies printed"], answer: "Political events, economic factors, and cultural practices" },
    { s: "GEC 102", q: "What does the Subtext of a document refer to?", choices: ["Its secondary and implied meanings", "Its exact word count", "Its physical size", "Its publication date only"], answer: "Its secondary and implied meanings" },
    { s: "GEC 102", q: "What is Historical Significance?", choices: ["The process used to evaluate the importance of selected events, people, and developments in the past", "The exact number of pages in a history book", "A rule that only applies to wars", "A grading system for exams only"], answer: "The process used to evaluate the importance of selected events, people, and developments in the past" },
    { s: "GEC 102", q: "The Relevance criterion in assessing historical significance asks what?", choices: ["Is it necessary or relevant to people living in the time, or still relevant today?", "How many pages does it have?", "What color is the document?", "Who printed the document?"], answer: "Is it necessary or relevant to people living in the time, or still relevant today?" },
    { s: "GEC 102", q: "The Resonance criterion in assessing historical significance asks about what?", choices: ["Who was affected by the event and why it was necessary for them", "The price of the artifact", "The size of the museum", "The type of paper used"], answer: "Who was affected by the event and why it was necessary for them" },
    { s: "GEC 102", q: "The Remarkable criterion in assessing historical significance asks what?", choices: ["Was the event remarked on by people at the time or since?", "Was the event colorful?", "Was the event expensive?", "Was the event short?"], answer: "Was the event remarked on by people at the time or since?" },
    { s: "GEC 102", q: "The Remembered criterion in assessing historical significance asks what?", choices: ["Was the event significant within the collective memory of a group?", "Was the event forgotten immediately?", "Was the event never recorded?", "Was the event fictional?"], answer: "Was the event significant within the collective memory of a group?" },
    { s: "GEC 102", q: "The Revealing criterion in assessing historical significance asks what?", choices: ["Does it reveal some other aspects of the past?", "Does it hide all information?", "Does it cost a lot of money?", "Does it require translation?"], answer: "Does it reveal some other aspects of the past?" },
    { s: "GEC 102", q: "The Resulting in Change criterion in assessing historical significance asks what?", choices: ["Does it have consequences for the future?", "Does it require government approval?", "Does it need to be translated?", "Does it need a new printing press?"], answer: "Does it have consequences for the future?" },
    { s: "GEC 102", q: "The Durability criterion in assessing historical significance asks what?", choices: ["For how long have the people's lives been affected?", "How heavy is the document?", "How much did it cost to produce?", "How many colors are used?"], answer: "For how long have the people's lives been affected?" },
    { s: "GEC 102", q: "The Quantity criterion in assessing historical significance asks what?", choices: ["How many people were affected by the event?", "How many pages does the book have?", "How many photos were taken?", "How many years did research take?"], answer: "How many people were affected by the event?" },
    { s: "GEC 102", q: "The Profundity criterion in assessing historical significance asks what?", choices: ["Was the event superficial or deeply affecting?", "Was the event expensive to record?", "Was the event well-photographed?", "Was the event quickly forgotten?"], answer: "Was the event superficial or deeply affecting?" },
    { s: "GEC 102", q: "If an author wants you to believe, do, or buy something, what is the author's purpose?", choices: ["To persuade", "To inform", "To entertain", "To describe"], answer: "To persuade" },
    { s: "GEC 102", q: "If an author wants to give you information or instructions, what is the author's purpose?", choices: ["To inform", "To entertain", "To persuade", "To narrate"], answer: "To inform" },
    { s: "GEC 102", q: "If an author wants to relate a story or recount past events, what is the author's purpose?", choices: ["To narrate or recount", "To explain", "To describe", "To persuade"], answer: "To narrate or recount" },
    { s: "GEC 102", q: "If an author wants you to visualize or experience what something looks, sounds, or feels like, what is the author's purpose?", choices: ["To describe", "To inform", "To persuade", "To narrate"], answer: "To describe" },
    { s: "GEC 102", q: "If an author wants to tell you how to do something or how something works, what is the author's purpose?", choices: ["To explain", "To entertain", "To persuade", "To describe"], answer: "To explain" },
    { s: "GEC 102", q: "If an author wants to amuse you or for you to enjoy the writing itself, what is the author's purpose?", choices: ["To entertain", "To inform", "To persuade", "To explain"], answer: "To entertain" },
    { s: "GEC 102", q: "What is the first step in identifying the author's purpose?", choices: ["Ask, 'Why did the author create or write this text?'", "Check the price of the book", "Count the number of pages", "Look at the book's color"], answer: "Ask, 'Why did the author create or write this text?'" },
    { s: "GEC 102", q: "If the author's purpose isn't obvious, what should you ask?", choices: ["'How did this make me feel?'", "'How much did this cost?'", "'Who printed this book?'", "'What font was used?'"], answer: "'How did this make me feel?'" },
    { s: "GEC 102", q: "Which clue words show that the author wants to Compare ideas?", choices: ["Both, similarly, in the same way, like, just as", "However, but, on the other hand", "Additional details, superlative adjectives", "Judgment words showing negative opinion"], answer: "Both, similarly, in the same way, like, just as" },
    { s: "GEC 102", q: "Which clue words show that the author wants to Contrast ideas?", choices: ["However, but, dissimilarly, on the other hand", "Both, similarly, just as", "Positive opinions proving a point", "Words that simplify a process"], answer: "However, but, dissimilarly, on the other hand" },
    { s: "GEC 102", q: "If a text contains judgment words that show a negative opinion, what is the author's purpose?", choices: ["To criticize", "To describe", "To compare", "To suggest"], answer: "To criticize" },
    { s: "GEC 102", q: "If a text uses additional details and superlative adjectives, what is the author trying to do?", choices: ["Intensify an idea", "Compare two ideas", "Contrast two ideas", "List ideas without opinion"], answer: "Intensify an idea" },
    { s: "GEC 102", q: "If a text uses positive opinions to prove a point, what is the author's purpose?", choices: ["To suggest an idea", "To criticize an idea", "To contrast ideas", "To identify a list only"], answer: "To suggest an idea" },

    { s: "P.I. 100", q: "Ano ang tawag sa Republic Act No. 1425?", choices: ["The Rizal Law", "The Education Act", "The Civil Code", "The Flag Law"], answer: "The Rizal Law" },
    { s: "P.I. 100", q: "Ano ang pangunahing layunin ng Republic Act No. 1425?", choices: ["Isama sa kurikula ng lahat ng paaralan ang mga kurso tungkol sa buhay, akda, at sulatin ni Jose Rizal", "Ipagbawal ang pag-aaral tungkol kay Rizal", "Palitan ang pangalan ng lahat ng paaralan", "Magtatag ng bagong wikang pambansa"], answer: "Isama sa kurikula ng lahat ng paaralan ang mga kurso tungkol sa buhay, akda, at sulatin ni Jose Rizal" },
    { s: "P.I. 100", q: "Anong mga nobela ni Rizal ang partikular na binanggit sa Republic Act No. 1425?", choices: ["Noli Me Tangere at El Filibusterismo", "Mi Ultimo Adios at Florante at Laura", "Sa Aking Mga Kabata at Noli Me Tangere", "El Filibusterismo at Ibong Adarna"], answer: "Noli Me Tangere at El Filibusterismo" },
    { s: "P.I. 100", q: "Sino ang senador na sumulat/nag-akda ng Rizal Bill?", choices: ["Claro M. Recto", "Jose P. Laurel", "Fidel V. Ramos", "Emilio Cortez"], answer: "Claro M. Recto" },
    { s: "P.I. 100", q: "Sino ang chairman ng committee on Education na nag-sponsor ng bill sa Senado?", choices: ["Senator P. Laurel, Sr.", "Claro M. Recto", "Mona D. Valisno", "Mariano Bengzon"], answer: "Senator P. Laurel, Sr." },
    { s: "P.I. 100", q: "Ano ang isa sa mga Section ng RA 1425 na nag-oobliga sa mga paaralan na magtago ng sapat na bilang ng kopya ng mga akda ni Rizal?", choices: ["Section 2", "Section 1", "Section 4", "Section 6"], answer: "Section 2" },
    { s: "P.I. 100", q: "Ano ang sinasabi ng Section 4 ng RA 1425?", choices: ["Walang bahagi ng batas ang magpapawalang-bisa sa probisyon tungkol sa relihiyosong doktrina sa paaralang pampubliko", "Ipagbabawal ang lahat ng aklat na banyaga", "Ipagbabawal ang lahat ng wikang katutubo", "Palalawakin ang mandatory na paggamit ng Espanyol"], answer: "Walang bahagi ng batas ang magpapawalang-bisa sa probisyon tungkol sa relihiyosong doktrina sa paaralang pampubliko" },
    { s: "P.I. 100", q: "Magkano ang halagang inaprubahang ilaan para sa layunin ng RA 1425?", choices: ["Tatlong daang libong piso (P300,000)", "Isang milyong piso", "Sampung libong piso", "Isang bilyong piso"], answer: "Tatlong daang libong piso (P300,000)" },
    { s: "P.I. 100", q: "Saan nailathala ang RA 1425 noong 1956?", choices: ["Official Gazette, Vol. 52, No. 6", "Manila Bulletin", "Philippine Star", "Philippine Daily Inquirer"], answer: "Official Gazette, Vol. 52, No. 6" },
    { s: "P.I. 100", q: "Sino ang nag-isyu ng Memorandum Order No. 247 na naglalayong ipatupad nang husto ang RA 1425?", choices: ["Pangulong Fidel V. Ramos", "Pangulong Corazon Aquino", "Pangulong Ferdinand Marcos", "Pangulong Joseph Estrada"], answer: "Pangulong Fidel V. Ramos" },
    { s: "P.I. 100", q: "Anong taon inilabas ang Memorandum Order No. 247?", choices: ["1994", "1956", "1998", "1996"], answer: "1994" },
    { s: "P.I. 100", q: "Sino ang lumagda sa CHED Memorandum No. 3, s. 1995 bilang Commissioner Officer-in-Charge?", choices: ["Mona D. Valisno", "Claro M. Recto", "Fidel V. Ramos", "Jose P. Laurel"], answer: "Mona D. Valisno" },
    { s: "P.I. 100", q: "Ayon sa aralin, ano ang isa sa positibong epekto ng Rizal Law?", choices: ["Nagdulot ito ng nationalist reawakening", "Nagpataas ito ng singil sa matrikula", "Nagpasara ito ng mga unibersidad", "Nag-alis ito ng lahat ng kurso sa agham"], answer: "Nagdulot ito ng nationalist reawakening" },
    { s: "P.I. 100", q: "Ayon sa aralin, ano ang isa sa negatibong epekto ng Rizal Law?", choices: ["Nagdulot ito ng mass confusion sa pagitan ng relihiyon at nasyonalismo", "Nagpataas ito ng bilang ng mag-aaral", "Nagpababa ito ng presyo ng aklat", "Wala itong naging epekto"], answer: "Nagdulot ito ng mass confusion sa pagitan ng relihiyon at nasyonalismo" },
    { s: "P.I. 100", q: "Ano ang tinuran ni Dr. Rizal tungkol sa paaralan ayon sa Memorandum Order No. 247?", choices: ["Ang paaralan ang aklat kung saan nakasulat ang kinabukasan ng bansa", "Ang paaralan ay para lamang sa mayayaman", "Ang paaralan ay hindi kailangan ng bansa", "Ang paaralan ay dapat isara"], answer: "Ang paaralan ang aklat kung saan nakasulat ang kinabukasan ng bansa" },
    { s: "P.I. 100", q: "Alin sa mga sumusunod ang isa sa mga kalagayan ng mga Pilipino sa ilalim ng kolonyal na kapangyarihan noong ika-19 na siglo?", choices: ["Racial discrimination", "Kalayaan sa lahat ng bagay", "Pantay na representasyon sa Espanya", "Libreng edukasyon para sa lahat"], answer: "Racial discrimination" },
    { s: "P.I. 100", q: "Ano ang tinatawag sa sistema ng sapilitang paggawa noong panahon ng Espanyol?", choices: ["Polo y servicio", "Cortes", "Frailocracy", "Encomienda lamang"], answer: "Polo y servicio" },
    { s: "P.I. 100", q: "Ano ang tawag sa kapangyarihan ng mga prayle sa relihiyon, edukasyon, at pulitika noong ika-19 na siglo?", choices: ["Frailocracy", "Democracy", "Monarchy", "Theocracy ng Amerikano"], answer: "Frailocracy" },
    { s: "P.I. 100", q: "Alin ang naging kilalang grupo na kinilala sa maraming abuso tulad ng maltreatment sa mga tao noong panahong iyon?", choices: ["Guardia Civil", "Katipunan", "Propaganda Movement", "Cortes"], answer: "Guardia Civil" },
    { s: "P.I. 100", q: "Ano ang tawag ng mga Espanyol sa mga Pilipino noong panahong iyon?", choices: ["Indios", "Ilustrados", "Bangus", "Mestizos"], answer: "Indios" },
    { s: "P.I. 100", q: "Ano naman ang itinawag ng mga Pilipino sa mga Espanyol bilang pagganti?", choices: ["Bangus", "Indios", "Kastila lamang", "Guardia"], answer: "Bangus" },
    { s: "P.I. 100", q: "Sino ang navigator-priest na nakahanap ng ruta pabalik sa Mexico mula sa Pilipinas noong 1565?", choices: ["Andres de Urdaneta", "Ferdinand Magellan", "Miguel Lopez de Legazpi", "Jose Basco y Vargas"], answer: "Andres de Urdaneta" },
    { s: "P.I. 100", q: "Ano ang tawag sa kalakalang dagat sa pagitan ng Manila at Acapulco?", choices: ["Galleon Trade", "Suez Canal Trade", "Silk Road Trade", "Spice Trade"], answer: "Galleon Trade" },
    { s: "P.I. 100", q: "Ano ang tawag sa mga tiket na naghahati sa espasyo ng kargamento sa mga barko ng galleon trade?", choices: ["Boletas", "Cedulas", "Encomiendas", "Cortes"], answer: "Boletas" },
    { s: "P.I. 100", q: "Anong petsa binuksan ang Suez Canal?", choices: ["November 17, 1869", "June 12, 1898", "December 30, 1896", "May 1, 1898"], answer: "November 17, 1869" },
    { s: "P.I. 100", q: "Bakit mahalaga ang pagbukas ng Suez Canal para sa Pilipinas?", choices: ["Pinaikli nito ang oras ng biyahe mula Pilipinas papuntang Espanya", "Pinatigil nito ang lahat ng kalakalan", "Ipinasara nito ang lahat ng daungan", "Winakasan nito ang paggamit ng barko"], answer: "Pinaikli nito ang oras ng biyahe mula Pilipinas papuntang Espanya" },
    { s: "P.I. 100", q: "Sino ang French na namuno sa pagtatayo ng Suez Canal?", choices: ["Ferdinand de Lesseps", "Andres de Urdaneta", "Nicholas Loney", "Jose Basco y Vargas"], answer: "Ferdinand de Lesseps" },
    { s: "P.I. 100", q: "Anong grupo ng mga Pilipino ang lumitaw dahil sa ekonomikong pag-unlad noong ika-19 na siglo?", choices: ["Mga ilustrado", "Mga Guardia Civil", "Mga prayle", "Mga Cortes"], answer: "Mga ilustrado" },
    { s: "P.I. 100", q: "Ano ang tatlong pangunahing produkto na dominante sa Philippine exports noong huling bahagi ng ika-19 na siglo?", choices: ["Tabako, abaka, at asukal", "Bigas, mais, at kape", "Ginto, pilak, at tanso", "Karne, gulay, at prutas"], answer: "Tabako, abaka, at asukal" },
    { s: "P.I. 100", q: "Sino ang British vice consul na tumulong sa pag-unlad ng industriya ng asukal sa Negros?", choices: ["Nicholas Loney", "Ferdinand de Lesseps", "Andres de Urdaneta", "Jose Basco y Vargas"], answer: "Nicholas Loney" },
    { s: "P.I. 100", q: "Ano ang tawag sa mga may-ari ng mga plantasyon ng asukal sa Negros noong huling bahagi ng ika-19 na siglo?", choices: ["Mga sugar barons", "Mga Guardia Civil", "Mga ilustrado lamang", "Mga Cortes"], answer: "Mga sugar barons" },
    { s: "P.I. 100", q: "Sino ang gobernador na nagsimula ng mga inisyatiba para sa kalakalan bago pa man mahirap ang panahon ng Economic Society?", choices: ["Jose Basco y Vargas", "Fidel V. Ramos", "Claro M. Recto", "Andres de Urdaneta"], answer: "Jose Basco y Vargas" },
    { s: "P.I. 100", q: "Ang paglaki ng populasyon ng Chinese mestizo sa Pilipinas noong huling bahagi ng ika-19 na siglo ay lumampas sa ilang bilang?", choices: ["200,000", "20,000", "2,000,000", "2,000"], answer: "200,000" },
    { s: "P.I. 100", q: "Saan ipinanganak si Jose Rizal?", choices: ["Calamba, Laguna", "Manila", "Dapitan", "Biñan, Laguna"], answer: "Calamba, Laguna" },
    { s: "P.I. 100", q: "Anong petsa ipinanganak si Jose Rizal?", choices: ["Hunyo 19, 1861", "Disyembre 30, 1896", "Hunyo 12, 1898", "Mayo 11, 1818"], answer: "Hunyo 19, 1861" },
    { s: "P.I. 100", q: "Ika-ilang anak si Jose Rizal sa labing-isang magkakapatid?", choices: ["Ikapito", "Una", "Ikasampu", "Ikalabing-isa"], answer: "Ikapito" },
    { s: "P.I. 100", q: "Sino ang ama ni Jose Rizal?", choices: ["Francisco Mercado Rizal", "Paciano Rizal", "Domingo Lam-co", "Manuel Alberto"], answer: "Francisco Mercado Rizal" },
    { s: "P.I. 100", q: "Sino ang ina ni Jose Rizal?", choices: ["Teodora Alonso Realonda", "Saturnina Rizal", "Narcisa Rizal", "Josephine Bracken"], answer: "Teodora Alonso Realonda" },
    { s: "P.I. 100", q: "Sino ang full-blooded Chinese na paternal ascendant ng pamilyang Rizal?", choices: ["Domingo Lam-co", "Eugenio Ursua", "Lakandula", "Juan Mercado"], answer: "Domingo Lam-co" },
    { s: "P.I. 100", q: "Sino ang naging asawa ni Domingo Lam-co?", choices: ["Ines de la Rosa", "Cirila Alejandro", "Teodora Alonso", "Regina Ursua"], answer: "Ines de la Rosa" },
    { s: "P.I. 100", q: "Sino ang maternal great-great-grandfather ni Rizal na may lahing Hapon?", choices: ["Eugenio Ursua", "Domingo Lam-co", "Juan Mercado", "Francisco Mercado"], answer: "Eugenio Ursua" },
    { s: "P.I. 100", q: "Sino ang huling Malayan king of Tondo na kinilalang ninuno ni Rizal?", choices: ["Lakandula", "Domingo Lam-co", "Eugenio Ursua", "Juan Mercado"], answer: "Lakandula" },
    { s: "P.I. 100", q: "Ano ang naging pinagmulan ng surname na 'Mercado'?", choices: ["Ang salitang MARKET, na inampon ni Domingo Lam-co", "Isang pangalan ng bayan", "Isang pangalan ng simbahan", "Isang titulo ng hari"], answer: "Ang salitang MARKET, na inampon ni Domingo Lam-co" },
    { s: "P.I. 100", q: "Sinong gobernador-heneral ang nag-utos sa mga pamilyang Pilipino na pumili ng bagong apelyido noong 1849?", choices: ["Gobernador Narciso Clavería", "Fidel V. Ramos", "Andres de Urdaneta", "Claro M. Recto"], answer: "Gobernador Narciso Clavería" },
    { s: "P.I. 100", q: "Ano ang kahulugan ng salitang 'Rizal' sa Espanyol ayon sa aralin?", choices: ["Isang bukid kung saan ang trigo, kahit putol habang berde pa, ay muling tutubo", "Isang uri ng hayop", "Isang uri ng damit", "Isang lugar sa Espanya"], answer: "Isang bukid kung saan ang trigo, kahit putol habang berde pa, ay muling tutubo" },
    { s: "P.I. 100", q: "Sino ang nakatatandang kapatid na lalaki ni Jose Rizal?", choices: ["Paciano Rizal", "Manuel Hidalgo", "Antonio Lopez", "Mariano Herbosa"], answer: "Paciano Rizal" },
    { s: "P.I. 100", q: "Sino ang pinaka-panganay sa magkakapatid na Rizal?", choices: ["Saturnina Rizal", "Narcisa Rizal", "Maria Rizal", "Trinidad Rizal"], answer: "Saturnina Rizal" },
    { s: "P.I. 100", q: "Sino ang pinakabata sa magkakapatid na Rizal?", choices: ["Soledad Rizal", "Josefa Rizal", "Trinidad Rizal", "Concepcion Rizal"], answer: "Soledad Rizal" },
    { s: "P.I. 100", q: "Sino sa magkakapatid ni Rizal ang naging tagapag-ingat ng kanyang huli at pinakamagandang tula?", choices: ["Trinidad Rizal", "Saturnina Rizal", "Narcisa Rizal", "Josefa Rizal"], answer: "Trinidad Rizal" },
    { s: "P.I. 100", q: "Sino sa magkakapatid ni Rizal ang namatay sa edad na tatlo?", choices: ["Concepcion Rizal", "Olympia Rizal", "Lucia Rizal", "Maria Rizal"], answer: "Concepcion Rizal" },
    { s: "P.I. 100", q: "Sino sa magkakapatid ang naging pinaka-edukado sa mga kapatid na babae ni Rizal, na naging guro?", choices: ["Soledad Rizal", "Narcisa Rizal", "Josefa Rizal", "Olympia Rizal"], answer: "Soledad Rizal" },
    { s: "P.I. 100", q: "Anong titulo ang ibinigay ni Rizal kay Paciano sa kanyang unang nobela?", choices: ["Pilosopo Tasio", "Elias", "Ibarra", "Padre Damaso"], answer: "Pilosopo Tasio" },
    { s: "P.I. 100", q: "Sino sa mga tiyuhin ni Rizal ang nagturo sa kanya na magbasa at magtrabaho nang masipag?", choices: ["Tiyo Gregorio", "Tiyo Jose", "Tiyo Manuel", "Tiyo Antonio"], answer: "Tiyo Gregorio" },
    { s: "P.I. 100", q: "Sino sa mga tiyuhin ni Rizal ang naghikayat sa kanya na mag-drawing, mag-sketch, at mag-eskultura?", choices: ["Tiyo Jose", "Tiyo Gregorio", "Tiyo Manuel", "Tiyo Antonio"], answer: "Tiyo Jose" },
    { s: "P.I. 100", q: "Sino sa mga tiyuhin ni Rizal ang naghikayat sa kanya na matutong lumangoy, mag-fencing, at mag-wrestling?", choices: ["Tiyo Manuel", "Tiyo Gregorio", "Tiyo Jose", "Tiyo Antonio"], answer: "Tiyo Manuel" },
    { s: "P.I. 100", q: "Ilang taon si Rizal noong natutunan niya ang alpabeto mula sa kanyang ina?", choices: ["Tatlong taong gulang", "Anim na taong gulang", "Walong taong gulang", "Sampung taong gulang"], answer: "Tatlong taong gulang" },
    { s: "P.I. 100", q: "Sino ang unang guro ni Rizal?", choices: ["Ang kanyang ina, si Teodora Alonso", "Si Leon Monroy", "Si Justiniano Aquino Cruz", "Si Padre Casañas"], answer: "Ang kanyang ina, si Teodora Alonso" },
    { s: "P.I. 100", q: "Sino ang unang tutor ni Rizal sa Espanyol at Latin na namatay makalipas ang limang buwan?", choices: ["Leon Monroy", "Justiniano Aquino Cruz", "Padre Casañas", "Maestro Celestino"], answer: "Leon Monroy" },
    { s: "P.I. 100", q: "Anong taon isinulat ni Rizal ang kanyang unang tula na 'Sa Aking Mga Kabata'?", choices: ["1869", "1861", "1896", "1898"], answer: "1869" },
    { s: "P.I. 100", q: "Ilang taong gulang si Rizal noong isulat ang 'Sa Aking Mga Kabata'?", choices: ["Walong taong gulang", "Tatlong taong gulang", "Sampung taong gulang", "Labindalawang taong gulang"], answer: "Walong taong gulang" },
    { s: "P.I. 100", q: "Ano ang tema ng tula na 'Sa Aking Mga Kabata'?", choices: ["Pag-ibig sa sariling wika", "Pag-ibig sa bayan", "Pag-ibig sa pamilya", "Pag-ibig sa kalikasan"], answer: "Pag-ibig sa sariling wika" },
    { s: "P.I. 100", q: "Saan nag-aral si Rizal para sa kanyang unang pormal na pribadong paaralan?", choices: ["Biñan", "Manila", "Dapitan", "Hong Kong"], answer: "Biñan" },
    { s: "P.I. 100", q: "Sino ang mahigpit na guro ni Rizal sa Biñan?", choices: ["Justiniano Aquino Cruz", "Leon Monroy", "Padre Casañas", "Rufino Collantes"], answer: "Justiniano Aquino Cruz" },
    { s: "P.I. 100", q: "Sino ang sumamang kapatid ni Rizal noong pumunta siya sa Biñan upang mag-aral?", choices: ["Paciano", "Narcisa", "Saturnina", "Trinidad"], answer: "Paciano" },
    { s: "P.I. 100", q: "Anong apat na R ang binanggit bilang katangian ng maagang edukasyon ni Rizal?", choices: ["Reading, writing, arithmetic, at religion", "Reading, running, writing, at religion", "Riding, writing, arithmetic, at reasoning", "Reading, arithmetic, running, at rowing"], answer: "Reading, writing, arithmetic, at religion" },
    { s: "P.I. 100", q: "Sino ang bully na kinaaway ni Rizal noong unang araw niya sa paaralan sa Biñan?", choices: ["Pedro", "Andres Salandanan", "Leandro", "Justiniano"], answer: "Pedro" },
    { s: "P.I. 100", q: "Sino ang kaklaseng humamon kay Rizal sa arm-wrestling matches sa Biñan?", choices: ["Andres Salandanan", "Pedro", "Leandro", "Justiniano"], answer: "Andres Salandanan" },
    { s: "P.I. 100", q: "Saan nagpunta si Rizal at ang kanyang ama noong Hunyo 1868 upang tuparin ang panata ng kanyang ina?", choices: ["Antipolo", "Dapitan", "Hong Kong", "Biñan"], answer: "Antipolo" },
    { s: "P.I. 100", q: "Sino ang kapatid ni Rizal na kanilang binisita sa La Concordia College sa Sta. Ana?", choices: ["Saturnina", "Narcisa", "Maria", "Josefa"], answer: "Saturnina" },

    { s: "KOMFIL", q: "Ano ang tinatawag na komunikasyon kapag isinasaalang-alang ang partikular na kalagayan kung saan ito nagaganap?", choices: ["Kontekstwalisadong komunikasyon", "Impormal na usapan", "Digital na mensahe", "Sekretong wika"], answer: "Kontekstwalisadong komunikasyon" },
    { s: "KOMFIL", q: "Ano ang ginamit ng mga sinaunang Pilipino bago pa dumating ang mga mananakop upang ipasa ang kaalaman at kultura?", choices: ["Pasalitang komunikasyon, simbolo, kilos, awit, at ritwal", "Email at social media", "Telepono at telegrama", "Pahayagang Espanyol"], answer: "Pasalitang komunikasyon, simbolo, kilos, awit, at ritwal" },
    { s: "KOMFIL", q: "Ano ang naipapasa sa pamamagitan ng pakikipag-usap at pagkukuwento noong sinaunang panahon?", choices: ["Mga alamat, epiko, kasaysayan, paniniwala, kaugalian, at pagpapahalaga", "Mga batas ng gobyerno lamang", "Mga aklat-aralin sa paaralan", "Mga kontrata sa negosyo"], answer: "Mga alamat, epiko, kasaysayan, paniniwala, kaugalian, at pagpapahalaga" },
    { s: "KOMFIL", q: "Bukod sa pagpapalitan ng mensahe, ano pa ang ginagampanan ng komunikasyon sa sinaunang pamayanan?", choices: ["Pagpapanatili ng kultura at pagkakakilanlan ng komunidad", "Pagpapalaki lamang ng populasyon", "Pagpapabilis ng industriya", "Pagbuo ng makabagong teknolohiya"], answer: "Pagpapanatili ng kultura at pagkakakilanlan ng komunidad" },
    { s: "KOMFIL", q: "Anong wika ang naging mahalaga sa pamahalaan, relihiyon, at edukasyon noong panahon ng mga Espanyol?", choices: ["Wikang Espanyol", "Wikang Ingles", "Wikang Hapon", "Wikang Intsik"], answer: "Wikang Espanyol" },
    { s: "KOMFIL", q: "Sa kabila ng paggamit ng Espanyol sa mga institusyon, ano ang patuloy na ginagamit ng mga Pilipino sa pang-araw-araw na pakikipag-ugnayan?", choices: ["Ang kanilang mga katutubong wika", "Wikang Latin", "Wikang Pranses", "Wikang Aleman"], answer: "Ang kanilang mga katutubong wika" },
    { s: "KOMFIL", q: "Ano ang ginamit na instrumento ng mga Espanyol para sa pagpapalaganap ng relihiyon at pamamahala?", choices: ["Ang komunikasyon", "Ang salapi", "Ang digmaan lamang", "Ang agrikultura"], answer: "Ang komunikasyon" },
    { s: "KOMFIL", q: "Ano ang natutuhan ng ilang Pilipino sa pag-usbong ng pahayagan at akdang pampanitikan?", choices: ["Gamitin ang pagsulat at publikasyon para ipahayag ang saloobin tungkol sa lipunan", "Gamitin ang wikang banyaga lamang", "Kalimutan ang kanilang katutubong kultura", "Sumunod na lamang sa lahat ng patakaran"], answer: "Gamitin ang pagsulat at publikasyon para ipahayag ang saloobin tungkol sa lipunan" },
    { s: "KOMFIL", q: "Sa panahon ng pag-usbong ng kilusang makabayan, para saan naging mahalagang kasangkapan ang komunikasyon?", choices: ["Pagpapalaganap ng ideya tungkol sa kalayaan, pagkakakilanlan, at pagbabago sa lipunan", "Pagbebenta ng produkto sa ibang bansa", "Pagpapalawak lamang ng negosyo", "Pagtatayo ng mga simbahan"], answer: "Pagpapalaganap ng ideya tungkol sa kalayaan, pagkakakilanlan, at pagbabago sa lipunan" },
    { s: "KOMFIL", q: "Alin sa mga sumusunod ang naging daan upang maipahayag ang mga ideyang makabayan noong panahon ng kilusang makabayan?", choices: ["Mga pahayagan, sanaysay, liham, at talumpati", "Mga larong online lamang", "Mga pelikulang banyaga", "Mga aplikasyong pang-negosyo"], answer: "Mga pahayagan, sanaysay, liham, at talumpati" },
    { s: "KOMFIL", q: "Anong wika ang naging malawak ang paggamit sa panahon ng mga Amerikano, lalo na sa edukasyon at pamahalaan?", choices: ["Wikang Ingles", "Wikang Espanyol", "Wikang Intsik", "Wikang Arabic"], answer: "Wikang Ingles" },
    { s: "KOMFIL", q: "Ano ang naging mahalagang usapin sa panahon ng mga Amerikano tungkol sa komunikasyon ng mga Pilipino?", choices: ["Ang pagkakaroon ng isang wikang maaaring magsilbing daan ng komunikasyon ng iba't ibang pangkat ng Pilipino", "Ang pagsasara ng lahat ng paaralan", "Ang paggamit lamang ng senyas", "Ang pagbabawal sa lahat ng wikang katutubo"], answer: "Ang pagkakaroon ng isang wikang maaaring magsilbing daan ng komunikasyon ng iba't ibang pangkat ng Pilipino" },
    { s: "KOMFIL", q: "Anong taon pinili ang Tagalog bilang batayan ng wikang pambansa?", choices: ["1937", "1898", "1946", "1987"], answer: "1937" },
    { s: "KOMFIL", q: "Bakit mahalaga ang pagbuo ng pambansang wika ayon sa aralin?", choices: ["Dahil may kaugnayan ito sa pagkakakilanlan, kultura, kasaysayan, at pagkakaisa ng bansa", "Dahil ito lamang ang pinakamadaling wika", "Dahil ito ang pinakaunang wikang ginamit sa daigdig", "Dahil ito ang ginagamit sa lahat ng bansa"], answer: "Dahil may kaugnayan ito sa pagkakakilanlan, kultura, kasaysayan, at pagkakaisa ng bansa" },
    { s: "KOMFIL", q: "Saan ginagamit ang Filipino sa larangan ng edukasyon ayon sa binanggit sa aralin?", choices: ["Talakayan sa klase, presentasyon, pananaliksik, pagsulat, pakikipanayam, at pulong", "Sa mga laro lamang sa labas ng paaralan", "Sa pagluluto lamang", "Sa paggawa ng kotse"], answer: "Talakayan sa klase, presentasyon, pananaliksik, pagsulat, pakikipanayam, at pulong" },
    { s: "KOMFIL", q: "Bakit higit na nakikita ang kahalagahan ng konteksto sa larangan ng edukasyon?", choices: ["Dahil iba ang paraan ng paggamit ng Filipino sa pormal na presentasyon kumpara sa impormal na pakikipag-usap", "Dahil pareho lamang lagi ang gamit ng wika saan man", "Dahil hindi na kailangan pumili ng salita", "Dahil hindi mahalaga ang tono sa pagsasalita"], answer: "Dahil iba ang paraan ng paggamit ng Filipino sa pormal na presentasyon kumpara sa impormal na pakikipag-usap" },
    { s: "KOMFIL", q: "Ano ang dapat piliin ng isang tao ayon sa aralin batay sa sitwasyon at kausap?", choices: ["Angkop na salita, tono, antas ng wika, at paraan ng pagpapahayag", "Kahit anong salitang gusto niya", "Wikang banyaga lamang", "Salitang hindi nauunawaan ng kausap"], answer: "Angkop na salita, tono, antas ng wika, at paraan ng pagpapahayag" },
    { s: "KOMFIL", q: "Bakit naging mas komplikado ang komunikasyon sa kasalukuyang panahon?", choices: ["Dahil sa mabilis na pag-unlad ng teknolohiya", "Dahil naglaho na ang lahat ng wika", "Dahil bawal na ang pagsasalita", "Dahil walang gumagamit ng internet"], answer: "Dahil sa mabilis na pag-unlad ng teknolohiya" },
    { s: "KOMFIL", q: "Alin sa mga sumusunod ay HINDI kabilang sa mga digital platform na binanggit sa aralin?", choices: ["Palengke", "Social media", "Email", "Video conferencing"], answer: "Palengke" },
    { s: "KOMFIL", q: "Bakit kailangang maging sensitibo ang isang tao sa konteksto ng kanyang mensahe sa makabagong panahon?", choices: ["Dahil maaaring hindi angkop gamitin sa iba't ibang tao ang paraan ng pagsulat na ginagamit sa kaibigan", "Dahil bawal nang magsulat ng mensahe", "Dahil parehas lang lagi ang paraan ng pagsulat kahit kanino", "Dahil hindi na kailangang mag-isip bago magsulat"], answer: "Dahil maaaring hindi angkop gamitin sa iba't ibang tao ang paraan ng pagsulat na ginagamit sa kaibigan" },
    { s: "KOMFIL", q: "Ano ang tumutukoy sa mga salik na nakapaligid sa isang sitwasyong pangkomunikasyon?", choices: ["Konteksto", "Bokabularyo", "Gramatika", "Ponolohiya"], answer: "Konteksto" },
    { s: "KOMFIL", q: "Alin sa mga sumusunod ay isa sa mga salik na kabilang sa konteksto ayon sa aralin?", choices: ["Kultura", "Kulay ng damit", "Uri ng sapatos", "Petsa ng kapanganakan"], answer: "Kultura" },
    { s: "KOMFIL", q: "Ano ang tumutukoy sa 'lugar' bilang salik ng konteksto?", choices: ["Kung saan nagaganap ang komunikasyon", "Ang layunin ng mensahe", "Ang wikang ginagamit", "Ang relasyon ng mga kausap"], answer: "Kung saan nagaganap ang komunikasyon" },
    { s: "KOMFIL", q: "Ano ang tumutukoy sa 'panahon' bilang salik ng konteksto?", choices: ["Ang kalagayan o yugto kung kailan nagaganap ang komunikasyon", "Ang lugar ng pag-uusap", "Ang wikang ginagamit", "Ang bilang ng kalahok"], answer: "Ang kalagayan o yugto kung kailan nagaganap ang komunikasyon" },
    { s: "KOMFIL", q: "Ano ang halimbawa ng 'relasyon ng mga kalahok' bilang salik ng konteksto?", choices: ["Guro at estudyante, o empleyado at supervisor", "Uri ng gadyet na ginagamit", "Presyo ng produkto", "Kulay ng logo"], answer: "Guro at estudyante, o empleyado at supervisor" },
    { s: "KOMFIL", q: "Ano ang tumutukoy sa 'layunin' bilang salik ng konteksto?", choices: ["Kung ang komunikasyon ay para magbigay ng impormasyon, manghikayat, o magpahayag ng damdamin", "Ang lugar kung saan nagaganap ang usapan", "Ang oras ng pagsasalita", "Ang kulay ng damit ng nagsasalita"], answer: "Kung ang komunikasyon ay para magbigay ng impormasyon, manghikayat, o magpahayag ng damdamin" },
    { s: "KOMFIL", q: "Ano ang tumutukoy sa 'daluyan' bilang salik ng konteksto?", choices: ["Maaaring pasalita, pasulat, harapan, o digital", "Ang bilang ng salita sa pangungusap", "Ang uri ng papel na ginamit", "Ang lugar ng pagpupulong lamang"], answer: "Maaaring pasalita, pasulat, harapan, o digital" },
    { s: "KOMFIL", q: "Ano ang naitutulong ng pag-unawa sa mga salik ng konteksto ayon sa aralin?", choices: ["Nagiging mas malinaw, angkop, epektibo, at responsableng tagapagsalita o tagapagsulat ang isang tao", "Nawawalan ng kahulugan ang mensahe", "Naiiwasan ang lahat ng pag-uusap", "Nagiging mas mahirap unawain ang mensahe"], answer: "Nagiging mas malinaw, angkop, epektibo, at responsableng tagapagsalita o tagapagsulat ang isang tao" }
  ];

  /* ============ NEW FEATURE: 🎮 Game Mode / Subject Selection ============
     The questionBank above is the SINGLE SOURCE OF TRUTH for which subjects
     are selectable. We derive the subject list and per-subject question
     pools directly from it, so a subject only ever becomes a mode if it
     actually has questions right now. Nothing here is hardcoded — if a
     subject is removed from questionBank (or one is added later), the mode
     list, the Game Protocol text, and the HUD stream label all update
     automatically with zero other changes required. */
  const subjectPoolMap = new Map();
  questionBank.forEach((item) => {
    if (!subjectPoolMap.has(item.s)) subjectPoolMap.set(item.s, []);
    subjectPoolMap.get(item.s).push(item);
  });
  // Preserves first-appearance order from questionBank (e.g. ITEC 101, ITEC
  // 102, GEC 101, GEC 102, P.I. 100, KOMFIL). A subject with zero questions
  // simply never appears in this Map, so it can never produce a mode.
  const AVAILABLE_SUBJECTS = Array.from(subjectPoolMap.keys());

  const RANDOM_MODE_ID = "RANDOM";

  // Short, accurate per-subject blurbs. Any subject not listed here (e.g. a
  // newly-added one) automatically falls back to a safe generic description
  // instead of an invented one.
  const SUBJECT_DESCRIPTIONS = {
    "ITEC 101": "Review questions from ITEC 101 only.",
    "ITEC 102": "Review questions from ITEC 102 only.",
    "GEC 101": "Review questions from GEC 101 only.",
    "GEC 102": "Review questions from GEC 102 only.",
    "P.I. 100": "Review questions from P.I. 100 only.",
    "KOMFIL": "Review questions from KOMFIL only."
  };

  // Centralized mode config: one RANDOM entry + one entry per real subject.
  // Everything downstream (mode selector cards, pool filtering, HUD stream
  // chip, dynamic Game Protocol, Boss Question subject) reads from this
  // single array instead of duplicating the subject list anywhere else.
  const GAME_MODES = [
    {
      id: RANDOM_MODE_ID,
      label: "RANDOM / ALL SUBJECTS",
      icon: "\u{1F3B2}",
      description: "Mixed questions from all available subjects.",
      streamLabel: "RANDOM_ALL_SUBJECTS",
      subjects: AVAILABLE_SUBJECTS.slice()
    },
    ...AVAILABLE_SUBJECTS.map((subject) => ({
      id: subject,
      label: subject,
      icon: "\u{1F4D8}",
      description: SUBJECT_DESCRIPTIONS[subject] || `Questions from ${subject} only.`,
      streamLabel: subject.replace(/[^A-Za-z0-9]+/g, "_").toUpperCase(),
      subjects: [subject]
    }))
  ];

  function getModeConfig(modeId) {
    return GAME_MODES.find((m) => m.id === modeId) || GAME_MODES[0];
  }

  /* ---------------- Per-mode leaderboard board keys ----------------
     Firebase path segment under arena_scores/{boardKey}/{usernameKey}.
     RANDOM maps to "random". Subject names are slugified so path segments
     stay safe (no spaces/dots). This keeps each mode's Top list isolated. */
  function modeToBoardKey(modeId) {
    if (modeId === LEADERBOARD_DAILY_ID || modeId === "daily") {
      return DAILY_LEADERBOARD_PREFIX + getLocalDateKey();
    }
    if (modeId === "season_midterms" || modeId === "season_finals") {
      return modeId;
    }
    const mode = getModeConfig(modeId);
    if (mode.id === RANDOM_MODE_ID) return "random";
    return String(mode.id || "random")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40) || "random";
  }

  function getAllBoardKeys() {
    return GAME_MODES.map((m) => modeToBoardKey(m.id));
  }

  function getModeIdFromBoardKey(boardKey) {
    const found = GAME_MODES.find((m) => modeToBoardKey(m.id) === boardKey);
    return found ? found.id : RANDOM_MODE_ID;
  }


  const state = {
    username: "",
    avatar: AVATARS[0],
    score: 0,
    lives: MAX_LIVES,
    currentQuestion: null,
    activePool: [],
    currentIndex: 0,
    locked: false,
    streak: 0,
    timer: QUESTION_TIME_LIMIT,
    timerId: null,
    hasUsed5050: false,
    hasUsedSkip: false,
    hiddenChoices: new Set(),
    sessionLocked: false,
    bestScore: 0,
    ending: false,
    allowBlurPenalty: true,
    confettiStopper: null,
    victoryAchieved: false,
    lastEndReason: "",
    mistakes: [],
    displayedScore: 0,
    scoreAnimId: null,
    milestonesHit: new Set(),
    /* NEW FEATURE: Boss Question state */
    bossQuestionActive: false,
    bossHit: new Set(),
    activeTimeLimit: QUESTION_TIME_LIMIT,
    /* NEW FEATURE: sound mute toggle */
    muted: false,
    /* NEW FEATURE: Game Mode / Subject Selection — defaults to the existing
       "Infinite Randomized" experience so nothing changes for a player who
       never touches the selector. */
    selectedMode: RANDOM_MODE_ID,
    /* Which mode's leaderboard is currently shown in the Leaderboard modal.
       Independent of gameplay selectedMode so a player can browse boards
       without changing their next-run mode. */
    leaderboardMode: RANDOM_MODE_ID,
    /* PHASE 1: Practice Mode + Retry Mistakes */
    isPractice: false,
    isDaily: false,
    isRetryMistakes: false,
    retryQuestionPool: [],
    dailyDateKey: "",
    runType: "ranked",
    bestStreak: 0,
    answeredCount: 0,
    correctCount: 0
  };

  // Short terminal-style lines shown on each 25-point milestone overlay.
  const milestoneLines = [
    "SYSTEM CHECKPOINT SAVED",
    "COMPILE SUCCESSFUL",
    "BUFFER UPGRADED",
    "ACHIEVEMENT UNLOCKED",
    "PROCESS BOOSTED",
    "LEVEL UP DETECTED",
    "CACHE OPTIMIZED",
    "PATCH APPLIED"
  ];

  let elements = null;
  let initialized = false;
  let fallbackScores = [];
  let initAttempts = 0;
  const MAX_INIT_ATTEMPTS = 40;

  function $(id) { return document.getElementById(id); }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function containsBadWord(text) {
    const lowered = text.toLowerCase();
    return badWords.some((word) => lowered.includes(word));
  }

  function sanitizeUsername(raw) {
    // Strict validation: letters and spaces only — no numbers, symbols, or emojis.
    return raw
      .replace(/[^a-zA-Z ]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 22);
  }

  function usernameKey(name) {
    return String(name || "")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "_")
      .replace(/[^a-z_]/g, "")
      .slice(0, 22);
  }

  function shuffle(arr) {
    const copy = arr.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function getRandomQuote() {
    return motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];
  }

  function formatQuote(quote) {
    return quote.author ? `"${quote.text}" \u2014 ${quote.author}` : `"${quote.text}"`;
  }

  /* ============ NEW FEATURE: 🏅 Dynamic Academic Badges / Ranks ============
     Rank title changes every 10 points, all the way up to the 500-point
     Valedictorian cap. Checked top-down via .find() — no lag, no switch
     statement needed. */
  const RANK_TABLE = [
    { min: 500, tier: "LEGEND", title: "BSCS 1-A Valedictorian \u{1F393}" },
    { min: 450, tier: "GOD MODE", title: "Cyber Dean's Lister \u{1F451}" },
    { min: 400, tier: "EXPERT", title: "Full-Stack Wizard \u{1F52E}" },
    { min: 300, tier: "EXPERT", title: "AI Prompt Engineer \u{1F9D9}\u200D\u2642\uFE0F" },
    { min: 250, tier: "SENIOR", title: "Database Manipulator \u{1F5C4}\uFE0F" },
    { min: 200, tier: "SENIOR", title: "Spaghetti Code Chef \u{1F35D}" },
    { min: 150, tier: "JUNIOR", title: "Pointer Survivor \u{1F4CD}" },
    { min: 100, tier: "JUNIOR", title: "OOP Architect \u{1F3DB}\uFE0F" },
    { min: 50, tier: "JUNIOR", title: "Array Master \u{1F522}" },
    { min: 40, tier: "SOPHOMORE", title: "StackOverflow Plagiarist \u{1F4DA}" },
    { min: 30, tier: "SOPHOMORE", title: "Git Commit Spammer \u{1F680}" },
    { min: 20, tier: "FRESHMAN", title: "Compiler Bully \u{1F916}" },
    { min: 10, tier: "FRESHMAN", title: "Syntax Error Enjoyer \u{1F41B}" },
    { min: 0, tier: "FRESHMAN", title: "Hello World Installer \u{1F9D1}\u200D\u{1F4BB}" }
  ];

  function getRankEntry(score) {
    const safeScore = Math.max(0, Number(score) || 0);
    return RANK_TABLE.find((entry) => safeScore >= entry.min) || RANK_TABLE[RANK_TABLE.length - 1];
  }

  function getRank(score) {
    const entry = getRankEntry(score);
    return `[${entry.tier}] ${entry.title}`;
  }

  /* ============ NEW FEATURE: 🔊 Retro Web Audio FX (no MP3s) ============
     One shared AudioContext, three tiny OscillatorNode-based chiptune FX.
     Everything routes through playTone()/isSoundBlocked() so the mute
     toggle silences all of it instantly with zero extra checks elsewhere. */
  let sharedAudioCtx = null;

  function getAudioCtx() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      if (!sharedAudioCtx) sharedAudioCtx = new Ctx();
      if (sharedAudioCtx.state === "suspended") sharedAudioCtx.resume();
      return sharedAudioCtx;
    } catch (error) {
      console.warn("[Arena] Web Audio unavailable:", error);
      return null;
    }
  }

  function isSoundBlocked() {
    return state.muted;
  }

  function playTone(ctx, freq, startAt, duration, type, gainLevel) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || "square";
    osc.frequency.setValueAtTime(freq, startAt);
    gain.gain.setValueAtTime(gainLevel != null ? gainLevel : 0.07, startAt);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(startAt);
    osc.stop(startAt + duration + 0.02);
    return osc;
  }

  // Quick high 8-bit "beep" — correct answer.
  function playCorrectBeep() {
    if (isSoundBlocked()) return;
    const ctx = getAudioCtx();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      playTone(ctx, 880, now, 0.09, "square", 0.06);
      playTone(ctx, 1320, now + 0.08, 0.12, "square", 0.06);
    } catch (error) {
      console.warn("[Arena] Correct-beep skipped:", error);
    }
  }

  // Short descending glitch/buzz — wrong answer or timeout.
  function playWrongBuzz() {
    if (isSoundBlocked()) return;
    const ctx = getAudioCtx();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(70, now + 0.28);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.32);
    } catch (error) {
      console.warn("[Arena] Wrong-buzz skipped:", error);
    }
  }

  // Short digital victory fanfare — every 25-score milestone (and graduation win).
  function playFanfare(big) {
    if (isSoundBlocked()) return;
    const ctx = getAudioCtx();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const notes = big
        ? [523.25, 659.25, 783.99, 1046.5]
        : [659.25, 830.61, 987.77];
      notes.forEach((freq, i) => {
        playTone(ctx, freq, now + i * 0.12, 0.16, "triangle", 0.065);
      });
    } catch (error) {
      console.warn("[Arena] Fanfare skipped:", error);
    }
  }

  function loadMutePreference() {
    try {
      return window.localStorage.getItem(SOUND_MUTE_KEY) === "1";
    } catch (error) {
      return false;
    }
  }

  function saveMutePreference(muted) {
    try {
      window.localStorage.setItem(SOUND_MUTE_KEY, muted ? "1" : "0");
    } catch (error) {
      /* ignore — storage may be unavailable (private mode, etc.) */
    }
  }

  function applyMuteButtonState() {
    if (!elements || !elements.muteToggleBtn) return;
    elements.muteToggleBtn.textContent = state.muted ? "\u{1F507}" : "\u{1F50A}";
    elements.muteToggleBtn.classList.toggle("is-muted", state.muted);
    elements.muteToggleBtn.setAttribute("aria-pressed", state.muted ? "true" : "false");
  }

  function toggleMute() {
    state.muted = !state.muted;
    saveMutePreference(state.muted);
    applyMuteButtonState();
    if (!state.muted) {
      // Little confirmation blip so the player knows sound is back on.
      playCorrectBeep();
    }
  }

  /* ---------------- Bind helper: click + touch without double-fire ---------------- */
  /* Ignores touchend after finger moved (scroll) so accidental game taps stop. */
  function bindTap(el, handler) {
    if (!el) return;
    let touched = false;
    let startX = 0;
    let startY = 0;
    let moved = false;
    const MOVE_THRESH = 14;

    el.addEventListener(
      "touchstart",
      (event) => {
        const t = event.changedTouches && event.changedTouches[0];
        if (!t) return;
        startX = t.clientX;
        startY = t.clientY;
        moved = false;
      },
      { passive: true }
    );
    el.addEventListener(
      "touchmove",
      (event) => {
        const t = event.changedTouches && event.changedTouches[0];
        if (!t) return;
        if (
          Math.abs(t.clientX - startX) > MOVE_THRESH ||
          Math.abs(t.clientY - startY) > MOVE_THRESH
        ) {
          moved = true;
        }
      },
      { passive: true }
    );
    el.addEventListener(
      "touchend",
      (event) => {
        if (moved) return;
        touched = true;
        handler(event);
        window.setTimeout(() => {
          touched = false;
        }, 400);
      },
      { passive: false }
    );
    el.addEventListener("click", (event) => {
      if (touched) return;
      handler(event);
    });
  }

  /* Require two taps within window — reduces accidental mode/LB switches on phone. */
  function bindDoubleTap(el, handler, gapMs) {
    if (!el) return;
    const gap = typeof gapMs === "number" ? gapMs : 420;
    let lastTap = 0;
    let armed = false;
    const armClass = "double-tap-armed";
    let startX = 0;
    let startY = 0;
    let moved = false;
    const MOVE_THRESH = 14;

    el.addEventListener(
      "touchstart",
      (event) => {
        const t = event.changedTouches && event.changedTouches[0];
        if (!t) return;
        startX = t.clientX;
        startY = t.clientY;
        moved = false;
      },
      { passive: true }
    );
    el.addEventListener(
      "touchmove",
      (event) => {
        const t = event.changedTouches && event.changedTouches[0];
        if (!t) return;
        if (
          Math.abs(t.clientX - startX) > MOVE_THRESH ||
          Math.abs(t.clientY - startY) > MOVE_THRESH
        ) {
          moved = true;
        }
      },
      { passive: true }
    );

    const onTap = (event) => {
      if (event.type === "touchend" && moved) return;
      event.preventDefault();
      const now = Date.now();
      if (armed && now - lastTap <= gap) {
        armed = false;
        lastTap = 0;
        el.classList.remove(armClass);
        handler(event);
        return;
      }
      armed = true;
      lastTap = now;
      el.classList.add(armClass);
      window.setTimeout(() => {
        if (Date.now() - lastTap >= gap - 20) {
          armed = false;
          el.classList.remove(armClass);
        }
      }, gap);
    };

    let touched = false;
    el.addEventListener(
      "touchend",
      (event) => {
        touched = true;
        onTap(event);
        window.setTimeout(() => { touched = false; }, 400);
      },
      { passive: false }
    );
    el.addEventListener("click", (event) => {
      if (touched) return;
      onTap(event);
    });
  }

  /* ---------------- Welcome modal ---------------- */
  function initWelcomeModal() {
    const modal = $("welcomeModal");
    const quoteEl = $("welcomeQuote");
    const enterBtn = $("welcomeEnterBtn");
    if (!modal || !quoteEl || !enterBtn) return;

    const quote = cyberpunkGreetingQuotes[Math.floor(Math.random() * cyberpunkGreetingQuotes.length)];
    quoteEl.textContent = quote.text;

    // Developer credit is always RST only (never full personal name).
    const sig = $("welcomeSignature") || document.querySelector(".modal-signature");
    if (sig) sig.textContent = "— Built by RST";

    const dismiss = () => {
      modal.setAttribute("hidden", "hidden");
      document.body.classList.remove("no-scroll");
    };

    document.body.classList.add("no-scroll");
    bindTap(enterBtn, (event) => {
      event.preventDefault();
      dismiss();
    });
  }

  /* ---------------- Generic on-demand pop-up modals ---------------- */
  /* Powers the "View Game Protocol" and "View Leaderboard" buttons: any
     element with [data-open-modal="someId"] opens #someId, and any element
     with [data-close-modal="someId"] (or the generic .modal-close-btn)
     closes it. Both modals default to hidden and only ever appear as a
     clean pop-up on top of everything -- never inline in the page flow. */
  function openModal(id) {
    const modal = $(id);
    if (!modal) return;
    modal.removeAttribute("hidden");
    document.body.classList.add("no-scroll");
    if (id === "leaderboardModal") {
      // Default the viewed board to the player's currently selected Game Mode
      // so the list matches the run they are about to (or just did) play.
      state.leaderboardMode = state.selectedMode || RANDOM_MODE_ID;
      renderLeaderboard();
    }
    // NEW FEATURE: Game Protocol is dynamic — always reflect whichever mode
    // is currently selected (or the default) the instant the modal opens.
    if (id === "protocolModal") {
      renderProtocolContent();
    }
  }

  function closeModal(id) {
    const modal = $(id);
    if (!modal) return;
    modal.setAttribute("hidden", "hidden");
    document.body.classList.remove("no-scroll");
  }

  function initModalTriggers() {
    document.querySelectorAll("[data-open-modal]").forEach((btn) => {
      bindTap(btn, (event) => {
        event.preventDefault();
        openModal(btn.getAttribute("data-open-modal"));
      });
    });
    document.querySelectorAll("[data-close-modal]").forEach((btn) => {
      bindTap(btn, (event) => {
        event.preventDefault();
        closeModal(btn.getAttribute("data-close-modal"));
      });
    });
  }

  /* ---------------- Binary matrix ambient background ---------------- */
  function initMatrixBackground() {
    const host = $("matrixBg");
    if (!host) return;
    const colCount = Math.max(10, Math.floor(window.innerWidth / 26));
    const frag = document.createDocumentFragment();
    for (let i = 0; i < colCount; i += 1) {
      const col = document.createElement("div");
      col.className = "matrix-col";
      col.style.left = `${(i / colCount) * 100}%`;
      col.style.animationDuration = `${8 + Math.random() * 10}s`;
      col.style.animationDelay = `${Math.random() * -12}s`;
      let stream = "";
      const rows = 40 + Math.floor(Math.random() * 30);
      for (let r = 0; r < rows; r += 1) {
        stream += Math.round(Math.random()) + "\n";
      }
      col.textContent = stream;
      frag.appendChild(col);
    }
    host.appendChild(frag);
  }

  /* ---------------- Mobile nav + smooth scroll ---------------- */
  function initNav() {
    const toggle = $("navToggle");
    const links = $("navLinks");
    if (toggle && links) {
      bindTap(toggle, (event) => {
        event.preventDefault();
        const open = links.classList.toggle("open");
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
      });
    }

    const menuOnlyIds = {
      "section-status": true,
      "vision-mission": true,
      "officers": true,
      "freshmen": true,
      "quick-links": true
    };

    document.querySelectorAll(".js-smooth, .nav-links a").forEach((a) => {
      a.addEventListener("click", (event) => {
        const href = a.getAttribute("href") || "";
        if (!href.startsWith("#")) return;
        const target = document.querySelector(href);
        if (!target) return;
        event.preventDefault();

        // Classmates: reveal menu-only sections that are hidden from main scroll
        const id = href.slice(1);
        if (menuOnlyIds[id] && (isClassmate() || isAdmin())) {
          document.querySelectorAll(".menu-revealed").forEach((el) => {
            if (el !== target) el.classList.remove("menu-revealed");
          });
          target.classList.add("menu-revealed");
        }
        // Opening Officer Updates clears the "new update" badge
        if (id === "officer-updates" && (isClassmate() || isAdmin())) {
          fetchOfficerUpdates().then((rows) => {
            if (rows[0]) markOfficerUpdatesSeen(rows[0].ts);
            else markOfficerUpdatesSeen(Date.now());
          }).catch(() => markOfficerUpdatesSeen(Date.now()));
        }

        // Allow layout to apply before scrolling
        window.requestAnimationFrame(() => {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        });

        if (links) {
          links.classList.remove("open");
          if (toggle) toggle.setAttribute("aria-expanded", "false");
        }
        try {
          history.replaceState(null, "", href);
        } catch (error) {
          /* ignore */
        }
      });
    });
  }

  /* ---------------- Avatar picker ---------------- */
  function initAvatarGrid() {
    const grid = $("avatarGrid");
    if (!grid) return;
    grid.innerHTML = "";
    AVATARS.forEach((emoji, index) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "avatar-opt" + (index === 0 ? " selected" : "");
      btn.textContent = emoji;
      btn.setAttribute("role", "radio");
      btn.setAttribute("aria-checked", index === 0 ? "true" : "false");
      bindTap(btn, (event) => {
        event.preventDefault();
        grid.querySelectorAll(".avatar-opt").forEach((el) => {
          el.classList.remove("selected");
          el.setAttribute("aria-checked", "false");
        });
        btn.classList.add("selected");
        btn.setAttribute("aria-checked", "true");
        state.avatar = emoji;
      });
      grid.appendChild(btn);
    });
    state.avatar = AVATARS[0];
  }

  /* ---------------- NEW FEATURE: Game Mode / Subject Selection ---------------- */
  // Builds one selectable card per GAME_MODES entry (RANDOM + every subject
  // that actually has questions). Mirrors the avatar picker's interaction
  // pattern (tap-to-select, single selected state, radiogroup semantics)
  // so it feels like it was always part of the arena.
  function initModeSelector() {
    const grid = elements.modeGrid;
    if (!grid) return;
    grid.innerHTML = "";

    GAME_MODES.forEach((mode) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "mode-card" + (mode.id === state.selectedMode ? " selected" : "");
      btn.setAttribute("role", "radio");
      btn.setAttribute("aria-checked", mode.id === state.selectedMode ? "true" : "false");
      btn.dataset.modeId = mode.id;
      btn.innerHTML =
        '<span class="mode-icon" aria-hidden="true">' + mode.icon + '</span>' +
        '<span class="mode-title">' + escapeHtml(mode.label) + '</span>' +
        '<span class="mode-desc">' + escapeHtml(mode.description) + '</span>';

      bindTap(btn, (event) => {
        event.preventDefault();
        selectMode(mode.id);
      });

      grid.appendChild(btn);
    });

    selectMode(state.selectedMode);
  }

  function selectMode(modeId) {
    const mode = getModeConfig(modeId);
    state.selectedMode = mode.id;

    if (elements.modeGrid) {
      elements.modeGrid.querySelectorAll(".mode-card").forEach((card) => {
        const isSelected = card.dataset.modeId === mode.id;
        card.classList.toggle("selected", isSelected);
        card.setAttribute("aria-checked", isSelected ? "true" : "false");
      });
    }

    if (elements.selectedModeLabel) {
      elements.selectedModeLabel.textContent = `Selected Mode: ${mode.label}`;
    }

    // Keep an already-open Game Protocol modal in sync with the newly
    // selected mode, with zero page refresh required.
    renderProtocolContent();
  }

  /* ---------------- PHASE 1+2: Ranked / Practice / Daily run types ---------------- */
  function getLocalDateKey(dateObj) {
    const d = dateObj || new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}${m}${day}`;
  }

  function hashStringToSeed(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i += 1) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function mulberry32(seed) {
    let t = seed >>> 0;
    return function next() {
      t += 0x6D2B79F5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  function seededShuffle(arr, seed) {
    const copy = arr.slice();
    const rand = mulberry32(seed);
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rand() * (i + 1));
      const tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    return copy;
  }

  function buildDailyPool() {
    const dateKey = getLocalDateKey();
    const seed = hashStringToSeed("bscs1a-daily-" + dateKey);
    return seededShuffle(questionBank, seed).slice(0, Math.min(DAILY_QUESTION_COUNT, questionBank.length));
  }

  function loadRecentMistakes() {
    try {
      const raw = JSON.parse(localStorage.getItem(MISTAKES_STORAGE_KEY) || "[]");
      return Array.isArray(raw) ? raw : [];
    } catch {
      return [];
    }
  }

  function saveRecentMistake(question) {
    if (!question) return;
    try {
      const list = loadRecentMistakes().filter((m) => !(m.s === question.s && m.q === question.q));
      list.unshift({ s: question.s, q: question.q, ts: Date.now() });
      localStorage.setItem(MISTAKES_STORAGE_KEY, JSON.stringify(list.slice(0, 40)));
    } catch (error) {
      /* ignore */
    }
    saveNotebookEntry(question);
  }

  function buildStudyPlanPool() {
    const mastery = loadMastery();
    const recent = loadRecentMistakes();
    const picked = [];
    const seen = new Set();

    const pushQ = (q) => {
      if (!q) return;
      const key = q.s + "||" + q.q;
      if (seen.has(key)) return;
      seen.add(key);
      picked.push(q);
    };

    // 1) Recent mistakes resolved against question bank
    recent.forEach((m) => {
      const found = questionBank.find((q) => q.s === m.s && q.q === m.q);
      pushQ(found);
    });

    // 2) Weak subjects by mastery ratio
    const rankedSubjects = AVAILABLE_SUBJECTS.slice().sort((a, b) => {
      const ea = mastery[a] || { correct: 0, total: 0 };
      const eb = mastery[b] || { correct: 0, total: 0 };
      const ra = ea.total ? ea.correct / ea.total : 0;
      const rb = eb.total ? eb.correct / eb.total : 0;
      return ra - rb;
    });
    rankedSubjects.forEach((subject) => {
      const pool = (subjectPoolMap.get(subject) || []).slice();
      shuffle(pool).forEach(pushQ);
    });

    // 3) Fill from full bank if needed
    shuffle(questionBank).forEach(pushQ);

    return picked.slice(0, Math.min(STUDY_PLAN_COUNT, picked.length));
  }


  function msUntilNextLocalMidnight() {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
    return Math.max(0, next.getTime() - now.getTime());
  }

  function formatCountdown(ms) {
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    return `${h}h ${String(m).padStart(2, "0")}m`;
  }

  function updateDailyMeta() {
    const el = elements.dailyMeta || $("dailyMeta");
    if (!el) return;
    if (state.runType !== "daily") {
      el.hidden = true;
      return;
    }
    el.hidden = false;
    el.textContent = `Daily Challenge · ${DAILY_QUESTION_COUNT} shared questions · resets in ${formatCountdown(msUntilNextLocalMidnight())}`;
  }

  function initRunTypeSelector() {
    const grid = elements.runTypeGrid || $("runTypeGrid");
    if (!grid) return;
    grid.querySelectorAll("[data-run-type]").forEach((btn) => {
      bindTap(btn, (event) => {
        event.preventDefault();
        selectRunType(btn.getAttribute("data-run-type") || "ranked");
      });
    });
    selectRunType("ranked");
    // Refresh daily countdown while login is visible
    window.setInterval(() => {
      if (elements.loginView && elements.loginView.classList.contains("active")) {
        updateDailyMeta();
      }
    }, 30000);
  }

  function selectRunType(runType) {
    // Back-compat: old boolean callers
    if (runType === true) runType = "practice";
    if (runType === false || runType == null) runType = "ranked";
    if (runType !== "ranked" && runType !== "practice" && runType !== "daily" && runType !== "study") {
      runType = "ranked";
    }
    // Access policy: guests (even with pass) only Practice / Study Plan
    if (authState.role === "guest") {
      if (runType === "ranked" || runType === "daily") runType = "practice";
    }

    state.runType = runType;
    state.isDaily = runType === "daily";
    // Practice + Study Plan are non-competitive (no leaderboard write, no heart loss)
    state.isPractice = runType === "practice" || runType === "study";
    if (runType === "daily") {
      state.isPractice = false;
    }
    if (runType === "ranked") {
      state.isPractice = false;
      state.isDaily = false;
    }

    const grid = elements.runTypeGrid || $("runTypeGrid");
    if (grid) {
      grid.querySelectorAll("[data-run-type]").forEach((btn) => {
        const selected = btn.getAttribute("data-run-type") === state.runType;
        btn.classList.toggle("selected", selected);
        btn.setAttribute("aria-checked", selected ? "true" : "false");
      });
    }

    // Daily uses a fixed mixed set — subject mode picker is informational only.
    if (elements.modeGrid) {
      elements.modeGrid.style.opacity = state.isDaily ? "0.45" : "1";
      elements.modeGrid.style.pointerEvents = state.isDaily ? "none" : "";
    }
    if (elements.selectedModeLabel) {
      if (state.isDaily) {
        elements.selectedModeLabel.textContent = "Daily set: mixed subjects (same for everyone today)";
      } else {
        elements.selectedModeLabel.textContent = `Selected Mode: ${getModeConfig(state.selectedMode).label}`;
      }
    }

    if (elements.startBtn) {
      elements.startBtn.textContent =
        state.runType === "practice" ? "START PRACTICE" :
        state.runType === "study" ? "START STUDY PLAN" :
        state.runType === "daily" ? "START DAILY CHALLENGE" :
        "INITIALIZE";
    }
    if (elements.loginStatus) {
      if (!canPlayArena()) {
        elements.loginStatus.textContent = "Arena locked for browse-only guests. Ask RST Admin for a Guest Pass.";
      } else if (state.runType === "practice") {
        elements.loginStatus.textContent = "Practice mode: walang heart loss at hindi nasesave ang score sa leaderboard.";
      } else if (state.runType === "study") {
        elements.loginStatus.textContent = `Study Plan: ${STUDY_PLAN_COUNT} questions focused on weak mastery + recent mistakes. Hindi competitive.`;
      } else if (state.runType === "daily") {
        elements.loginStatus.textContent = `Daily Challenge: ${DAILY_QUESTION_COUNT} fixed questions shared by the whole section. Score saves to today's Daily board only.`;
      } else {
        elements.loginStatus.textContent = "Scores are saved to the cloud (Firebase) and also cached on this device.";
      }
    }
    updateDailyMeta();
  }

  /* ---------------- PHASE 2: Local subject mastery ---------------- */
  function loadMastery() {
    try {
      const raw = JSON.parse(localStorage.getItem(MASTERY_STORAGE_KEY) || "{}");
      return raw && typeof raw === "object" ? raw : {};
    } catch {
      return {};
    }
  }

  function saveMastery(data) {
    try {
      localStorage.setItem(MASTERY_STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn("[Arena] mastery save failed:", error);
    }
  }

  function recordMastery(subject, isCorrect) {
    if (!subject) return;
    const data = loadMastery();
    if (!data[subject]) data[subject] = { correct: 0, total: 0 };
    data[subject].total += 1;
    if (isCorrect) data[subject].correct += 1;
    saveMastery(data);
    renderMasteryBars();
  }

  function renderMasteryBars() {
    const host = elements.masteryBars || $("masteryBars");
    if (!host) return;
    const data = loadMastery();
    const subjects = AVAILABLE_SUBJECTS.slice();
    const rows = subjects.map((subject) => {
      const entry = data[subject] || { correct: 0, total: 0 };
      const pct = entry.total ? Math.round((entry.correct / entry.total) * 100) : 0;
      return { subject, pct, total: entry.total, correct: entry.correct };
    }).filter((row) => row.total > 0);

    if (!rows.length) {
      host.innerHTML = `<p class="mastery-empty">Play a few questions to build mastery bars.</p>`;
      return;
    }

    host.innerHTML = rows
      .map((row) => {
        return `<div class="mastery-row" title="${escapeHtml(String(row.correct))}/${escapeHtml(String(row.total))} correct">
          <span class="mastery-name">${escapeHtml(row.subject)}</span>
          <span class="mastery-track"><span class="mastery-fill" style="width:${row.pct}%"></span></span>
          <span class="mastery-pct">${row.pct}%</span>
        </div>`;
      })
      .join("");
  }

  /* ---------------- PHASE 2: Hero Today strip ---------------- */
  // Easy to edit for section officers — static list, no backend required.
  const SECTION_ANNOUNCEMENTS = [
    { text: "Reviewer Arena: try Daily Challenge for a shared 12-question set every day." },
    { text: "Practice Mode is available — review without losing hearts or leaderboard pressure." },
    { text: "Check the Freedom Wall for section shout-outs and study tips." }
  ];

  // Fallback deadline radar (YYYY-MM-DD). Live board from Firebase overrides when present.
  const SECTION_DEADLINES = [
    { name: "ITEC 102 Quiz window", date: "2026-08-25" },
    { name: "GEC reading check", date: "2026-08-28" },
    { name: "Midterm focus block", date: "2026-09-15" },
    { name: "Finals season opens", date: "2026-10-16" }
  ];
  const DEADLINES_PATH = "hub_config/deadlines";
  const DEADLINES_LOCAL_KEY = "bscs1a_deadlines_v1";
  const OFFICER_SEEN_KEY = "bscs1a_officer_updates_seen_ts_v1";
  const OFFICER_BADGE_KEY = "bscs1a_officer_updates_latest_ts_v1";

  // Set to a future date string "YYYY-MM-DD" to show countdown, or null to hide.
  const NEXT_EXAM_DATE = "2026-09-15";
  const BADGES_KEY = "bscs1a_badges_v1";

  /* Weekly schedule snapshot for Command Center "next class" */
  const WEEKLY_SCHEDULE = {
    1: [ // Monday
      { time: "8:30–10:00 AM", subj: "GEC 102 · Philippine History", tag: "Online" },
      { time: "10:00–11:30 AM", subj: "P.I. 100 · Rizal", tag: "Online" },
      { time: "1:00–2:30 PM", subj: "GEC 101 · Understanding the Self", tag: "Online" },
      { time: "2:30–4:00 PM", subj: "KOMFIL", tag: "Online" }
    ],
    2: [ // Tuesday
      { time: "10:00 AM–12:00 PM", subj: "ITEC 102 · Programming", tag: "F2F · Room 100" },
      { time: "2:30–4:00 PM", subj: "KOMFIL", tag: "F2F" }
    ],
    3: [ // Wednesday
      { time: "8:30–10:00 AM", subj: "GEC 102", tag: "F2F · VoAg 101" },
      { time: "10:00–11:30 AM", subj: "P.I. 100", tag: "F2F · Acad 208" },
      { time: "1:00–2:30 PM", subj: "GEC 101", tag: "F2F · VoAg 100" },
      { time: "3:00–4:30 PM", subj: "PATHFIT 1", tag: "GYM" }
    ],
    4: [ // Thursday
      { time: "7:00–10:00 AM", subj: "ITEC 102 · Programming", tag: "F2F · VoAg 207" },
      { time: "2:00–4:00 PM", subj: "ITEC 101 · Intro to Computing", tag: "F2F · VoAg 101" }
    ],
    5: [],
    6: [],
    0: []
  };

  function getNextClassInfo() {
    const now = new Date();
    const day = now.getDay();
    const slots = WEEKLY_SCHEDULE[day] || [];
    if (!slots.length) {
      return { value: "Vacant / Weekend", sub: "Walang scheduled class ngayong araw" };
    }
    // Simple: show first slot of the day (reliable on phones without parsing every time format)
    const first = slots[0];
    return {
      value: first.subj,
      sub: `${first.time} · ${first.tag}`
    };
  }

  function getDailyStatusInfo() {
    try {
      const key = "bscs1a_daily_done_" + getLocalDateKey();
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          value: "Completed today",
          sub: `Best score: ${Number(parsed.score || 0)}`
        };
      }
    } catch (error) {
      /* ignore */
    }
    return {
      value: "Not started",
      sub: `${DAILY_QUESTION_COUNT} shared questions · resets at midnight`
    };
  }

  function markDailyDoneIfNeeded() {
    if (!state.isDaily) return;
    try {
      const key = "bscs1a_daily_done_" + getLocalDateKey();
      const prev = JSON.parse(localStorage.getItem(key) || "null");
      const score = state.score;
      if (!prev || Number(prev.score || 0) < score) {
        localStorage.setItem(key, JSON.stringify({ score, ts: Date.now() }));
      }
    } catch (error) {
      /* ignore */
    }
  }

  async function renderTodayStrip() {
    const host = elements.todayStrip || $("todayStrip");
    if (!host) return;

    let countdownHtml = "";
    if (NEXT_EXAM_DATE) {
      const target = new Date(NEXT_EXAM_DATE + "T00:00:00");
      if (!Number.isNaN(target.getTime())) {
        const diffDays = Math.ceil((target.getTime() - Date.now()) / 86400000);
        if (diffDays >= 0) {
          countdownHtml =
            `<span class="countdown-pill">Exam focus · ${escapeHtml(NEXT_EXAM_DATE)} · ${diffDays} day${diffDays === 1 ? "" : "s"} left</span>`;
        }
      }
    }

    const nextClass = getNextClassInfo();
    const daily = getDailyStatusInfo();
    const items = SECTION_ANNOUNCEMENTS.map((a) => `<li>${escapeHtml(a.text)}</li>`).join("");
    const liveDeadlines = await fetchLiveDeadlines();
    const deadlinesHtml = buildDeadlineRadarHtml(liveDeadlines);
    host.innerHTML =
      `<div class="today-card command-center">` +
        `<h3>Command Center · RST</h3>` +
        `<div class="cmd-grid">` +
          `<div class="cmd-tile"><span class="cmd-label">Next class</span><span class="cmd-value">${escapeHtml(nextClass.value)}</span><span class="cmd-sub">${escapeHtml(nextClass.sub)}</span></div>` +
          `<div class="cmd-tile"><span class="cmd-label">Daily Challenge</span><span class="cmd-value">${escapeHtml(daily.value)}</span><span class="cmd-sub">${escapeHtml(daily.sub)}</span></div>` +
        `</div>` +
        `<div class="room-finder"><div class="rf-label">Room finder · today</div><div class="rf-value">${escapeHtml(nextClass.value)} · ${escapeHtml(nextClass.sub)}</div></div>` +
        `<div class="pulse-line" id="sectionPulseLine">Section Pulse · loading…</div>` +
        deadlinesHtml +
        `<ul style="margin-top:0.65rem">${items}</ul>` +
        countdownHtml +
        buildQotdHtml() +
      `</div>`;
    refreshSectionPulse();
    refreshOfficerUpdateBadge();
  }

  function buildDeadlineRadarHtml(deadlines) {
    const source = Array.isArray(deadlines) && deadlines.length ? deadlines : SECTION_DEADLINES;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const rows = (source || [])
      .slice()
      .sort((a, b) => String(a.date).localeCompare(String(b.date)))
      .map((d) => {
        const target = new Date(d.date + "T00:00:00");
        const diff = Math.ceil((target.getTime() - today.getTime()) / 86400000);
        let when = d.date;
        if (!Number.isNaN(diff)) {
          if (diff < 0) when = "Passed";
          else if (diff === 0) when = "Today";
          else if (diff === 1) when = "Tomorrow";
          else when = `${diff}d left`;
        }
        return `<li><span class="dl-name">${escapeHtml(d.name)}</span><span class="dl-when">${escapeHtml(when)}</span></li>`;
      })
      .join("");
    if (!rows) return "";
    return `<div style="margin-top:0.55rem;"><span class="cmd-label" style="display:block;margin-bottom:0.25rem;">DEADLINE RADAR</span><ul class="deadline-list">${rows}</ul></div>`;
  }

  async function fetchLiveDeadlines() {
    let list = [];
    if (db) {
      try {
        const snap = await get(ref(db, DEADLINES_PATH));
        if (snap.exists()) {
          const val = snap.val();
          Object.keys(val).forEach((id) => {
            const row = val[id];
            if (row && row.name && row.date) list.push({ id, name: row.name, date: row.date });
          });
        }
      } catch (error) {
        console.warn("[Arena] live deadlines fetch failed:", error);
      }
    }
    if (!list.length) {
      try {
        const local = JSON.parse(localStorage.getItem(DEADLINES_LOCAL_KEY) || "[]");
        if (Array.isArray(local)) list = local.filter((d) => d && d.name && d.date);
      } catch (error) {
        list = [];
      }
    }
    return list;
  }

  async function saveLiveDeadline(name, date) {
    const payload = {
      name: String(name || "").trim().slice(0, 80),
      date: String(date || "").trim(),
      ts: Date.now(),
      by: authState.username || "admin"
    };
    if (!payload.name || !/^\d{4}-\d{2}-\d{2}$/.test(payload.date)) {
      throw new Error("Need title + date (YYYY-MM-DD)");
    }
    const id = "dl_" + Date.now();
    try {
      const local = JSON.parse(localStorage.getItem(DEADLINES_LOCAL_KEY) || "[]");
      const arr = Array.isArray(local) ? local : [];
      arr.push({ id, ...payload });
      localStorage.setItem(DEADLINES_LOCAL_KEY, JSON.stringify(arr.slice(-30)));
    } catch (error) {
      /* ignore */
    }
    if (db) {
      await set(ref(db, DEADLINES_PATH + "/" + id), payload);
    }
    return payload;
  }

  function getOfficerSeenTs() {
    try {
      return Number(localStorage.getItem(OFFICER_SEEN_KEY) || 0);
    } catch {
      return 0;
    }
  }

  function markOfficerUpdatesSeen(ts) {
    try {
      const value = Number(ts || Date.now());
      localStorage.setItem(OFFICER_SEEN_KEY, String(value));
      localStorage.setItem(OFFICER_BADGE_KEY, String(value));
    } catch (error) {
      /* ignore */
    }
    const badge = $("navUpdateBadge");
    if (badge) badge.hidden = true;
  }

  async function refreshOfficerUpdateBadge() {
    const badge = $("navUpdateBadge");
    if (!badge) return;
    if (!(isClassmate() || isAdmin())) {
      badge.hidden = true;
      return;
    }
    try {
      const rows = await fetchOfficerUpdates();
      if (!rows.length) {
        badge.hidden = true;
        return;
      }
      const latest = Number(rows[0].ts || 0);
      const seen = getOfficerSeenTs();
      if (latest > seen) {
        badge.hidden = false;
        badge.textContent = "•";
        badge.title = "New Officer Update";
      } else {
        badge.hidden = true;
      }
    } catch (error) {
      badge.hidden = true;
    }
  }

  async function refreshSectionPulse() {
    const el = $("sectionPulseLine");
    if (!el) return;
    try {
      const events = await fetchClassmateLoginEvents(40);
      const latest = await fetchClassmateLoginLog();
      const weekly = countActiveThisWeek(events.length ? events : latest);
      let dailyPlays = 0;
      try {
        // Best-effort: count local daily done flag only on this device is not global.
        // Pulse emphasizes login activity which is section-wide via Firebase.
      } catch (e) { /* ignore */ }
      el.textContent = `Section Pulse · ${weekly} classmate${weekly === 1 ? "" : "s"} active this week · ${latest.length} unique logins tracked`;
    } catch (error) {
      el.textContent = "Section Pulse · online when classmates sign in";
    }
  }

  function buildQotdHtml() {
    if (!questionBank.length) return "";
    const seed = hashStringToSeed("qotd-" + getLocalDateKey());
    const q = seededShuffle(questionBank, seed)[0];
    if (!q) return "";
    return `<div class="qotd-card"><strong>QUESTION OF THE DAY · RST</strong>${escapeHtml(q.s)} — ${escapeHtml(q.q)}</div>`;
  }



  let officerUpdateFilter = "all";


  async function fetchResourceRequests() {
    let list = [];
    if (db) {
      try {
        const snap = await get(ref(db, RESOURCE_REQ_PATH));
        if (snap.exists()) {
          const val = snap.val();
          Object.keys(val).forEach((id) => {
            const row = val[id];
            if (row && typeof row === "object") list.push({ id, ...row });
          });
        }
      } catch (error) {
        console.warn("[Hub] resource requests fetch failed:", error);
      }
    }
    try {
      const local = JSON.parse(localStorage.getItem("bscs1a_resource_reqs_v1") || "{}");
      Object.keys(local).forEach((id) => {
        if (!list.find((x) => x.id === id)) list.push({ id, ...local[id] });
      });
    } catch (error) {
      /* ignore */
    }
    return list.sort((a, b) => Number(b.ts || 0) - Number(a.ts || 0));
  }

  async function markResourceRequestDone(id) {
    if (!canManageResourceRequests()) throw new Error("Not allowed");
    const patch = { done: true, doneAt: Date.now(), doneBy: authState.username || "" };
    try {
      const local = JSON.parse(localStorage.getItem("bscs1a_resource_reqs_v1") || "{}");
      if (local[id]) {
        local[id] = { ...local[id], ...patch };
        localStorage.setItem("bscs1a_resource_reqs_v1", JSON.stringify(local));
      }
    } catch (error) {
      /* ignore */
    }
    if (db) {
      try {
        const snap = await get(ref(db, RESOURCE_REQ_PATH + "/" + id));
        if (snap.exists()) {
          await set(ref(db, RESOURCE_REQ_PATH + "/" + id), { ...snap.val(), ...patch });
        }
      } catch (error) {
        console.warn(error);
      }
    }
  }

  function renderRequestRowsHtml(rows) {
    if (!rows.length) {
      return `<p style="color:var(--muted);font-size:0.82rem;">No resource requests yet.</p>`;
    }
    return rows.map((r) => {
      const when = formatLoginStamp(r.ts);
      const done = r.done ? " · DONE" : "";
      return `<div style="padding:0.55rem 0;border-bottom:1px solid rgba(255,255,255,0.06);">
        <div style="font-weight:800;color:#eafffb;">${escapeHtml(r.topic || "")}${done}</div>
        <div style="font-size:0.78rem;color:var(--muted);margin-top:0.2rem;">${escapeHtml(r.name || "Anonymous")} · ${escapeHtml(when)}</div>
        ${r.note ? `<div style="font-size:0.8rem;margin-top:0.25rem;color:rgba(230,241,255,0.85);">${escapeHtml(r.note)}</div>` : ""}
        ${!r.done ? `<button type="button" class="lifeline-btn req-done-btn" data-req-id="${escapeHtml(r.id)}" style="margin-top:0.35rem;">Mark done</button>` : ""}
      </div>`;
    }).join("");
  }

  async function fetchOfficerUpdates() {
    let list = [];
    if (db) {
      try {
        const snap = await get(ref(db, OFFICER_UPDATES_PATH));
        if (snap.exists()) {
          const val = snap.val();
          Object.keys(val).forEach((id) => {
            const row = val[id];
            if (row && typeof row === "object") list.push({ id, ...row });
          });
        }
      } catch (error) {
        console.warn("[Officers] fetch updates failed:", error);
      }
    }
    if (!list.length) {
      try {
        const local = JSON.parse(localStorage.getItem(OFFICER_UPDATES_LOCAL) || "{}");
        Object.keys(local).forEach((id) => list.push({ id, ...local[id] }));
      } catch (error) {
        list = [];
      }
    }
    return list.sort((a, b) => Number(b.ts || 0) - Number(a.ts || 0));
  }

  async function publishOfficerUpdate(channel, message) {
    if (!isOfficer()) throw new Error("Officers only");
    const allowed = isAdmin()
      ? ["announcements", "academics", "events", "tech"]
      : (authState.officerChannels || []);
    if (allowed.indexOf(channel) < 0) throw new Error("Channel not allowed for your duty");
    const textValue = String(message || "").trim().slice(0, 280);
    if (!textValue) throw new Error("Empty message");
    const id = "ou_" + Date.now() + "_" + (authState.username || "x");
    const payload = {
      channel,
      text: textValue,
      by: authState.username,
      byName: authState.displayName || authState.username,
      roleTitle: authState.officerTitle || (isAdmin() ? "RST Admin" : "Officer"),
      ts: Date.now(),
      company: COMPANY_NAME
    };
    try {
      const local = JSON.parse(localStorage.getItem(OFFICER_UPDATES_LOCAL) || "{}");
      local[id] = payload;
      localStorage.setItem(OFFICER_UPDATES_LOCAL, JSON.stringify(local));
    } catch (error) {
      /* ignore */
    }
    if (db) {
      await set(ref(db, OFFICER_UPDATES_PATH + "/" + id), payload);
    }
    return payload;
  }

  async function renderOfficerUpdates() {
    const host = $("officerUpdateList");
    if (!host) return;
    if (!(isClassmate() || isAdmin())) {
      host.innerHTML = `<p class="arena-note">Classmates only.</p>`;
      refreshOfficerUpdateBadge();
      return;
    }
    host.innerHTML = `<p class="arena-note">Loading updates…</p>`;
    const rows = await fetchOfficerUpdates();
    const filtered = officerUpdateFilter === "all"
      ? rows
      : rows.filter((r) => r.channel === officerUpdateFilter);
    if (!filtered.length) {
      host.innerHTML = `<p class="arena-note">No updates yet in this channel. Officers can post from Officer Desk.</p>`;
      refreshOfficerUpdateBadge();
      return;
    }
    host.innerHTML = filtered.slice(0, 40).map((r) => {
      const when = formatLoginStamp(r.ts);
      const ch = CHANNEL_LABELS[r.channel] || r.channel;
      return `<article class="officer-update-card">
        <div class="ou-ch">${escapeHtml(ch)}</div>
        <p class="ou-text">${escapeHtml(r.text || "")}</p>
        <div class="ou-meta">${escapeHtml(r.roleTitle || "Officer")} · ${escapeHtml((r.byName || r.by || "").split(",")[0])} · ${escapeHtml(when)}</div>
      </article>`;
    }).join("");
    refreshOfficerUpdateBadge();
  }

  function openOfficerDesk() {
    if (!isOfficer()) {
      showShareToast && showShareToast("Officers only");
      return;
    }
    const existing = document.querySelector(".admin-overlay.officer-desk");
    if (existing) existing.remove();
    const channels = isAdmin()
      ? ["announcements", "academics", "events", "tech"]
      : (authState.officerChannels || []);
    const overlay = document.createElement("div");
    overlay.className = "admin-overlay officer-desk";
    const panel = document.createElement("div");
    panel.className = "admin-panel";
    const opts = channels.map((c) =>
      `<option value="${c}">${CHANNEL_LABELS[c] || c}</option>`
    ).join("");
    panel.innerHTML = `
      <h3 style="margin:0 0 8px;font-size:1rem;">Officer Desk</h3>
      <p style="margin:0 0 10px;font-size:0.78rem;color:var(--muted);">
        ${escapeHtml(authState.officerTitle || "Officer")} · post only to your duty channels. Visible to classmates only.
      </p>
      <label style="display:block;font-size:0.72rem;font-weight:800;color:var(--muted);margin-bottom:0.3rem;">CHANNEL</label>
      <select id="odChannel" style="width:100%;min-height:44px;border-radius:12px;border:1px solid rgba(255,255,255,0.14);background:rgba(0,0,0,0.28);color:var(--text);padding:0.5rem;margin-bottom:0.55rem;">${opts}</select>
      <textarea id="odMessage" maxlength="280" placeholder="Short update for the section…" style="width:100%;min-height:96px;border-radius:12px;border:1px solid rgba(255,255,255,0.14);background:rgba(0,0,0,0.28);color:var(--text);padding:0.65rem;"></textarea>
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;">
        <button type="button" class="lifeline-btn" id="odPublish">Publish</button>
        <button type="button" class="lifeline-btn" id="odClose">Close</button>
      </div>
      <p id="odStatus" style="margin:10px 0 0;font-size:0.78rem;color:var(--accent);"></p>
    `;
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    const status = panel.querySelector("#odStatus");
    bindTap(panel.querySelector("#odClose"), (e) => { e.preventDefault(); overlay.remove(); });
    bindTap(overlay, (e) => { if (e.target === overlay) overlay.remove(); });
    bindTap(panel.querySelector("#odPublish"), async (e) => {
      e.preventDefault();
      const ch = panel.querySelector("#odChannel").value;
      const msg = panel.querySelector("#odMessage").value;
      try {
        await publishOfficerUpdate(ch, msg);
        status.textContent = "Published. Classmates can see it under Officer Updates.";
        panel.querySelector("#odMessage").value = "";
        renderOfficerUpdates();
      } catch (error) {
        status.textContent = error.message || "Publish failed";
      }
    });

    // Resource request inbox for academics / tech duty officers
    if (canManageResourceRequests()) {
      const box = document.createElement("div");
      box.style.marginTop = "14px";
      box.innerHTML = `<h4 style="margin:0 0 6px;font-size:0.82rem;color:#ffd27d;letter-spacing:0.04em;">RESOURCE REQUESTS</h4>
        <div id="odRequestList" style="max-height:36vh;overflow:auto;"><p style="color:var(--muted);font-size:0.8rem;">Loading…</p></div>`;
      panel.appendChild(box);
      const listHost = box.querySelector("#odRequestList");
      (async () => {
        const rows = await fetchResourceRequests();
        listHost.innerHTML = renderRequestRowsHtml(rows.slice(0, 30));
        listHost.querySelectorAll(".req-done-btn").forEach((btn) => {
          bindTap(btn, async (ev) => {
            ev.preventDefault();
            try {
              await markResourceRequestDone(btn.getAttribute("data-req-id"));
              const refreshed = await fetchResourceRequests();
              listHost.innerHTML = renderRequestRowsHtml(refreshed.slice(0, 30));
              listHost.querySelectorAll(".req-done-btn").forEach((b2) => {
                bindTap(b2, async (ev2) => {
                  ev2.preventDefault();
                  await markResourceRequestDone(b2.getAttribute("data-req-id"));
                  const r2 = await fetchResourceRequests();
                  listHost.innerHTML = renderRequestRowsHtml(r2.slice(0, 30));
                });
              });
            } catch (error) {
              status.textContent = error.message || "Update failed";
            }
          });
        });
      })();
    }
  }

  function initOfficerUpdatesUI() {
    const filters = $("ouFilters");
    if (filters) {
      filters.querySelectorAll("[data-ou]").forEach((btn) => {
        bindTap(btn, (event) => {
          event.preventDefault();
          officerUpdateFilter = btn.getAttribute("data-ou") || "all";
          filters.querySelectorAll("[data-ou]").forEach((b) => b.classList.toggle("active", b === btn));
          renderOfficerUpdates();
        });
      });
    }
    const deskBtns = ["openOfficerDeskBtn", "openOfficerDeskBtnLogin"];
    deskBtns.forEach((id) => {
      const btn = $(id);
      if (btn) {
        bindTap(btn, (event) => {
          event.preventDefault();
          openOfficerDesk();
        });
      }
    });
  }

  async function loadAdminPin() {
    const pin = $("adminPin");
    const body = $("adminPinBody");
    if (!pin || !body) return;
    let message = "";
    try {
      if (db) {
        const snap = await get(ref(db, ANNOUNCEMENT_PATH));
        if (snap.exists()) {
          const val = snap.val();
          message = typeof val === "string" ? val : (val && val.text) || "";
        }
      }
    } catch (error) {
      console.warn("[Hub] announcement fetch failed:", error);
    }
    if (!message) {
      try {
        message = localStorage.getItem(ANNOUNCEMENT_LOCAL_KEY) || "";
      } catch (error) {
        message = "";
      }
    }
    if (!message) {
      message = "Welcome to BSCS 1-A · RST Hub. Check Command Center for class & Daily status.";
    }
    body.textContent = message;
    pin.classList.add("is-visible");
  }

  async function saveAdminPin(textValue) {
    const cleaned = String(textValue || "").trim().slice(0, 240);
    try {
      localStorage.setItem(ANNOUNCEMENT_LOCAL_KEY, cleaned);
    } catch (error) {
      /* ignore */
    }
    if (db) {
      await set(ref(db, ANNOUNCEMENT_PATH), {
        text: cleaned,
        updatedBy: authState.username || ADMIN_USERNAME,
        ts: Date.now(),
        company: COMPANY_NAME
      });
    }
    await loadAdminPin();
  }

  function applyExamWeekMode() {
    try {
      if (!NEXT_EXAM_DATE) return;
      const target = new Date(NEXT_EXAM_DATE + "T00:00:00");
      if (Number.isNaN(target.getTime())) return;
      const diffDays = Math.ceil((target.getTime() - Date.now()) / 86400000);
      // Auto exam-week focus within 14 days of exam date
      const on = diffDays >= 0 && diffDays <= 14;
      document.body.classList.toggle("exam-week", on);
      if (on && !document.body.classList.contains("exam-mode")) {
        // soft nudge only via class; user can still use Exam Mode toggle in arena
      }
    } catch (error) {
      /* ignore */
    }
  }

  function initResourceRequestForm() {
    const form = $("resourceRequestForm");
    if (!form) return;
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const status = $("reqStatus");
      // Guests without Guest Pass cannot submit resource requests
      if (authState.role === "guest" && !authState.guestPlayAllowed) {
        if (status) {
          status.textContent = "Guest · Browse only — hindi pwede mag-request. Sign in as classmate o gumamit ng Guest Pass.";
        }
        return;
      }
      if (!authState.role) {
        if (status) status.textContent = "Sign in muna bago mag-send ng request.";
        return;
      }
      const topic = String(($("reqTopic") && $("reqTopic").value) || "").trim();
      const name = String(($("reqName") && $("reqName").value) || "").trim().slice(0, 40);
      const note = String(($("reqNote") && $("reqNote").value) || "").trim().slice(0, 200);
      if (!topic) {
        if (status) status.textContent = "Ilagay kung ano ang kailangan mo.";
        return;
      }
      const payload = {
        topic,
        name: name || (authState.displayName ? String(authState.displayName).split(",")[0] : "Anonymous"),
        note,
        ts: Date.now(),
        by: authState.username || "guest",
        role: authState.role || "guest"
      };
      try {
        const key = "req_" + Date.now();
        const local = JSON.parse(localStorage.getItem("bscs1a_resource_reqs_v1") || "{}");
        local[key] = payload;
        localStorage.setItem("bscs1a_resource_reqs_v1", JSON.stringify(local));
        if (db) {
          await set(ref(db, RESOURCE_REQ_PATH + "/" + key), payload);
        }
        if (status) status.textContent = "Request sent. RST / officers can review it.";
        form.reset();
      } catch (error) {
        if (status) status.textContent = "Saved on this device (cloud sync failed).";
        console.warn(error);
      }
    });
  }

  function registerPwa() {
    if (!("serviceWorker" in navigator)) return;
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch((error) => {
        console.warn("[PWA] SW register skipped:", error);
      });
    });
  }

  /* One-tap Back to Top (shows after scrolling down) */
  function initBackToTop() {
    const btn = $("backToTopBtn");
    if (!btn) return;
    const showAfter = 380;
    let ticking = false;

    const sync = () => {
      const y = window.scrollY || document.documentElement.scrollTop || 0;
      btn.classList.toggle("is-visible", y > showAfter);
      ticking = false;
    };

    window.addEventListener(
      "scroll",
      () => {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(sync);
      },
      { passive: true }
    );

    bindTap(btn, (event) => {
      event.preventDefault();
      try {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch (error) {
        window.scrollTo(0, 0);
      }
      // Also focus brand / top for a11y
      const brand = document.querySelector(".brand, .nav");
      if (brand && typeof brand.focus === "function") {
        try {
          brand.setAttribute("tabindex", "-1");
          brand.focus({ preventScroll: true });
        } catch (e) {
          /* ignore */
        }
      }
    });

    sync();
  }




  /* ---------------- NEW FEATURE: dynamic Game Protocol ---------------- */
  // Generates the entire Game Protocol body from the ACTUAL live game
  // configuration (constants above) and the currently selected mode, so it
  // can never drift out of sync with the real rules the way a static block
  // of copy could.
  function renderProtocolContent() {
    const container = elements.protocolContent;
    if (!container) return;

    const mode = getModeConfig(state.selectedMode);
    const isRandom = mode.id === RANDOM_MODE_ID;
    const bossSubject = getBossSubjectForActiveMode();

    const poolText = isRandom
      ? `All available subjects that currently have questions (${AVAILABLE_SUBJECTS.join(", ")}).`
      : `${mode.id} ONLY.`;

    const diffText = isRandom
      ? "Questions may come from any subject currently available in the question bank."
      : `Questions are restricted to ${mode.id}. Questions from other subjects will not appear.`;

    const bossText = isRandom
      ? `Random / All Subjects keeps the original Boss Question behavior \u2014 the Boss pulls from the hardest subject pool (${BOSS_SUBJECT}).`
      : `To keep this mode strictly ${mode.id}-only, the Boss Question here is also pulled from ${bossSubject} instead of ${BOSS_SUBJECT} \u2014 it will never break your subject-only selection.`;

    container.innerHTML =
      `<p class="sysline">[CORE RULES] ${questionBank.length}-question bank &middot; Randomized order &middot; ${MAX_LIVES} starting lives &middot; ${QUESTION_TIME_LIMIT}s per question &middot; Boss Q @ ${BOSS_TIME_LIMIT}s &middot; Top 10 leaderboard</p>` +
      `<p><strong>Mode:</strong> ${escapeHtml(mode.label)}<br/><strong>Question Pool:</strong> ${escapeHtml(poolText)}</p>` +
      `<p><strong>Mode Difference:</strong> ${escapeHtml(diffText)}</p>` +
      `<ul class="protocol-rules-list">` +
        `<li><strong>Starting Hearts:</strong> ${MAX_LIVES}</li>` +
        `<li><strong>Correct Answer:</strong> +${SCORE_PER_CORRECT} points</li>` +
        `<li><strong>Wrong Answer:</strong> -1 heart</li>` +
        `<li><strong>Timeout:</strong> -1 heart</li>` +
        `<li><strong>Every ${MILESTONE_FANFARE_SCORE_STEP} Points:</strong> +2 Hearts</li>` +
        `<li><strong>Timer:</strong> ${QUESTION_TIME_LIMIT}s per question (Boss: ${BOSS_TIME_LIMIT}s)</li>` +
        `<li><strong>Streak Bonus:</strong> +${STREAK_BONUS} every ${STREAK_TARGET}-streak</li>` +
        `<li><strong>Lifelines:</strong> 50/50 + Skip (1 use each per session)</li>` +
      `</ul>` +
      `<p>
        Start with <strong>${MAX_LIVES} lives (hearts)</strong>. Bawat tamang sagot ay
        <strong>+${SCORE_PER_CORRECT} points</strong>, at kada ${STREAK_TARGET} sunod-sunod na tamang sagot (streak)
        ay may <strong>+${STREAK_BONUS} bonus point</strong>. Bawat maling sagot o pag-expire ng
        <strong>${QUESTION_TIME_LIMIT}-second timer</strong> ay babawas ng isang heart. Kapag naubos ang
        hearts, magti-trigger ang game over system.
      </p>` +
      `<p>
        <strong>\u2764\uFE0F HEART MILESTONE:</strong> Every ${MILESTONE_FANFARE_SCORE_STEP} points reached = +2 Hearts.
        Isang beses lang ito magre-reward bawat milestone kada session (hal. 25, 50, 75, 100...).
      </p>` +
      `<p>
        May dalawang lifelines na pwedeng gamitin isang beses bawat session:
        <strong>50/50</strong> (nag-aalis ng dalawang maling choice) at <strong>Skip</strong>
        (lumalaktaw sa tanong nang walang penalty). Dynamic ang badge title habang
        tumataas ang score mo.
      </p>` +
      `<p>
        <strong>\u2694\uFE0F Boss Question:</strong> sa scores na <strong>${BOSS_THRESHOLDS.join(", ")}</strong>,
        magti-trigger ang isang "BOSS LEVEL" na may red flash warning. Ang susunod na tanong ay
        galing sa <strong>${escapeHtml(bossSubject)}</strong> at bababa ang timer sa
        <strong>${BOSS_TIME_LIMIT} seconds</strong>. Kung tama, +${BOSS_SCORE_PER_CORRECT} points (double)
        &mdash; kung mali, normal na -1 heart lang. ${escapeHtml(bossText)}
      </p>` +
      `<p>
        <strong>Username rules:</strong> letters at spaces lang ang tinatanggap
        (walang numero, symbols, o emoji) &mdash; awtomatikong nililinis ito habang
        nagta-type ka.
      </p>` +
      `<p>
        <strong>One entry per player:</strong> case-insensitive ang pagtukoy sa
        pangalan sa leaderboard (hal. "RST" at "rst" ay iisa lang), kaya isang
        record lang bawat player. Ang lumang score ay mapapalitan lamang kapag
        mas mataas ang bagong score &mdash; kung mas mababa, hindi ito isasave.
      </p>` +
      `<p>
        <strong>\u{1F3C5} Academic Rank Badges:</strong> nagbabago ang iyong badge title
        kada <strong>10 points</strong>, mula "Hello World Installer" bilang
        FRESHMAN pataas hanggang "BSCS 1-A Valedictorian" bilang LEGEND sa
        score 500. Nakikita ito live sa tabi ng iyong score sa HUD.
      </p>` +
      `<p>
        <strong>\u{1F50A} Retro Sound FX:</strong> may 8-bit na tunog ang bawat tamang
        sagot, maling sagot, at ${MILESTONE_FANFARE_SCORE_STEP}-score milestone &mdash; puro generated sa browser
        (walang audio file na kailangang i-download). May Mute button
        (\u{1F50A}/\u{1F507}) sa ibabang-kanang bahagi ng screen kung gusto mong patahimikin.
      </p>`;
  }

  function init() {
    if (initialized) return;

    elements = {
      loginView: $("loginView"),
      gameView: $("gameView"),
      gameOverView: $("gameOverView"),
      usernameInput: $("usernameInput"),
      startBtn: $("startBtn"),
      restartBtn: $("restartBtn"),
      loginStatus: $("loginStatus"),
      hudUser: $("hudUser"),
      hudRank: $("hudRank"),
      hudScore: $("hudScore"),
      hudLives: $("hudLives"),
      subjectChip: $("subjectChip"),
      streamModeLabel: $("streamModeLabel"),
      modeGrid: $("modeGrid"),
      selectedModeLabel: $("selectedModeLabel"),
      protocolContent: $("protocolContent"),
      questionText: $("questionText"),
      choicesWrap: $("choicesWrap"),
      feedback: $("feedback"),
      leaderboardBody: $("leaderboardBody"),
      finalScore: $("finalScore"),
      finalRank: $("finalRank"),
      timerBarFill: $("timerBarFill"),
      timerNum: $("timerNum"),
      lifelineRow: $("lifelineRow"),
      gameOverNote: $("gameOverNote"),
      gameOverQuote: $("gameOverQuote"),
      reviewList: $("reviewList"),
      lbTitle: $("lbTitle"),
      muteToggleBtn: $("muteToggleBtn"),
      practiceChip: $("practiceChip"),
      endPracticeBtn: $("endPracticeBtn"),
      shareResultBtn: $("shareResultBtn"),
      retryMistakesBtn: $("retryMistakesBtn"),
      runTypeGrid: $("runTypeGrid"),
      crashTitle: document.querySelector("#gameOverView .crash-title"),
      dailyMeta: $("dailyMeta"),
      masteryBars: $("masteryBars"),
      masteryPanel: $("masteryPanel"),
      todayStrip: $("todayStrip")
    };

    const missing = Object.keys(elements).filter((key) => !elements[key]);
    if (missing.length) {
      initAttempts += 1;
      if (initAttempts === 1) {
        console.warn("[Arena] Waiting for DOM elements, missing so far:", missing);
      }
      if (initAttempts >= MAX_INIT_ATTEMPTS) {
        console.error("[Arena] Giving up: these element IDs were never found in the HTML:", missing);
        return;
      }
      setTimeout(init, 300);
      return;
    }

    initAuthGate();
    initNotebookButton();
    initExamModeToggle();
    initWelcomeModal();
    initMatrixBackground();
    initNav();
    initAvatarGrid();
    initModeSelector();
    initRunTypeSelector();
    initLifelineButtons();
    initAdminTrigger();

    state.muted = loadMutePreference();
    applyMuteButtonState();
    bindTap(elements.muteToggleBtn, (event) => {
      event.preventDefault();
      toggleMute();
    });
    initBackToTop();

    bindTap(elements.startBtn, (event) => {
      event.preventDefault();
      if (elements.usernameInput) elements.usernameInput.blur();
      startGame();
    });

    bindTap(elements.restartBtn, (event) => {
      event.preventDefault();
      rebootArena();
    });

    if (elements.endPracticeBtn) {
      bindTap(elements.endPracticeBtn, (event) => {
        event.preventDefault();
        endGame("practice_end");
      });
    }
    if (elements.shareResultBtn) {
      bindTap(elements.shareResultBtn, (event) => {
        event.preventDefault();
        shareResult();
      });
    }
    if (elements.retryMistakesBtn) {
      bindTap(elements.retryMistakesBtn, (event) => {
        event.preventDefault();
        startRetryMistakes();
      });
    }

    initModalTriggers();

    elements.usernameInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        if (isClassmate() || isAdmin()) {
          elements.usernameInput.blur();
          if (elements.loginStatus) {
            elements.loginStatus.textContent = "Name locked from login. Pumili ng mode, then START.";
          }
          return;
        }
        // Guest: lock name + dismiss keyboard, then choose mode (do not auto-start)
        confirmGuestDisplayName();
      }
    });
    // Prevent focus bounce: if name is locked, ignore focus attempts from accidental taps
    elements.usernameInput.addEventListener("focus", (event) => {
      if (elements.usernameInput.readOnly || elements.usernameInput.classList.contains("is-name-locked")) {
        elements.usernameInput.blur();
      }
    });

    // Live-clean the field as the user types: letters and spaces only.
    elements.usernameInput.addEventListener("input", () => {
      const cursorAtEnd = elements.usernameInput.selectionEnd === elements.usernameInput.value.length;
      const cleaned = elements.usernameInput.value.replace(/[^a-zA-Z ]/g, "").slice(0, 22);
      if (cleaned !== elements.usernameInput.value) {
        elements.usernameInput.value = cleaned;
        if (cursorAtEnd) {
          elements.usernameInput.setSelectionRange(cleaned.length, cleaned.length);
        }
      }
    });

    document.addEventListener("keydown", handleGlobalKeys);
    window.addEventListener("blur", handleWindowBlur);

    migrateLegacyScores().then(() => renderLeaderboard());
    renderMasteryBars();
    renderTodayStrip();
    initStudyRooms();
    renderMyDesk();
    loadAdminPin();
    applyExamWeekMode();
    initResourceRequestForm();
    initOfficerUpdatesUI();
    renderOfficerUpdates();
    registerPwa();
    updateHud();
    setView("loginView");
    initialized = true;
    console.log("[Arena] Game initialized OK.");
  }

  /* ---------------- Lifelines ---------------- */
  function initLifelineButtons() {
    const row = elements.lifelineRow;
    row.innerHTML = "";

    const fiftyBtn = document.createElement("button");
    fiftyBtn.type = "button";
    fiftyBtn.id = "lifeline5050";
    fiftyBtn.className = "lifeline-btn";
    fiftyBtn.textContent = "50/50";
    bindTap(fiftyBtn, (event) => {
      event.preventDefault();
      useFiftyFifty();
    });

    const skipBtn = document.createElement("button");
    skipBtn.type = "button";
    skipBtn.id = "lifelineSkip";
    skipBtn.className = "lifeline-btn";
    skipBtn.textContent = "Skip Question";
    bindTap(skipBtn, (event) => {
      event.preventDefault();
      useSkip();
    });

    row.appendChild(fiftyBtn);
    row.appendChild(skipBtn);
    elements.fiftyBtn = fiftyBtn;
    elements.skipBtn = skipBtn;
  }

  function useFiftyFifty() {
    if (state.locked || state.hasUsed5050 || !state.currentQuestion) return;
    state.hasUsed5050 = true;
    elements.fiftyBtn.disabled = true;

    const wrongOnes = state.currentQuestion.choices.filter((c) => c !== state.currentQuestion.answer);
    const toHide = shuffle(wrongOnes).slice(0, 2);
    toHide.forEach((choice) => state.hiddenChoices.add(choice));
    renderChoiceButtons();
  }

  function useSkip() {
    if (state.locked || state.hasUsedSkip || !state.currentQuestion) return;
    state.hasUsedSkip = true;
    elements.skipBtn.disabled = true;
    // Skipping a Boss Question ends that encounter — no free re-roll of it.
    state.bossQuestionActive = false;
    setBossVisuals(false);
    elements.feedback.textContent = "Skipped. Walang penalty.";
    elements.feedback.className = "feedback";
    stopTimer();
    window.setTimeout(loadNextQuestion, 350);
  }

  /* ---------------- View + HUD ---------------- */
  function setView(name) {
    [elements.loginView, elements.gameView, elements.gameOverView].forEach((view) => {
      view.classList.remove("active");
    });
    const map = { loginView: elements.loginView, gameView: elements.gameView, gameOverView: elements.gameOverView };
    map[name].classList.add("active");

    if (name === "gameView") {
      document.body.classList.add("arena-playing");
      document.body.classList.remove("arena-gameover");
    } else if (name === "gameOverView") {
      document.body.classList.add("arena-gameover");
      document.body.classList.remove("arena-playing", "streak-hot");
      // Mobile UX fix: auto-focus/scroll straight to the crash panel so the
      // player never has to manually scroll down to see their result.
      window.requestAnimationFrame(() => {
        elements.gameOverView.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } else {
      document.body.classList.remove("arena-playing", "arena-gameover", "streak-hot");
    }
  }

  function animateScoreTo(target) {
    if (state.scoreAnimId) cancelAnimationFrame(state.scoreAnimId);
    const start = state.displayedScore;
    const diff = target - start;
    const duration = 420;
    const startTime = performance.now();

    function step(now) {
      const progress = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      state.displayedScore = Math.round(start + diff * eased);
      elements.hudScore.textContent = String(state.displayedScore);
      if (progress < 1) {
        state.scoreAnimId = requestAnimationFrame(step);
      } else {
        state.displayedScore = target;
        elements.hudScore.textContent = String(target);
      }
    }
    state.scoreAnimId = requestAnimationFrame(step);
  }

  function updateHud() {
    elements.hudUser.textContent = state.username
      ? `${state.avatar} ${state.username}`
      : "-";
    elements.hudRank.textContent = getRank(state.score);
    animateScoreTo(state.score);
    if (state.isPractice) {
      elements.hudLives.textContent = "\u221E";
    } else {
      elements.hudLives.textContent = "\u2764\uFE0F".repeat(Math.max(0, state.lives)) +
        "\u{1F5A4}".repeat(Math.max(0, MAX_LIVES - state.lives));
    }

    if (elements.practiceChip) {
      if (state.isRetryMistakes) {
        elements.practiceChip.hidden = false;
        elements.practiceChip.textContent = "RETRY MISTAKES";
        elements.practiceChip.classList.remove("is-daily");
      } else if (state.isPractice) {
        elements.practiceChip.hidden = false;
        elements.practiceChip.textContent = "PRACTICE";
        elements.practiceChip.classList.remove("is-daily");
      } else if (state.isDaily) {
        elements.practiceChip.hidden = false;
        elements.practiceChip.textContent = "DAILY";
        elements.practiceChip.classList.add("is-daily");
      } else {
        elements.practiceChip.hidden = true;
        elements.practiceChip.classList.remove("is-daily");
      }
    }
    if (elements.endPracticeBtn) {
      elements.endPracticeBtn.hidden = !(state.isPractice && elements.gameView.classList.contains("active") && !state.ending);
    }

    document.body.classList.toggle("streak-hot", state.streak >= STREAK_TARGET && !state.ending);
  }

  /* ---------------- Timer ---------------- */
  function stopTimer() {
    if (state.timerId) {
      clearInterval(state.timerId);
      state.timerId = null;
    }
  }

  function startTimer() {
    stopTimer();
    // NEW FEATURE: Boss Questions run on a slashed 15s clock instead of 25s.
    if (state.bossQuestionActive) {
      state.activeTimeLimit = BOSS_TIME_LIMIT;
    } else if (state.isPractice || state.runType === "study") {
      const custom = getSelectedPracticeTimerSeconds();
      state.activeTimeLimit = custom; // 0 = timer off
    } else {
      state.activeTimeLimit = QUESTION_TIME_LIMIT;
    }
    state.timer = state.activeTimeLimit;
    if (state.activeTimeLimit === 0) {
      state.timer = 0;
    }
    renderTimerBar();

    // Timer off (Practice): no countdown / no timeout pressure
    if (state.activeTimeLimit === 0) {
      return;
    }

    state.timerId = setInterval(() => {
      state.timer -= 1;
      renderTimerBar();
      if (state.timer <= 0) {
        stopTimer();
        handleTimeout();
      }
    }, 1000);
  }

  function renderTimerBar() {
    if (!state.activeTimeLimit) {
      elements.timerBarFill.style.width = "100%";
      elements.timerBarFill.style.background = "#64ffda";
      elements.timerNum.textContent = "OFF";
      return;
    }
    const limit = state.activeTimeLimit || QUESTION_TIME_LIMIT;
    const pct = Math.max(0, (state.timer / limit) * 100);
    elements.timerBarFill.style.width = `${pct}%`;
    elements.timerNum.textContent = String(Math.max(0, state.timer));

    let color = "#64ffda";
    if (pct <= 60 && pct > 30) color = "#ffe066";
    if (pct <= 30) color = "#ff6b6b";
    elements.timerBarFill.style.background = color;
  }

  function handleTimeout() {
    if (state.locked || !state.currentQuestion) return;
    playWrongBuzz();
    state.answeredCount += 1;
    state.streak = 0;
    if (state.currentQuestion && state.currentQuestion.s) {
      recordMastery(state.currentQuestion.s, false);
      saveRecentMistake(state.currentQuestion);
    }
    state.mistakes.push({
      subject: state.currentQuestion.s,
      q: state.currentQuestion.q,
      chosen: "(Walang sagot \u2014 naubos ang oras)",
      correct: state.currentQuestion.answer
    });
    disableChoices(state.currentQuestion.answer);
    state.streak = 0;
    // Boss Question timing out still counts as a normal miss (no bonus/penalty change).
    state.bossQuestionActive = false;
    setBossVisuals(false);
    loseLife("timeout");
  }

  /* ---------------- Question flow ---------------- */
  // NEW FEATURE: subject-alternating pool. Instead of one flat shuffled list
  // (which can cluster several questions from the same subject back-to-back),
  // we group all questions by subject, shuffle each subject's own list, and
  // then round-robin across subjects when building the play order. This way
  // the same subject can't dominate a stretch of the run, and every single
  // question is used exactly once before anything repeats / the pool reshuffles.
  // Reuses the subjectPoolMap built once, above, from the actual
  // questionBank — no second copy of "which subjects exist" anywhere.
  const subjectPools = Array.from(subjectPoolMap.values());

  // NEW FEATURE: mode-aware pool builder. RANDOM / ALL SUBJECTS keeps the
  // exact original round-robin-across-subjects behavior untouched. A
  // subject-specific mode instead round-robins across a pool list
  // containing only that one subject, so only its own questions can ever
  // be drawn — the existing shuffle/round-robin logic is reused as-is.
  function buildPool() {
    // PHASE 1: Retry Mistakes uses a dedicated pool reconstructed from this session's misses.
    if (state.isRetryMistakes && state.retryQuestionPool.length) {
      state.activePool = shuffle(state.retryQuestionPool.slice());
      state.currentIndex = 0;
      return;
    }

    // PHASE 2: Daily Challenge — deterministic shared set for the local calendar day.
    if (state.isDaily) {
      state.dailyDateKey = getLocalDateKey();
      state.activePool = buildDailyPool();
      state.currentIndex = 0;
      return;
    }

    // Study Plan: prioritize low mastery subjects + recent mistakes
    if (state.runType === "study") {
      state.activePool = buildStudyPlanPool();
      state.currentIndex = 0;
      return;
    }

    const mode = getModeConfig(state.selectedMode);
    const activeSubjectPools = mode.id === RANDOM_MODE_ID
      ? subjectPools
      : mode.subjects.map((subject) => subjectPoolMap.get(subject)).filter(Boolean);

    const shuffledSubjectQueues = shuffle(activeSubjectPools).map((list) => shuffle(list));
    const pool = [];
    let remaining = true;
    while (remaining) {
      remaining = false;
      for (const queue of shuffledSubjectQueues) {
        if (queue.length) {
          pool.push(queue.shift());
          if (queue.length) remaining = true;
        }
      }
    }
    state.activePool = pool;
    state.currentIndex = 0;
  }

  // NEW FEATURE: Boss Question subject now adapts to the selected Game
  // Mode. RANDOM / ALL SUBJECTS preserves the original hardest-subject hack
  // (ITEC 102). A subject-specific mode must never violate its own
  // subject-only restriction, so its Boss Question is instead pulled from
  // that same selected subject.
  function getBossSubjectForActiveMode() {
    return state.selectedMode === RANDOM_MODE_ID ? BOSS_SUBJECT : state.selectedMode;
  }

  function getBossQuestion() {
    const pool = subjectPoolMap.get(getBossSubjectForActiveMode());
    if (!pool || !pool.length) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // Toggles the red boss-mode visuals on the subject chip, stream label, and arena border.
  function setBossVisuals(active) {
    document.body.classList.toggle("boss-active", !!active);
    if (elements.subjectChip) elements.subjectChip.classList.toggle("boss-chip", !!active);
    const streamChip = document.querySelector(".stream-chip");
    if (streamChip) streamChip.classList.toggle("boss-stream", !!active);
  }

  function loadNextQuestion() {
    if (state.ending || state.sessionLocked) return;

    let question = null;

    // NEW FEATURE: if a Boss Question was just triggered, force-pull it
    // from the hardest subject pool instead of the normal shuffled pool.
    if (state.bossQuestionActive) {
      question = getBossQuestion();
    }

    if (!question) {
      state.bossQuestionActive = false;
      setBossVisuals(false);
      if (state.currentIndex >= state.activePool.length) {
        // PHASE 1: Retry Mistakes finishes after one full pass of the miss set.
        if (state.isRetryMistakes) {
          window.setTimeout(() => endGame("retry_done"), 200);
          return;
        }
        // PHASE 2: Daily Challenge is a finite 12-question set.
        if (state.isDaily) {
          window.setTimeout(() => endGame("daily_complete"), 200);
          return;
        }
        if (state.runType === "study") {
          window.setTimeout(() => endGame("study_complete"), 200);
          return;
        }
        buildPool();
      }
      question = state.activePool[state.currentIndex];
      state.currentIndex += 1;
    }

    state.currentQuestion = question;
    state.locked = false;
    state.hiddenChoices = new Set();
    state.hasUsed5050 = false;
    state.hasUsedSkip = false;
    if (elements.fiftyBtn) elements.fiftyBtn.disabled = false;
    if (elements.skipBtn) elements.skipBtn.disabled = false;

    setBossVisuals(state.bossQuestionActive);
    elements.subjectChip.textContent = state.bossQuestionActive
      ? `\u2694\uFE0F BOSS: ${question.s}`
      : question.s;
    elements.questionText.textContent = question.q;
    elements.feedback.textContent = "";
    elements.feedback.className = "feedback";

    renderChoiceButtons();
    startTimer();
  }

  function renderChoiceButtons() {
    const question = state.currentQuestion;
    elements.choicesWrap.innerHTML = "";
    const options = shuffle(question.choices);

    options.forEach((choice) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "choice";
      btn.textContent = choice;

      if (state.hiddenChoices.has(choice)) {
        btn.style.visibility = "hidden";
        btn.disabled = true;
      }

      bindTap(btn, (event) => {
        event.preventDefault();
        handleAnswer(choice, btn);
      });

      elements.choicesWrap.appendChild(btn);
    });
  }

  function disableChoices(correctAnswer) {
    const buttons = elements.choicesWrap.querySelectorAll(".choice");
    buttons.forEach((btn) => {
      btn.disabled = true;
      if (btn.textContent === correctAnswer) {
        btn.classList.add("correct");
      }
    });
  }

  function handleAnswer(choice, btnEl) {
    if (state.locked || !state.currentQuestion) return;
    state.locked = true;
    stopTimer();

    const correct = choice === state.currentQuestion.answer;
    const buttons = elements.choicesWrap.querySelectorAll(".choice");

    buttons.forEach((btn) => { btn.disabled = true; });

    // NEW FEATURE: Boss Questions were flagged when this question loaded —
    // capture that now, before any state gets reset below.
    const wasBossQuestion = state.bossQuestionActive;

    if (correct) {
      btnEl.classList.add("correct");
      state.streak += 1;
      let gained;
      if (wasBossQuestion) {
        // Boss Question correct answer: flat DOUBLE points, no streak stacking.
        gained = BOSS_SCORE_PER_CORRECT;
      } else {
        gained = SCORE_PER_CORRECT;
        if (state.streak > 0 && state.streak % STREAK_TARGET === 0) {
          gained += STREAK_BONUS;
        }
      }
      const oldScore = state.score;
      state.score += gained;
      playCorrectBeep();
      state.answeredCount += 1;
      state.correctCount += 1;
      if (state.streak > state.bestStreak) state.bestStreak = state.streak;
      if (state.currentQuestion && state.currentQuestion.s) {
        recordMastery(state.currentQuestion.s, true);
      }

      if (wasBossQuestion) {
        state.bossQuestionActive = false;
        setBossVisuals(false);
        elements.feedback.textContent = `\u2694\uFE0F BOSS DEFEATED! +${gained} points (DOUBLE) \u00b7 Keep going, Scholar!`;
        elements.feedback.className = "feedback is-boss-win";
      } else {
        elements.feedback.textContent = `Correct! +${gained} points \u00b7 Streak ${state.streak}`;
        elements.feedback.className = "feedback";
      }
      updateHud();

      const milestone = getCrossedMilestone(oldScore, state.score);
      if (milestone) {
        state.milestonesHit.add(milestone);
        state.lives += 2;
        updateHud();
        stopTimer();
        playFanfare(false);
        showMilestoneOverlay(milestone, () => {
          // NEW FEATURE: some checkpoints are also Boss Question triggers.
          // PHASE 2: Daily Challenge stays a pure shared set — no boss inject.
          if (!state.isDaily && BOSS_THRESHOLDS.includes(milestone) && !state.bossHit.has(milestone)) {
            state.bossHit.add(milestone);
            window.setTimeout(() => triggerBossSequence(), 200);
          } else {
            window.setTimeout(loadNextQuestion, 250);
          }
        });
        return;
      }

      window.setTimeout(loadNextQuestion, 550);
    } else {
      btnEl.classList.add("wrong");
      buttons.forEach((btn) => {
        if (btn.textContent === state.currentQuestion.answer) btn.classList.add("correct");
      });
      state.mistakes.push({
        subject: state.currentQuestion.s,
        q: state.currentQuestion.q,
        chosen: choice,
        correct: state.currentQuestion.answer
      });
      state.streak = 0;
      playWrongBuzz();
      state.answeredCount += 1;
      if (state.currentQuestion && state.currentQuestion.s) {
        recordMastery(state.currentQuestion.s, false);
        saveRecentMistake(state.currentQuestion);
      }
      // Boss Question wrong answer: normal -1 heart, no extra penalty.
      state.bossQuestionActive = false;
      setBossVisuals(false);
      const hint = "Tamang sagot: " + state.currentQuestion.answer;
      if (state.isPractice) {
        elements.feedback.innerHTML = (wasBossQuestion
          ? "Boss question — mali. Practice mode: walang bawas na heart."
          : "Mali. Practice mode: walang bawas na heart.") +
          '<div class="answer-hint">' + escapeHtml(hint) + "</div>";
      } else {
        elements.feedback.innerHTML = (wasBossQuestion
          ? "Boss question — mali. Isang heart lang ang nabawas."
          : "Mali. Isang heart ang nabawas.") +
          '<div class="answer-hint">' + escapeHtml(hint) + "</div>";
      }
      elements.feedback.className = "feedback is-wrong";
      updateHud();
      loseLife("wrong");
    }
  }

  function loseLife(reason) {
    // PHASE 1: Practice / Retry Mistakes never lose hearts and never game-over from lives.
    if (state.isPractice) {
      updateHud();
      window.setTimeout(loadNextQuestion, 650);
      return;
    }
    state.lives -= 1;
    updateHud();
    if (state.lives <= 0) {
      window.setTimeout(() => endGame(reason), 500);
    } else {
      window.setTimeout(loadNextQuestion, 650);
    }
  }

  /* ---------------- 25-point milestones ---------------- */
  function getCrossedMilestone(oldScore, newScore) {
    const milestone = Math.floor(newScore / 25) * 25;
    if (milestone > 0 && milestone > oldScore && !state.milestonesHit.has(milestone)) {
      return milestone;
    }
    return null;
  }

  function showMilestoneOverlay(milestone, onDone) {
    const overlay = document.createElement("div");
    overlay.className = "milestone-overlay";
    const line = milestoneLines[Math.floor(Math.random() * milestoneLines.length)];
    overlay.innerHTML =
      '<div class="milestone-box">' +
        '<p class="milestone-tag">[CHECKPOINT :: SCORE ' + milestone + ']</p>' +
        '<p class="milestone-line">' + escapeHtml(line) + '</p>' +
        '<p class="milestone-reward">+2 \u2764\uFE0F HEARTS AWARDED</p>' +
      '</div>';
    document.body.appendChild(overlay);

    window.setTimeout(() => {
      overlay.classList.add("fade-out");
      window.setTimeout(() => {
        overlay.remove();
        if (typeof onDone === "function") onDone();
      }, 260);
    }, 1200);
  }

  /* ---------------- ⚔️ NEW FEATURE: Boss Question subject-hack ---------------- */
  function triggerBossSequence() {
    if (state.ending || state.sessionLocked) return;
    playWrongBuzz();

    const bossSubject = getBossSubjectForActiveMode();
    const flashOverlay = document.createElement("div");
    flashOverlay.className = "boss-flash-overlay";
    const flashText = document.createElement("div");
    flashText.className = "boss-flash-text";
    flashText.innerHTML =
      "<span>\u26A0\uFE0F BOSS LEVEL WARNING! \u26A0\uFE0F</span>" +
      "<small>SUBJECT HACK DETECTED \u2014 " + escapeHtml(bossSubject) + " INCOMING \u2014 " + BOSS_TIME_LIMIT + "s CLOCK</small>";
    document.body.appendChild(flashOverlay);
    document.body.appendChild(flashText);

    window.setTimeout(() => {
      flashOverlay.remove();
      flashText.remove();
      state.bossQuestionActive = true;
      loadNextQuestion();
    }, BOSS_FLASH_DURATION_MS);
  }

  /* ---------------- Blur / focus anti-cheat ---------------- */
  function handleWindowBlur() {
    if (!state.allowBlurPenalty) return;
    // Practice runs are learning sessions — no tab-switch penalty.
    if (state.isPractice) return;
    if (elements.gameView.classList.contains("active") && !state.locked && !state.ending) {
      endGame("blur");
    }
  }

  function handleGlobalKeys(event) {
    if (event.key === "Escape") {
      const overlay = document.querySelector(".admin-overlay");
      if (overlay) overlay.remove();
    }
  }

  /* ---------------- Start / reboot ---------------- */
  function resetArena() {
    state.score = 0;
    state.lives = MAX_LIVES;
    state.currentQuestion = null;
    state.currentIndex = 0;
    state.locked = false;
    state.streak = 0;
    state.hasUsed5050 = false;
    state.hasUsedSkip = false;
    state.hiddenChoices = new Set();
    state.ending = false;
    state.victoryAchieved = false;
    state.mistakes = [];
    state.displayedScore = 0;
    state.milestonesHit = new Set();
    state.bestStreak = 0;
    state.answeredCount = 0;
    state.correctCount = 0;
    // NEW FEATURE: reset Boss Question state for a fresh run.
    state.bossQuestionActive = false;
    state.bossHit = new Set();
    state.activeTimeLimit = QUESTION_TIME_LIMIT;
    setBossVisuals(false);
    // Note: isPractice / isRetryMistakes / retryQuestionPool are controlled by
    // startGame / startRetryMistakes / rebootArena — not wiped here blindly
    // so retry can call resetArena after setting those flags.
    buildPool();
    updateHud();
  }

  function startGame() {
    if (state.sessionLocked) return;
    if (!authState.role) {
      elements.loginStatus.textContent = "Sign in muna sa Section Access gate.";
      return;
    }
    if (!canPlayArena()) {
      elements.loginStatus.textContent = "Guest browse-only: Arena locked. Request a Guest Pass from RST Admin.";
      return;
    }
    // Guests with pass: Practice / Study only
    if (isGuest() && state.runType !== "practice" && state.runType !== "study") {
      selectRunType("practice");
      elements.loginStatus.textContent = "Guest Pass: Practice / Study Plan only. Ranked & Daily are classmate-only.";
      return;
    }

    if ((isClassmate() || isAdmin()) && !(elements.usernameInput.value || "").trim()) {
      syncArenaUsernameField();
    }
    const raw = elements.usernameInput.value || ((isClassmate() || isAdmin()) ? classmateArenaName() : "");
    const cleaned = sanitizeUsername(raw);

    if (!cleaned) {
      elements.loginStatus.textContent = isGuest()
        ? "Ilagay at i-Done ang guest display name bago mag-START."
        : "Kailangan ng username bago simulan ang challenge.";
      return;
    }
    if (containsBadWord(cleaned)) {
      elements.loginStatus.textContent = "Gumamit ng angkop na username, walang bastos na salita.";
      return;
    }

    state.username = cleaned;
    // Fresh run (not a retry) clears retry pool flags.
    state.isRetryMistakes = false;
    state.retryQuestionPool = [];
    // Sync flags from run-type selector (ranked / practice / daily).
    state.isPractice = state.runType === "practice";
    state.isDaily = state.runType === "daily";
    state.dailyDateKey = state.isDaily ? getLocalDateKey() : "";
    resetArena();
    updateHud();
    // NEW FEATURE: make the selected Game Mode visible in the HUD stream
    // chip for the whole run (the subject chip beside it still always shows
    // the actual current question's subject — the two are never confused).
    if (elements.streamModeLabel) {
      if (state.isDaily) {
        elements.streamModeLabel.textContent = `DAILY_${getLocalDateKey()}`;
      } else if (state.runType === "study") {
        elements.streamModeLabel.textContent = "STUDY_PLAN";
      } else {
        const base = getModeConfig(state.selectedMode).streamLabel;
        elements.streamModeLabel.textContent = state.isPractice ? `PRACTICE_${base}` : base;
      }
    }
    setView("gameView");
    updateHud();
    loadNextQuestion();
  }

  function rebootArena() {
    if (state.sessionLocked) {
      window.location.reload();
      return;
    }
    stopTimer();
    state.username = "";
    state.bestScore = 0;
    state.isRetryMistakes = false;
    state.retryQuestionPool = [];
    state.isDaily = false;
    state.dailyDateKey = "";
    resetArena();
    // NEW FEATURE: a fresh arena run returns to RANDOM / ALL SUBJECTS by
    // default rather than silently keeping whatever mode was last played.
    selectMode(RANDOM_MODE_ID);
    selectRunType(isGuest() ? "practice" : "ranked");
    setView("loginView");
    syncArenaUsernameField();
    if (isGuest()) {
      elements.usernameInput.value = "";
      elements.usernameInput.readOnly = false;
      elements.usernameInput.classList.remove("is-name-locked");
      elements.loginStatus.textContent = "Guest: type a display name, tap Done, then pick mode.";
      // do not auto-focus — avoids keyboard covering mode list
    } else {
      elements.loginStatus.textContent = "Classmate name locked. Pumili ng mode / run type, then START.";
    }
  }

  /* ---------------- Leaderboard (Firebase + local fallback) ----------------
     Per-mode boards: arena_scores/{boardKey}/{usernameKey}
     boardKey examples: "random", "itec_101", "gec_102", "pi_100", "komfil"
     Only the active board is fetched — never the whole tree. */
  async function fetchScores(modeId) {
    const boardKey = modeToBoardKey(modeId != null ? modeId : state.leaderboardMode);

    if (db) {
      try {
        const snap = await get(ref(db, `${FIREBASE_TABLE}/${boardKey}`));
        if (snap.exists()) {
          const val = snap.val();
          // Guard: if this node is still a flat legacy username entry (has
          // score at this level), treat it as empty for the new structure.
          if (val && typeof val === "object" && !("score" in val && "username" in val)) {
            return Object.keys(val).map((key) => ({ id: key, boardKey, ...val[key] }));
          }
        }
        return [];
      } catch (error) {
        console.warn("[Arena] Firebase read failed, using local cache:", error);
      }
    }

    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      // v6 shape: { random: [...], itec_101: [...] }
      if (raw && typeof raw === "object" && !Array.isArray(raw)) {
        const list = raw[boardKey];
        return Array.isArray(list) ? list.map((e) => ({ ...e, boardKey })) : [];
      }
      // v5 flat array fallback → only surface under random
      if (Array.isArray(raw) && boardKey === "random") {
        return raw.map((e) => ({ ...e, boardKey }));
      }
      return [];
    } catch {
      return Array.isArray(fallbackScores) ? fallbackScores : [];
    }
  }

  async function persistScores(list, modeId) {
    const boardKey = modeToBoardKey(modeId != null ? modeId : state.leaderboardMode);
    fallbackScores = list;
    try {
      let store = {};
      try {
        const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
        if (raw && typeof raw === "object" && !Array.isArray(raw)) {
          store = raw;
        } else if (Array.isArray(raw)) {
          // One-time lift of flat v5 list into random board.
          store = { random: raw };
        }
      } catch {
        store = {};
      }
      store[boardKey] = list;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch (error) {
      console.warn("[Arena] localStorage write failed:", error);
    }
  }

  /* ---------------- One-time legacy score conversion (per-board) ---------------- */
  async function migrateLegacyScores() {
    // Migrate each known board independently so mixed boards stay isolated.
    const modeIds = GAME_MODES.map((m) => m.id);
    let totalMigrated = 0;

    for (const modeId of modeIds) {
      let all;
      try {
        all = await fetchScores(modeId);
      } catch (error) {
        console.warn("[Arena] Could not load scores for migration:", error);
        continue;
      }
      if (!all.length) continue;

      const legacyEntries = all.filter(
        (entry) => !entry.scoreVersion || entry.scoreVersion < SCORE_MIGRATION_VERSION
      );
      if (!legacyEntries.length) continue;

      const boardKey = modeToBoardKey(modeId);
      const migrated = all.map((entry) => {
        if (entry.scoreVersion && entry.scoreVersion >= SCORE_MIGRATION_VERSION) return entry;
        const oldScore = Number(entry.score || 0);
        const newScore = Math.max(0, Math.round(oldScore * LEGACY_TO_CURRENT_RATIO));
        return {
          ...entry,
          score: newScore,
          badge: getRank(newScore),
          scoreVersion: SCORE_MIGRATION_VERSION
        };
      });

      if (db) {
        try {
          await Promise.all(
            migrated
              .filter((entry) => entry.id)
              .map((entry) => {
                const { id, boardKey: _bk, ...rest } = entry;
                return set(ref(db, `${FIREBASE_TABLE}/${boardKey}/${id}`), {
                  username: rest.username,
                  score: rest.score,
                  badge: rest.badge,
                  avatar: rest.avatar || "",
                  ts: rest.ts || Date.now(),
                  scoreVersion: rest.scoreVersion || SCORE_MIGRATION_VERSION
                });
              })
          );
        } catch (error) {
          console.warn("[Arena] Firebase score migration failed for", boardKey, error);
        }
      }

      await persistScores(migrated, modeId);
      totalMigrated += legacyEntries.length;
    }

    if (totalMigrated) {
      console.log(`[Arena] Migrated ${totalMigrated} legacy score(s) across mode boards.`);
    }
  }

  async function saveScore() {
    // PHASE 1: Practice / Retry Mistakes never write to the competitive leaderboard.
    if ((state.isPractice && !state.isDaily) || state.isRetryMistakes) {
      console.log("[Arena] Practice/Retry run — score not saved to leaderboard.");
      return;
    }
    // Access policy: only verified classmates may write competitive boards.
    if (!isClassmate()) {
      console.log("[Arena] Guest session — competitive score write blocked.");
      return;
    }
    const key = usernameKey(state.username);
    // PHASE 2: Daily scores go to arena_scores/daily_YYYYMMDD/{user}
    const boardKey = state.isDaily
      ? (DAILY_LEADERBOARD_PREFIX + (state.dailyDateKey || getLocalDateKey()))
      : modeToBoardKey(state.selectedMode);
    const modeId = state.isDaily ? LEADERBOARD_DAILY_ID : state.selectedMode;
    const entry = {
      username: state.username,
      score: state.score,
      badge: getRank(state.score),
      avatar: state.avatar,
      ts: Date.now(),
      scoreVersion: SCORE_MIGRATION_VERSION
    };

    if (db && key) {
      try {
        const entryRef = ref(db, `${FIREBASE_TABLE}/${boardKey}/${key}`);
        const snap = await get(entryRef);
        if (snap.exists() && Number(snap.val().score || 0) >= state.score) {
          // Existing high score on THIS board is already equal or better.
          return;
        }
        await set(entryRef, entry);
        if (!state.isDaily) {
          const season = getCurrentSeasonKey();
          if (season) {
            try {
              const seasonRef = ref(db, `${FIREBASE_TABLE}/${season}/${key}`);
              const seasonSnap = await get(seasonRef);
              if (!seasonSnap.exists() || Number(seasonSnap.val().score || 0) < state.score) {
                await set(seasonRef, entry);
              }
            } catch (seasonErr) {
              console.warn("[Arena] season board write skipped:", seasonErr);
            }
          }
        }
        return;
      } catch (error) {
        console.warn("[Arena] Firebase write failed, saving locally instead:", error);
      }
    }

    const list = await fetchScores(modeId);
    const idx = list.findIndex((item) => usernameKey(item.username) === key);
    if (idx >= 0) {
      if (Number(list[idx].score || 0) < state.score) list[idx] = { ...entry, id: key, boardKey };
    } else {
      list.push({ ...entry, id: key, boardKey });
    }
    await persistScores(list, modeId);
  }

  function medalFor(rankIndex) {
    if (rankIndex === 0) return { medal: "\u{1F947}", cls: "row-gold" };
    if (rankIndex === 1) return { medal: "\u{1F948}", cls: "row-silver" };
    if (rankIndex === 2) return { medal: "\u{1F949}", cls: "row-bronze" };
    return { medal: "", cls: "" };
  }

  function renderLeaderboardModeTabs() {
    const host = $("lbModeTabs");
    if (!host) return;
    host.innerHTML = "";

    const tabDefs = [
      { id: LEADERBOARD_DAILY_ID, label: "DAILY" },
      ...GAME_MODES.map((mode) => ({
        id: mode.id,
        label: mode.id === RANDOM_MODE_ID ? "RANDOM" : mode.label
      }))
    ];
    const seasonKey = getCurrentSeasonKey();
    if (seasonKey) {
      tabDefs.push({ id: seasonKey, label: seasonKey === "season_midterms" ? "MIDTERMS" : "FINALS" });
    }

    tabDefs.forEach((tab) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "lb-mode-tab" + (tab.id === state.leaderboardMode ? " selected" : "");
      btn.textContent = tab.label;
      btn.setAttribute("aria-pressed", tab.id === state.leaderboardMode ? "true" : "false");
      bindTap(btn, (event) => {
        event.preventDefault();
        if (state.leaderboardMode === tab.id) return;
        state.leaderboardMode = tab.id;
        renderLeaderboard();
      });
      host.appendChild(btn);
    });
  }

  async function renderLeaderboard() {
    if (!elements.leaderboardBody) return;

    // Keep tabs + title in sync with the board being viewed.
    renderLeaderboardModeTabs();
    const isDailyBoard = state.leaderboardMode === LEADERBOARD_DAILY_ID;
    const isSeasonBoard = state.leaderboardMode === "season_midterms" || state.leaderboardMode === "season_finals";
    const mode = isDailyBoard
      ? { id: LEADERBOARD_DAILY_ID, label: "Daily Challenge (" + getLocalDateKey() + ")" }
      : isSeasonBoard
        ? { id: state.leaderboardMode, label: getSeasonLabel(state.leaderboardMode) }
      : getModeConfig(state.leaderboardMode);
    if (elements.lbTitle) {
      elements.lbTitle.textContent = isDailyBoard
        ? "Top Arena Challengers \u00b7 DAILY"
        : isSeasonBoard
          ? ("Top Arena Challengers \u00b7 " + String(mode.label).toUpperCase())
        : mode.id === RANDOM_MODE_ID
          ? "Top Arena Challengers \u00b7 RANDOM"
          : `Top Arena Challengers \u00b7 ${mode.label}`;
    }
    const note = $("lbNote");
    if (note) {
      note.textContent = isDailyBoard
        ? "Top 10 \u00b7 Today's shared Daily Challenge board"
        : isSeasonBoard
          ? "Top 10 \u00b7 Season board (ranked runs this term)"
        : mode.id === RANDOM_MODE_ID
          ? "Top 10 \u00b7 Random / All Subjects board"
          : `Top 10 \u00b7 ${mode.label} only`;
    }

    elements.leaderboardBody.innerHTML =
      `<tr><td colspan="4" class="lb-empty">Loading ${escapeHtml(mode.label)} board\u2026</td></tr>`;

    const all = await fetchScores(state.leaderboardMode);
    const top = all
      .slice()
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 10);

    if (!top.length) {
      elements.leaderboardBody.innerHTML =
        `<tr><td colspan="4" class="lb-empty">
          <div>No challenger records yet for <strong>${escapeHtml(mode.label)}</strong>.</div>
          <div style="margin-top:0.35rem;opacity:0.9;">Be the first Scholar on this board.</div>
          <button type="button" class="lb-cta-btn" id="lbEmptyCta">Play ${escapeHtml(mode.label)}</button>
        </td></tr>`;
      const cta = $("lbEmptyCta");
      if (cta) {
        bindTap(cta, (event) => {
          event.preventDefault();
          closeModal("leaderboardModal");
          setView("loginView");
          if (state.leaderboardMode === LEADERBOARD_DAILY_ID) {
            selectRunType("daily");
            if (elements.loginStatus) {
              elements.loginStatus.textContent = "Ready: Daily Challenge. Enter username then START DAILY CHALLENGE.";
            }
          } else {
            selectMode(state.leaderboardMode);
            selectRunType("ranked");
            if (elements.loginStatus) {
              elements.loginStatus.textContent = `Ready: Ranked · ${getModeConfig(state.leaderboardMode).label}. Enter username then INITIALIZE.`;
            }
          }
          if (elements.usernameInput) elements.usernameInput.focus();
        });
      }
      return;
    }

    elements.leaderboardBody.innerHTML = top
      .map((entry, index) => {
        const { medal, cls } = medalFor(index);
        const avatar = entry.avatar ? `<span class="lb-avatar">${escapeHtml(entry.avatar)}</span>` : "";
        return `<tr class="${cls}">
          <td><span class="lb-rank">${medal ? `<span class="lb-medal">${medal}</span>` : ""}${index + 1}</span></td>
          <td>${avatar}${escapeHtml(entry.username || "Anonymous")}</td>
          <td>${escapeHtml(entry.badge || getRank(entry.score || 0))}</td>
          <td>${Number(entry.score || 0)}</td>
        </tr>`;
      })
      .join("");
  }

  /* ---------------- Leaderboard admin: edit / recalc / reset ---------------- */
  function initAdminTrigger() {
    const title = elements.lbTitle;
    if (!title) return;
    let taps = 0;
    let tapTimer = null;

    bindTap(title, (event) => {
      event.preventDefault();
      taps += 1;
      if (tapTimer) clearTimeout(tapTimer);
      tapTimer = window.setTimeout(() => { taps = 0; }, 1600);
      if (taps >= 5) {
        taps = 0;
        openAdminGate();
      }
    });
  }

  function openAdminGate() {
    /* SECURITY: the frontend passcode gate is gone. The panel can open,
       but Firebase Rules now reject any attempt (from here or anywhere
       else) to overwrite or delete an existing leaderboard entry, so
       there is no real admin power left to protect client-side. */
    openAdminPanel();
  }

  async function openAdminPanel() {
    const existing = document.querySelector(".admin-overlay");
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.className = "admin-overlay";

    const mode = getModeConfig(state.leaderboardMode);
    const boardKey = modeToBoardKey(state.leaderboardMode);

    const panel = document.createElement("div");
    panel.className = "admin-panel";
    panel.innerHTML = `<h3 style="margin:0 0 10px;font-size:1rem;">Leaderboard Admin</h3>
      <p style="margin:0 0 10px;font-size:0.78rem;color:var(--muted);">
        Board: <strong>${escapeHtml(mode.label)}</strong> (<code>${escapeHtml(boardKey)}</code>).
        I-edit ang score o i-delete ang isang entry sa board na ito lang.
      </p>
      <div id="adminRows"></div>
      <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;">
        <button type="button" class="lifeline-btn" id="adminClose">Close</button>
        <button type="button" class="lifeline-btn admin-danger" id="adminResetBoard">Reset THIS Board</button>
      </div>`;

    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    const rowsHost = panel.querySelector("#adminRows");
    const all = await fetchScores(state.leaderboardMode);
    const sorted = all.slice().sort((a, b) => (b.score || 0) - (a.score || 0));

    if (!sorted.length) {
      rowsHost.innerHTML = `<p class="lb-empty">Walang records sa board na ito.</p>`;
    } else {
      sorted.forEach((entry) => {
        const row = document.createElement("div");
        row.className = "admin-row";
        row.innerHTML = `<span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(entry.avatar || "")} ${escapeHtml(entry.username || "Anonymous")}</span>
          <input type="number" value="${Number(entry.score || 0)}" />
          <button type="button" class="admin-save">Save</button>
          <button type="button" class="admin-danger admin-delete">Del</button>`;

        const input = row.querySelector("input");
        const saveBtn = row.querySelector(".admin-save");
        const delBtn = row.querySelector(".admin-delete");

        bindTap(saveBtn, async (event) => {
          event.preventDefault();
          const newScore = Math.max(0, parseInt(input.value, 10) || 0);
          entry.score = newScore;
          entry.badge = getRank(newScore);
          entry.scoreVersion = SCORE_MIGRATION_VERSION;
          entry.boardKey = boardKey;
          await writeEntry(entry);
          await renderLeaderboard();
          saveBtn.textContent = "Saved";
          window.setTimeout(() => { saveBtn.textContent = "Save"; }, 900);
        });

        bindTap(delBtn, async (event) => {
          event.preventDefault();
          if (!window.confirm(`Alisin ang record ni ${entry.username} sa ${mode.label}?`)) return;
          await deleteEntry(entry);
          row.remove();
          await renderLeaderboard();
        });

        rowsHost.appendChild(row);
      });
    }

    bindTap(panel.querySelector("#adminClose"), (event) => {
      event.preventDefault();
      overlay.remove();
    });

    bindTap(panel.querySelector("#adminResetBoard"), async (event) => {
      event.preventDefault();
      if (!window.confirm(`Sigurado ka bang gusto mong i-reset ang ${mode.label} board? Hindi na ito maibabalik.`)) return;
      await resetBoardScores(state.leaderboardMode);
      overlay.remove();
      await renderLeaderboard();
    });

    bindTap(overlay, (event) => {
      if (event.target === overlay) overlay.remove();
    });
  }

  async function writeEntry(entry) {
    const boardKey = entry.boardKey || modeToBoardKey(state.leaderboardMode);
    const id = entry.id || usernameKey(entry.username);
    if (db && id) {
      try {
        await set(ref(db, `${FIREBASE_TABLE}/${boardKey}/${id}`), {
          username: entry.username,
          score: entry.score,
          badge: entry.badge,
          avatar: entry.avatar || "",
          ts: entry.ts || Date.now(),
          scoreVersion: entry.scoreVersion || SCORE_MIGRATION_VERSION
        });
        return;
      } catch (error) {
        console.warn("[Arena] Firebase edit failed, falling back to local:", error);
      }
    }
    const list = await fetchScores(getModeIdFromBoardKey(boardKey));
    const idx = list.findIndex(
      (item) => (item.id && item.id === id) || (item.username === entry.username && item.ts === entry.ts)
    );
    if (idx >= 0) list[idx] = { ...entry, id, boardKey };
    await persistScores(list, getModeIdFromBoardKey(boardKey));
  }

  async function deleteEntry(entry) {
    const boardKey = entry.boardKey || modeToBoardKey(state.leaderboardMode);
    const id = entry.id || usernameKey(entry.username);
    if (db && id) {
      try {
        await remove(ref(db, `${FIREBASE_TABLE}/${boardKey}/${id}`));
        return;
      } catch (error) {
        console.warn("[Arena] Firebase delete failed, falling back to local:", error);
      }
    }
    const modeId = getModeIdFromBoardKey(boardKey);
    const list = await fetchScores(modeId);
    const filtered = list.filter(
      (item) => !(item.id === id || (item.username === entry.username && item.ts === entry.ts))
    );
    await persistScores(filtered, modeId);
  }

  async function resetBoardScores(modeId) {
    const boardKey = modeToBoardKey(modeId);
    if (db) {
      try {
        await remove(ref(db, `${FIREBASE_TABLE}/${boardKey}`));
      } catch (error) {
        console.warn("[Arena] Firebase board reset failed, clearing local cache instead:", error);
      }
    }
    await persistScores([], modeId);
  }

  /* ---------------- Confetti ---------------- */
  function startConfettiEffect() {
    const canvas = $("confettiCanvas");
    if (!canvas) return () => {};
    canvas.hidden = false;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext("2d");
    const colors = ["#64ffda", "#00e5ff", "#ffd27d", "#ff6b6b", "#eaf5ff"];
    const particles = Array.from({ length: 140 }, () => ({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * canvas.height,
      r: 4 + Math.random() * 5,
      c: colors[Math.floor(Math.random() * colors.length)],
      vy: 2 + Math.random() * 3,
      vx: -1.5 + Math.random() * 3,
      rot: Math.random() * Math.PI,
      vr: -0.1 + Math.random() * 0.2
    }));

    let running = true;
    function tick() {
      if (!running) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        if (p.y > canvas.height + 20) p.y = -20;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 0.6);
        ctx.restore();
      });
      requestAnimationFrame(tick);
    }
    tick();

    return () => {
      running = false;
      canvas.hidden = true;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }

  // Graduation win (500) reuses the shared retro sound engine's big fanfare,
  // and correctly respects the mute toggle.
  function playVictoryFanfare() {
    playFanfare(true);
  }

  /* ---------------- Overlay helper for graduation / session lock ---------------- */
  function createOverlayShell() {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    const panel = document.createElement("div");
    panel.className = "modal-panel";
    panel.style.textAlign = "left";
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    return { overlay, panel };
  }

  function showGraduationModal() {
    return new Promise((resolve) => {
      const { overlay, panel } = createOverlayShell();
      panel.style.textAlign = "center";
      panel.innerHTML =
        "<h2 style='margin:0 0 12px;font-size:1.5rem;'>\u{1F393} CONGRATULATIONS, GRADUATE! \u{1F393}</h2>" +
        "<p style='line-height:1.7;margin:0 0 10px;font-size:0.9rem;color:rgba(230,241,255,0.88);'>You have officially conquered the BSCS 1-A Academic Reviewer Arena with a Perfect Master Score of 500+! You are now certified as the ultimate <strong>Academic Overlord</strong> of the section. Good luck on your actual exams, Scholar!</p>" +
        "<p style='margin:0 0 8px;'><strong>Final Score:</strong> " + state.score + "</p>" +
        "<p style='margin:0 0 18px;'><strong>Rank:</strong> " + escapeHtml(getRank(state.score)) + "</p>";

      const button = document.createElement("button");
      button.type = "button";
      button.className = "modal-enter";
      button.textContent = "Close Graduation Modal";

      bindTap(button, (event) => {
        event.preventDefault();
        overlay.remove();
        resolve();
      });

      panel.appendChild(button);
    });
  }

  function showSessionLockScreen() {
    const { panel } = createOverlayShell();
    panel.innerHTML =
      "<h2 style='margin:0 0 12px;font-size:1.3rem;'>Session Locked</h2>" +
      "<p style='line-height:1.7;margin:0 0 16px;font-size:0.88rem;color:rgba(230,241,255,0.88);'>Na-save na ang iyong graduation score sa cloud. Para maiwasan ang abuse, naka-lock na ang current session. I-reload ang page para sa bagong arena run.</p>";

    const reloadButton = document.createElement("button");
    reloadButton.type = "button";
    reloadButton.className = "modal-enter";
    reloadButton.textContent = "Reload Page";
    bindTap(reloadButton, (event) => {
      event.preventDefault();
      window.location.reload();
    });
    panel.appendChild(reloadButton);
  }

  async function handleGraduationWin() {
    if (state.ending) return;
    state.ending = true;
    state.victoryAchieved = true;
    state.bossQuestionActive = false;
    setBossVisuals(false);
    state.locked = true;
    state.allowBlurPenalty = false;
    stopTimer();

    if (state.currentQuestion) {
      disableChoices(state.currentQuestion.answer);
    }

    updateHud();
    state.confettiStopper = startConfettiEffect();
    playVictoryFanfare();

    await saveScore();
    await renderLeaderboard();
    elements.finalScore.textContent = String(state.score);
    elements.finalRank.textContent = getRank(state.score);

    await showGraduationModal();

    if (typeof state.confettiStopper === "function") {
      state.confettiStopper();
      state.confettiStopper = null;
    }

    state.sessionLocked = true;
    setView("loginView");
    elements.startBtn.disabled = true;
    elements.usernameInput.disabled = true;
    elements.loginStatus.textContent = "Graduation complete. Session locked to prevent score abuse.";
    showSessionLockScreen();
  }

  function renderReviewPanel() {
    if (!state.mistakes.length) {
      elements.reviewList.innerHTML = `<p class="review-empty">Walang mistakes this run &mdash; perfect recall!</p>`;
      return;
    }
    elements.reviewList.innerHTML = state.mistakes
      .map((m) => `<div class="review-item">
          <span class="rq">[${escapeHtml(m.subject)}] ${escapeHtml(m.q)}</span>
          <span class="ra">Sagot mo: ${escapeHtml(m.chosen)}</span>
          <span class="ra">Tamang sagot: <b>${escapeHtml(m.correct)}</b></span>
        </div>`)
      .join("");
  }

  function updateGameOverDisplay(reason) {
    const quote = getRandomQuote();
    const messageMap = {
      lives: "Naubos ang hearts mo sa arena. Regroup, review, then bounce back.",
      wrong: "That final mistake ended the run, pero kaya mo pang higitan ito.",
      timeout: "Naubos ang oras sa huling tanong mo. Bilisan ang recall sa next round.",
      blur: "Auto game over ito dahil lumipat ka ng browser tab habang active ang game.",
      practice_end: "Practice session ended. Walang score na na-save — pure review lang ito.",
      retry_done: "Naubos ang retry set mo. Review ulit o bumalik sa Ranked mode.",
      daily_complete: "Natapos mo ang Daily Challenge set ngayong araw. Score is saved to today's Daily board.",
      study_complete: "Study Plan complete. Review the mistakes list, then try Ranked when ready."
    };

    if (elements.crashTitle) {
      if (state.isRetryMistakes || reason === "retry_done") {
        elements.crashTitle.textContent = "[PRACTICE] RETRY MISTAKES COMPLETE";
      } else if (state.isPractice || reason === "practice_end") {
        elements.crashTitle.textContent = "[PRACTICE] SESSION ENDED";
      } else if (state.isDaily || reason === "daily_complete") {
        elements.crashTitle.textContent = "[DAILY CHALLENGE] COMPLETE";
      } else {
        elements.crashTitle.textContent = "[SYSTEM CRASH] REVIEWER OVER";
      }
    }

    elements.gameOverNote.innerHTML = "<strong>Status:</strong> " + escapeHtml(messageMap[reason] || messageMap.lives);
    if (state.isPractice) {
      elements.gameOverNote.innerHTML += " <strong>(Practice — hindi nasesave sa leaderboard)</strong>";
    }
    elements.gameOverQuote.textContent = formatQuote(quote);

    const accEl = $("statAccuracy");
    const streakEl = $("statStreak");
    const modeEl = $("statMode");
    const accuracy = state.answeredCount
      ? Math.round((state.correctCount / state.answeredCount) * 100) + "%"
      : "—";
    if (accEl) accEl.textContent = accuracy;
    if (streakEl) streakEl.textContent = String(state.bestStreak || 0);
    if (modeEl) {
      modeEl.textContent = state.isRetryMistakes
        ? "Retry"
        : state.runType === "study"
          ? "Study"
          : state.isDaily
            ? "Daily"
            : state.isPractice
              ? "Practice"
              : "Ranked";
    }
    markDailyDoneIfNeeded();
    renderReviewPanel();

    // PHASE 1: Retry Mistakes button only when there is something to retry
    // and this wasn't already a pure empty retry completion.
    if (elements.retryMistakesBtn) {
      const canRetry = state.mistakes.length > 0;
      elements.retryMistakesBtn.hidden = !canRetry;
      elements.retryMistakesBtn.disabled = !canRetry;
      elements.retryMistakesBtn.textContent = canRetry
        ? `Retry Mistakes (${state.mistakes.length})`
        : "Retry Mistakes";
    }
  }

  async function endGame(reason = "lives") {
    if (state.ending) return;
    state.ending = true;
    state.locked = true;
    state.bossQuestionActive = false;
    setBossVisuals(false);
    state.lastEndReason = reason;
    stopTimer();
    state.allowBlurPenalty = false;
    if (elements.endPracticeBtn) elements.endPracticeBtn.hidden = true;

    await saveScore();
    await renderLeaderboard();

    elements.finalScore.textContent = String(state.score);
    elements.finalRank.textContent = getRank(state.score);
    evaluateBadgesOnEnd();
    updateGameOverDisplay(reason);
    setView("gameOverView");

    state.allowBlurPenalty = true;
  }

  /* ---------------- PHASE 1: Share Result + Retry Mistakes ---------------- */
  function buildShareText() {
    const mode = getModeConfig(state.selectedMode);
    const runLabel = state.isRetryMistakes
      ? "Retry Mistakes (Practice)"
      : state.isDaily
        ? `Daily Challenge · ${state.dailyDateKey || getLocalDateKey()}`
      : state.isPractice
        ? `Practice · ${mode.label}`
        : `Ranked · ${mode.label}`;
    const accuracy = state.answeredCount
      ? Math.round((state.correctCount / state.answeredCount) * 100) + "%"
      : "n/a";
    const lines = [
      "BSCS 1-A Reviewer Arena · RST Hub",
      `Player: ${state.avatar} ${state.username || "Scholar"}`,
      `Mode: ${runLabel}`,
      `Score: ${state.score}`,
      `Badge: ${getRank(state.score)}`,
      `Accuracy: ${accuracy} · Best streak: ${state.bestStreak || 0}`,
      `Mistakes: ${state.mistakes.length}`,
      "— Built by RST · BSCS 1-A · LSPU Siniloan"
    ];
    return lines.join("\n");
  }

  function showShareToast(message) {
    const existing = document.querySelector(".share-toast");
    if (existing) existing.remove();
    const toast = document.createElement("div");
    toast.className = "share-toast";
    toast.textContent = message;
    document.body.appendChild(toast);
    window.setTimeout(() => toast.remove(), 2200);
  }

  async function shareResult() {
    const text = buildShareText();
    try {
      if (navigator.share) {
        await navigator.share({
          title: "BSCS 1-A Reviewer Arena",
          text
        });
        showShareToast("Shared successfully");
        return;
      }
    } catch (error) {
      // User cancel or share failure → fall through to clipboard.
      if (error && error.name === "AbortError") return;
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        showShareToast("Result copied — paste sa GC");
        return;
      }
    } catch (error) {
      console.warn("[Arena] Clipboard share failed:", error);
    }
    // Last-resort fallback for older mobile browsers
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      showShareToast("Result copied — paste sa GC");
    } catch (error) {
      showShareToast("Copy failed — screenshot na lang");
    }
  }

  function resolveMistakeQuestions(mistakes) {
    const pool = [];
    const seen = new Set();
    mistakes.forEach((m) => {
      const key = `${m.subject}||${m.q}`;
      if (seen.has(key)) return;
      seen.add(key);
      const found = questionBank.find((q) => q.s === m.subject && q.q === m.q);
      if (found) pool.push(found);
    });
    return pool;
  }

  function startRetryMistakes() {
    if (state.sessionLocked) return;
    const pool = resolveMistakeQuestions(state.mistakes);
    if (!pool.length) {
      showShareToast("Walang mistakes to retry");
      return;
    }
    // Preserve username/avatar/mode; switch into Practice + Retry pool.
    state.isPractice = true;
    state.isDaily = false;
    state.runType = "practice";
    state.isRetryMistakes = true;
    state.retryQuestionPool = pool;
    state.ending = false;
    state.locked = false;
    state.allowBlurPenalty = true;
    // Keep previous mistakes list cleared for the new focused run tracking.
    resetArena();
    if (elements.streamModeLabel) {
      elements.streamModeLabel.textContent = "RETRY_MISTAKES";
    }
    setView("gameView");
    updateHud();
    loadNextQuestion();
  }


  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
