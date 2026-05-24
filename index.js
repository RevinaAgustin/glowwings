import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { generateChatResponse } from './geminiService.js';

const app = express();
const upload = multer();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

/*
  Route handler for /api/config.
  Exposes public configuration such as the Google OAuth Client ID to the frontend.
*/
app.get('/api/config', (req, res) => {
  res.status(200).json({ googleClientId: (process.env.GOOGLE_CLIENT_ID || "").trim() });
});

/*
  Route handler for /api/chat.
  Handles chat requests with optional text and attachments (images, PDFs, documents).
  Submits prompt queries directly to the chatbot model and returns the text response.
*/
app.post('/api/chat', upload.single('file'), async (req, res) => {
  const { text, conversation } = req.body;
  const file = req.file;

  if (!text && !file) {
    return res.status(400).json({ message: "Payload tidak valid. Kirimkan teks atau berkas." });
  }

  try {
    let history = [];
    if (conversation) {
      history = JSON.parse(conversation);
    }

    const reply = await generateChatResponse(history, text, file);
    res.status(200).json({ result: reply });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});