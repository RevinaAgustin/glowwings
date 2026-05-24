import readline from 'readline';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: 'AIzaSyDjpVfXjyLdKNjP1pxve-FDAbt8ZVgTzfc' });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🤖 Gemini CLI - ketik "exit" untuk keluar\n');

function tanya() {
  rl.question('> ', async (input) => {
    if (input.toLowerCase() === 'exit') {
      console.log('Bye!');
      rl.close();
      return;
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: input
      });
      console.log('\n' + response.text + '\n');
    } catch (e) {
      console.log('Error:', e.message);
    }

    tanya(); // looping balik
  });
}

tanya();