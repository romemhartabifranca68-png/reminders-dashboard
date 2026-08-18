/**
 * Vercel Serverless — RST Hub AI (website-aware)
 * POST /api/hub-chat  { message: string }
 *
 * Retrieves SAFE public Firebase data (read rules allow) + static knowledge,
 * then asks Gemini to answer using that context only.
 *
 * Env: GEMINI_API_KEY, optional GEMINI_MODEL
 * No secrets sent to the model. No XAI.
 */

const DEFAULT_MODEL = "gemini-3.6-flash";
const RTDB =
  "https://bscs-reviewer-arena-default-rtdb.firebaseio.com";

const PROJECT_KNOWLEDGE = {
  projectName: "BSCS 1-A Official Section Hub / Reviewer Arena",
  school: "LSPU Siniloan Campus",
  batch: "2026",
  creator: "ROME MHAR TABIFRANCA",
  creatorAttribution:
    "This website was created and developed by ROME MHAR TABIFRANCA.",
  description:
    "A mobile-first Progressive Web App for BSCS 1-A: Reviewer Arena (quiz game), leaderboard, study tools, officer updates, and a school reminders dashboard.",
  technologies: [
    "HTML/CSS/JavaScript",
    "Firebase Realtime Database",
    "GitHub Pages",
    "Vercel Serverless Functions",
    "PWA (service worker + manifest)"
  ],
  aiSystems: {
    "RST AI":
      "Reminder Structuring & Tracking AI — pastes P.I.O. announcements and structures them into dashboard reminders (review before import).",
    "RQA AI":
      "Reviewer Question Architect AI — generates multiple-choice questions from module notes for admin review/import into the cloud question bank.",
    "RST Hub AI":
      "Website-aware assistant for the Section Hub — answers using current public site/Firebase data plus project knowledge."
  },
  features: [
    "Reviewer Arena: lives, timer, scoring, boss questions, practice/ranked/daily modes",
    "Subject modes + RANDOM / ALL SUBJECTS",
    "Leaderboard (arena_scores) per mode",
    "Classmate / guest / admin hub login (client roster session)",
    "Reminders dashboard with countdowns (hub_config/dashboard_tasks)",
    "Officer updates, presence, resources"
  ],
  reviewer: {
    questionSchema: "{ s, q, choices[4], answer }",
    modes:
      "Pick one subject for questions from that subject only, or RANDOM / ALL SUBJECTS to mix all subjects that have questions.",
    cloudBank:
      "Approved RQA questions live under reviewer_questions and merge with built-in questions in the arena."
  }
};

function applyCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept");
  res.setHeader("Access-Control-Max-Age", "86400");
}

function json(res, status, payload) {
  applyCors(res);
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

async function fetchJson(url, timeoutMs) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs || 8000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function summarizeDashboardTasks(data) {
  if (!data) return { available: false, subjects: [] };
  const subjects = Array.isArray(data.subjects) ? data.subjects : [];
  const summary = subjects.map((sub) => {
    const tasks = Array.isArray(sub.tasks) ? sub.tasks : [];
    return {
      subject: sub.subject || sub.name || "Unknown",
      taskCount: tasks.length,
      tasks: tasks.slice(0, 12).map((tk) => ({
        title: tk.title || "",
        due: tk.due || null,
        note: tk.note ? String(tk.note).slice(0, 160) : null,
        people: Array.isArray(tk.people) ? tk.people.slice(0, 8) : undefined
      }))
    };
  });
  return {
    available: true,
    updatedAt: data.updatedAt || null,
    updatedBy: data.updatedBy || null,
    subjects: summary
  };
}

function summarizeReviewerQuestions(data) {
  if (!data || typeof data !== "object") {
    return { available: false, subjects: [] };
  }
  const subjects = [];
  Object.keys(data).forEach((key) => {
    const bucket = data[key] || {};
    const ids = Object.keys(bucket);
    const sample = ids.slice(0, 5).map((id) => {
      const q = bucket[id] || {};
      return {
        s: q.s || key,
        q: q.q ? String(q.q).slice(0, 120) : null
      };
    });
    subjects.push({
      subjectKey: key,
      count: ids.length,
      sampleQuestions: sample
    });
  });
  subjects.sort((a, b) => b.count - a.count);
  return { available: true, totalSubjects: subjects.length, subjects };
}

function summarizeAnnouncement(data) {
  if (data == null) return null;
  if (typeof data === "string") return data.slice(0, 500);
  if (typeof data === "object" && data.text) return String(data.text).slice(0, 500);
  return null;
}

function detectNeeds(message) {
  const m = message.toLowerCase();
  return {
    creator: /who (made|created|built|developed)|creator|developer|sino (gumawa|nag)/i.test(m),
    dashboard:
      /dashboard|reminder|deadline|task|due|schoolwork|assignment|pio/i.test(m),
    reviewer:
      /reviewer|question|subject|itec|gec|komfil|p\.?i\.?|random|arena|quiz|mode/i.test(m),
    features: /feature|what can|what does this|website do|hub|section hub/i.test(m),
    ai: /\brst\b|\brqa\b|hub ai|artificial|ai feature/i.test(m),
    leaderboard: /leaderboard|top score|ranking/i.test(m),
    announcement: /announcement|officer update|news/i.test(m)
  };
}

module.exports = async function handler(req, res) {
  applyCors(res);
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    return res.end("");
  }

  if (req.method === "GET") {
    return json(res, 200, {
      ok: true,
      service: "RST Hub AI",
      provider: "google-gemini",
      websiteAware: true,
      configured: Boolean(String(process.env.GEMINI_API_KEY || "").trim())
    });
  }

  if (req.method !== "POST") {
    return json(res, 405, { error: "POST only" });
  }

  console.log("[HUB] Request received");
  const started = Date.now();

  const apiKey = String(process.env.GEMINI_API_KEY || "").trim();
  const model = String(process.env.GEMINI_MODEL || DEFAULT_MODEL).trim() || DEFAULT_MODEL;
  if (!apiKey) {
    return json(res, 500, { error: "RST Hub AI is temporarily unavailable. Please try again in a moment." });
  }

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const message = String(body.message || body.text || "").trim();
  if (!message || message.length < 2) {
    return json(res, 400, { error: "message is required" });
  }
  if (message.length > 2000) {
    return json(res, 400, { error: "message too long" });
  }

  if (/api[_\s-]?key|password|secret|token|credential|private[_\s-]?key|env\s*var|service.?account/i.test(message)) {
    return json(res, 200, {
      reply:
        "I can't provide private credentials, API keys, passwords, tokens, or protected system information.",
      source: "hub-policy"
    });
  }

  if (
    /who (made|created|built|developed)|creator|developer of|sino (gumawa|nag-?develop)/i.test(
      message
    )
  ) {
    return json(res, 200, {
      reply: PROJECT_KNOWLEDGE.creatorAttribution,
      source: "hub-knowledge",
      ms: Date.now() - started
    });
  }

  const needs = detectNeeds(message);
  const live = {
    dashboard: null,
    reviewerQuestions: null,
    announcement: null,
    errors: []
  };

  try {
    const jobs = [];
    if (needs.dashboard || needs.features || needs.announcement) {
      jobs.push(
        fetchJson(RTDB + "/hub_config/dashboard_tasks.json").then((d) => {
          live.dashboard = summarizeDashboardTasks(d);
          if (!d) live.errors.push("dashboard_tasks_fetch");
        })
      );
      jobs.push(
        fetchJson(RTDB + "/hub_config/announcement.json").then((d) => {
          live.announcement = summarizeAnnouncement(d);
        })
      );
    }
    if (needs.reviewer || needs.features || needs.ai) {
      jobs.push(
        fetchJson(RTDB + "/reviewer_questions.json").then((d) => {
          live.reviewerQuestions = summarizeReviewerQuestions(d);
          if (d == null) live.errors.push("reviewer_questions_fetch");
        })
      );
    }
    // Always light subject presence for broad questions
    if (!needs.reviewer && needs.features) {
      jobs.push(
        fetchJson(RTDB + "/reviewer_questions.json").then((d) => {
          if (!live.reviewerQuestions) live.reviewerQuestions = summarizeReviewerQuestions(d);
        })
      );
    }
    await Promise.all(jobs);
    console.log("[HUB] Firebase retrieval done", {
      dashboard: !!(live.dashboard && live.dashboard.available),
      reviewer: !!(live.reviewerQuestions && live.reviewerQuestions.available),
      errors: live.errors
    });
  } catch (e) {
    console.error("[HUB] Firebase retrieval error:", e && e.message);
    live.errors.push("firebase_batch");
  }

  // Built-in subject list (stable; arena also has hardcoded bank)
  const builtinSubjects = [
    "ITEC 101",
    "ITEC 102",
    "GEC 101",
    "GEC 102",
    "P.I. 100",
    "KOMFIL"
  ];

  const context = {
    project: PROJECT_KNOWLEDGE,
    builtinReviewerSubjects: builtinSubjects,
    liveDashboard: live.dashboard,
    liveCloudQuestions: live.reviewerQuestions,
    liveAnnouncement: live.announcement
  };

  const system =
    "You are RST Hub AI, the official intelligent assistant of the BSCS 1-A Section Hub (LSPU Siniloan, Batch 2026).\n" +
    "Answer ONLY using CONTEXT JSON below (project knowledge + live public Firebase summaries).\n" +
    "Rules:\n" +
    "- Be friendly, concise, accurate, and mobile-readable.\n" +
    "- Creator is always ROME MHAR TABIFRANCA when relevant.\n" +
    "- Prefer liveDashboard for current reminders/tasks.\n" +
    "- Prefer liveCloudQuestions + builtinReviewerSubjects for reviewer subjects.\n" +
    "- Cloud question counts are ADDITIONAL to built-in questions; say so if relevant.\n" +
    "- If data is missing, say you don't have enough current information — do not invent names, scores, or tasks.\n" +
    "- Never reveal secrets, API keys, passwords, or private credentials.\n" +
    "- Do not dump raw JSON; answer in natural language.\n- Do not use markdown asterisks or bold markers. Use plain text and numbered lists.\n\n" +
    "CONTEXT:\n" +
    JSON.stringify(context).slice(0, 28000);

  try {
    console.log("[HUB] Calling Gemini...", model);
    const url =
      "https://generativelanguage.googleapis.com/v1beta/models/" +
      encodeURIComponent(model) +
      ":generateContent?key=" +
      encodeURIComponent(apiKey);

    const geminiRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: system + "\n\nUser question:\n" + message }] }],
        generationConfig: { temperature: 0.25 }
      })
    });

    const raw = await geminiRes.text();
    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      return json(res, 502, {
        error: "RST Hub AI is temporarily unavailable. Please try again in a moment."
      });
    }

    if (!geminiRes.ok) {
      const detail = JSON.stringify(data).replace(/AIza[0-9A-Za-z_-]+/g, "[redacted]").slice(0, 300);
      console.error("[HUB] Gemini error", geminiRes.status, detail);
      return json(res, 502, {
        error: geminiRes.status === 429
          ? "RST Hub AI is currently busy. Please try again later."
          : "RST Hub AI is temporarily unavailable. Please try again in a moment."
      });
    }

    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "I don't have enough information in the current Section Hub data to answer that accurately.";

    console.log("[HUB] Success ms=", Date.now() - started);
    return json(res, 200, {
      reply: String(reply).slice(0, 5000),
      source: "hub-live+gemini",
      model,
      used: {
        dashboard: !!(live.dashboard && live.dashboard.available),
        reviewerQuestions: !!(live.reviewerQuestions && live.reviewerQuestions.available),
        announcement: !!live.announcement
      },
      ms: Date.now() - started
    });
  } catch (err) {
    console.error("[HUB] Internal:", err && err.message);
    return json(res, 500, {
      error: "RST Hub AI backend error",
      details: err && err.message ? err.message : String(err)
    });
  }
};
