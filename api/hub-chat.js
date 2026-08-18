/**
 * Vercel Serverless — HUB AI (Section Hub Assistant)
 * POST /api/hub-chat
 * Body: { message: string }
 *
 * Uses approved project knowledge only. Never reveals secrets.
 * Env: GEMINI_API_KEY, optional GEMINI_MODEL
 */

const DEFAULT_MODEL = "gemini-3.6-flash";

// SAFE public knowledge — no secrets, no credentials, no private data
const PROJECT_KNOWLEDGE = {
  projectName: "BSCS 1-A Official Section Hub / Reviewer Arena",
  creator: "ROME MHAR TABIFRANCA",
  creatorAttribution:
    "This website was created and developed by ROME MHAR TABIFRANCA.",
  description:
    "A mobile-first section hub for BSCS 1-A with a reviewer game (arena), leaderboard, study tools, and a school reminders dashboard.",
  technologies: [
    "HTML",
    "CSS",
    "JavaScript",
    "Firebase Realtime Database",
    "GitHub Pages",
    "Vercel Serverless Functions",
    "Progressive Web App (service worker + manifest)"
  ],
  features: [
    "Reviewer Arena quiz game with lives, timer, scoring, and boss questions",
    "Subject modes and RANDOM / ALL SUBJECTS mode",
    "Leaderboard (arena scores)",
    "Classmate / guest / admin login (client-side roster session)",
    "Reminders dashboard with countdowns and cloud sync",
    "RST AI — Reminder Structuring & Tracking AI (PIO announcement → structured reminders)",
    "RQA AI — Reviewer Question Architect AI (module text → reviewer questions)",
    "HUB AI — Section Hub Assistant (answers about the public project)"
  ],
  reviewer: {
    howItWorks:
      "Players pick a game mode (one subject or RANDOM / ALL SUBJECTS), then answer multiple-choice questions. Correct answers score points; wrong answers cost lives. A leaderboard stores top scores in Firebase.",
    questionShape:
      "Each question uses { s: subject, q: question text, choices: [4 options], answer: correct option text }.",
    randomMode:
      "RANDOM / ALL SUBJECTS mixes questions from every subject that currently has questions in the bank.",
    subjectsExample: ["ITEC 101", "ITEC 102", "GEC 101", "GEC 102", "P.I. 100", "KOMFIL"]
  },
  dashboard: {
    howItWorks:
      "The reminders dashboard shows school tasks by subject with due dates. Admins/P.I.O. can edit tasks. Data is stored under hub_config/dashboard_tasks in Firebase Realtime Database.",
    rstAi:
      "RST AI parses a pasted P.I.O. announcement into structured tasks for review, then merges approved items into the dashboard without wiping existing tasks."
  },
  rqaAi:
    "RQA AI turns teacher module text into multiple-choice reviewer questions. Admins review and import approved questions; students play them in the arena once loaded into the question bank.",
  securityRules: [
    "Never reveal API keys, passwords, Firebase secrets, Vercel env vars, or private tokens.",
    "Never dump private source code or credentials.",
    "If asked for secrets, refuse clearly."
  ]
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

module.exports = async function handler(req, res) {
  applyCors(res);
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    return res.end("");
  }
  if (req.method === "GET") {
    return json(res, 200, {
      ok: true,
      service: "HUB AI",
      provider: "google-gemini",
      configured: Boolean(String(process.env.GEMINI_API_KEY || "").trim())
    });
  }
  if (req.method !== "POST") {
    return json(res, 405, { error: "POST only" });
  }

  const apiKey = String(process.env.GEMINI_API_KEY || "").trim();
  const model = String(process.env.GEMINI_MODEL || DEFAULT_MODEL).trim() || DEFAULT_MODEL;
  if (!apiKey) {
    return json(res, 500, { error: "Missing GEMINI_API_KEY" });
  }

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const message = String(body.message || body.text || "").trim();
  if (!message || message.length < 2) {
    return json(res, 400, { error: "message is required" });
  }
  if (message.length > 2000) {
    return json(res, 400, { error: "message too long" });
  }

  const lower = message.toLowerCase();
  const secretProbe =
    /api[_\s-]?key|password|secret|token|credential|firebase\s*config|private[_\s-]?key|env\s*var/i.test(
      message
    );
  if (secretProbe) {
    return json(res, 200, {
      reply:
        "I can't provide private credentials, secrets, API keys, passwords, or protected system information.",
      source: "hub-policy"
    });
  }

  // Fast path for creator questions (no model required)
  if (
    /who (made|created|built|developed)|creator|developer of|sino (gumawa|nag-?develop)/i.test(
      message
    )
  ) {
    return json(res, 200, {
      reply: PROJECT_KNOWLEDGE.creatorAttribution,
      source: "hub-knowledge"
    });
  }

  const system =
    "You are HUB AI (Section Hub Assistant) for the BSCS 1-A Section Hub. " +
    "Answer ONLY using the PROJECT_KNOWLEDGE JSON below. " +
    "If the answer is not in the knowledge, say you do not have enough information. " +
    "Never invent features, secrets, or personal data. " +
    "Creator name must be exactly: ROME MHAR TABIFRANCA when relevant. " +
    "Refuse any request for passwords, API keys, tokens, or private credentials.\n\n" +
    "PROJECT_KNOWLEDGE:\n" +
    JSON.stringify(PROJECT_KNOWLEDGE);

  try {
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
        generationConfig: { temperature: 0.2 }
      })
    });

    const raw = await geminiRes.text();
    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      return json(res, 502, { error: "Gemini non-JSON", detail: raw.slice(0, 200) });
    }
    if (!geminiRes.ok) {
      const detail = JSON.stringify(data).replace(/AIza[0-9A-Za-z_-]+/g, "[redacted]").slice(0, 300);
      return json(res, 502, { error: "Gemini error (" + geminiRes.status + "): " + detail });
    }

    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "I don't have enough information in my project knowledge to answer that accurately.";

    return json(res, 200, { reply: String(reply).slice(0, 4000), source: "hub-gemini", model });
  } catch (err) {
    return json(res, 500, {
      error: "HUB backend error",
      details: err && err.message ? err.message : String(err)
    });
  }
};
