const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const https = require('https'); // Modul bawaan Node.js
const http = require('http');
const ytSearch = require('yt-search');

const app = express();
app.use(cors());
app.use(express.json());

// Endpoint 1: Ambil URL Mentah
app.post('/get-direct-url', (req, res) => {
    const { url } = req.body;
    
    // Bersihkan parameter tracking ?si= biar yt-dlp gak pusing
    const cleanUrl = url.split('?si=')[0]; 
    
    console.log(`Mengekstrak URL: ${cleanUrl}`);
    
    // KUNCI FIX: Tambahin parameter penyamaran jadi Android Client
    const ytCommand = `yt-dlp -g -f "b[ext=mp4]/best[ext=mp4]" --extractor-args "youtube:player_client=android" "${cleanUrl}"`;
    
    exec(ytCommand, (error, stdout, stderr) => {
        if (error) {
            console.error("❌ YTDLP Error:", stderr || error.message); 
            return res.status(500).send("Gagal");
        }
        res.json({ directUrl: stdout.trim() });
    });
});

app.get('/stream-video', (req, res) => {
    const directUrl = req.query.url;
    if (!directUrl) return res.status(400).send("Kosong");

    const options = { headers: {} };
    if (req.headers.range) {
        options.headers['Range'] = req.headers.range;
    }

    // 💡 KUNCI FIX: Pilih modul http atau https secara otomatis tergantung isi URL
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
        if (err.code === 'ECONNRESET') {
            console.log("Koneksi diputus oleh browser (diabaikan).");
        } else {
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


// Endpoint Baru: Search YouTube
app.get('/search', async (req, res) => {
    const keyword = req.query.q;
    if (!keyword) return res.status(400).send("Keyword kosong");
    
    try {
        const result = await ytSearch(keyword);
        // Ambil 10 video teratas aja biar enteng dikirim ke frontend
        const videos = result.videos.slice(0, 10); 
        res.json(videos);
    } catch (err) {
        res.status(500).send("Gagal mencari");
    }
});

app.listen(4000, () => console.log("Backend Range-Proxy jalan di port 4000"));
