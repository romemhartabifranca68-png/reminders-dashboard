/**
 * Vercel Serverless Function
 * POST /api/parse-pio-reminders
 *
 * RST — Reminder Structuring & Tracking AI
 * Provider: Google Gemini (FREE API key via AI Studio)
 *
 * Env (Vercel):
 *   GEMINI_API_KEY  (required)
 *   GEMINI_MODEL    (optional; default gemini-3.6-flash)
 *
 * Does NOT use XAI_API_KEY / xAI / Grok.
 */

const DEFAULT_MODEL = "gemini-3.6-flash";

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
3. Split each distinct schoolwork into its OWN item.
4. Detect tentative / TBA and set tentative=true.
5. Student names are assignedStudents, NOT the task title.
6. Normalize codes: GEC 102, GEC 101, P.I. 101, ITEC 102, PATHFIT, NSTP 1.
7. Prefer announcement year when year is omitted.
8. deadline = YYYY-MM-DD when clear; else null and keep deadlineText.
9. Ignore quotes, greetings, and @everyone.`;

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

function getApiKey() {
  return String(process.env.GEMINI_API_KEY || "").trim();
}

function getModel() {
  const m = String(process.env.GEMINI_MODEL || "").trim();
  return m || DEFAULT_MODEL;
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

function classifyGeminiError(status, bodyObj, raw) {
  // Log full detail server-side only; never return provider names to clients.
  const msg = JSON.stringify(bodyObj || raw || "")
    .replace(/AIza[0-9A-Za-z_-]+/g, "[redacted]")
    .slice(0, 500);
  console.error("[RST] upstream status=", status, "detail=", msg);
  if (status === 429) {
    return { http: 503, error: "RST AI is currently busy. Please try again later." };
  }
  if (status === 401 || status === 403) {
    return { http: 503, error: "RST AI is temporarily unavailable. Please try again in a moment." };
  }
  if (status === 404) {
    return { http: 503, error: "RST AI is temporarily unavailable. Please try again in a moment." };
  }
  return {
    http: 503,
    error: "RST AI is temporarily unavailable. Your website is still working normally."
  };
}

module.exports = async function handler(req, res) {
  applyCors(res);

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    return res.end("");
  }

  const apiKey = getApiKey();
  const model = getModel();

  // Health / diagnostics (no secrets)
  if (req.method === "GET") {
    return json(res, 200, {
      ok: true,
      service: "RST AI",
      provider: "google-gemini",
      model,
      configured: Boolean(apiKey)
    });
  }

  if (req.method !== "POST") {
    return json(res, 405, { error: "Method not allowed. Use POST." });
  }

  console.log("[RST] Request received");
  console.log("[RST] GEMINI_API_KEY configured:", Boolean(apiKey));
  console.log("[RST] GEMINI_MODEL:", model);

  if (!apiKey) {
    return json(res, 500, {
      error: "RST AI is temporarily unavailable. Please try again in a moment."
    });
  }

  const body = readBody(req);
  const text = typeof body.text === "string" ? body.text.trim() : "";
  console.log("[RST] Text length:", text.length);

  if (!text || text.length < 10) {
    return json(res, 400, { error: "Missing or too-short 'text' in body." });
  }
  if (text.length > 12000) {
    return json(res, 400, { error: "Text exceeds 12,000 characters." });
  }

  try {
    const url =
      "https://generativelanguage.googleapis.com/v1beta/models/" +
      encodeURIComponent(model) +
      ":generateContent?key=" +
      encodeURIComponent(apiKey);

    console.log("[RST] Calling Gemini...");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 50000);

    let geminiRes;
    try {
      geminiRes = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: SYSTEM_PROMPT + "\n\nPIO Announcement to parse:\n" + text
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json"
          }
        }),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeout);
    }

    const raw = await geminiRes.text();
    console.log("[RST] Gemini HTTP status:", geminiRes.status);

    let data = null;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      console.error("[RST] Gemini non-JSON:", String(raw).slice(0, 300));
      return json(res, 502, {
        error: "RST AI is temporarily unavailable. Please try again in a moment.",
        detail: String(raw).slice(0, 300)
      });
    }

    if (!geminiRes.ok) {
      const classified = classifyGeminiError(geminiRes.status, data, raw);
      console.error("[RST] Gemini error:", classified.error);
      return json(res, classified.http, { error: classified.error });
    }

    const rawText =
      data &&
      data.candidates &&
      data.candidates[0] &&
      data.candidates[0].content &&
      data.candidates[0].content.parts &&
      data.candidates[0].content.parts[0] &&
      data.candidates[0].content.parts[0].text;

    const parsed = extractJson(rawText);
    if (!parsed || !Array.isArray(parsed.items)) {
      console.error("[RST] Malformed JSON:", String(rawText || "").slice(0, 300));
      return json(res, 502, {
        error: "RST AI — AI returned malformed JSON.",
        model
      });
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

    console.log("[RST] Success. items=", items.length);

    return json(res, 200, {
      announcementDate: parsed.announcementDate || null,
      items,
      source: "google-gemini",
      model
    });
  } catch (err) {
    if (err && err.name === "AbortError") {
      return json(res, 504, { error: "RST AI request timed out." });
    }
    console.error("[RST] Internal error:", err && err.message ? err.message : err);
    return json(res, 500, {
      error: "RST backend error",
      details: err && err.message ? err.message : String(err)
    });
  }
};
