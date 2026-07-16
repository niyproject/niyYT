import './VideoCard.css';
import { fetchDirectUrl } from '../../api/youtube';

// Penampung handler di luar scope fungsi agar mudah dibersihkan
// untuk mencegah memory leak saat komponen di-render ulang
let playUrlHandler = null;

export function renderVideoCard(containerId, onVideoReady) {
    const container = document.getElementById(containerId);

    // ==========================================
    // UPDATE HTML: Wadah Video & Custom Controls
    // ==========================================
    container.innerHTML = `
        <div class="video-container" id="vidContainer" style="display:none; padding: 15px; background: #1a1a1a; border-radius: 12px; margin-bottom: 20px;">
            <div id="statusMessage" class="status" style="margin-bottom:10px; font-size: 13px; color: #aaa;"></div>

            <div id="playerWrapper" style="position: relative; width: 100%; border-radius: 8px; overflow: hidden; background: #000; aspect-ratio: 16/9;">
                <video id="mainPlayer" crossorigin="anonymous" playsinline style="width:100%; height: 100%; display: block;"></video>

                <div id="thumbOverlay" style="display: none; position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 10; background-color: #000; cursor: pointer;">
                    <img id="overlayImage" src="" style="width: 100%; height: 100%; object-fit: cover; opacity: 0.5;">
                    <div id="overlaySpinner" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); display: none;">
                        <div class="loading-spinner"></div>
                    </div>
                    <div id="overlayStandbyPlay" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 60px; color: rgba(255,0,0,0.8); display: none; text-shadow: 0px 0px 10px black;">
                        <i class="fa-solid fa-circle-play"></i>
                    </div>
                </div>
            </div>

            <div class="custom-controls" style="margin-top: 15px;">
                
                <div class="progress-area" style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
                    <span id="currentTimeDisplay" style="color: #fff; font-size: 12px; font-family: 'Poppins', system-ui, sans-serif;">00:00</span>
                    <input type="range" id="progressBar" min="0" max="100" value="0" style="flex: 1; cursor: pointer; accent-color: #ff0000; height: 4px; border-radius: 2px; outline: none;">
                    <span id="durationDisplay" style="color: #fff; font-size: 12px; font-family: 'Poppins', system-ui, sans-serif;">00:00</span>
                </div>

                <div class="buttons-area" style="display: flex; justify-content: space-between; align-items: center;">
                    
                    <div class="playback-controls" style="display: flex; align-items: center; gap: 15px;">
                        <button class="ctrl-btn" id="btnPrev" title="Previous"><i class="fa-solid fa-backward-step"></i></button>
                        <button class="ctrl-btn" id="btnSeekBack" title="Mundur 5 Detik"><i class="fa-solid fa-backward"></i></button>
                        
                        <button class="ctrl-btn play-btn" id="btnPlayPause" title="Play/Pause"><i class="fa-solid fa-play"></i></button>
                        
                        <button class="ctrl-btn" id="btnSeekForward" title="Maju 5 Detik"><i class="fa-solid fa-forward"></i></button>
                        <button class="ctrl-btn" id="btnNext" title="Next"><i class="fa-solid fa-forward-step"></i></button>
                    </div>

                    <div class="tools-controls" style="display: flex; gap: 15px;">
                        <button class="ctrl-btn" id="btnPip" title="Picture in Picture"><i class="fa-solid fa-clone"></i></button>
                        <button class="ctrl-btn" id="btnFullscreen" title="Fullscreen"><i class="fa-solid fa-expand"></i></button>
                    </div>
                </div>

            </div>
        </div>
    `;

    const statusMessage = document.getElementById('statusMessage');
    const vidContainer = document.getElementById('vidContainer');
    const player = document.getElementById('mainPlayer');
    const thumbOverlay = document.getElementById('thumbOverlay');
    const overlayImage = document.getElementById('overlayImage');
    const overlaySpinner = document.getElementById('overlaySpinner');
    const overlayStandbyPlay = document.getElementById('overlayStandbyPlay');

    const progressBar = document.getElementById('progressBar');
    const currentTimeDisplay = document.getElementById('currentTimeDisplay');
    const durationDisplay = document.getElementById('durationDisplay');
    const btnPlayPause = document.getElementById('btnPlayPause');

    // ==========================================
    // VARIABLE INTERNAL (STATE)
    // ==========================================
    let stallTimer = null;
    let activeStreamUrl = null;
    let pendingResumeHandler = null;

    // ==========================================
    // FUNGSI PENGENDALI LAYAR OVERLAY (DIPINDAH KE ATAS)
    // ==========================================
    const showOverlay = (mode, thumbUrl) => {
        if(thumbUrl) {
            overlayImage.src = thumbUrl;
            localStorage.setItem('yt_cached_thumb', thumbUrl);
        } else {
            overlayImage.src = localStorage.getItem('yt_cached_thumb') || '';
        }

        thumbOverlay.style.display = 'block';

        if (mode === 'standby') {
            overlayImage.style.filter = 'none'; 
            overlaySpinner.style.display = 'none';
            overlayStandbyPlay.style.display = 'block'; 
        } else {
            overlayImage.style.filter = 'blur(2px)'; 
            overlaySpinner.style.display = 'block'; 
            overlayStandbyPlay.style.display = 'none';
        }
    };

    const hideOverlay = () => {
        thumbOverlay.style.display = 'none';
        overlayStandbyPlay.style.display = 'none';
        overlaySpinner.style.display = 'none';
    };


    // ==========================================
    // LOGIKA KONTROL VIDEO (OTAK TOMBOL)
    // ==========================================
    
    // 1. Update Play/Pause Icon
    player.addEventListener('play', () => {
        btnPlayPause.innerHTML = '<i class="fa-solid fa-pause"></i>';
    });
    player.addEventListener('pause', () => {
        btnPlayPause.innerHTML = '<i class="fa-solid fa-play"></i>';
    });

    // 2. Klik Tombol Play/Pause
    btnPlayPause.addEventListener('click', () => {
        if (player.paused) player.play();
        else player.pause();
    });

    // 3. Seek Maju/Mundur 5 Detik
    document.getElementById('btnSeekBack').addEventListener('click', () => {
        player.currentTime -= 5;
    });
    document.getElementById('btnSeekForward').addEventListener('click', () => {
        player.currentTime += 5;
    });

    // 4. Update Progress Bar & Waktu (Setiap video jalan)
    player.addEventListener('timeupdate', () => {
        const percent = (player.currentTime / player.duration) * 100;
        progressBar.value = percent || 0;
        
        // Format waktu (00:00)
        const format = (sec) => {
            const m = Math.floor(sec / 60);
            const s = Math.floor(sec % 60);
            return `${m}:${s.toString().padStart(2, '0')}`;
        };
        currentTimeDisplay.innerText = format(player.currentTime);
        if(player.duration) durationDisplay.innerText = format(player.duration);
    });

    // 5. Geser Progress Bar (Manual Seek)
    progressBar.addEventListener('input', (e) => {
        const time = (e.target.value / 100) * player.duration;
        player.currentTime = time;
    });

    // 6. Next & Prev (Menghubungkan ke sistem app)
    document.getElementById('btnNext').addEventListener('click', () => {
        document.dispatchEvent(new CustomEvent('app:play-next'));
    });
    
    document.getElementById('btnPrev').addEventListener('click', () => {
        document.dispatchEvent(new CustomEvent('app:play-prev'));
    });

    // ==========================================
    // FUNGSI UTAMA LOAD VIDEO
    // ==========================================
    const loadAndPlayVideo = async (url) => {
        vidContainer.style.display = "block";
        statusMessage.innerText = "Mengekstrak stream audio/video...";

        try {
            const data = await fetchDirectUrl(url);
            activeStreamUrl = `/stream-video?url=${encodeURIComponent(data.directUrl)}`;
            player.src = activeStreamUrl;
            player.controls = false;

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
                // 💡 Kalau berhasil auto-play, overlay akan dihilangkan otomatis
                // oleh event 'playing' di bawah.
            } catch (e) {
                console.log("Auto-play ditahan browser.");
                statusMessage.innerText = "Siap! Ketuk layar atau tombol Play.";
                showOverlay('standby'); // Munculkan gambar dan tombol play raksasa
            }

        } catch (err) {
            // 💡 INI BARU ERROR ASLI (Kalau server backend lu diblokir YouTube)
            statusMessage.innerText = "Gagal memuat video! YouTube memblokir akses.";
            hideOverlay();
        }
    };

    // ==========================================
    // LOGIKA STALL DETECTOR & FIX RACE CONDITION
    // ==========================================
    const startStallDetector = () => {
        clearStallDetector();

        stallTimer = setTimeout(() => {
            if (activeStreamUrl && !player.paused) {
                statusMessage.innerText = "Koneksi interup. Memulihkan aliran data... ⚡";
                const lastTime = player.currentTime;
                localStorage.setItem('yt_saved_time', lastTime);

                player.pause();
                player.removeAttribute('src');
                player.src = ''; 
                player.load();

                player.src = activeStreamUrl;
                player.load();

                if (pendingResumeHandler) {
                    player.removeEventListener('loadedmetadata', pendingResumeHandler);
                }

                pendingResumeHandler = function onResume() {
                    player.currentTime = lastTime;
                    player.play().catch(() => {
                        statusMessage.innerText = "Stream siap! Ketuk layar atau tombol Play untuk lanjut 🎵";
                        hideOverlay();
                    });

                    player.removeEventListener('loadedmetadata', pendingResumeHandler);
                    pendingResumeHandler = null;
                };

                player.addEventListener('loadedmetadata', pendingResumeHandler);
            }
        }, 6000);
    };

    const clearStallDetector = () => {
        if (stallTimer) {
            clearTimeout(stallTimer);
            stallTimer = null;
        }
    };

    // ==========================================
    // EVENT LISTENER PLAYER (MATA-MATA STATUS)
    // ==========================================
    player.addEventListener('waiting', () => {
        startStallDetector();
    });


    player.addEventListener('playing', () => {
        statusMessage.innerText = "Now Playing 🎵"; // 💡 Reset tulisan status
        hideOverlay();
        clearStallDetector();
    });

    player.addEventListener('stalled', () => {
        startStallDetector();
    });

    // 💡 TAMBAHAN BARU: Sensor kalau video udah mentok habis (Tamat)
    player.addEventListener('ended', () => {
        statusMessage.innerText = "Video selesai. Memutar lagu selanjutnya... ⏭️";
        document.dispatchEvent(new CustomEvent('app:play-next'));
    });

    player.addEventListener('timeupdate', () => {
        if (player.currentTime > 0 && player.readyState >= 2 && !player.paused) {
            clearStallDetector();
            localStorage.setItem('yt_saved_time', player.currentTime);
        }
    });

    player.oncanplay = () => {
        statusMessage.innerText = "Now Playing 🎵";
        hideOverlay();
        onVideoReady(player);
    };


    // ==========================================
    // LOGIKA PERGANTIAN VIDEO & KLIK OVERLAY (FINAL FIX)
    // ==========================================

    thumbOverlay.addEventListener('click', () => {
        if (overlayStandbyPlay.style.display !== 'none') {
            const savedUrl = localStorage.getItem('yt_cached_url');
            
            // Cek kalau source videonya kebetulan kosong/error, kita paksa fetch ulang
            if (!player.src || player.src === window.location.href) {
                showOverlay('loading');
                if (savedUrl) loadAndPlayVideo(savedUrl);
            } else {
                // Kalau source ada, paksa play
                statusMessage.innerText = "Memulai pemutaran... ⏳";
                player.play().then(() => {
                    hideOverlay();
                }).catch(err => {
                    console.log("Play manual masih ditolak, muat ulang:", err);
                    showOverlay('loading');
                    if (savedUrl) loadAndPlayVideo(savedUrl);
                });
            }
        }
    });


    if (playUrlHandler) {
        document.removeEventListener('app:play-url', playUrlHandler);
    }

    playUrlHandler = (e) => {
        const url = e.detail.url;
        const thumb = e.detail.thumbnail;
        if (!url) return;

        showOverlay('loading', thumb);

        clearStallDetector();
        if (pendingResumeHandler) {
            player.removeEventListener('loadedmetadata', pendingResumeHandler);
            pendingResumeHandler = null;
        }

        if (url !== localStorage.getItem('yt_cached_url')) {
            localStorage.setItem('yt_saved_time', '0');
            player.pause();
            player.currentTime = 0;
            player.removeAttribute('src');
            player.src = '';
            player.load();
        }

        localStorage.setItem('yt_cached_url', url);
        loadAndPlayVideo(url);
    };

    document.addEventListener('app:play-url', playUrlHandler);

    // ==========================================
    // LAZY LOAD SAAT REFRESH
    // ==========================================
    const savedUrl = localStorage.getItem('yt_cached_url');
    if (savedUrl) {
        vidContainer.style.display = "block"; // Munculkan container utama
        showOverlay('standby'); // Tampilkan status gambar dan tombol play raksasa
    }

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

   // ==========================================
    // DETEKSI MODE PiP (PICTURE-IN-PICTURE)
    // ==========================================
    player.addEventListener('enterpictureinpicture', () => {
        // Saat PiP terbuka, kempeskan container biar layar pencarian luas
        vidContainer.classList.add('is-pip');
    });

    player.addEventListener('leavepictureinpicture', () => {
        // Saat PiP ditutup, kembalikan ukuran container
        vidContainer.classList.remove('is-pip');

        // 💡 Kasih delay 150ms biar ngasih waktu browser selesai nge-pause,
        // baru kita paksa play lagi setelahnya.
        setTimeout(() => {
            if (player.paused) {
                player.play().catch(err => {
                    console.log("Sistem mencegah auto-play saat keluar PiP", err);
                });
            }
        }, 150); // 150 milidetik biasanya udah lebih dari cukup
    });
}
