import { _fetchMaterialById } from "./materialController.js";
import { llm, embeddings } from "../services/llmService.js";
import { htmlToText, buildRetriever } from "../services/ragStore.js";

export const generateQuestion = async (req, res, next) => {
  try {
    const { tutorialId } = req.params;

    const mat = await _fetchMaterialById(tutorialId);
    if (!mat?.content)
      return res.status(404).json({ message: "Material not found!" });

    const text = htmlToText(mat.content);
    const retriever = await buildRetriever(mat.id, text, embeddings);
    const docs = await retriever.invoke(`Judul: ${mat.title}`);

    const context = docs.map((d, i) => `#${i + 1} ${d.pageContent}`).join("\n");

    // Prompt LLM
    const system = `Kamu adalah seorang ahli dalam membuat soal pilihan ganda (MCQ) kontekstual dalam Bahasa Indonesia.

Semua pertanyaan, pilihan jawaban, dan penjelasan HARUS didasarkan sepenuhnya pada informasi dari teks modul tersebut.  
Jangan menambahkan atau mengarang informasi di luar isi modul.

Tugasmu:
- Buat **tepat 3 soal pilihan ganda (MCQs)** berdasarkan isi modul yang diberikan.
- Gunakan Bahasa Indonesia yang jelas dan akademis.
- Pastikan semua pertanyaan bersifat kontekstual dan relevan dengan isi modul.

Output:
1. Keluarkan **hanya JSON valid** tanpa tanda \`\`\`json atau teks tambahan lain.
2. JSON HARUS mengikuti format di bawah ini persis:

{
  "questions": [
    {
      "id": 1,
      "question": "string",
      "options": ["string","string","string","string"],
      "correct_answer": "string",
      "explanation": "string"
    },
    {
      "id": 2,
      "question": "string",
      "options": ["string","string","string","string"],
      "correct_answer": "string",
      "explanation": "string"
    },
    {
      "id": 3,
      "question": "string",
      "options": ["string","string","string","string"],
      "correct_answer": "string",
      "explanation": "string"
    }
  ]
}

Aturan tambahan:
- Tidak boleh ada penjelasan, teks pembuka, atau penutup di luar JSON.
- Gunakan data kontekstual dari teks yang diberikan.
- Jika tidak cukup informasi, buat soal dari kalimat penting dalam teks.
- ID soal harus berurutan: 1, 2, 3.
- Setiap “options” wajib memiliki **4 item unik**.
- Bagian “explanation” harus ditulis singkat, jelas, dan membantu pemahaman. Penjelasan boleh menggunakan poin (–) untuk menjabarkan langkah-langkah utama, prinsip penting, atau mnemonic

Larangan:
Jangan memulai pertanyaan, jawaban, atau penjelasan dengan frasa seperti: "Teks menyatakan", "Menurut teks", "Berdasarkan teks", "Dalam paragraf disebutkan", dsb yang memiliki makna yang sama. Mulailah langsung dengan isi pernyataan atau pertanyaan utama.

Instruksi akhir:
**Output-kan hanya JSON valid seperti di atas, tanpa Markdown, tanpa kata pengantar, tanpa \`\`\`json.**`;
    const matTitle = mat.title || "";

    const user = `Judul: ${matTitle}\nMaterials:\n${text}`;

    const resp = await llm.invoke([
      { role: "system", content: system },
      { role: "user", content: user },
    ]);

    const raw =
      resp?.kwargs?.content ||
      resp?.content ||
      resp?.text ||
      JSON.stringify(resp) ||
      "";

    // Clean up response to extract JSON
    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/```$/i, "")
      .trim();

    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    const jsonString =
      start !== -1 && end !== -1 ? cleaned.slice(start, end + 1) : cleaned;

    if (!jsonString) {
      return res.json({
        message: "No JSON content found from model",
        raw,
      });
    }

    // Parse JSON
    let payload = null;
    try {
      payload = JSON.parse(jsonString);
    } catch (err) {
      return res.json({
        message: "Failed to parse JSON from model",
        error: err?.message,
        raw,
      });
    }

    return res.json({
      questions: payload.questions,
    });
  } catch (e) {
    next(e);
  }
};
