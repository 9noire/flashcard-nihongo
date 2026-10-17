import { NextResponse } from 'next/server';
import { KotobaItem } from '@/types/kotoba';

interface ChatPayloadMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(req: Request) {
  try {
    const { messages, kotobaList, lessonScope } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Riwayat pesan tidak boleh kosong' }, { status: 400 });
    }

    const apiKey = (process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '').trim();

    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      return NextResponse.json({ error: 'Gemini API Key belum dikonfigurasi di file .env.local' }, { status: 400 });
    }

    // Prepare vocabulary context for the AI
    const vocabList: KotobaItem[] = Array.isArray(kotobaList) ? kotobaList : [];
    
    // Format vocabulary sample/context (cap to prevent token overflow if very large, though flash handles ~1M tokens)
    const formattedVocab = vocabList.slice(0, 300).map((k) => {
      const kanjiStr = k.kanji ? ` (Kanji: ${k.kanji})` : '';
      return `- [Bab ${k.lessonId} No.${k.no}] ${k.kana}${kanjiStr} = ${k.arti}`;
    }).join('\n');

    const scopeTitle = lessonScope === 'all' || !lessonScope ? 'Semua Bab yang Diimpor' : `Bab ${lessonScope}`;

    const systemInstructionText = `
Kamu adalah "Kotoba Sensei" (言葉先生), seorang asisten dan tutor belajar Bahasa Jepang yang ramah, suportif, dan cerdas.
Tugas utamamu adalah membantu pengguna memahami kosakata, tata bahasa, dan contoh penggunaan dari materi yang telah diimpor ke dalam aplikasi flashcard ini.

=== KOSAKATA YANG TELAH DIPELAJARI / DIIMPOR (${scopeTitle}) ===
Total kata tersedia: ${vocabList.length} kata
${formattedVocab || '(Belum ada data kosakata yang diimpor oleh pengguna)'}
=============================================================

PANDUAN MENJAWAB:
1. Prioritaskan kosakata dari daftar materi di atas jika pengguna meminta contoh kalimat, penjelasan arti, atau latihan soal.
2. Jika pengguna meminta contoh kalimat (例文 - reibun):
   - Berikan kalimat sederhana level JLPT N5/N4 yang relevan.
   - Cantumkan bentuk Kanji/Hiragana, Furigana / Romaji, serta terjemahan bahasa Indonesianya.
3. Jika pengguna meminta kuis/latihan:
   - Buatkan kuis yang menyenangkan dan interaktif (misal: tebak arti, pilih jawaban, atau melengkapi kalimat).
   - Tunggu jawaban dari pengguna sebelum memberikan jawaban atau pembahasannya.
4. Jika pengguna bertanya tentang tata bahasa (bunpou) atau partikel (wa, ga, o, ni, de, dll) yang berhubungan dengan kosakata tersebut, jelaskan dengan ringkas, padat, dan mudah dimengerti.
5. Gunakan bahasa Indonesia yang jelas, ringkas, dan langsung pada inti penjelasan tanpa basa-basi berlebihan atau emoji berlebih.
6. Format teks menggunakan Markdown yang rapi (bold, bullet points) agar mudah dan nyaman dibaca.
`;

    // Format chat history for Gemini API
    // Gemini API requires roles 'user' and 'model'
    const validRoles = messages.map((m: ChatPayloadMessage) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content || '' }],
    }));

    // Ensure the conversation starts with a 'user' message
    const formattedContents = [];
    for (let i = 0; i < validRoles.length; i++) {
      const current = validRoles[i];
      if (formattedContents.length === 0 && current.role !== 'user') {
        continue;
      }
      // Merge consecutive identical roles if any
      const last = formattedContents[formattedContents.length - 1];
      if (last && last.role === current.role) {
        last.parts[0].text += '\n\n' + current.parts[0].text;
      } else {
        formattedContents.push(current);
      }
    }

    if (formattedContents.length === 0) {
      formattedContents.push({
        role: 'user',
        parts: [{ text: 'Halo Sensei!' }],
      });
    }

    const models = [
      'gemini-3.8-flash',
      'gemini-3.6-flash',
      'gemini-3.5-flash',
      'gemini-flash-latest',
      'gemini-2.5-flash-lite',
    ];

    let lastError = '';

    for (const model of models) {
      try {
        const bodyPayload = {
          systemInstruction: {
            parts: [{ text: systemInstructionText }],
          },
          contents: formattedContents,
          generationConfig: {
            temperature: 0.7,
            topP: 0.95,
          },
        };

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyPayload),
          }
        );

        if (!response.ok) {
          const errJson = await response.json().catch(() => ({}));
          lastError = errJson.error?.message || `Model ${model} returned HTTP ${response.status}`;
          console.warn(`Assistant API (${model}) failed:`, lastError);
          continue;
        }

        const data = await response.json();
        const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (textResponse) {
          return NextResponse.json({
            reply: textResponse,
            modelUsed: model,
          });
        }
      } catch (err: any) {
        lastError = err?.message || 'Error communicating with AI service';
      }
    }

    return NextResponse.json(
      { error: `Gagal mendapatkan respon dari AI Assistant: ${lastError}` },
      { status: 500 }
    );
  } catch (error: any) {
    console.error('Assistant API Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Terjadi kesalahan pada server saat memproses asisten AI.' },
      { status: 500 }
    );
  }
}
