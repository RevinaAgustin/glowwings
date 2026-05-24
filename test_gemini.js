/*
  Test script for Gemini API Integration
  Directly imports and tests the geminiService response using the local workspace environment.
*/
import 'dotenv/config';
import { generateChatResponse } from './geminiService.js';

async function runTest() {
  try {
    console.log("Memulai uji coba Gemini API...");
    const history = [];
    const text = "Halo Glowwings! Aku umur 15 tahun, kulitku berminyak, budgetku murah, dan aku ga ada alergi. Skintone aku medium. Rekomendasiin pelembab dong.";
    const response = await generateChatResponse(history, text, null);
    console.log("\n--- Respon dari Glowwings ---");
    console.log(response);
    console.log("-------------------------------\n");
    console.log("Uji coba berhasil!");
  } catch (error) {
    console.error("Uji coba gagal:", error);
  }
}

runTest();
