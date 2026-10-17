import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { rawText } = await req.json();

    if (!rawText || typeof rawText !== 'string') {
      return NextResponse.json({ error: 'rawText is required' }, { status: 400 });
    }

    const apiKey = (process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '').trim();

    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      return NextResponse.json({ error: 'Gemini API Key belum dikonfigurasi di file .env' }, { status: 400 });
    }

    const prompt = `
You are an expert Japanese Kotoba Vocabulary Table Parser.
Extract all vocabulary entries from the provided text of a Minna no Nihongo Japanese PDF lesson table.

RETURN ONLY VALID RAW JSON adherence to this exact schema (no markdown, no backticks, no extra text):
{
  "lessonId": 8,
  "items": [
    {
      "no": 1,
      "kana": "ハンサム「な」",
      "kanji": "",
      "arti": "tampan, gagah"
    },
    {
      "no": 2,
      "kana": "わたし",
      "kanji": "私",
      "arti": "saya"
    }
  ]
}

STRICT PARSING RULES:
1. "lessonId": Extract lesson number from text like "第8課" or "Bab 8" (number default to 1 if missing).
2. "no": Integer sequential row number (1, 2, 3...).
3. "kana": MUST only contain Hiragana, Katakana, or particle brackets (e.g. ハンサム「な」, わたし).
4. "kanji": MUST only contain Kanji characters (e.g. 私, 綺麗「な」). IF the word has NO Kanji (or is Katakana-only), "kanji" MUST BE AN EMPTY STRING "".
5. "arti": MUST contain the Indonesian translation (e.g. "tampan, gagah", "saya"). NEVER EVER place Indonesian/Latin translation text into "kanji" or "kana"!

RAW TEXT TO PARSE:
${rawText.slice(0, 30000)}
`;

    // Updated active models per Google Gemini API specification
    const models = [
      'gemini-3.8-flash',
      'gemini-3.6-flash',
      'gemini-3.5-flash',
      'gemini-2.5-flash-lite',
      'gemini-flash-latest',
      'gemini-3.1-pro-preview',
    ];
    let lastError = '';

    for (const model of models) {
      for (const useJsonMime of [true, false]) {
        try {
          const bodyPayload: any = {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.1,
            },
          };
          if (useJsonMime) {
            bodyPayload.generationConfig.responseMimeType = 'application/json';
          }

          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(bodyPayload),
            }
          );

          if (!response.ok) {
            const errJson = await response.json();
            lastError = errJson.error?.message || `Model ${model} error ${response.status}`;
            console.warn(`Gemini Model ${model} Warning:`, lastError);
            continue;
          }

          const data = await response.json();
          const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          
          if (!responseText) {
            lastError = 'Model returned empty response text';
            continue;
          }

          const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsedJson = JSON.parse(cleanedText);

          if (parsedJson && parsedJson.items && Array.isArray(parsedJson.items)) {
            console.log(`Successfully parsed PDF using ${model}! Total items: ${parsedJson.items.length}`);
            return NextResponse.json(parsedJson);
          }
        } catch (err: any) {
          lastError = err?.message || 'Parsing JSON response failed';
        }
      }
    }

    return NextResponse.json(
      { error: `Gemini API Call Failed: ${lastError}` },
      { status: 500 }
    );
  } catch (error: any) {
    console.error('AI PDF Parse Error:', error);
    return NextResponse.json({ error: error?.message || 'Server parsing error' }, { status: 500 });
  }
}
