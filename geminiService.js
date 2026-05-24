import { GoogleGenAI } from "@google/genai";
import pdf from "pdf-parse";
import mammoth from "mammoth";

const ai = new GoogleGenAI({ apiKey: (process.env.GEMINI_API_KEY || "").trim() });

const SYSTEM_INSTRUCTION = `You are Glowwings, a relaxed, friendly, yet professional virtual Beauty Advisor. Your target audience is teenagers just starting to learn about skincare and makeup.
Language Style: Use everyday Indonesian that is fun, friendly, and supportive, like a bestie (use the terms 'aku' and 'kamu' or 'bestie'). Avoid stiff formal language, but ensure your explanations are easy to understand, accurate, and not patronizing.
Main Duties: Helping choose skincare/makeup products, answering questions about ingredient functions/beauty tips, analyzing ingredient list documents, and analyzing facial photos/skintone.
Mandatory Rules: At the beginning of a conversation with a new user, ask these four questions casually before making a recommendation: Skin Type, Monthly Budget (cheap/medium/expensive), Ingredient Allergies, and Skintone. Ensure recommendations always fit your budget.
Important Limitation: You are NOT a dermatologist. If your skin problem is severe, you must gently refer them to a professional. Do not prescribe strong medications.
Strict Constraint: Do NOT use any emojis in your response under any circumstances.`;

/*
  Converts a buffer into a generative AI inline data part.
  Encodes the buffer to a base64 string and matches the mime type.
*/
function bufferToGenerativePart(buffer, mimeType) {
  return {
    inlineData: {
      data: buffer.toString("base64"),
      mimeType
    },
  };
}

/*
  Extracts raw text content from PDF, DOCX, and plain text files.
  Utilizes pdf-parse for PDFs, mammoth for DOCX, and standard string conversions for TXT.
*/
async function extractDocumentText(fileBuffer, mimeType, fileName) {
  try {
    if (mimeType === "application/pdf") {
      const data = await pdf(fileBuffer);
      return data.text || "";
    } else if (
      mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || 
      fileName.endsWith(".docx")
    ) {
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      return result.value || "";
    } else {
      return fileBuffer.toString("utf-8");
    }
  } catch (error) {
    console.error(`Gagal mengekstrak teks dari berkas ${fileName}:`, error.message);
    return "";
  }
}

/*
  Queries the Gemini 1.5 Pro Latest model with user text, history, and optional files.
  Appends previous conversation rounds, compiles the system prompt, and returns the response.
  If the file is an image, it passes it directly to Gemini's vision engine as base64 inlineData.
  If the file is a document (PDF, DOCX, TXT), it extracts the text and injects it into the prompt.
*/
export async function generateChatResponse(history, userText, userFile) {
  let promptText = userText || "";
  let finalFile = null;

  if (userFile) {
    const mimeType = userFile.mimetype;
    const isImage = mimeType.startsWith("image/");

    if (isImage) {
      finalFile = userFile;
    } else {
      const docText = await extractDocumentText(userFile.buffer, mimeType, userFile.originalname);
      if (docText) {
        promptText += `\n\n[Konten Dokumen: ${userFile.originalname}]\n${docText}`;
      }
    }
  }

  const formattedContents = [];

  if (Array.isArray(history)) {
    history.forEach((msg) => {
      const role = msg.role === "model" ? "model" : "user";
      formattedContents.push({
        role: role,
        parts: [{ text: msg.text || "" }]
      });
    });
  }

  const currentParts = [];

  if (finalFile) {
    const filePart = bufferToGenerativePart(finalFile.buffer, finalFile.mimetype);
    currentParts.push(filePart);
  }

  if (promptText) {
    currentParts.push({ text: promptText });
  }

  formattedContents.push({
    role: "user",
    parts: currentParts
  });

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: formattedContents,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
    }
  });

  return response.text;
}
