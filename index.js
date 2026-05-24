import { GoogleGenAI } from "@google/genai";
import 'dotenv/config';
import multer from 'multer';
import express from 'express';
import cors from 'cors';

const ai = new GoogleGenAI({});
const app = express();
const upload = multer();

const GEMINI_MODEL = "gemini-3.5-flash";

app.use(express.json());
app.use(express.static("public"));
app.use(cors());

const PORT = 3000;
app.listen(PORT, () => console.log(`Server ready on http://localhost:${PORT}`));

/* Endpoint Utama Chatbot Glowwings Multi-modal */
app.post('/api/chat', upload.single('file'), async (req, res) => {
  try {
    let conversation = [];
    if (req.body.conversation) {
      conversation = JSON.parse(req.body.conversation);
    }

    const promptText = req.body.text || "";
    let newParts = [];

    if (promptText) {
      newParts.push({ text: promptText });
    }

    if (req.file) {
      const base64Data = req.file.buffer.toString("base64");
      newParts.push({
        inlineData: {
          data: base64Data,
          mimeType: req.file.mimetype
        }
      });
    }

    if (newParts.length === 0) {
      return res.status(400).json({ message: "Pesan atau file tidak boleh kosong!" });
    }

    const contents = [...conversation, { role: "user", parts: newParts }];

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents,
      config: {
        temperature: 0.7,
        systemInstruction: "Kamu adalah Glowwings, seorang Beauty Advisor virtual yang santai, friendly, tapi tetap profesional. Target pengguna kamu adalah remaja yang baru mulai belajar soal skincare dan makeup. Gunakan bahasa Indonesia sehari-hari yang asik, ramah, dan suportif ala bestie (gunakan sapaan 'aku' dan 'kamu' atau 'bestie'). DILARANG KERAS menggunakan emoji apapun dalam responmu. Tugas Utama: Membantu pengguna memilih produk skincare/makeup, menjawab fungsi ingredients/tips kecantikan, menganalisis dokumen ingredients, dan menganalisis foto wajah/skintone. Aturan Memori: Di awal percakapan pengguna baru, tanyakan 4 hal ini secara santai sebelum memberikan rekomendasi: Tipe Kulit, Budget Bulanan (murah/menengah/mahal), Alergi Bahan Tertentu, dan Skintone. Pastikan rekomendasi selalu sesuai budget. Kamu BUKAN dokter kulit. Jika masalah kulit parah, wajib sarankan ke dokter profesional secara halus. Jangan resepkan obat keras."
      }
    });

    res.status(200).json({ result: response.text });

  } catch (e) {
    console.log(e);
    res.status(500).json({ message: e.message });
  }
});