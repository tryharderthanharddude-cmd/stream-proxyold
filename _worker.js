/**
 * Universal HLS/M3U8 Streaming Worker & Smart Player
 * - Solves 403 Forbidden / IP-Whitelisting / Cloudflare IP Block
 * - Auto-detects Direct CORS vs Cloudflare Reverse Proxy
 * - Zero Browser File Download (Content-Disposition: inline)
 * - Supports High Concurrency (100k+ viewers) via Edge Caching
 */

const DEFAULT_STREAM = "https://a121.azplay49.me/hls/streama269241/index.m3u8?cst=3e74aca8de8568fcd4e3b9863a0956e8";

function extractTargetUrl(requestUrl, fallback) {
  const idx = requestUrl.indexOf("?url=");
  if (idx !== -1) {
    const raw = requestUrl.substring(idx + 5);
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }
  const ampIdx = requestUrl.indexOf("&url=");
  if (ampIdx !== -1) {
    const raw = requestUrl.substring(ampIdx + 5);
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }
  return fallback;
}

function getUpstreamHeaders(targetUrl) {
  let origin = "https://istreameast.co.com";
  let referer = "https://istreameast.co.com/";
  try {
    const u = new URL(targetUrl);
    origin = u.origin;
    referer = u.origin + "/";
  } catch (e) {}

  return {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "*/*",
    "Accept-Language": "en-US,en;q=0.9",
    "Origin": origin,
    "Referer": referer
  };
}

function renderSmartPlayer(streamUrl) {
  return `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Live Stream Player</title>
  <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html, body { width:100%; height:100%; background:#000; overflow:hidden; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; }
    .wrap { position:relative; width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:#000; }
    video { width:100%; height:100%; object-fit:contain; }
    .badge { position:absolute; top:14px; left:14px; background:rgba(0,0,0,0.85); color:#fff; padding:6px 14px; border-radius:20px; font-size:13px; font-weight:600; display:flex; align-items:center; gap:8px; z-index:10; pointer-events:none; border:1px solid rgba(255,255,255,0.2); }
    .dot { width:8px; height:8px; background:#ef4444; border-radius:50%; animation:pulse 1.2s infinite; }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
    .btn { position:absolute; z-index:20; background:#ef4444; color:#fff; border:none; padding:16px 36px; border-radius:50px; font-size:16px; font-weight:700; cursor:pointer; display:none; box-shadow:0 4px 20px rgba(239,68,68,0.5); }
    .btn:hover { background:#dc2626; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="badge"><span class="dot"></span><span id="st">লাইভ লোড হচ্ছে...</span></div>
    <button class="btn" id="b" onclick="playVid()">▶ ক্লিক করে চালান</button>
    <video id="v" controls autoplay playsinline></video>
  </div>
  <script>
    const rawTarget = ${JSON.stringify(streamUrl)};
    const v = document.getElementById('v');
    const st = document.getElementById('st');
    const b = document.getElementById('b');

    const proxyUrl = window.location.origin + '/live.m3u8?url=' + encodeURIComponent(rawTarget);
    let isUsingProxy = false;
    let hls = null;

    function playVid() {
      v.play().then(() => {
        b.style.display = 'none';
        st.innerText = 'লাইভ চলছে';
        st.style.color = '#4ade80';
      }).catch(err => console.log(err));
    }

    function initHls(sourceUrl) {
      if (hls) {
        hls.destroy();
      }
      if (!Hls.isSupported()) {
        if (v.canPlayType('application/vnd.apple.mpegurl')) {
          v.src = sourceUrl;
          v.play().catch(() => { b.style.display = 'block'; });
        }
        return;
      }

      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 30,
        manifestLoadingMaxRetry: 3,
        levelLoadingMaxRetry: 3
      });

      hls.loadSource(sourceUrl);
      hls.attachMedia(v);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        st.innerText = 'লাইভ চলছে';
        st.style.color = '#4ade80';
        v.play().catch(() => {
          b.style.display = 'block';
          st.innerText = 'প্লে বাটনে ক্লিক করুন';
          st.style.color = '#fbbf24';
        });
      });

      hls.on(Hls.Events.ERROR, (e, data) => {
        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            // যদি সরাসরি সোর্স লোড না হয় এবং এখনো প্রক্সি ট্রাই না করা হয়ে থাকে
            if (!isUsingProxy) {
              console.log("Direct load failed (CORS or network). Switching to Cloudflare Proxy...");
              isUsingProxy = true;
              st.innerText = 'প্রক্সি মোডে সুইচ হচ্ছে...';
              initHls(proxyUrl);
            } else {
              st.innerText = 'রিকানেক্ট হচ্ছে...';
              hls.startLoad();
            }
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
          } else {
            st.innerText = 'স্ট্রিম অফলাইন';
            st.style.color = '#ef4444';
          }
        }
      });
    }

    // প্রথম ধাপ: সরাসরি স্ট্রিম লিঙ্ক চালান (IP বাইন্ডিং বা ক্লাউডফ্লেয়ার ব্লক বাইপাস করতে)
    // যদি ব্রাউজার ব্লক পায় তবে স্বয়ংক্রিয়ভাবে প্রক্সি মোডে সুইচ করবে
    initHls(rawTarget);
  </script>
</body>
</html>`;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // ১. CORS প্রি-ফ্লাইট হ্যান্ডলিং
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
          "Access-Control-Allow-Headers": "*"
        }
      });
    }

    const targetUrl = extractTargetUrl(request.url, DEFAULT_STREAM);
    const acceptHeader = request.headers.get("Accept") || "";
    const secFetchDest = request.headers.get("Sec-Fetch-Dest") || "";

    // ২. ব্রাউজার সরাসরি ভিজিট করলে এইচটিএমএল প্লেয়ার রেন্ডার করা
    const isBrowserNavigation = (secFetchDest === "document" || acceptHeader.includes("text/html")) && url.pathname !== "/live.m3u8";

    if (isBrowserNavigation || url.pathname === "/player") {
      return new Response(renderSmartPlayer(targetUrl), {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=UTF-8",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    // ৩. M3U8 প্লেলিস্ট প্রক্সি ও রিরাইট
    if (url.pathname === "/live.m3u8" || !targetUrl.includes(".ts")) {
      try {
        const upstreamHeaders = getUpstreamHeaders(targetUrl);
        const resp = await fetch(targetUrl, {
          headers: upstreamHeaders
        });

        if (!resp.ok) {
          return new Response(resp.body, {
            status: resp.status,
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Content-Type": "text/plain"
            }
          });
        }

        let m3u8 = await resp.text();
        const baseUrl = targetUrl.substring(0, targetUrl.lastIndexOf("/") + 1);

        // রিলেটিভ .ts পাথগুলোকে ক্লাউডফ্লেয়ারের /ts?url= এ রিরাইট করা
        const lines = m3u8.split("\n").map(line => {
          const t = line.trim();
          if (!t || t.startsWith("#")) return line;
          const fullTs = t.startsWith("http") ? t : baseUrl + t;
          return url.origin + "/ts?url=" + encodeURIComponent(fullTs);
        });

        return new Response(lines.join("\n"), {
          status: 200,
          headers: {
            "Content-Type": "application/vnd.apple.mpegurl",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
            "Access-Control-Allow-Headers": "*",
            "Cache-Control": "public, max-age=2, s-maxage=2",
            "Content-Disposition": "inline"
          }
        });
      } catch (err) {
        return new Response("M3U8 Proxy Error: " + err.message, {
          status: 502,
          headers: { "Access-Control-Allow-Origin": "*" }
        });
      }
    }

    // ৪. TS সেগমেন্ট প্রক্সি ও ১ ঘণ্টার হাই-স্পিড এজ ক্যাশিং
    if (url.pathname === "/ts" || targetUrl.includes(".ts")) {
      const chunkTarget = extractTargetUrl(request.url, targetUrl);
      try {
        const upstreamHeaders = getUpstreamHeaders(chunkTarget);
        const chunkResp = await fetch(chunkTarget, {
          headers: upstreamHeaders,
          cf: { cacheTtl: 3600, cacheEverything: true }
        });

        const newHeaders = new Headers();
        newHeaders.set("Content-Type", "video/mp2t");
        newHeaders.set("Access-Control-Allow-Origin", "*");
        newHeaders.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
        newHeaders.set("Access-Control-Allow-Headers", "*");
        newHeaders.set("Cache-Control", "public, max-age=3600, s-maxage=3600");
        newHeaders.set("Content-Disposition", "inline");

        return new Response(chunkResp.body, {
          status: chunkResp.status,
          headers: newHeaders
        });
      } catch (err) {
        return new Response("Chunk Proxy Error: " + err.message, {
          status: 502,
          headers: { "Access-Control-Allow-Origin": "*" }
        });
      }
    }

    return new Response("Not Found", { status: 404 });
  }
};
