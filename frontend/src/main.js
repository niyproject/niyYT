import { renderVideoCard } from './components/Video/VideoCard';
import { initDelayPedal } from './components/Effects/DelayPedal';
import { initPanning } from './components/Effects/Panning';
import { initGraphicEQ } from './components/Effects/GraphicEQ';
import { initDistortion } from './components/Effects/Distortion';
import { initEchoDelay } from './components/Effects/EchoDelay';

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
// LOGIKA PENCARIAN (TOP NAV)
// ==========================================
const searchForm = document.getElementById('searchForm');
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('search-results');
const searchStatus = document.getElementById('search-status');

searchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const keyword = searchInput.value.trim();
    if (!keyword) return;

    // DETEKSI: Apakah input ini berupa link YouTube?
    const isLink = keyword.includes('youtube.com/') || keyword.includes('youtu.be/');

    if (isLink) {
        // Kalau link, langsung suruh video card nge-play!
        searchStatus.innerText = "Memuat video dari link...";
        searchResults.innerHTML = ""; // Kosongkan area bawah
        
        document.dispatchEvent(new CustomEvent('app:play-url', { 
            detail: { url: keyword } 
        }));
        return; // Hentikan eksekusi di sini, gak usah lanjut nyari ke backend
    }

    // ==========================================
    // Kalau bukan link, berarti nyari pakai kata kunci
    // ==========================================
    searchStatus.innerText = "Mencari...";
    searchResults.innerHTML = ""; 

    try {
        const response = await fetch(`/search?q=${encodeURIComponent(keyword)}`);
        const videos = await response.json();
        
        searchStatus.innerText = videos.length === 0 ? "Tidak ada hasil ditemukan." : "";
        
        videos.forEach(video => {
            const card = document.createElement('div');
            card.className = 'video-card';
            card.innerHTML = `
                <img src="${video.image || video.thumbnail}" class="video-thumb" alt="Thumbnail">
                <div class="video-info">
                    <div class="video-title">${video.title}</div>
                    <div class="video-author">${video.author.name} • ${video.timestamp}</div>
                </div>
            `;
            
            card.addEventListener('click', () => {
                document.dispatchEvent(new CustomEvent('app:play-url', { 
                    detail: { url: video.url } 
                }));
            });
            
            searchResults.appendChild(card);
        });
    } catch (err) {
        searchStatus.innerText = "Gagal mengambil data pencarian dari server.";
    }
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

    // E. Masuk ke Echo Analog
    const finalOut = initEchoDelay(audioCtx, distOut, 'echo-delay-container');

    // 5. Output Akhir dicolok ke Speaker HP/Browser
    finalOut.connect(audioCtx.destination);


    isSetup = true;
});
