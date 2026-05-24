import { useState, useRef, useEffect } from 'react';

const INITIAL_GREETING = "Halo bestie! Kenalin, aku Glowwings, virtual Beauty Advisor yang siap nemenin perjalanan skincare dan makeup kamu. Sebelum kita bahas rekomendasi produk yang paling cocok buat kamu, boleh tolong jawab 4 pertanyaan ini dulu secara santai?\n\n1. Tipe kulit kamu apa? (Kering, berminyak, kombinasi, sensitif)\n2. Budget bulanan kamu berapa? (Murah, sedang, atau mahal)\n3. Ada alergi kandungan tertentu nggak?\n4. Warna kulit / skintone kamu apa?\n\nYuk jawab pelan-pelan biar aku bisa kasih saran yang pas banget buat kamu!";

/*
  Decodes a JSON Web Token (JWT) payload on the client side.
  Splits the token to retrieve the base64url-encoded payload, converts it to base64,
  and decodes it into a JavaScript object containing user profile information.
*/
const decodeJwt = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
};

/*
  Glowwings Virtual Beauty Advisor App.
  Integrates Google OAuth 2.0 for user authentication and session management.
  Maintains user-specific conversation history loaded from and saved to localStorage.
  Provides a beautiful, minimalist, full-screen Gemini-style layout with a left sidebar.
  Uses native Web Speech API (window.SpeechRecognition) for real-time voice input transcription.
  Supports image visual thumbnail previews (using object URLs) and document icons.
  Communicates with the backend server for stable chatbot responses.
*/
export default function App() {
  const [messages, setMessages] = useState([
    { role: 'model', text: INITIAL_GREETING }
  ]);
  const [input, setInput] = useState('');
  const [file, setFile] = useState(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  const [currentUser, setCurrentUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [gsiLoaded, setGsiLoaded] = useState(false);
  const [googleClientId, setGoogleClientId] = useState('');
  const [chatToDelete, setChatToDelete] = useState(null);

  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    const savedUser = localStorage.getItem('glowwings_user');
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch('http://localhost:3000/api/config');
        const data = await res.json();
        if (data.googleClientId) {
          setGoogleClientId(data.googleClientId);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchConfig();
  }, []);

  useEffect(() => {
    if (currentUser) {
      const stored = localStorage.getItem(`glowwings_history_${currentUser.sub}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setConversations(parsed);
          if (parsed.length > 0) {
            setActiveChatId(parsed[0].id);
            setMessages(parsed[0].messages);
          } else {
            startNewChat(false);
          }
        } catch (e) {
          console.error(e);
        }
      } else {
        setConversations([]);
        startNewChat(false);
      }
    } else {
      setConversations([]);
      setMessages([{ role: 'model', text: INITIAL_GREETING }]);
      setActiveChatId(null);
    }
  }, [currentUser]);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => setGsiLoaded(true);
    document.body.appendChild(script);
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  useEffect(() => {
    if (gsiLoaded && googleClientId && window.google) {
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleCredentialResponse
      });

      const btnContainer = document.getElementById("google-signin-btn-modal");
      if (btnContainer) {
        window.google.accounts.id.renderButton(btnContainer, {
          theme: "outline",
          size: "large",
          width: 250
        });
      }

      const sidebarBtnContainer = document.getElementById("google-signin-btn-sidebar");
      if (sidebarBtnContainer) {
        window.google.accounts.id.renderButton(sidebarBtnContainer, {
          theme: "outline",
          size: "medium",
          width: 200
        });
      }
    }
  }, [gsiLoaded, googleClientId, showLoginModal, currentUser]);

  const handleCredentialResponse = (response) => {
    const credential = response.credential;
    if (credential) {
      const payload = decodeJwt(credential);
      if (payload) {
        setCurrentUser(payload);
        setShowLoginModal(false);
        localStorage.setItem('glowwings_user', JSON.stringify(payload));
      }
    }
  };

  const handleSignOut = () => {
    setCurrentUser(null);
    localStorage.removeItem('glowwings_user');
    startNewChat(true);
  };

  const startNewChat = (forceReset = true) => {
    setMessages([{ role: 'model', text: INITIAL_GREETING }]);
    setActiveChatId(null);
    if (forceReset) {
      setSidebarOpen(false);
    }
  };

  const selectChat = (chatId) => {
    const chat = conversations.find(c => c.id === chatId);
    if (chat) {
      setActiveChatId(chat.id);
      setMessages(chat.messages);
      setSidebarOpen(false);
    }
  };

  /*
    Toggles the pinned status of a specific chat session in the list.
    Updates both the local React state and the persistent user-specific localStorage history.
  */
  const togglePinChat = (chatId, e) => {
    if (e) {
      e.stopPropagation();
    }
    if (!currentUser) return;
    setConversations(prev => {
      const nextList = prev.map(chat => {
        if (chat.id === chatId) {
          return { ...chat, pinned: !chat.pinned };
        }
        return chat;
      });
      localStorage.setItem(`glowwings_history_${currentUser.sub}`, JSON.stringify(nextList));
      return nextList;
    });
  };

  /*
    Initiates the deletion process for a chat room.
    Saves the target chat ID to show the custom confirmation dialog.
  */
  const confirmDeleteChat = (chatId, e) => {
    if (e) {
      e.stopPropagation();
    }
    setChatToDelete(chatId);
  };

  /*
    Deletes a specific chat session and updates persistence.
    If the deleted chat was the actively selected one, redirects the user to a new blank session.
  */
  const deleteChat = (chatId) => {
    if (!currentUser) return;
    setConversations(prev => {
      const nextList = prev.filter(chat => chat.id !== chatId);
      localStorage.setItem(`glowwings_history_${currentUser.sub}`, JSON.stringify(nextList));
      return nextList;
    });
    if (activeChatId === chatId) {
      startNewChat(false);
    }
    setChatToDelete(null);
  };

  /*
    Renders a unified chat session list item.
    Configures a hoverable button with floating action buttons to pin or delete the session.
  */
  const renderChatItem = (chat) => {
    return (
      <div 
        key={chat.id}
        className="group relative flex items-center justify-between w-full rounded-xl transition-all border border-transparent hover:bg-white/40"
      >
        <button 
          onClick={() => selectChat(chat.id)}
          className={`flex-1 text-left px-3 py-2.5 rounded-xl text-xs flex items-center gap-2.5 transition-all truncate border-transparent ${
            activeChatId === chat.id 
              ? 'bg-pink-100/50 text-pink-700 font-semibold border-pink-200/30' 
              : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className={`w-4 h-4 shrink-0 ${activeChatId === chat.id ? 'text-pink-600' : 'text-slate-400'}`}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.177 48.177 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
          </svg>
          <span className="truncate pr-16">{chat.title}</span>
        </button>
        
        <div className="absolute right-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity bg-gradient-to-l from-white/95 via-white/80 to-transparent pl-4 py-1 rounded-r-xl">
          <button 
            type="button"
            onClick={(e) => togglePinChat(chat.id, e)}
            className="p-1 hover:bg-slate-100/60 rounded-lg text-slate-400 hover:text-pink-500 transition-colors cursor-pointer"
            title={chat.pinned ? "Lepas sematan" : "Sematkan obrolan"}
          >
            {chat.pinned ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-pink-500">
                <path d="M16 4.5a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3.31a2 2 0 0 1-.586 1.414l-1.828 1.828A1 1 0 0 0 6 12v1a1 1 0 0 0 1 1h3.5v5.5a1.5 1.5 0 1 0 3 0V14H17a1 1 0 0 0 1-1v-1a1 1 0 0 0-.586-.914l-1.828-1.828A2 2 0 0 1 14 7.81V4.5Z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 4.5a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3.31a2 2 0 0 1-.586 1.414l-1.828 1.828A1 1 0 0 0 6 12v1a1 1 0 0 0 1 1h3.5v5.5a1.5 1.5 0 1 0 3 0V14H17a1 1 0 0 0 1-1v-1a1 1 0 0 0-.586-.914l-1.828-1.828A2 2 0 0 1 14 7.81V4.5Z" />
              </svg>
            )}
          </button>
          <button 
            type="button"
            onClick={(e) => confirmDeleteChat(chat.id, e)}
            className="p-1 hover:bg-red-50/60 rounded-lg text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
            title="Hapus obrolan"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.34 9m-4.72 0-.34-9m4.72-3-.03-.412a8.997 8.997 0 0 0-4.74 0l-.03.41C8.74 7.218 8.07 8 8 9.07v9.423c0 .87.64 1.583 1.5 1.636a48.513 48.513 0 0 0 9 0c.86-.053 1.5-1.766 1.5-1.636V9.07c0-1.07-.67-1.852-1.5-1.862L14.74 6Z" />
            </svg>
          </button>
        </div>
      </div>
    );
  };

  const saveChatHistory = (updatedMessages, chatId = null) => {
    if (!currentUser) return;
    const targetId = chatId || activeChatId;
    let currentId = targetId;
    
    if (!currentId) {
      currentId = 'chat_' + Date.now();
      setActiveChatId(currentId);
    }

    let title = "Percakapan Baru";
    const firstUserMsg = updatedMessages.find(m => m.role === 'user');
    if (firstUserMsg) {
      title = firstUserMsg.text.slice(0, 30);
      if (firstUserMsg.text.length > 30) {
        title += '...';
      }
    }

    setConversations(prev => {
      let exists = false;
      let nextList = prev.map(chat => {
        if (chat.id === currentId) {
          exists = true;
          return { ...chat, messages: updatedMessages, title };
        }
        return chat;
      });

      if (!exists) {
        const newChat = {
          id: currentId,
          title,
          messages: updatedMessages,
          createdAt: new Date().toISOString()
        };
        nextList = [newChat, ...nextList];
      }

      localStorage.setItem(`glowwings_history_${currentUser.sub}`, JSON.stringify(nextList));
      return nextList;
    });
  };

  const checkAuth = () => {
    if (!currentUser) {
      setShowLoginModal(true);
      return false;
    }
    return true;
  };

  const startRecording = () => {
    if (!checkAuth()) return;
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Browser Anda tidak mendukung Web Speech API. Silakan gunakan Google Chrome untuk fitur input suara.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'id-ID';

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      const currentSpeech = (finalTranscript || interimTranscript).trim();
      if (currentSpeech) {
        setInput(currentSpeech);
      }
    };

    recognition.onerror = (event) => {
      console.error(event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.start();
    recognitionRef.current = recognition;
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleFileChange = (e) => {
    if (!checkAuth()) {
      e.target.value = '';
      return;
    }
    if (e.target.files && e.target.files[0]) {
      const chosenFile = e.target.files[0];
      setFile(chosenFile);

      if (filePreviewUrl) {
        URL.revokeObjectURL(filePreviewUrl);
      }

      if (chosenFile.type.startsWith('image/')) {
        setFilePreviewUrl(URL.createObjectURL(chosenFile));
      } else {
        setFilePreviewUrl(null);
      }
    }
  };

  const removeFile = () => {
    setFile(null);
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
      setFilePreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!checkAuth()) return;
    if (!input && !file) return;

    let userMessageText = input;
    if (file && !input) {
      userMessageText = `Mengirim berkas: ${file.name}`;
    }

    const currentMessages = [...messages];
    const newMessages = [...currentMessages, { role: 'user', text: userMessageText }];
    
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    const formData = new FormData();
    formData.append('text', input);
    if (file) {
      formData.append('file', file);
    }
    formData.append('conversation', JSON.stringify(currentMessages));

    setFile(null);
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
      setFilePreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    try {
      const response = await fetch('http://localhost:3000/api/chat', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (response.ok) {
        setMessages((prev) => {
          const nextMessages = [...prev, { role: 'model', text: data.result }];
          saveChatHistory(nextMessages);
          return nextMessages;
        });
      } else {
        const errorText = `Gagal: ${data.message || 'Terjadi kesalahan backend.'}`;
        setMessages((prev) => {
          const nextMessages = [...prev, { role: 'model', text: errorText }];
          saveChatHistory(nextMessages);
          return nextMessages;
        });
      }
    } catch (error) {
      console.error(error);
      const connErrorText = 'Koneksi gagal. Pastikan server backend sudah menyala.';
      setMessages((prev) => {
        const nextMessages = [...prev, { role: 'model', text: connErrorText }];
        saveChatHistory(nextMessages);
        return nextMessages;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    if (!currentUser) {
      setShowLoginModal(true);
      return;
    }
    setInput(e.target.value);
  };

  const formatMessageText = (text) => {
    if (!text) return '';
    return text.split('\n').map((line, lineIndex) => {
      let content = line;
      const boldRegex = /\*\*(.*?)\*\*/g;
      const parts = [];
      let lastIndex = 0;
      let match;

      while ((match = boldRegex.exec(content)) !== null) {
        if (match.index > lastIndex) {
          parts.push(content.substring(lastIndex, match.index));
        }
        parts.push(
          <strong key={match.index} className="font-semibold text-pink-600">
            {match[1]}
          </strong>
        );
        lastIndex = boldRegex.lastIndex;
      }

      if (lastIndex < content.length) {
        parts.push(content.substring(lastIndex));
      }

      const isListItem = line.trim().startsWith('* ') || line.trim().startsWith('- ');
      const cleanLine = isListItem ? line.trim().substring(2) : line;

      if (isListItem) {
        return (
          <li key={lineIndex} className="list-disc ml-5 mt-1 text-slate-700">
            {parts.length > 0 ? parts : cleanLine}
          </li>
        );
      }

      return (
        <p key={lineIndex} className={line.trim() === '' ? 'h-2' : 'mt-1 text-slate-700 leading-relaxed'}>
          {parts.length > 0 ? parts : content}
        </p>
      );
    });
  };

  const pinnedConversations = conversations.filter(chat => chat.pinned);
  const recentConversations = conversations.filter(chat => !chat.pinned);

  return (
    <div className="w-screen h-screen bg-gradient-to-br from-pink-50 via-slate-50 to-blue-50 flex font-sans overflow-hidden">
      
      <div className={`w-72 bg-white/30 backdrop-blur-xl border-r border-slate-200/60 flex flex-col shrink-0 h-full transition-all duration-300 absolute md:static z-20 top-0 bottom-0 left-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-4 border-b border-slate-200/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-pink-400 to-blue-400 p-1 flex items-center justify-center text-white shadow-md">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor" className="w-full h-full text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.9)]">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-2-3-6-4.5-9.5-4.5.5 6 3 11.5 9.5 16.5m0-12C8.5 8 5 10 4 13.5c3.5 1.5 6 3.5 8 7.5m-8-7.5c1.5 1.5 3 2.5 4.5 4" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c2-3 6-4.5 9.5-4.5-.5 6-3 11.5-9.5 16.5m0-12C15.5 8 19 10 20 13.5c-3.5 1.5-6 3.5-8 7.5m8-7.5c-1.5 1.5-3 2.5-4.5 4" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2m-7 1l1.5 1.5m11-1.5L16 7.5M3 10h2m14 0h2m-15 5l1.5.5m10.5-.5l-1.5.5M12 18v2" />
              </svg>
            </div>
            <span className="font-bold text-slate-800 tracking-wide text-sm">Glowwings</span>
          </div>
          
          <button 
            onClick={() => setSidebarOpen(false)}
            className="p-1 hover:bg-slate-100/60 rounded-lg md:hidden text-slate-500 hover:text-slate-800 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-3">
          <button 
            onClick={() => startNewChat(true)}
            className="w-full py-2.5 px-4 bg-gradient-to-tr from-pink-400 to-blue-400 hover:from-pink-500 hover:to-blue-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Sesi Baru
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-1 space-y-1">
          {currentUser ? (
            conversations.length > 0 ? (
              <>
                {pinnedConversations.length > 0 && (
                  <div className="space-y-1 mb-4">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1">Disematkan</div>
                    {pinnedConversations.map(chat => renderChatItem(chat))}
                  </div>
                )}
                <div className="space-y-1">
                  {pinnedConversations.length > 0 && (
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1">Terbaru</div>
                  )}
                  {pinnedConversations.length === 0 && (
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1">Riwayat Obrolan</div>
                  )}
                  {recentConversations.map(chat => renderChatItem(chat))}
                </div>
              </>
            ) : (
              <div className="text-slate-400 text-xs italic text-center py-4">Belum ada obrolan.</div>
            )
          ) : (
            <div className="text-slate-400 text-xs italic text-center py-4 px-2 bg-slate-50/40 rounded-xl border border-slate-100/50">
              Silakan masuk untuk melihat riwayat obrolan kamu.
            </div>
          )}
        </div>

        <div className="p-3 border-t border-slate-200/40 bg-white/10">
          {currentUser ? (
            <div className="flex items-center gap-3">
              <img 
                src={currentUser.picture} 
                alt={currentUser.name} 
                className="w-9 h-9 rounded-xl border border-pink-200 object-cover"
              />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-slate-800 truncate">{currentUser.name}</div>
                <div className="text-[10px] text-slate-500 truncate">{currentUser.email}</div>
              </div>
              <button 
                onClick={handleSignOut}
                className="p-2 hover:bg-red-50 hover:text-red-600 rounded-xl text-slate-400 transition-colors shrink-0"
                title="Keluar"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-xs text-slate-500 font-medium text-center mb-1">Mulai obrolan kamu!</div>
              <div id="google-signin-btn-sidebar" className="flex justify-center"></div>
            </div>
          )}
        </div>
      </div>

      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/10 backdrop-blur-xs z-10 md:hidden"
        />
      )}

      <div className="flex-1 flex flex-col h-full overflow-hidden bg-white/20">
        
        <div className="bg-white/40 border-b border-slate-200/40 p-4 flex items-center justify-between backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 hover:bg-slate-100/60 rounded-xl md:hidden text-slate-600 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
            
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-400 to-blue-400 p-1.5 flex items-center justify-center text-white shadow-md shadow-pink-200">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor" className="w-full h-full text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.9)]">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-2-3-6-4.5-9.5-4.5.5 6 3 11.5 9.5 16.5m0-12C8.5 8 5 10 4 13.5c3.5 1.5 6 3.5 8 7.5m-8-7.5c1.5 1.5 3 2.5 4.5 4" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c2-3 6-4.5 9.5-4.5-.5 6-3 11.5-9.5 16.5m0-12C15.5 8 19 10 20 13.5c-3.5 1.5-6 3.5-8 7.5m8-7.5c-1.5 1.5-3 2.5-4.5 4" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2m-7 1l1.5 1.5m11-1.5L16 7.5M3 10h2m14 0h2m-15 5l1.5.5m10.5-.5l-1.5.5M12 18v2" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-800 tracking-wide">Glowwings</h1>
              <p className="text-[10px] text-slate-500 font-medium">Virtual Beauty Advisor</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-xs text-slate-500 font-medium">Online</span>
            </div>
            {!currentUser && (
              <button 
                onClick={() => setShowLoginModal(true)}
                className="py-1.5 px-3 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-xs flex items-center gap-1.5 transition-all"
              >
                Masuk
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-8">
          <div className="max-w-3xl mx-auto w-full space-y-8">
            {messages.map((msg, index) => (
              <div key={index}>
                {msg.role === 'model' ? (
                  <div className="flex gap-4 items-start">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-pink-400 to-blue-400 p-1 flex items-center justify-center text-white shrink-0 shadow-sm shadow-pink-200">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor" className="w-full h-full text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.9)]">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-2-3-6-4.5-9.5-4.5.5 6 3 11.5 9.5 16.5m0-12C8.5 8 5 10 4 13.5c3.5 1.5 6 3.5 8 7.5m-8-7.5c1.5 1.5 3 2.5 4.5 4" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c2-3 6-4.5 9.5-4.5-.5 6-3 11.5-9.5 16.5m0-12C15.5 8 19 10 20 13.5c-3.5 1.5-6 3.5-8 7.5m8-7.5c-1.5 1.5-3 2.5-4.5 4" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2m-7 1l1.5 1.5m11-1.5L16 7.5M3 10h2m14 0h2m-15 5l1.5.5m10.5-.5l-1.5.5M12 18v2" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Glowwings</div>
                      <div className="bg-white/85 border border-slate-100 rounded-2xl rounded-tl-none p-4 shadow-2xs text-slate-800 text-xs sm:text-sm leading-relaxed">
                        {formatMessageText(msg.text)}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-4 items-start flex-row-reverse">
                    {currentUser ? (
                      <img 
                        src={currentUser.picture} 
                        alt="User" 
                        className="w-8 h-8 rounded-lg object-cover border border-blue-200 shrink-0 shadow-2xs"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-blue-400 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-2xs">
                        U
                      </div>
                    )}
                    <div className="flex-1 min-w-0 text-right">
                      <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Kamu</div>
                      <div className="inline-block text-left bg-blue-50/90 border border-blue-100/50 rounded-2xl rounded-tr-none p-4 shadow-2xs text-slate-800 text-xs sm:text-sm leading-relaxed">
                        {formatMessageText(msg.text)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-pink-400 to-blue-400 p-1 flex items-center justify-center text-white shrink-0 shadow-sm animate-pulse">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor" className="w-full h-full text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.9)]">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-2-3-6-4.5-9.5-4.5.5 6 3 11.5 9.5 16.5m0-12C8.5 8 5 10 4 13.5c3.5 1.5 6 3.5 8 7.5m-8-7.5c1.5 1.5 3 2.5 4.5 4" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c2-3 6-4.5 9.5-4.5-.5 6-3 11.5-9.5 16.5m0-12C15.5 8 19 10 20 13.5c-3.5 1.5-6 3.5-8 7.5m8-7.5c-1.5 1.5-3 2.5-4.5 4" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2m-7 1l1.5 1.5m11-1.5L16 7.5M3 10h2m14 0h2m-15 5l1.5.5m10.5-.5l-1.5.5M12 18v2" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Glowwings</div>
                  <div className="bg-white/85 border border-slate-100 rounded-2xl rounded-tl-none p-4 shadow-2xs flex items-center gap-2 max-w-[200px]">
                    <div className="flex gap-1.5 items-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-bounce [animation-delay:-0.3s]"></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-bounce [animation-delay:-0.15s]"></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-bounce"></span>
                    </div>
                    <span className="text-xs text-slate-400 italic font-medium">Menganalisis...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </div>

        <div className="bg-gradient-to-t from-slate-50 via-slate-50/90 to-transparent p-4 md:p-6 border-t border-slate-200/10 backdrop-blur-xs shrink-0">
          <div className="max-w-3xl mx-auto w-full">
            
            {file && (
              <div className="mb-4 flex items-center gap-3">
                {filePreviewUrl ? (
                  <div className="relative group w-16 h-16 rounded-2xl overflow-hidden border border-white/80 shadow-md">
                    <img 
                      src={filePreviewUrl} 
                      alt="Pratinjau Foto" 
                      className="w-full h-full object-cover"
                    />
                    <button 
                      type="button"
                      onClick={removeFile}
                      className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity duration-200 cursor-pointer"
                      title="Hapus foto"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div className="relative bg-white/60 backdrop-blur-md border border-slate-200/40 rounded-2xl px-4 py-2.5 flex items-center gap-3 shadow-2xs max-w-sm">
                    <div className="w-8 h-8 rounded-xl bg-pink-50 flex items-center justify-center text-pink-500 shrink-0">
                      {file.name.endsWith('.pdf') ? (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-slate-800 truncate">{file.name}</div>
                      <div className="text-[10px] text-slate-400 font-medium uppercase">{file.name.split('.').pop()} Berkas</div>
                    </div>
                    <button 
                      type="button"
                      onClick={removeFile}
                      className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                      title="Hapus berkas"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} className="relative bg-white border border-slate-200 shadow-sm focus-within:border-pink-300 focus-within:ring-2 focus-within:ring-pink-100 rounded-3xl p-2 flex items-center gap-1.5 transition-all">
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*,.pdf,.doc,.docx,.txt"
                className="hidden" 
              />
              
              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading || isRecording}
                className="p-3 text-slate-500 hover:text-pink-500 hover:bg-slate-50 active:bg-slate-100 rounded-2xl transition-all shrink-0 disabled:opacity-40"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.572L8.557 18.515a1.5 1.5 0 1 1-2.12-2.12l8.835-8.836m-3.535-3.536L4.854 15.353" />
                </svg>
              </button>

              {isRecording ? (
                <button 
                  type="button" 
                  onClick={stopRecording}
                  className="p-3 text-red-500 bg-red-50 hover:bg-red-100 rounded-2xl transition-all shrink-0 animate-pulse flex items-center gap-2"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping"></span>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.25h13.5v13.5H5.25V5.25Z" />
                  </svg>
                </button>
              ) : (
                <button 
                  type="button" 
                  onClick={startRecording}
                  disabled={isLoading}
                  className="p-3 text-slate-500 hover:text-blue-500 hover:bg-slate-50 active:bg-slate-100 rounded-2xl transition-all shrink-0 disabled:opacity-40"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                  </svg>
                </button>
              )}

              {isRecording ? (
                <div className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs font-semibold text-red-500 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
                  Mendengarkan... Bicara sekarang (klik tombol merah untuk berhenti)
                </div>
              ) : (
                <input
                  type="text"
                  value={input}
                  onChange={handleInputChange}
                  onClick={handleInputChange}
                  placeholder="Tanya skincare atau makeup..."
                  className="flex-1 px-4 py-3 bg-slate-50 border border-transparent rounded-2xl focus:outline-none text-slate-700 placeholder-slate-400 text-sm transition-all"
                />
              )}

              <button 
                type="submit" 
                disabled={isLoading || isRecording || (!input && !file)}
                className="p-3 bg-gradient-to-tr from-pink-400 to-blue-400 hover:from-pink-500 hover:to-blue-500 text-white shadow-md active:scale-95 rounded-2xl transition-all shrink-0 disabled:opacity-40 disabled:scale-100"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                </svg>
              </button>
            </form>
            
            <div className="text-[10px] text-slate-400/80 text-center mt-2.5 font-medium tracking-wide">
              Glowwings adalah asisten kecantikan virtual. Konsultasikan dengan dokter spesialis jika masalah kulitmu berat.
            </div>
          </div>
        </div>
      </div>

      {showLoginModal && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white/80 backdrop-blur-2xl border border-white/60 shadow-2xl rounded-3xl p-6 max-w-sm w-full text-center relative">
            <button 
              onClick={() => setShowLoginModal(false)}
              className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700 transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
            
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-400 to-blue-400 p-2.5 flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-pink-200">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor" className="w-full h-full text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.9)]">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-2-3-6-4.5-9.5-4.5.5 6 3 11.5 9.5 16.5m0-12C8.5 8 5 10 4 13.5c3.5 1.5 6 3.5 8 7.5m-8-7.5c1.5 1.5 3 2.5 4.5 4" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c2-3 6-4.5 9.5-4.5-.5 6-3 11.5-9.5 16.5m0-12C15.5 8 19 10 20 13.5c-3.5 1.5-6 3.5-8 7.5m8-7.5c-1.5 1.5-3 2.5-4.5 4" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2m-7 1l1.5 1.5m11-1.5L16 7.5M3 10h2m14 0h2m-15 5l1.5.5m10.5-.5l-1.5.5M12 18v2" />
              </svg>
            </div>
            
            <h3 className="text-lg font-bold text-slate-800 mb-1">Masuk Terlebih Dahulu</h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-6">
              Silakan masuk dengan Google untuk mulai berkonsultasi dengan Glowwings secara personal.
            </p>
            
            <div className="flex flex-col items-center gap-3">
              <div id="google-signin-btn-modal" className="w-full flex justify-center"></div>
              
              <button 
                onClick={() => setShowLoginModal(false)}
                className="text-xs text-slate-400 hover:text-slate-600 font-medium transition-all"
              >
                Nanti Saja
              </button>
            </div>
          </div>
        </div>
      )}

      {chatToDelete && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white/80 backdrop-blur-2xl border border-white/60 shadow-2xl rounded-3xl p-6 max-w-sm w-full text-center relative">
            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center text-red-500 mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.34 9m-4.72 0-.34-9m4.72-3-.03-.412a8.997 8.997 0 0 0-4.74 0l-.03.41C8.74 7.218 8.07 8 8 9.07v9.423c0 .87.64 1.583 1.5 1.636a48.513 48.513 0 0 0 9 0c.86-.053 1.5-1.766 1.5-1.636V9.07c0-1.07-.67-1.852-1.5-1.862L14.74 6Z" />
              </svg>
            </div>
            
            <h3 className="text-base font-bold text-slate-800 mb-1">Hapus Obrolan?</h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-6">
              Tindakan ini akan menghapus seluruh riwayat percakapan ini secara permanen dan tidak dapat dibatalkan.
            </p>
            
            <div className="flex items-center gap-3">
              <button 
                type="button"
                onClick={() => setChatToDelete(null)}
                className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all cursor-pointer border border-transparent"
              >
                Batal
              </button>
              <button 
                type="button"
                onClick={() => deleteChat(chatToDelete)}
                className="flex-1 py-2.5 px-4 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-xl shadow-md transition-all cursor-pointer border border-transparent"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
