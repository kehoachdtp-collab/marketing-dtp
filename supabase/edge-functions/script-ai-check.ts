// ════════════════════════════════════════════════════════════════
// Supabase Edge Function: script-ai-check
// ════════════════════════════════════════════════════════════════
// Input  (POST JSON): { script_id: uuid, title: string, content: string }
// Output (JSON):      { ok: true, score, summary, issues[], cost_usd }
// ════════════════════════════════════════════════════════════════

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OPENAI_KEY    = Deno.env.get("OPENAI_API_KEY")!;
const SUPABASE_URL  = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MODEL_CHAT    = "gpt-4o-mini";
const MODEL_EMBED   = "text-embedding-3-small";

// Pricing per 1M tokens (cập nhật 2025) — chỉ để tính cost gần đúng
const PRICE = { in: 0.15, out: 0.60, embed: 0.02 };

const CHECK_PROMPT = `Bạn là chuyên gia kiểm duyệt nội dung quảng cáo/marketing tại Việt Nam, hiểu rõ Luật Quảng cáo VN, quy định ngành Dược/Thực phẩm chức năng/Mỹ phẩm/TMĐT.

Hãy đánh giá KỊCH BẢN dưới đây cho video KOC. Trả về JSON đúng format:
{
  "score": 0-100 (100 = sạch hoàn toàn, không vi phạm),
  "summary": "1-2 câu tóm tắt tổng quan",
  "issues": [
    {
      "type": "claim_cam" | "y_te_qua_da" | "sai_su_that" | "so_sanh_truc_tiep" | "chinh_ta" | "brand_voice" | "khac",
      "severity": "high" | "medium" | "low",
      "quote": "đoạn nguyên văn vi phạm",
      "suggestion": "cách sửa cụ thể"
    }
  ]
}

Tiêu chí check:
1. Claim cấm (chữa khỏi bệnh, thay thế thuốc, 100% hiệu quả, không tác dụng phụ...)
2. Y tế quá đà (cam kết khỏi bệnh, thần dược, dược tính chưa được kiểm chứng)
3. Sai sự thật (số liệu bịa, chứng nhận không có, so sánh sai)
4. So sánh trực tiếp tên đối thủ
5. Chính tả / ngữ pháp tiếng Việt
6. Brand voice / tông giọng phù hợp KOC review trung thực

QUAN TRỌNG: Chỉ trả về JSON, không markdown, không giải thích thêm.`;

interface CheckBody { script_id: string; title: string; content: string; }

Deno.serve(async (req) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return new Response("method not allowed", { status: 405, headers: cors });

  try {
    const body: CheckBody = await req.json();
    if (!body?.script_id || !body?.content) {
      return json({ ok: false, error: "missing script_id or content" }, 400, cors);
    }

    const supa = createClient(SUPABASE_URL, SERVICE_KEY);

    // 1) Gọi OpenAI Chat completion để check vi phạm
    const chatRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL_CHAT,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: CHECK_PROMPT },
          { role: "user",   content: `Tiêu đề: ${body.title || "(không)"}\n\nKịch bản:\n${body.content}` },
        ],
      }),
    });
    if (!chatRes.ok) {
      const err = await chatRes.text();
      return json({ ok: false, error: "openai_chat_failed", detail: err }, 500, cors);
    }
    const chatData = await chatRes.json();
    const raw = chatData.choices?.[0]?.message?.content ?? "{}";
    let parsed: { score?: number; summary?: string; issues?: any[] } = {};
    try { parsed = JSON.parse(raw); } catch { parsed = { score: 0, summary: "AI trả về format sai", issues: [] }; }

    const usageChat = chatData.usage ?? { prompt_tokens: 0, completion_tokens: 0 };
    const costChat = (usageChat.prompt_tokens / 1_000_000) * PRICE.in
                   + (usageChat.completion_tokens / 1_000_000) * PRICE.out;

    // 2) Gọi OpenAI Embedding để tìm trùng sau này
    const embedRes = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL_EMBED,
        input: `${body.title}\n\n${body.content}`.slice(0, 8000),
      }),
    });
    let embedding: number[] | null = null;
    let costEmbed = 0;
    if (embedRes.ok) {
      const embedData = await embedRes.json();
      embedding = embedData.data?.[0]?.embedding ?? null;
      const tokens = embedData.usage?.prompt_tokens ?? 0;
      costEmbed = (tokens / 1_000_000) * PRICE.embed;
    }

    const totalCost = +(costChat + costEmbed).toFixed(6);

    // 3) Ghi kết quả vào DB qua RPC
    const { error: rpcErr } = await supa.rpc("script_set_ai_result", {
      p_id: body.script_id,
      p_score: parsed.score ?? 0,
      p_summary: parsed.summary ?? "",
      p_issues: parsed.issues ?? [],
      p_embedding: embedding,
      p_engine: MODEL_CHAT,
      p_prompt_tokens: usageChat.prompt_tokens,
      p_completion_tokens: usageChat.completion_tokens,
      p_cost_usd: totalCost,
      p_raw: chatData,
    });
    if (rpcErr) {
      return json({ ok: false, error: "rpc_failed", detail: rpcErr.message }, 500, cors);
    }

    return json({
      ok: true,
      script_id: body.script_id,
      score: parsed.score ?? 0,
      summary: parsed.summary ?? "",
      issues: parsed.issues ?? [],
      cost_usd: totalCost,
      tokens: usageChat,
    }, 200, cors);

  } catch (e) {
    return json({ ok: false, error: "exception", detail: String(e) }, 500, cors);
  }
});

function json(payload: unknown, status: number, headers: Record<string,string>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}
