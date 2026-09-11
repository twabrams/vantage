// Vantage planner — proxies one planning call to Claude using the owner's key (never exposed to the browser).
module.exports = async (req, res) => {
  const key = process.env.ANTHROPIC_API_KEY;
  if (req.method === "GET") return res.status(key ? 200 : 404).json({ ok: !!key });
  if (req.method !== "POST") return res.status(405).json({ error: "method" });
  if (!key) return res.status(404).json({ error: "no key configured" });
  let body = req.body; if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  const prompt = body && body.prompt;
  if (!prompt || typeof prompt !== "string" || prompt.length > 20000) return res.status(400).json({ error: "bad prompt" });
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: process.env.MODEL || "claude-haiku-4-5", max_tokens: 700, messages: [{ role: "user", content: prompt }] })
    });
    if (!r.ok) return res.status(502).json({ error: "upstream", status: r.status, detail: (await r.text()).slice(0, 300) });
    const data = await r.json();
    const text = (data.content || []).map((c) => c.text || "").join("");
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return res.status(502).json({ error: "no json" });
    return res.status(200).json(JSON.parse(m[0]));
  } catch (e) { return res.status(502).json({ error: String(e && e.message || e) }); }
};
