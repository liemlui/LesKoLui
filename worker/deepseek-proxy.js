export default {
  async fetch(request, env) {
    const cors = {
      "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "null",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: cors });

    const body = await request.json();
    const ALLOWED_MODELS = ["deepseek-chat", "deepseek-reasoner"];
    const model = ALLOWED_MODELS.includes(body.model) ? body.model : "deepseek-chat";
    const r = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages: body.messages,
        temperature: body.temperature ?? 0.7,
        response_format: body.response_format,
      }),
    });
    const data = await r.text();
    return new Response(data, { status: r.status, headers: { ...cors, "Content-Type": "application/json" } });
  },
};
