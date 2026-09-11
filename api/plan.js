// Vantage — asks Claude to design the dashboard, using the owner's key (never exposed to the browser).
module.exports = async (req, res) => {
  const key = process.env.ANTHROPIC_API_KEY;
  if (req.method === "GET") return res.status(key ? 200 : 404).json({ ok: !!key });
  if (req.method !== "POST") return res.status(405).json({ error: "method" });
  if (!key) return res.status(404).json({ error: "no key configured" });
  let body = req.body; if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  body = body || {};
  let messages = Array.isArray(body.messages) ? body.messages : (typeof body.prompt === "string" ? [{ role: "user", content: body.prompt }] : null);
  if (!messages || !messages.length) return res.status(400).json({ error: "no messages" });
  messages = messages.slice(-6).filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim()).map((m) => ({ role: m.role, content: m.content.slice(0, 30000) }));
  if (!messages.length || messages[messages.length - 1].role !== "user") return res.status(400).json({ error: "bad messages" });
  const system = typeof body.system === "string" ? body.system.slice(0, 20000) : undefined;
  const models = [process.env.MODEL, "claude-haiku-4-5", "claude-sonnet-4-5", "claude-3-5-haiku-latest"].filter(Boolean);
  try {
    let r, detail = "";
    for (const model of models) {
      r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({ model, max_tokens: 4500, temperature: 0.8, ...(system ? { system } : {}), messages })
      });
      if (r.ok) break;
      detail = (await r.text()).slice(0, 400);
      if (!(r.status === 404 || /not_found|model/i.test(detail))) break;   // only a missing model moves to the next one
    }
    if (!r || !r.ok) return res.status(502).json({ error: "upstream", status: r && r.status, detail });
    const data = await r.json();
    const text = (data.content || []).map((c) => c.text || "").join("");
    const a = text.indexOf("{"), b = text.lastIndexOf("}");
    if (a < 0 || b <= a) return res.status(502).json({ error: "no json", text: text.slice(0, 300) });
    return res.status(200).json(JSON.parse(text.slice(a, b + 1)));
  } catch (e) { return res.status(502).json({ error: String((e && e.message) || e) }); }
};
module.exports.config = { maxDuration: 60 };
