/**
 * Vercel Serverless Function
 * POST /api/parse-pio-reminders
 *
 * RST — Reminder Structuring & Tracking AI
 * Backend: Google Gemini 2.0 Flash (v1beta)
 *
 * Required Vercel Environment Variable:
 *   GEMINI_API_KEY
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

const GEMINI_MODEL = "gemini-2.0-flash";

function applyCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
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

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    applyCors(res);
    res.statusCode = 204;
    return res.end();
  }

  if (req.method !== "POST") {
    return json(res, 405, { error: "Method not allowed. Use POST." });
  }

  const apiKey = String(process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey) {
    return json(res, 500, {
      error: "Missing GEMINI_API_KEY in Vercel environment variables."
    });
  }

  const body = req.body || {};
  const text = typeof body.text === "string" ? body.text.trim() : "";

  if (!text || text.length < 10) {
    return json(res, 400, { error: "Missing or too-short 'text' in body." });
  }
  if (text.length > 12000) {
    return json(res, 400, { error: "Text exceeds 12,000 characters." });
  }

  try {
    const url =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" +
      encodeURIComponent(apiKey);

    const response = await fetch(url, {
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
          responseMimeType: "application/json",
          temperature: 0.1
        }
      })
    });

    const raw = await response.text();
    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      return json(res, 502, {
        error: "Gemini returned non-JSON body.",
        detail: String(raw).slice(0, 300)
      });
    }

    if (!response.ok) {
      const detail = JSON.stringify(data)
        .replace(/AIza[0-9A-Za-z_-]+/g, "[redacted]")
        .slice(0, 400);
      // Always 502 for upstream AI errors (not 404) so UI is clear
      return json(res, 502, {
        error: "Gemini API error (" + response.status + ", model=" + GEMINI_MODEL + "): " + detail
      });
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
      return json(res, 502, {
        error: "AI returned malformed JSON.",
        model: GEMINI_MODEL
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

    return json(res, 200, {
      announcementDate: parsed.announcementDate || null,
      items,
      source: "google-gemini",
      model: GEMINI_MODEL
    });
  } catch (err) {
    return json(res, 500, {
      error: "Internal Server Error",
      details: err && err.message ? err.message : String(err)
    });
  }
};
