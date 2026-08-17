/**
 * Vercel Serverless Function
 * POST /api/parse-pio-reminders
 *
 * RST — Reminder Structuring & Tracking AI
 * Provider: xAI Grok (NOT Gemini)
 *
 * Required Vercel Environment Variable:
 *   XAI_API_KEY
 */

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

/** xAI model id for Chat Completions API (docs.x.ai, Aug 2026) */
const XAI_MODEL = "grok-4.5";

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

module.exports = async function handler(req, res) {
  applyCors(res);

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    return res.end("");
  }

  // Health check — never exposes secrets
  if (req.method === "GET") {
    const configured = Boolean(String(process.env.XAI_API_KEY || "").trim());
    return json(res, 200, {
      ok: true,
      service: "RST AI",
      provider: "xAI",
      model: XAI_MODEL,
      configured
    });
  }

  if (req.method !== "POST") {
    return json(res, 405, { error: "Method not allowed. Use POST." });
  }

  console.log("[RST] Request received");
  console.log("[RST] Method:", req.method);

  const apiKey = String(process.env.XAI_API_KEY || "").trim();
  console.log("[RST] XAI_API_KEY configured:", Boolean(apiKey));
  if (!apiKey) {
    return json(res, 500, {
      error: "Missing XAI_API_KEY in Vercel environment variables."
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
    console.log("[RST] Calling xAI... model=", XAI_MODEL);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 50000);

    let xaiRes;
    try {
      xaiRes = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + apiKey
        },
        body: JSON.stringify({
          model: XAI_MODEL,
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

    const raw = await xaiRes.text();
    console.log("[RST] xAI response status:", xaiRes.status);

    if (!xaiRes.ok) {
      const safe = String(raw)
        .replace(/xai-[a-zA-Z0-9_-]+/g, "[redacted]")
        .replace(/sk-[a-zA-Z0-9_-]+/g, "[redacted]")
        .slice(0, 400);
      console.error("[RST] xAI error body:", safe);
      return json(res, 502, {
        error: "RST AI provider error (" + xaiRes.status + "): " + safe
      });
    }

    let xaiJson;
    try {
      xaiJson = JSON.parse(raw);
    } catch (e) {
      return json(res, 502, { error: "xAI returned non-JSON body." });
    }

    const content =
      xaiJson &&
      xaiJson.choices &&
      xaiJson.choices[0] &&
      xaiJson.choices[0].message &&
      xaiJson.choices[0].message.content;

    const parsed = extractJson(content);
    if (!parsed || !Array.isArray(parsed.items)) {
      console.error("[RST] Malformed model output:", String(content || "").slice(0, 300));
      return json(res, 502, { error: "AI returned malformed JSON." });
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

    console.log("[RST] Request completed. items=", items.length);

    return json(res, 200, {
      announcementDate: parsed.announcementDate || null,
      items,
      source: "xai-grok",
      model: XAI_MODEL
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
