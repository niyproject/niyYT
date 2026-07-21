const express = require('express');
const cors = require('cors');
const { execFile } = require('child_process');
const https = require('https');
const http = require('http');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

// ==========================================
// 💡 OTOMATISASI PATH NODE.JS & ENVIRONMENT (Lintas OS / VPS / Termux)
// ==========================================
const nodeBinaryPath = process.execPath;
const folderNodeAsli = path.dirname(nodeBinaryPath);
const fullEnv = Object.assign({}, process.env, {
    PATH: `${folderNodeAsli}:${process.env.PATH || ''}`
});

// Helper check cookie Netscape yang valid agar tidak bikin yt-dlp crash
const getValidCookiesArg = () => {
    if (fs.existsSync('cookies.txt')) {
        try {
            const content = fs.readFileSync('cookies.txt', 'utf8');
            if (content.startsWith('# Netscape')) {
                return ['--cookies', 'cookies.txt'];
            }
        } catch (e) {
            console.warn("⚠️ Gagal membaca cookies.txt, melanjutkan tanpa cookie.");
        }
    }
    return [];
};

// ==========================================
// ENDPOINT 1: AMBIL URL MENTAH (SANITY CHECK URL)
// ==========================================
app.post('/get-direct-url', (req, res) => {
    const { url, mode } = req.body;

    if (!url) return res.status(400).json({ error: "URL dibutuhkan" });

    // 💡 FIX: Bersihkan parameter playlist / share link agar murni ID video saja
    let cleanUrl = url.split('?si=')[0].split('&list=')[0];

    console.log(`🎬 Universal Extracting: ${cleanUrl} (Mode: ${mode || 'video'})`);

    let args = [
        ...getValidCookiesArg(),
        '-g',
        '--no-playlist',
        '--js-runtimes', `node:${nodeBinaryPath}`,
        '--remote-components', 'ejs:github',
        '--extractor-args', 'youtube:player_client=web_embedded,android;player_skip=webpage'
    ];

    if (mode === 'audio') {
        args.push('-f', 'ba/b');
    } else {
        args.push('-f', 'b[ext=mp4]/best[ext=mp4]/best');
    }

    args.push(cleanUrl);

    execFile('yt-dlp', args, { env: fullEnv, maxBuffer: 1024 * 1024 * 5 }, (error, stdout, stderr) => {
        if (res.headersSent) return;

        if (error) {
            console.error("❌ YTDLP Error:", stderr || error.message);
            return res.status(500).send("Gagal mengekstrak video");
        }

        res.json({ directUrl: stdout.trim() });
    });
});

// ==========================================
// 💡 FUNGSI SEARCH YOUTUBE (CLEAN RADIO MIX & FIX AVATAR)
// ==========================================
const dapatkanVideoSearch = (keyword, page = 1) => {
    return new Promise((resolve, reject) => {
        const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(keyword)}`;

        const limit = 15;
        const start = ((page - 1) * limit) + 1;
        const end = page * limit;

        const args = [
            ...getValidCookiesArg(),
            '-J',
            '--flat-playlist',
            '--geo-bypass',
            '--playlist-start', start.toString(),
            '--playlist-end', end.toString(),
            searchUrl
        ];

        execFile('yt-dlp', args, { env: fullEnv, maxBuffer: 1024 * 1024 * 5 }, (error, stdout, stderr) => {
            if (error) {
                console.error("❌ YTDLP Search Error:", stderr || error.message);
                return reject(error);
            }

            try {
                if (!stdout) throw new Error("Data stdout dari yt-dlp kosong.");

                const data = JSON.parse(stdout);
                const entries = data.entries || [];

                const videos = [];

                for (const v of entries) {
                    let rawUrl = v.url || `https://www.youtube.com/watch?v=${v.id}`;
                    
                    // 🛑 FILTER UTAMA: Buang Radio Mix / Unviewable Playlist buatan YouTube (RD...)
                    if (rawUrl.includes('list=RD') || (v.id && v.id.startsWith('RD'))) {
                        continue; 
                    }

                    let type = 'video';
                    if (rawUrl.includes('/channel/') || rawUrl.includes('/c/') || rawUrl.includes('/@')) {
                        type = 'channel';
                    } else if (rawUrl.includes('list=')) {
                        type = 'playlist';
                    }

                    const bestThumb = v.thumbnails && v.thumbnails.length > 0
                        ? v.thumbnails[v.thumbnails.length - 1].url
                        : (type === 'channel' 
                            ? 'https://ui-avatars.com/api/?name=' + encodeURIComponent(v.title || 'Channel') + '&background=333&color=fff' 
                            : '');

                    let formatWaktu = '--:--';
                    if (v.duration) {
                        const m = Math.floor(v.duration / 60);
                        const s = Math.floor(v.duration % 60).toString().padStart(2, '0');
                        formatWaktu = `${m}:${s}`;
                    }

                    videos.push({
                        title: v.title || 'Tanpa Judul',
                        url: rawUrl,
                        type: type,
                        image: bestThumb,
                        thumbnail: bestThumb,
                        timestamp: formatWaktu,
                        author: { name: v.uploader || v.channel || 'YouTube' }
                    });
                }

                resolve(videos);
            } catch (parseError) {
                console.error("❌ YTDLP Parsing Error:", parseError.message);
                reject(parseError);
            }
        });
    });
};

// ==========================================
// ENDPOINT 2: PROXY STREAMING (DENGAN AUTO-REDIRECT)
// ==========================================
app.get('/stream-video', (req, res) => {
    const directUrl = req.query.url;
    if (!directUrl) return res.status(400).send("URL Kosong");

    // Bawa header Range dari frontend (penting banget buat fitur seek/fader)
    const options = { headers: {} };
    if (req.headers.range) {
        options.headers['Range'] = req.headers.range;
    }

    let redirectCount = 0;
    const MAX_REDIRECTS = 5; // Batasan agar tidak infinite loop
    let activeProxyReq = null; // Menyimpan request yang sedang berjalan

    // Fungsi rekursif untuk nembak URL
    const fetchStream = (targetUrl) => {
        if (redirectCount > MAX_REDIRECTS) {
            console.error("❌ Terlalu banyak redirect dari YouTube");
            if (!res.headersSent) res.status(500).send("Terlalu banyak redirect");
            return;
        }

        const client = targetUrl.startsWith('https') ? https : http;

        activeProxyReq = client.get(targetUrl, options, (ytResponse) => {
            const { statusCode } = ytResponse;

            // 1. Cek apakah ini respons Redirect (Kode 301, 302, 303, 307, 308)
            if (statusCode >= 300 && statusCode < 400 && ytResponse.headers.location) {
                redirectCount++;
                const nextUrl = ytResponse.headers.location;
                console.log(`🔀 Redirect ke-${redirectCount} diterima. Memutar rute...`);
                
                // Panggil ulang fungsi dengan URL tujuan yang baru
                fetchStream(nextUrl);
                return;
            }

            // 2. Kalau bukan redirect (biasanya 200 OK atau 206 Partial Content), teruskan ke Vite
            res.status(statusCode);

            const headersToKeep = ['content-type', 'content-length', 'content-range', 'accept-ranges'];
            for (const header of headersToKeep) {
                if (ytResponse.headers[header]) {
                    res.setHeader(header, ytResponse.headers[header]);
                }
            }

            // Alirkan (pipe) data video langsung ke frontend
            ytResponse.pipe(res);
        });

        activeProxyReq.on('error', (err) => {
            if (err.code !== 'ECONNRESET') {
                console.error("❌ Proxy error:", err.message);
            }
            if (!res.headersSent) {
                res.status(500).send("Gagal menyambung ke stream");
            } else {
                res.end();
            }
        });
    };

    // Bersihkan koneksi kalau user nutup tab, close player, atau skip lagu
    req.on('close', () => {
        if (activeProxyReq) activeProxyReq.destroy();
    });

    // Jalankan tembakan pertama
    fetchStream(directUrl);
});


// ==========================================
// ENDPOINT 3: SEARCH YOUTUBE
// ==========================================
app.get('/search', async (req, res) => {
    const keyword = req.query.q;
    const page = parseInt(req.query.page) || 1;

    if (!keyword) return res.status(400).send("Keyword kosong");

    try {
        const videos = await dapatkanVideoSearch(keyword, page);
        res.json(videos);
    } catch (err) {
        console.error("🚨 ROUTE SEARCH ERROR:", err.message);
        res.status(500).send("Gagal mencari");
    }
});

// ==========================================
// ENDPOINT 4: GET TRENDING
// ==========================================
app.get('/trending', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    try {
        const trendingVideos = await dapatkanVideoTrending(page);
        res.json(trendingVideos);
    } catch (error) {
        console.error("🚨 ROUTE TRENDING ERROR:", error.message || error);
        res.status(500).json({ error: "Gagal mengambil tab trending" });
    }
});

// ==========================================
// ENDPOINT 5: CUSTOM PLAYLIST VIA YT-DLP
// ==========================================
app.get('/playlist', (req, res) => {
    const playlistUrl = req.query.url;
    if (!playlistUrl) return res.status(400).send("Link playlist kosong bung");

    console.log(`🎬 Mengurai Custom Playlist: ${playlistUrl}`);

    const args = [
        ...getValidCookiesArg(),
        '-J',
        '--flat-playlist',
        '--geo-bypass',
        playlistUrl
    ];

    execFile('yt-dlp', args, { env: fullEnv, maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
        if (error) {
            console.error("❌ YTDLP Playlist Error:", stderr || error.message);
            return res.status(500).send("Gagal memuat playlist");
        }

        try {
            if (!stdout) throw new Error("Data stdout kosong.");

            const data = JSON.parse(stdout);
            const entries = data.entries || [];

            const playlistVideos = entries.map(v => {
                const bestThumb = v.thumbnails && v.thumbnails.length > 0
                    ? v.thumbnails[v.thumbnails.length - 1].url
                    : '';

                let formatWaktu = '--:--';
                if (v.duration) {
                    const m = Math.floor(v.duration / 60);
                    const s = Math.floor(v.duration % 60).toString().padStart(2, '0');
                    formatWaktu = `${m}:${s}`;
                }

                return {
                    title: v.title || 'Video Tanpa Judul',
                    url: v.url || `https://www.youtube.com/watch?v=${v.id}`,
                    image: bestThumb,
                    thumbnail: bestThumb,
                    timestamp: formatWaktu,
                    author: { name: v.uploader || v.channel || data.title || 'Playlist' }
                };
            });

            res.json(playlistVideos);
        } catch (parseError) {
            console.error("❌ YTDLP Playlist Parsing Error:", parseError.message);
            res.status(500).send("Gagal memproses data playlist");
        }
    });
});

app.listen(4000, () => console.log("Backend Range-Proxy jalan di port 4000"));
