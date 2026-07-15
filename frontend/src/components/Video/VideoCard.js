import './VideoCard.css';
import { fetchDirectUrl } from '../../api/youtube';

export function renderVideoCard(containerId, onVideoReady) {
    const container = document.getElementById(containerId);
    
    container.innerHTML = `
        <div class="video-container" id="vidContainer" style="display:none; padding: 15px;">
            <div id="statusMessage" class="status" style="margin-bottom:10px; font-size: 13px; color: #aaa;"></div>
            <video id="mainPlayer" crossorigin="anonymous" playsinline style="width:100%; border-radius:8px; background: #000;"></video>
            <div class="video-controls" style="margin-top:10px; display:flex; justify-content:flex-end; gap:10px;">
                <button class="btn-control" id="btnPip" style="background:#ff0000; border:none; padding:8px 12px; color:#fff; border-radius:4px; font-weight:bold; cursor:pointer;">Melayang (PiP)</button>
                <button class="btn-control" id="btnFullscreen" style="background:#ff0000; border:none; padding:8px 12px; color:#fff; border-radius:4px; font-weight:bold; cursor:pointer;">Layar Penuh</button>
            </div>
        </div>
    `;

    const statusMessage = document.getElementById('statusMessage');
    const vidContainer = document.getElementById('vidContainer');
    const player = document.getElementById('mainPlayer');

    // ==========================================
    // VARIABLE INTERNAL (STATE)
    // ==========================================
    let stallTimer = null;    // Untuk hitung mundur 6 detik pas lag
    let activeStreamUrl = null; // Cache URL raw MP4 biar reset-nya instan

    // ==========================================
    // FUNGSI UTAMA LOAD VIDEO
    // ==========================================
    const loadAndPlayVideo = async (url) => {
        vidContainer.style.display = "block";
        statusMessage.innerText = "Mengekstrak stream audio/video...";
        
        try {
            // Ambil URL mentah dari backend (yt-dlp)
            const data = await fetchDirectUrl(url);
            
            // Simpan URL stream-nya ke memori buat darurat kalau macet
            activeStreamUrl = `/stream-video?url=${encodeURIComponent(data.directUrl)}`;
            
            player.src = activeStreamUrl;
            player.controls = true;

            // Posisikan ke detik terakhir saat metadata video sudah siap
            player.addEventListener('loadedmetadata', function onMeta() {
                const savedTime = localStorage.getItem('yt_saved_time');
                if (savedTime && parseFloat(savedTime) > 0) {
                    player.currentTime = parseFloat(savedTime);
                }
                player.removeEventListener('loadedmetadata', onMeta);
            });

            try { 
                await player.play(); 
                clearStallDetector(); 
            } catch (e) { 
                statusMessage.innerText = "Siap! Klik tombol Play."; 
            }

        } catch (err) {
            statusMessage.innerText = "Gagal memuat video! YouTube memblokir akses.";
        }
    };

    // ==========================================
    // LOGIKA STALL DETECTOR (ANTI BLOCK BALAPAN)
    // ==========================================
    const startStallDetector = () => {
        clearStallDetector();
        
        stallTimer = setTimeout(() => {
            if (activeStreamUrl && !player.paused) {
                statusMessage.innerText = "Koneksi interup. Memulihkan aliran data... ⚡";
                
                const lastTime = player.currentTime;
                // Simpan detiknya ke localStorage sebagai cadangan darurat
                localStorage.setItem('yt_saved_time', lastTime);

                // HARD RESET: Hancurkan pipa data lama yang menyumbat browser
                player.pause();
                player.removeAttribute('src');
                player.load(); 

                // Tembak ulang pipa baru
                player.src = activeStreamUrl;
                player.load(); // Paksa browser alokasikan memori baru

                // Pasang pemicu jalan
                player.addEventListener('loadedmetadata', function onResume() {
                    player.currentTime = lastTime;
                    
                    // Gunakan Promise play untuk deteksi blokir browser
                    player.play().catch(() => {
                        // Jika diblokir sistem autoplay browser mobile, 
                        // ubah status agar user tinggal sentuh layar sekali
                        statusMessage.innerText = "Stream siap! Ketuk layar atau tombol Play untuk lanjut 🎵";
                    });
                    
                    player.removeEventListener('loadedmetadata', onResume);
                });
            }
        }, 6000); 
    };
    const clearStallDetector = () => {
        if (stallTimer) {
            clearTimeout(stallTimer);
            stallTimer = null;
        }
    };

    // Mata-mata status buffering
    player.addEventListener('waiting', startStallDetector);
    player.addEventListener('playing', clearStallDetector);
    player.addEventListener('stalled', startStallDetector); // Kalau stream macet total
    
    player.addEventListener('timeupdate', () => {
        // Kalau video beneran jalan lancar, simpan waktunya
        if (player.currentTime > 0 && player.readyState >= 2 && !player.paused) {
            clearStallDetector(); // Reset timer lag karena video sudah gerak
            localStorage.setItem('yt_saved_time', player.currentTime);
        }
    });

    // ==========================================
    // LOGIKA PERGANTIAN VIDEO
    // ==========================================
    document.addEventListener('app:play-url', (e) => {
        const url = e.detail.url;
        if (!url) return;
        
        // Kalau ganti video baru, reset detik ke 0
        if (url !== localStorage.getItem('yt_cached_url')) {
            localStorage.setItem('yt_saved_time', '0');
            
            // Matikan paksa video lama biar gak diem-diem save detik terakhir
            player.pause();
            player.currentTime = 0;
            player.removeAttribute('src'); 
            player.load();
        }
        
        localStorage.setItem('yt_cached_url', url);
        loadAndPlayVideo(url);
    });

    // AUTO LOAD SAAT REFRESH
    const savedUrl = localStorage.getItem('yt_cached_url');
    if (savedUrl) loadAndPlayVideo(savedUrl);

    // Kirim sinyal ke Main.js buat nyambungin kabel audio engine
    player.oncanplay = () => {
        statusMessage.innerText = "Now Playing 🎵";
        onVideoReady(player);
    };

    // ==========================================
    // UTILITY UI (PIP & FULLSCREEN)
    // ==========================================
    document.getElementById('btnPip').addEventListener('click', async () => {
        try {
            if (document.pictureInPictureElement) await document.exitPictureInPicture();
            else await player.requestPictureInPicture();
        } catch (e) { console.error("PiP Error", e); }
    });
    
    document.getElementById('btnFullscreen').addEventListener('click', async () => {
        try {
            if (document.fullscreenElement) await document.exitFullscreen();
            else await vidContainer.requestFullscreen();
        } catch (e) { console.error("FS Error", e); }
    });
}
