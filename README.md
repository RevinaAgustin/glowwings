# 🌸 Glowwings - Virtual Beauty Advisor

Glowwings adalah aplikasi chatbot cerdas berbasis AI yang dirancang sebagai asisten kecantikan virtual khusus untuk remaja. Aplikasi ini membantu pengguna dalam memilih produk skincare dan makeup yang tepat, memberikan edukasi mengenai kandungan bahan produk (*ingredients*), serta memberikan tips kecantikan dengan pendekatan yang ramah, personal, dan suportif layaknya seorang sahabat (*bestie*).

---

## Fitur Utama

- **Virtual Beauty Advisor:** Menggunakan model AI canggih untuk memberikan rekomendasi produk yang disesuaikan secara personal berdasarkan:
  - Tipe Kulit (*Skin Type*)
  - Anggaran Bulanan (*Monthly Budget*)
  - Alergi Bahan Tertentu (*Ingredient Allergies*)
  - Warna Kulit (*Skintone*)
- **Analisis Multi-Modal:** Mendukung pengiriman berkas gambar (untuk analisis visual kondisi kulit/wajah) dan dokumen PDF/DOCX/TXT (untuk membedah & menganalisis daftar bahan produk/ingredients).
- **Voice-to-Text Input:** Fitur input suara memanfaatkan Web Speech API yang memungkinkan pengguna mengobrol dengan chatbot secara natural, yang kemudian ditranskripsi otomatis menjadi teks.
- **Manajemen Percakapan:** Sidebar interaktif untuk mengelola riwayat obrolan, lengkap dengan fitur pin percakapan penting dan opsi hapus untuk percakapan yang sudah tidak diperlukan.
- **Sistem Autentikasi:** Integrasi Google Login untuk memastikan keamanan data profil dan riwayat percakapan pengguna.
- **Antarmuka Estetis & Responsif:** Desain modern satu halaman penuh (*full-page*) dengan visual minimalis bergradasi pastel (biru & merah muda) yang menenangkan, dirancang fokus pada interaksi pengguna tanpa gangguan visual.

---

##  Teknologi yang Digunakan

- **Frontend:** React.js (v19) dengan Vite, Tailwind CSS (v4)
- **Backend:** Node.js, Express.js
- **AI Engine:** Google Gemini API SDK (`@google/genai` dengan model **Gemini 2.5 Flash** & **Gemini 2.0 Flash**)
- **Integrasi Pihak Ketiga:**
  - Multer (Penanganan upload file & gambar)
  - PDF-Parse & Mammoth (Ekstraktor teks dokumen PDF & DOCX)
  - Web Speech API (Transkripsi suara bawaan browser)
  - Google OAuth 2.0 (Autentikasi Login)

---

##  Cara Menjalankan Aplikasi

### 1. Persiapan Awal
Klon repositori ini dan masuk ke dalam direktori utama:
```bash
git clone https://github.com/RevinaAgustin/glowwings.git
cd glowwings
```

### 2. Instalasi Dependencies
Instal paket-paket library yang dibutuhkan oleh Backend (direktori utama) dan Frontend:
```bash
# Instal dependencies backend
npm install

# Instal dependencies frontend
cd frontend
npm install
cd ..
```

### 3. Konfigurasi Lingkungan (.env)
Buat file bernama `.env` di direktori utama (root) proyek Anda, lalu masukkan kredensial berikut:
```env
# Google Gemini API Key (Dapatkan di https://aistudio.google.com/)
GEMINI_API_KEY=your_gemini_api_key_here

# Google OAuth 2.0 Client ID untuk autentikasi login (Dapatkan di Google Cloud Console)
GOOGLE_CLIENT_ID=your_google_client_id_here.apps.googleusercontent.com
```

### 4. Menjalankan Aplikasi

#### 💻 Mode Pengembangan (Development)
Untuk menjalankan server backend dan frontend secara bersamaan dalam mode pengembangan:
1. Jalankan backend di direktori utama:
   ```bash
   node index.js
   ```
2. Jalankan frontend Vite di terminal terpisah di dalam folder `/frontend`:
   ```bash
   cd frontend
   npm run dev
   ```

####  Mode Produksi (Production / Live Server)
Jika ingin menjalankan aplikasi secara utuh melalui server Express di port `3000`:
1. Lakukan build pada frontend dari direktori utama:
   ```bash
   npm run build
   ```
   *(Aset statis hasil build akan otomatis tersalin ke folder `/public` di direktori backend).*
2. Jalankan server:
   ```bash
   node index.js
   ```
3. Buka browser dan akses `http://localhost:3000`.

---

## ⚠️ Aturan Penggunaan & Batasan

Aplikasi ini ditujukan murni sebagai media edukasi kecantikan dan asisten rekomendasi kosmetik harian. **Glowwings bukan dokter spesialis kulit (dermatologis) profesional.** Jika pengguna berkonsultasi mengenai masalah kulit yang parah atau bersifat medis, aplikasi dirancang untuk secara lembut menyarankan pengguna agar berkonsultasi langsung dengan dokter kulit atau profesional medis tepercaya.
