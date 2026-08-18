/**
 * Vercel Serverless — RQA AI (Reviewer Question Architect)
 * POST /api/rqa-generate
 *
 * Body: { text, subject, count?, difficulty?, types? }
 * Returns: { items: [{ s, q, choices, answer, explanation, difficulty, source }] }
 *
 * Env: GEMINI_API_KEY, optional GEMINI_MODEL
 * Does NOT touch RST AI or xAI.
 */

const DEFAULT_MODEL = "gemini-3.6-flash";

const SYSTEM_PROMPT = `You are RQA AI (Reviewer Question Architect) for BSCS 1-A reviewer games.
Generate MULTIPLE-CHOICE questions STRICTLY from the provided source material only.

Return STRICT JSON only:
{
  "items": [
    {
      "q": "question text",
      "choices": ["A", "B", "C", "D"],
      "answer": "exact text of one choice",
      "explanation": "brief why, grounded in source",
      "difficulty": "easy|medium|hard",
      "source": { "section": "topic or heading if known", "note": "optional locator" }
    }
  ]
}

HARD RULES:
1. Only facts present in the source material. Never invent.
2. Exactly 4 choices; answer must match one choice string exactly.
3. Clear, unambiguous questions suitable for mobile quiz play.
4. Plausible distractors from the same material when possible.
5. No motivational quotes as questions.
6. Prefer concept checks over trivia word-matching.`;

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
  const t = String(text).trim();
  try { return JSON.parse(t); } catch (e) { /* */ }
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) {
    try { return JSON.parse(fence[1].trim()); } catch (e) { /* */ }
  }
  const a = t.indexOf("{");
  const b = t.lastIndexOf("}");
  if (a >= 0 && b > a) {
    try { return JSON.parse(t.slice(a, b + 1)); } catch (e) { /* */ }
  }
  return null;
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
      service: "RQA AI",
      provider: "google-gemini",
      model: String(process.env.GEMINI_MODEL || DEFAULT_MODEL).trim(),
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
  const text = String(body.text || "").trim();
  const subject = String(body.subject || "").trim();
  let count = parseInt(body.count, 10);
  if (!Number.isFinite(count) || count < 1) count = 10;
  if (count > 40) count = 40;
  const difficulty = String(body.difficulty || "mixed").toLowerCase();

  if (!subject) return json(res, 400, { error: "subject is required" });
  if (!text || text.length < 40) {
    return json(res, 400, { error: "Source text too short (paste module notes / extracted text)." });
  }
  if (text.length > 100000) {
    return json(res, 400, { error: "Source text too long (max ~100k chars). Split the module." });
  }

  // Cap payload to model context safety
  const sourceSlice = text.length > 48000 ? text.slice(0, 48000) : text;

  try {
    const url =
      "https://generativelanguage.googleapis.com/v1beta/models/" +
      encodeURIComponent(model) +
      ":generateContent?key=" +
      encodeURIComponent(apiKey);

    const userPrompt =
      "Subject: " +
      subject +
      "\nTarget questions: " +
      count +
      "\nDifficulty: " +
      difficulty +
      "\n\nSOURCE MATERIAL:\n" +
      sourceSlice;

    const geminiRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: SYSTEM_PROMPT + "\n\n" + userPrompt }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json"
        }
      })
    });

    const raw = await geminiRes.text();
    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      return json(res, 502, { error: "Gemini non-JSON response", detail: raw.slice(0, 200) });
    }
    if (!geminiRes.ok) {
      const detail = JSON.stringify(data).replace(/AIza[0-9A-Za-z_-]+/g, "[redacted]").slice(0, 400);
      return json(res, 502, { error: "Gemini error (" + geminiRes.status + "): " + detail });
    }

    const content =
      data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const parsed = extractJson(content);
    if (!parsed || !Array.isArray(parsed.items)) {
      return json(res, 502, { error: "Malformed AI JSON (missing items)" });
    }

    const items = parsed.items
      .filter((it) => it && it.q && Array.isArray(it.choices) && it.choices.length >= 2 && it.answer)
      .map((it) => {
        const choices = it.choices.map((c) => String(c).slice(0, 200)).slice(0, 6);
        let answer = String(it.answer).slice(0, 200);
        if (!choices.includes(answer)) {
          // try case-insensitive match
          const hit = choices.find((c) => c.toLowerCase() === answer.toLowerCase());
          if (hit) answer = hit;
          else answer = choices[0];
        }
        // Normalize to 4 choices when possible
        while (choices.length < 4) choices.push("N/A");
        const four = choices.slice(0, 4);
        if (!four.includes(answer)) four[0] = answer;
        return {
          s: subject,
          q: String(it.q).slice(0, 400),
          choices: four,
          answer,
          explanation: it.explanation ? String(it.explanation).slice(0, 400) : "",
          difficulty: ["easy", "medium", "hard"].includes(String(it.difficulty || "").toLowerCase())
            ? String(it.difficulty).toLowerCase()
            : "medium",
          source: it.source && typeof it.source === "object" ? it.source : null
        };
      })
      .slice(0, count);

    return json(res, 200, {
      items,
      subject,
      source: "rqa-gemini",
      model
    });
  } catch (err) {
    return json(res, 500, {
      error: "RQA backend error",
      details: err && err.message ? err.message : String(err)
    });
  }
};
