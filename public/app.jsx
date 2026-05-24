/* Komponen Utama Chatbot Glowwings
  Menggunakan FormData untuk mengirim pesan teks dan file ke backend.
*/
import { useState } from 'react';

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input && !file) return;

    const newMessages = [...messages, { role: 'user', text: input }];
    setMessages(newMessages);
    setInput('');
    setFile(null);
    setIsLoading(true);

    const formData = new FormData();
    formData.append('text', input);
    if (file) {
      formData.append('file', file);
    }
    formData.append('conversation', JSON.stringify(messages));

    try {
      const response = await fetch('http://localhost:3000/api/chat', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      setMessages((prev) => [...prev, { role: 'model', text: data.result }]);
    } catch (error) {
      console.error("Gagal mengirim pesan:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 to-blue-100 p-4 md:p-8 flex items-center justify-center font-sans">
      <div className="w-full max-w-2xl bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden flex flex-col h-[80vh]">
        
        <div className="bg-pink-300 p-4 shadow-sm text-center">
          <h1 className="text-xl font-bold text-white tracking-wide">Glowwings</h1>
          <p className="text-pink-50 text-sm">Your Personal Beauty Advisor</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] p-3 rounded-2xl ${msg.role === 'user' ? 'bg-blue-200 text-slate-800 rounded-tr-none' : 'bg-pink-100 text-slate-800 rounded-tl-none'}`}>
                {msg.text}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-pink-50 text-pink-400 p-3 rounded-2xl rounded-tl-none italic text-sm">
                Glowwings sedang mengetik...
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-4 bg-white border-t border-pink-100 flex items-center gap-2">
          <label className="cursor-pointer p-2 text-pink-400 hover:bg-pink-50 rounded-full transition-colors">
            <input 
              type="file" 
              className="hidden" 
              onChange={(e) => setFile(e.target.files[0])}
              accept="image/*,.pdf,.doc,.docx"
            />
            <span className="font-bold text-lg">+</span>
          </label>
          
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tanya soal skincare atau makeup..."
            className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-full focus:outline-none focus:border-pink-300 focus:ring-1 focus:ring-pink-300"
          />
          
          <button 
            type="submit" 
            disabled={isLoading || (!input && !file)}
            className="px-6 py-2 bg-blue-300 hover:bg-blue-400 text-white font-semibold rounded-full transition-colors disabled:opacity-50"
          >
            Kirim
          </button>
        </form>

        {file && (
          <div className="px-4 pb-2 text-xs text-slate-500 bg-white">
            File siap dikirim: {file.name}
          </div>
        )}
      </div>
    </div>
  );
}