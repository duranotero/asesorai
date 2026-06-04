// Función serverless de Netlify: chat del asesor financiero con la API de Anthropic.

export default async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método no permitido" }), { status: 405 });
  }
  try {
    const { messages, context } = await req.json();
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return Response.json({ text: "Falta configurar ANTHROPIC_API_KEY en Netlify." });

    const ctx = `Datos del usuario (CHF):
- Ingreso mensual: ${context.ingreso}
- Estrategia: ${context.estrategia === "avalanche" ? "avalancha" : "bola de nieve"}
- Gastos: ${(context.expenses || []).map((e) => `${e.nombre}(${e.categoria}):${e.monto}`).join("; ")} | Total: ${context.totalExp}
- Deudas: ${(context.debts || []).map((d) => `${d.nombre}: saldo ${d.saldo}, ${d.tasa}%, min ${d.minimo}`).join("; ")} | Total: ${context.totalDebt}
- Dinero libre: ${context.freeCash}
- Meta: ${context.meta?.nombre}, objetivo ${context.meta?.objetivo}, ahorrado ${context.meta?.ahorrado}`;

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: "Eres un asesor financiero profesional, claro y empático. Respondes en español, en CHF, con recomendaciones concretas y accionables usando los datos del usuario. Usa pasos numerados cuando ayude. Son orientaciones generales, no asesoría regulada.\n\n" + ctx,
        messages,
      }),
    });
    const data = await r.json();
    const text = (data?.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n") || "No pude responder. Intenta de nuevo.";
    return Response.json({ text });
  } catch (e) {
    return Response.json({ text: "Error de conexión. Intenta de nuevo." });
  }
};
