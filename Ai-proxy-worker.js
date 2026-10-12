// Cloudflare Worker: lets your GitHub Pages app use the AI without exposing your API key.
// Secrets/variables (Worker -> Settings -> Variables):
//   ANTHROPIC_API_KEY  (Secret)  your key from console.anthropic.com
//   ALLOW              (Text)    https://YOURNAME.github.io   (only your site may call this)
export default {
  async fetch(req, env) {
    const origin = req.headers.get("Origin") || "";
    const ok = !env.ALLOW || origin === env.ALLOW;
    const cors = {
      "Access-Control-Allow-Origin": ok ? origin || "*" : "null",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Content-Type": "application/json"
    };
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    if (!ok || req.method !== "POST") return new Response(JSON.stringify({ text: "Not allowed" }), { status: 403, headers: cors });

    let prompt = "";
    try { prompt = String((await req.json()).prompt || "").slice(0, 12000); } catch {}
    if (!prompt) return new Response(JSON.stringify({ text: "Empty question" }), { status: 400, headers: cors });

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: "claude-sonnet-5-5", max_tokens: 1000, messages: [{ role: "user", content: prompt }] })
    });
    const j = await r.json();
    const text = (j.content || []).map(x => x.text || "").join("") || (j.error && j.error.message) || "Sorry, I could not answer that.";
    return new Response(JSON.stringify({ text }), { status: r.ok ? 200 : 502, headers: cors });
  }
};
