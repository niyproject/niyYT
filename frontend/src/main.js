import { renderVideoCard } from './components/Video/VideoCard';
import { initDelayPedal } from './components/Effects/DelayPedal';
import { initPanning } from './components/Effects/Panning';
import { initGraphicEQ } from './components/Effects/GraphicEQ';
import { initDistortion } from './components/Effects/Distortion';
import { initEchoDelay } from './components/Effects/EchoDelay';
import { initReverbPedal } from './components/Effects/ReverbPedal';

let audioCtx, isSetup = false;

// ==========================================
// LOGIKA TAB NAVIGASI (BOTTOM NAV)
// ==========================================
const btnNavSearch = document.getElementById('btn-nav-search');
const btnNavMixer = document.getElementById('btn-nav-mixer');
const tabSearch = document.getElementById('tab-search');
const tabMixer = document.getElementById('tab-mixer');

btnNavSearch.addEventListener('click', () => {
    btnNavSearch.classList.add('active');
    btnNavMixer.classList.remove('active');
    tabSearch.classList.add('active');
    tabMixer.classList.remove('active');
});

btnNavMixer.addEventListener('click', () => {
    btnNavMixer.classList.add('active');
    btnNavSearch.classList.remove('active');
    tabMixer.classList.add('active');
    tabSearch.classList.remove('active');
});

// ==========================================
// LOGIKA PENCARIAN (TOP NAV) & SESSION CACHE
// ==========================================
const searchForm = document.getElementById('searchForm');
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('search-results');
const searchStatus = document.getElementById('search-status');

// 💡 FUNGSI RENDER DIPISAH BIAR BISA DIPANGGIL ULANG OLEH CACHE
const renderVideoList = (videos) => {
    searchResults.innerHTML = "";
    searchStatus.innerText = videos.length === 0 ? "Tidak ada hasil ditemukan." : "";
    
    const currentPlayingUrl = localStorage.getItem('yt_cached_url');

    videos.forEach(video => {
        const card = document.createElement('div');
        card.className = 'video-card';
        card.dataset.url = video.url; 

        if (video.url === currentPlayingUrl) {
            card.classList.add('playing-now');
        }

        card.innerHTML = `
            <div class="thumb-wrapper">
                <img src="${video.image || video.thumbnail}" class="video-thumb" alt="Thumbnail">
                <div class="play-overlay">▶</div>
            </div>
            <div class="video-info">
                <div class="video-title">${video.title}</div>
                <div class="video-author">${video.author.name} • ${video.timestamp}</div>
            </div>
        `;

        card.addEventListener('click', () => {
            document.dispatchEvent(new CustomEvent('app:play-url', {
                detail: { 
                    url: video.url, 
                    thumbnail: video.image || video.thumbnail 
                }
            }));
        });

        searchResults.appendChild(card);
    });
};

searchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const keyword = searchInput.value.trim();
    if (!keyword) return;

    const isLink = keyword.includes('youtube.com/') || keyword.includes('youtu.be/');

    if (isLink) {
        searchStatus.innerText = "Memuat video dari link...";
        searchResults.innerHTML = ""; 
        
        let videoId = "";
        if(keyword.includes('youtu.be/')) {
            videoId = keyword.split('youtu.be/')[1].split('?')[0];
        } else if (keyword.includes('youtube.com/watch')) {
            videoId = new URLSearchParams(keyword.split('?')[1]).get('v');
        }
        const thumbUrl = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : '';

        document.dispatchEvent(new CustomEvent('app:play-url', {
            detail: { url: keyword, thumbnail: thumbUrl } 
        }));
        return; 
    }

    searchStatus.innerText = "Mencari...";
    searchResults.innerHTML = "";

    try {
        const response = await fetch(`/search?q=${encodeURIComponent(keyword)}`);
        const videos = await response.json();
        
        // 💡 SIMPAN HASIL KE SESSION STORAGE SEBELUM RENDER
        sessionStorage.setItem('yt_last_search_keyword', keyword);
        sessionStorage.setItem('yt_last_search_results', JSON.stringify(videos));

        renderVideoList(videos);
    } catch (err) {
        searchStatus.innerText = "Gagal mengambil data pencarian dari server.";
    }
});

// 💡 AUTO LOAD HASIL PENCARIAN SAAT REFRESH
document.addEventListener('DOMContentLoaded', () => {
    const savedKeyword = sessionStorage.getItem('yt_last_search_keyword');
    const savedResults = sessionStorage.getItem('yt_last_search_results');

    if (savedKeyword && savedResults) {
        searchInput.value = savedKeyword; // Kembalikan teks di kotak input
        try {
            const videos = JSON.parse(savedResults);
            renderVideoList(videos); // Render ulang list-nya
        } catch (e) {
            console.error("Gagal membaca cache pencarian");
        }
    }
});


// ==========================================
// 💡 LOGIKA UPDATE UI SAAT VIDEO DIPUTAR
// ==========================================
document.addEventListener('app:play-url', (e) => {
    const playedUrl = e.detail.url;
    const allCards = document.querySelectorAll('.video-card');
    
    // Looping semua card di layar
    allCards.forEach(card => {
        if (card.dataset.url === playedUrl) {
            // Kalau URL cocok, pasang efek monokrom & matikan klik
            card.classList.add('playing-now');
        } else {
            // Kalau beda, bersihkan efek (buat video yang sebelumnya jalan)
            card.classList.remove('playing-now');
        }
    });
});


renderVideoCard('video-card-container', (videoElement) => {
    
    if (isSetup) return;

    // 1. Inisialisasi Mesin Utama
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const sourceNode = audioCtx.createMediaElementSource(videoElement);

    // Bangunkan mesin audio setiap kali ada klik di layar
    document.body.addEventListener('click', () => {
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    });

    // 2. Pemisah Jalur (Splitter ke L & R)
    const splitter = audioCtx.createChannelSplitter(2);
    sourceNode.connect(splitter);
    
    // Bikin titik colokan awal biar gampang dioper
    const chL = audioCtx.createGain();
    const chR = audioCtx.createGain();
    splitter.connect(chL, 0);
    splitter.connect(chR, 1);

    // ==========================================
    // 3. ESTAFET KABEL (DAISY CHAIN)
    // ==========================================
    
    // A. Masuk ke Delay (Haas Effect)
    const delayOut = initDelayPedal(audioCtx, chL, chR, 'delay-pedal-container');

    // B. Masuk ke Panning
    const panOut = initPanning(audioCtx, delayOut.outL, delayOut.outR, 'panning-container');

    // C. Masuk ke 30-Band Graphic EQ (Kiri & Kanan)
    const eqOut = initGraphicEQ(audioCtx, panOut.outL, panOut.outR, 'eq-container');

    // 4. Penggabung Jalur (Merger L & R jadi Mono/Stereo Gabungan)
    const merger = audioCtx.createChannelMerger(2);
    eqOut.outL.connect(merger, 0, 0);
    eqOut.outR.connect(merger, 0, 1);

    // D. Masuk ke Distortion
    const distOut = initDistortion(audioCtx, merger, 'distortion-container');

    // E. Masuk ke Echo Ping-Pong
    const echoOut = initEchoDelay(audioCtx, distOut, 'echo-delay-container');

    // F. Masuk ke True Reverb (Tercelup Gema Ruangan)
    const finalOut = initReverbPedal(audioCtx, echoOut, 'reverb-container');

    // 5. Output Akhir dicolok ke Speaker HP/Browser
    finalOut.connect(audioCtx.destination);


    isSetup = true;
});
