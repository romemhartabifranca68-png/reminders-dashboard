/**
 * Vercel Serverless Function
 * POST /api/parse-pio-reminders
 *
 * RST — Reminder Structuring & Tracking AI
 * Backend: Google Gemini (stable v1) — gemini-1.5-flash
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
}`;

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
    return json(res, 500, { error: "Missing GEMINI_API_KEY in Vercel environment variables." });
  }

  const body = req.body || {};
  const text = typeof body.text === "string" ? body.text.trim() : "";

  if (!text) {
    return json(res, 400, { error: "Missing 'text' in body." });
  }

  try {
    // Stable v1 endpoint with canonical gemini-1.5-flash
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: `${SYSTEM_PROMPT}\n\nPIO Announcement to parse:\n${text}` }]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return json(res, response.status, {
        error: `Gemini API Error (${response.status}): ${JSON.stringify(data)}`
      });
    }

    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    const parsedData = JSON.parse(rawText);

    return json(res, 200, parsedData);
  } catch (err) {
    return json(res, 500, { error: "Internal Server Error", details: err.message });
  }
};
