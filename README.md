# pJrAI Backend + Admin Panel

Backend Express + Admin Panel neobrutalist untuk AI Chat pJrAI.  
Stack: **Node.js · Express · Upstash Redis (REST) · Pure REST API**

---

## 📁 Struktur Project

```
pjrai-backend/
├── server.js                  ← Entry point Express
├── package.json
├── vercel.json                ← Deploy config Vercel
├── .env.example               ← Template environment
├── .gitignore
│
├── lib/
│   └── redis.js               ← Upstash Redis REST wrapper (tanpa SDK)
│
├── middleware/
│   └── adminAuth.js           ← Validasi x-admin-key header
│
├── routes/
│   ├── visit.js               ← POST /api/visit
│   ├── chat.js                ← POST /api/chat
│   └── admin.js               ← GET /api/sessions, /session/:id, /stats
│
└── public/
    ├── index.html             ← Frontend pJrAI (original)
    ├── style.css              ← CSS original
    ├── script.js              ← Script + backend integration
    └── admin.html             ← Admin Panel (neobrutalism)
```

---

## ⚡ Quick Start (Lokal)

### 1. Install dependencies

```bash
npm install
```

### 2. Setup environment

```bash
cp .env.example .env
# Edit .env dan isi nilai-nilainya
```

```env
ADMIN_KEY=ganti_dengan_password_admin_kamu
UPSTASH_REDIS_REST_URL=https://xxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXxxxx...
```

### 3. Jalankan server

```bash
npm start
# atau untuk development dengan auto-reload:
npm run dev
```

Buka:
- Frontend: http://localhost:3000
- Admin: http://localhost:3000/admin.html

---

## 🚀 Deploy ke Vercel

### 1. Install Vercel CLI

```bash
npm i -g vercel
```

### 2. Deploy

```bash
vercel
```

### 3. Set environment variables di Vercel dashboard

Pergi ke **Project Settings → Environment Variables** dan tambahkan:

| Variable | Value |
|---|---|
| `ADMIN_KEY` | password admin kamu |
| `UPSTASH_REDIS_REST_URL` | URL dari Upstash console |
| `UPSTASH_REDIS_REST_TOKEN` | Token dari Upstash console |

### 4. Redeploy

```bash
vercel --prod
```

---

## 🚀 Deploy ke VPS (nginx)

### 1. Upload ke server

```bash
scp -r pjrai-backend/ user@yourserver:/var/www/pjrai
```

### 2. Install & start

```bash
cd /var/www/pjrai
npm install --production
cp .env.example .env && nano .env   # isi env vars

# Pakai PM2 supaya tetap running
npm install -g pm2
pm2 start server.js --name pjrai
pm2 save && pm2 startup
```

### 3. Nginx config

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

## 🔌 API Endpoints

### Public (no auth required)

| Method | Path | Deskripsi |
|--------|------|-----------|
| `POST` | `/api/visit` | Simpan/update user session |
| `POST` | `/api/chat` | Log chat user + AI response |
| `GET`  | `/api/health` | Health check |

### Admin (requires `x-admin-key` header)

| Method | Path | Deskripsi |
|--------|------|-----------|
| `GET` | `/api/sessions` | Semua sessions + chat count |
| `GET` | `/api/session/:id` | Detail session + full chat |
| `GET` | `/api/stats` | Statistik agregat |

---

## 📦 Redis Data Structure

```
visit:{sessionId}  → STRING (JSON)
  {
    "sessionId": "s_abc123",
    "ip": "1.2.3.4",
    "userAgent": "Mozilla/5.0...",
    "createdAt": "2024-01-01T10:00:00.000Z",
    "lastActive": "2024-01-01T10:05:00.000Z"
  }

chat:{sessionId}   → LIST (JSON strings)
  [
    { "role": "user", "text": "...", "time": "..." },
    { "role": "ai",   "text": "...", "time": "..." },
    ...
  ]
```

TTL semua key: **90 hari** (auto-expire).

---

## 🎨 Admin Panel Features

- **Login** dengan ADMIN_KEY
- **Dashboard stats**: Total Sesi, Total Pesan, Aktif Hari Ini
- **Table semua sesi**: sessionId, IP, User Agent, Jumlah Chat, Last Active
- **Search** berdasarkan sessionId atau IP
- **Slide panel chat**: lihat semua pesan user ↔ AI per sesi dengan timestamp
- **Auto-refresh** tombol
- **Neobrutalism UI**: border tebal, shadow keras, warna solid

---

## 🔒 Keamanan

- Admin endpoints diproteksi `x-admin-key` header
- Public endpoints (`/api/visit`, `/api/chat`) tidak memerlukan auth — rate limit via Upstash jika diperlukan
- CORS hanya dari domain yang di-set di `ALLOWED_ORIGIN` env var (opsional)
- Redis TTL 90 hari mencegah data menumpuk selamanya

---

## 🌐 Mengubah Backend URL di Frontend

Di `public/script.js` baris paling atas:

```js
var BACKEND_URL = "";  // sama-origin (default)
// atau:
var BACKEND_URL = "https://pjrai-backend.vercel.app";  // URL terpisah
```

---

## 📝 Notes

- **Tidak perlu database** — semua data di Upstash Redis
- **Tanpa SDK** — Redis diakses via fetch ke REST API Upstash
- **Deploy-friendly** — berjalan di Vercel (serverless) atau VPS biasa
- Data TTL otomatis 90 hari agar Redis tidak penuh
