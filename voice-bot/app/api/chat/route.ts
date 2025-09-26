import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    // Pick the first available API key
    const geminiApiKey = process.env.GEMINI_KEY;
    const openaiApiKey = process.env.OPENAI_KEY;
    const claudeApiKey = process.env.CLAUDE_KEY;

    if (!geminiApiKey && !openaiApiKey && !claudeApiKey) {
      return NextResponse.json(
        { error: "No AI API key configured in .env.local." },
        { status: 500 }
      );
    }

    // Combine messages into a single prompt
    const prompt = messages
      .map((m: any) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
      .join("\n");

    let reply = "Sorry, I couldn't generate a reply.";

    // 1️⃣ Gemini
    if (geminiApiKey) {
      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta2/models/gemini-1.5:generateText",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${geminiApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt: { text: prompt },
            maxOutputTokens: 512,
            temperature: 0.7,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        return NextResponse.json(
          { error: `Gemini API Error: ${errorText}` },
          { status: response.status }
        );
      }

      const data = await response.json();
      reply = data?.candidates?.[0]?.output || reply;
      return NextResponse.json({ reply });
    }

    // 2️⃣ OpenAI (text-davinci-003 or gpt-4)
    if (openaiApiKey) {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openaiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4",
          messages,
          temperature: 0.7,
          max_tokens: 512,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return NextResponse.json(
          { error: `OpenAI API Error: ${errorText}` },
          { status: response.status }
        );
      }

      const data = await response.json();
      reply = data?.choices?.[0]?.message?.content || reply;
      return NextResponse.json({ reply });
    }

    // 3️⃣ Claude
    if (claudeApiKey) {
      const response = await fetch("https://api.anthropic.com/v1/complete", {
        method: "POST",
        headers: {
          "x-api-key": claudeApiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-3",
          prompt: messages.map((m: any) => `${m.role === "user" ? "Human" : "Assistant"}: ${m.content}`).join("\n") + "\nAssistant:",
          max_tokens_to_sample: 512,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return NextResponse.json(
          { error: `Claude API Error: ${errorText}` },
          { status: response.status }
        );
      }

      const data = await response.json();
      reply = data?.completion || reply;
      return NextResponse.json({ reply });
    }

  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
