# Glowwings - Virtual Beauty Advisor

Glowwings adalah aplikasi chatbot cerdas yang dirancang sebagai asisten kecantikan virtual khusus untuk remaja. Aplikasi ini membantu pengguna dalam memilih produk *skincare* dan *makeup* yang tepat, memberikan edukasi mengenai kandungan produk, serta memberikan tips kecantikan dengan pendekatan yang ramah dan suportif.

## Fitur Utama

* **Virtual Beauty Advisor:** Menggunakan model AI canggih untuk memberikan rekomendasi produk yang disesuaikan dengan tipe kulit, *skintone*, anggaran, dan alergi pengguna.
* **Analisis Multi-Modal:** Mendukung pengiriman foto (untuk analisis kulit/wajah) dan dokumen (untuk analisis daftar bahan produk/ingredients).
* **Voice-to-Text Input:** Fitur *voice input* yang memungkinkan pengguna berbicara dengan chatbot, yang secara otomatis akan ditranskrip menjadi teks.
* **Manajemen Percakapan:** Sidebar untuk mengelola riwayat chat, termasuk fitur *pin* untuk percakapan penting dan hapus untuk percakapan yang tidak lagi diperlukan.
* **Sistem Autentikasi:** Integrasi Google Login untuk memastikan keamanan data riwayat percakapan pengguna.
* **Antarmuka Minimalis:** Desain *full-page* yang bersih dengan estetika gradasi pastel (biru & merah muda), dirancang tanpa gangguan visual (bebas emoji).

## Teknologi yang Digunakan

* **Frontend:** React.js dengan Vite, Tailwind CSS.
* **Backend:** Node.js, Express.js.
* **AI Engine:** Google Gemini API (`gemini-1.5-pro-latest`).
* **Integrasi:** Multer (penanganan file), Web Speech API (transkripsi suara), Google OAuth 2.0.

## Cara Menjalankan Aplikasi

1. **Clone repository ini:**
```bash
git clone https://github.com/RevinaAgustin/glowwings.git
cd glowwings

```
2. **Install dependencies:**
```bash
npm install
```
3. **Konfigurasi Lingkungan:**
Buat file `.env` di direktori utama dan tambahkan *API Key* kamu:
```env
GOOGLE_API_KEY=your_gemini_api_key_here
GOOGLE_CLIENT_ID=your_google_client_id_here
```
4. **Jalankan aplikasi:**
```bash
node index.js

```
## Aturan Penggunaan
Aplikasi ini ditujukan sebagai pendamping edukasi kecantikan. Glowwings bukanlah dokter spesialis kulit. Jika pengguna mengalami masalah kulit yang serius, aplikasi akan secara lembut menyarankan untuk berkonsultasi dengan profesional medis.
