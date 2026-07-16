const express = require('express');
const cors = require('cors');
const { execFile } = require('child_process'); 
const https = require('https');
const http = require('http');
const ytSearch = require('yt-search');

const app = express();
app.use(cors());
app.use(express.json());

// ==========================================
// ENDPOINT 1: AMBIL URL MENTAH
// ==========================================
app.post('/get-direct-url', (req, res) => {
    const { url } = req.body;
    const cleanUrl = url.split('?si=')[0];
    console.log(`Mengekstrak URL: ${cleanUrl}`);

    execFile('yt-dlp', [
        '-g',
        '-f', 'b[ext=mp4]/best[ext=mp4]',
        '--extractor-args', 'youtube:player_client=android',
        cleanUrl
    ], (error, stdout, stderr) => {
        if (error) {
            console.error("❌ YTDLP Error:", stderr || error.message);
            return res.status(500).send("Gagal");
        }
        res.json({ directUrl: stdout.trim() });
    });
});

// ==========================================
// ENDPOINT 2: PROXY STREAMING
// ==========================================
app.get('/stream-video', (req, res) => {
    const directUrl = req.query.url;
    if (!directUrl) return res.status(400).send("Kosong");

    const options = { headers: {} };
    if (req.headers.range) {
        options.headers['Range'] = req.headers.range;
    }

    const client = directUrl.startsWith('https') ? https : http;

    const proxyReq = client.get(directUrl, options, (ytResponse) => {
        res.status(ytResponse.statusCode);

        const headersToKeep = ['content-type', 'content-length', 'content-range', 'accept-ranges'];
        for (const header of headersToKeep) {
            if (ytResponse.headers[header]) {
                res.setHeader(header, ytResponse.headers[header]);
            }
        }

        ytResponse.pipe(res);
    });

    proxyReq.on('error', (err) => {
        if (err.code !== 'ECONNRESET') {
            console.error("❌ Proxy error:", err.message);
        }

        if (!res.headersSent) {
            res.status(500).send("Gagal menyambung ke stream");
        } else {
            res.end();
        }
    });

    req.on('close', () => {
        proxyReq.destroy();
    });
});

/*
// ==========================================
// ENDPOINT 3: SEARCH YOUTUBE (DENGAN PAGINASI)
// ==========================================
app.get('/search', async (req, res) => {
    const keyword = req.query.q;
    const page = parseInt(req.query.page) || 1; // Default ke halaman 1
    
    if (!keyword) return res.status(400).send("Keyword kosong");

    try {
        const result = await ytSearch(keyword);
        
        // Potong hasil pencarian berdasarkan nomor halaman
        const start = (page - 1) * 10;
        const end = page * 10;
        const videos = result.videos.slice(start, end);
        
        res.json(videos);
    } catch (err) {
        console.error("🚨 ROUTE SEARCH ERROR:", err.message);
        res.status(500).send("Gagal mencari");
    }
});
*/

// ==========================================
// 💡 FUNGSI PAMUNGKAS: TRENDING GENERAL (DENGAN PAGINASI)
// ==========================================
const dapatkanVideoTrending = (page = 1) => {
    return new Promise((resolve, reject) => {
        const trendingUrl = 'https://www.youtube.com/playlist?list=PLkbaG37V-vG8Fib_qvgOKf3qzqA0SUk59';
        
        // yt-dlp punya fitur bawaan buat ngambil urutan spesifik!
        const limit = 15;
        const start = ((page - 1) * limit) + 1;
        const end = page * limit;

        execFile('yt-dlp', [
            '-J', 
            '--flat-playlist', 
            '--geo-bypass',
            '--playlist-start', start.toString(),
            '--playlist-end', end.toString(),
            trendingUrl
        ], { maxBuffer: 1024 * 1024 * 5 }, (error, stdout, stderr) => {
            if (error) {
                console.error("❌ YTDLP Exec Error:", stderr || error.message);
                return reject(error);
            }
            
            try {
                if (!stdout) throw new Error("Data stdout dari yt-dlp kosong.");

                const data = JSON.parse(stdout);
                const entries = data.entries || [];
                
                // Nggak perlu di .slice(0, 10) lagi karena yt-dlp udah motongin dari sononya
                const videos = entries.map(v => {
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
                        author: { name: v.uploader || v.channel || 'YouTube' }
                    };
                });
                
                resolve(videos);
            } catch (parseError) {
                console.error("❌ YTDLP Parsing Error:", parseError.message);
                reject(parseError);
            }
        });
    });
};


// ==========================================
// 💡 FUNGSI PAMUNGKAS: SEARCH YOUTUBE VIA YT-DLP (PAGINASI ASLI)
// ==========================================
const dapatkanVideoSearch = (keyword, page = 1) => {
    return new Promise((resolve, reject) => {
        // Trik: Ubah keyword jadi URL asli pencarian YouTube
        const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(keyword)}`;

        // Perhitungan urutan potong (1-10, 11-20, 21-30, dst)
        const limit = 15;
        const start = ((page - 1) * limit) + 1; 
        const end = page * limit;

        execFile('yt-dlp', [
            '-J',
            '--flat-playlist',
            '--geo-bypass',
            '--playlist-start', start.toString(),
            '--playlist-end', end.toString(),
            searchUrl
        ], { maxBuffer: 1024 * 1024 * 5 }, (error, stdout, stderr) => {
            if (error) {
                console.error("❌ YTDLP Search Error:", stderr || error.message);
                return reject(error);
            }

            try {
                if (!stdout) throw new Error("Data stdout dari yt-dlp kosong.");

                const data = JSON.parse(stdout);
                const entries = data.entries || [];

                const videos = entries.map(v => {
                    // Ambil resolusi gambar terbaik
                    const bestThumb = v.thumbnails && v.thumbnails.length > 0
                        ? v.thumbnails[v.thumbnails.length - 1].url
                        : '';

                    // Konversi durasi ke format 00:00
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
                        author: { name: v.uploader || v.channel || 'YouTube' }
                    };
                });

                resolve(videos);
            } catch (parseError) {
                console.error("❌ YTDLP Parsing Error:", parseError.message);
                reject(parseError);
            }
        });
    });
};


// ==========================================
// ENDPOINT 3: SEARCH YOUTUBE (DENGAN YT-DLP)
// ==========================================
app.get('/search', async (req, res) => {
    const keyword = req.query.q;
    const page = parseInt(req.query.page) || 1; 

    if (!keyword) return res.status(400).send("Keyword kosong");

    try {
        // Langsung hajar pakai mesin baru
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



app.listen(4000, () => console.log("Backend Range-Proxy jalan di port 4000"));
