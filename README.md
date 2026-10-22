# 🚀 Universal HLS/M3U8 Streaming Reverse Proxy & Smart Player

A high-performance, production-ready Cloudflare Worker & Smart Web Player for live sports streams (M3U8 / HLS).
Built to handle **100,000+ concurrent viewers** with zero browser file downloads, edge caching, and automatic token protection.

---

## 🌟 Key Features

1. **Smart Dual-Mode Playback:**
   - **Direct Mode:** Directly connects from the viewer's IP if the origin server allows CORS. This bypasses Cloudflare Datacenter IP bans (HTTP 403) and client-bound tokens (`?cst=...`).
   - **Proxy Fallback Mode:** Automatically falls back to Cloudflare Worker reverse proxy if the stream blocks CORS or requires custom headers (`Referer`, `Origin`, `User-Agent`).

2. **Zero Browser File Downloads:**
   - Enforces `Content-Disposition: inline` and proper MIME types (`application/vnd.apple.mpegurl` and `video/mp2t`), preventing browsers from downloading `.m3u8` or `.ts` files.

3. **High-Speed Edge Caching:**
   - Caches `.ts` video segments across Cloudflare's global edge network for 1 hour (`cacheTtl: 3600, cacheEverything: true`).
   - Reduces origin load by 95%+, allowing free tier support for massive concurrency.

4. **1000 USA Residential Mobile Proxies Included:**
   - Formatted and validated Verizon Business USA residential mobile proxy pool available in `proxies.json` and `proxies.txt`.

---

## 📁 Repository Structure

```text
├── worker.js         # Cloudflare Worker main proxy script
├── _worker.js        # Cloudflare Pages Functions compatible worker
├── index.html        # Responsive Smart Video Player (can be hosted on GitHub Pages)
├── wrangler.toml     # Cloudflare deployment configuration
├── proxies.json      # 900+ USA Verizon Residential Mobile Proxies (JSON format)
├── proxies.txt       # Raw IP:PORT:USER:PASS proxy list
└── README.md         # Documentation & Deployment Guide
```

---

## 🚀 Deployment Options

### অপশন ১: Cloudflare Dashboard থেকে সরাসরি ডিপ্লয়
1. [Cloudflare Dashboard](https://dash.cloudflare.com/) এ লগইন করুন।
2. **Workers & Pages** -> **Create application** -> **Create Worker** সিলেক্ট করুন।
3. **Deploy** বাটনে ক্লিক করে **Edit code** এ যান।
4. `worker.js` ফাইলের কোড কপি করে পেস্ট করুন এবং **Save and deploy** বাটনে ক্লিক করুন।

### অপশন ২: GitHub এর মাধ্যমে অটো ডিপ্লয় (Cloudflare Pages)
1. এই রিপোজিটরিটি আপনার GitHub অ্যাকাউন্টে পুশ করুন।
2. Cloudflare Dashboard এ গিয়ে **Workers & Pages** -> **Create application** -> **Pages** এ যান।
3. **Connect to Git** নির্বাচন করে আপনার রিপোজিটরি সিলেক্ট করুন।
4. Build setting ডিফল্ট রেখে **Save and Deploy** দিন।

---

## 📺 How to Use / কিভাবে ব্যবহার করবেন

### ১. ব্রাউজারে সরাসরি দেখা:
```text
https://YOUR-WORKER.workers.dev/?url=YOUR_M3U8_URL
```

### ২. আপনার ওয়েবসাইটে আইফ্রেম (iFrame) দিয়ে যুক্ত করা:
```html
<iframe 
  src="https://YOUR-WORKER.workers.dev/?url=https://a121.azplay49.me/hls/streama269241/index.m3u8?cst=3e74aca8de8568fcd4e3b9863a0956e8" 
  width="100%" 
  height="500px" 
  frameborder="0" 
  allow="autoplay; fullscreen; encrypted-media" 
  allowfullscreen>
</iframe>
```

---

## 🛡️ Residential Proxies Information

* **Total Proxies:** 900+
* **Provider:** Verizon Business Mobile Residential (USA)
* **Auth Type:** HTTP / HTTPS with User:Password authentication
* **Formats provided:** 
  - `proxies.json` (Structured JSON with full URLs)
  - `proxies.txt` (`IP:PORT:USER:PASS`)

---

## 📄 License
MIT License. Free to use for personal and commercial projects.
