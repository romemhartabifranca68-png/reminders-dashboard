/**
 * Vercel Serverless Function
 * POST /api/parse-pio-reminders
 *
 * RST — Reminder Structuring & Tracking AI
 *
 * Required Vercel Environment Variables:
 *   XAI_API_KEY              (required)
 *   FIREBASE_PROJECT_ID      (optional unless REQUIRE_FIREBASE_AUTH = true)
 *   FIREBASE_CLIENT_EMAIL    (optional unless REQUIRE_FIREBASE_AUTH = true)
 *   FIREBASE_PRIVATE_KEY     (optional; paste PEM with \n for newlines)
 */

const admin = require("firebase-admin");

const ALLOWED_EDITORS = {
  "tabifranca@bscs1a-hub.app": { username: "tabifranca", role: "admin" },
  "cainto@bscs1a-hub.app": { username: "cainto", role: "pio" }
};

/** Set true to reject requests without a valid Admin/P.I.O. Firebase ID token */
const REQUIRE_FIREBASE_AUTH = false;

const SYSTEM_PROMPT = `You are an expert academic assistant for a Filipino university section (BSCS 1-A, LSPU Siniloan).
Your ONLY job is to extract schoolwork / reminders from PIO (Public Information Officer) announcements.

Return STRICT JSON only (no markdown fences, no commentary) with this shape:
{
  "announcementDate": "YYYY-MM-DD or null",
  "items": [
    {
      "subjectCode": "GEC 102",
      "subjectName": "Readings in Philippine History",
      "title": "short task title",
      "description": "extra details / instructions",
      "deadline": "YYYY-MM-DD or null",
      "deadlineText": "original date phrase or null",
      "tentative": false,
      "submissionLocation": "Google Classroom or null",
      "assignedStudents": ["Surname or full name"],
      "tags": ["optional"]
    }
  ]
}

HARD RULES:
1. Never invent subjects, tasks, deadlines, students, or submission locations.
2. If a field is unknown, use null or [].
3. Split each distinct schoolwork into its OWN item (do not merge quiz + reporting into one).
4. Detect tentative / TBA / subject-to-change and set tentative=true.
5. Student names under a task are assignedStudents, NOT the task title.
6. Normalize subject codes when clear: GEC 102, GEC 101, P.I. 101, ITEC 102, PATHFIT, NSTP 1.
7. Prefer announcement year when the PIO omits the year.
8. deadline must be YYYY-MM-DD when a date is clear; otherwise null and keep deadlineText.
9. Keep titles concise (under 120 chars). Put longer instructions in description.
10. Ignore motivational quotes, greetings, and @everyone.`;

function applyCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, Accept"
  );
  res.setHeader("Access-Control-Max-Age", "86400");
}

function json(res, status, payload) {
  applyCors(res);
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function initFirebaseAdmin() {
  if (admin.apps.length) return admin.app();

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY || "";
  privateKey = privateKey.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey
    })
  });
}

function extractJson(text) {
  if (!text) return null;
  const trimmed = String(text).trim();
  try {
    return JSON.parse(trimmed);
  } catch (e) { /* continue */ }

  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) {
    try {
      return JSON.parse(fence[1].trim());
    } catch (e) { /* continue */ }
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch (e) { /* continue */ }
  }
  return null;
}

async function optionalVerifyEditor(req) {
  const header = String(req.headers.authorization || req.headers.Authorization || "");
  const match = header.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    if (REQUIRE_FIREBASE_AUTH) {
      const err = new Error("Missing Authorization Bearer token.");
      err.status = 401;
      throw err;
    }
    return null;
  }

  const app = initFirebaseAdmin();
  if (!app) {
    if (REQUIRE_FIREBASE_AUTH) {
      const err = new Error("Server misconfigured: Firebase Admin credentials missing.");
      err.status = 500;
      throw err;
    }
    return null;
  }

  let decoded;
  try {
    decoded = await admin.auth().verifyIdToken(match[1].trim(), true);
  } catch (e) {
    const err = new Error("Invalid or expired Firebase Auth token.");
    err.status = 401;
    throw err;
  }

  const email = String(decoded.email || "").toLowerCase();
  if (email && ALLOWED_EDITORS[email]) {
    return {
      uid: decoded.uid,
      email,
      username: ALLOWED_EDITORS[email].username,
      role: ALLOWED_EDITORS[email].role
    };
  }

  if (decoded.hubEditor === true || decoded.hubRole === "admin" || decoded.hubRole === "pio") {
    return {
      uid: decoded.uid,
      email: email || null,
      username: String(decoded.hubUsername || email.split("@")[0] || decoded.uid).toLowerCase(),
      role: decoded.hubRole || "editor"
    };
  }

  if (decoded.email_verified && email) {
    const local = email.split("@")[0].toLowerCase();
    if (local === "tabifranca" || local === "cainto") {
      return {
        uid: decoded.uid,
        email,
        username: local,
        role: local === "tabifranca" ? "admin" : "pio"
      };
    }
  }

  const err = new Error("Not authorized. Admin or P.I.O. Firebase account required.");
  err.status = 403;
  throw err;
}

function readBody(req) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    return req.body;
  }
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch (e) {
      return {};
    }
  }
  return {};
}

module.exports = async function handler(req, res) {
  applyCors(res);

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end("");
    return;
  }

  if (req.method !== "POST") {
    json(res, 405, { error: "POST only" });
    return;
  }

  try {
    const editor = await optionalVerifyEditor(req);

    const body = readBody(req);
    const text = String(body.text || "").trim();

    if (!text || text.length < 20) {
      json(res, 400, { error: "PIO text is too short." });
      return;
    }
    if (text.length > 12000) {
      json(res, 400, { error: "PIO text exceeds 12,000 characters." });
      return;
    }

    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      json(res, 500, { error: "Server misconfigured: missing XAI_API_KEY." });
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 55000);

    let xaiRes;
    try {
      xaiRes = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + apiKey
        },
        body: JSON.stringify({
          model: "grok-2-latest",
          temperature: 0.1,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content:
                "Extract all schoolwork reminders from this PIO announcement. Return JSON only.\n\n" +
                text
            }
          ]
        }),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!xaiRes.ok) {
      json(res, 502, {
        error: "xAI API error (" + xaiRes.status + "). Check XAI_API_KEY and model access."
      });
      return;
    }

    const xaiJson = await xaiRes.json();
    const content =
      xaiJson &&
      xaiJson.choices &&
      xaiJson.choices[0] &&
      xaiJson.choices[0].message &&
      xaiJson.choices[0].message.content;

    const parsed = extractJson(content);
    if (!parsed || !Array.isArray(parsed.items)) {
      json(res, 502, { error: "AI returned malformed JSON." });
      return;
    }

    const items = parsed.items
      .filter((it) => it && (it.title || it.subjectCode))
      .map((it) => ({
        subjectCode: it.subjectCode || it.subject || null,
        subjectName: it.subjectName || it.fullName || null,
        title: String(it.title || "Untitled").slice(0, 160),
        description: it.description ? String(it.description).slice(0, 500) : null,
        deadline: it.deadline || null,
        deadlineText: it.deadlineText || null,
        tentative: !!it.tentative,
        submissionLocation: it.submissionLocation || null,
        assignedStudents: Array.isArray(it.assignedStudents)
          ? it.assignedStudents.map((n) => String(n).slice(0, 60)).slice(0, 20)
          : [],
        tags: Array.isArray(it.tags)
          ? it.tags.map((t) => String(t).slice(0, 40)).slice(0, 8)
          : []
      }));

    json(res, 200, {
      announcementDate: parsed.announcementDate || null,
      items,
      source: "xai-grok",
      editor: editor ? editor.username : null
    });
  } catch (error) {
    if (error && error.name === "AbortError") {
      json(res, 504, { error: "AI request timed out." });
      return;
    }
    const status = error && error.status ? error.status : 500;
    if (status === 401 || status === 403) {
      json(res, status, { error: error.message || "Unauthorized" });
      return;
    }
    console.error("[parse-pio-reminders]", error);
    json(res, 500, { error: "Server error while parsing PIO text." });
  }
};
