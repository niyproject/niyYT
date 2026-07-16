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

    // ==========================================
    // 💡 TAMBAHAN BARU: KOTAK PAGINASI BAWAH
    // ==========================================
    if (videos.length > 0) {
        // Tarik data kita lagi di halaman berapa
        const currentPage = parseInt(sessionStorage.getItem('yt_current_page')) || 1;
        const lastKeyword = sessionStorage.getItem('yt_last_search_keyword') || "";

        const paginationWrapper = document.createElement('div');
        paginationWrapper.style.cssText = "display: flex; justify-content: center; align-items: center; gap: 20px; margin-top: 30px; padding-bottom: 30px;";

        // 1. Tombol Prev Page
        const btnPrev = document.createElement('button');
        btnPrev.className = 'btn-control';
        btnPrev.innerHTML = '<i class="fa-solid fa-chevron-left"></i> Prev Page';
        
        // Matikan tombol kalau udah di halaman 1
        if (currentPage === 1) {
            btnPrev.style.opacity = "0.4";
            btnPrev.style.cursor = "not-allowed";
        } else {
            btnPrev.onclick = () => {
                // Parameter ketiga 'false' biar ga langsung auto-play
                executeSearch(lastKeyword, currentPage - 1, false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            };
        }

        // 2. Teks Indikator Halaman
        const pageText = document.createElement('span');
        pageText.style.cssText = "color: #fff; font-size: 14px; font-weight: bold;";
        pageText.innerText = `Page ${currentPage}`;

        // 3. Tombol Next Page
        const btnNext = document.createElement('button');
        btnNext.className = 'btn-control';
        btnNext.innerHTML = 'Next Page <i class="fa-solid fa-chevron-right"></i>';
        btnNext.onclick = () => {
            // Parameter ketiga 'false' biar ga langsung auto-play
            executeSearch(lastKeyword, currentPage + 1, false);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };

        paginationWrapper.appendChild(btnPrev);
        paginationWrapper.appendChild(pageText);
        paginationWrapper.appendChild(btnNext);

        searchResults.appendChild(paginationWrapper);
    }
};

// ==========================================
// 💡 MODIFIKASI FUNGSI PENCARIAN (MENDUKUNG MUNDUR HALAMAN)
// ==========================================
// Ubah parameter ketiga jadi autoPlayAction ('first', 'last', atau false)
const executeSearch = async (keyword = "", page = 1, autoPlayAction = false) => {
    searchStatus.innerText = `Memuat halaman ${page}...`;
    searchResults.innerHTML = "";

    // Tampilkan 5 kartu skeleton
    for(let i = 0; i < 5; i++) {
        searchResults.innerHTML += `
            <div class="video-card skeleton-wrapper">
                <div class="thumb-wrapper skeleton" style="width: 100%; aspect-ratio: 16/9; border-radius: 8px;"></div>
                <div class="video-info" style="margin-top: 10px; display: flex; flex-direction: column; gap: 8px;">
                    <div class="skeleton" style="width: 90%; height: 16px; border-radius: 4px;"></div>
                    <div class="skeleton" style="width: 60%; height: 14px; border-radius: 4px;"></div>
                </div>
            </div>
        `;
    }

    try {
        const url = keyword
            ? `/search?q=${encodeURIComponent(keyword)}&page=${page}`
            : `/trending?page=${page}`;

        const response = await fetch(url);
        const videos = await response.json();

        if (videos.length === 0) {
            searchStatus.innerText = "Daftar putar sudah habis bung! 🎵";
            searchResults.innerHTML = "";
            return;
        }

        sessionStorage.setItem('yt_last_search_keyword', keyword);
        sessionStorage.setItem('yt_last_search_results', JSON.stringify(videos));
        sessionStorage.setItem('yt_current_page', page);

        renderVideoList(videos);

        // 💡 LOGIKA EKSEKUSI AUTO-PLAY (Pilih Atas atau Bawah)
        if (autoPlayAction && videos.length > 0) {
            setTimeout(() => {
                const cards = searchResults.querySelectorAll('.video-card');
                if (autoPlayAction === 'first' && cards.length > 0) {
                    cards[0].click(); // Putar urutan paling atas
                } else if (autoPlayAction === 'last' && cards.length > 0) {
                    cards[cards.length - 1].click(); // Putar urutan paling bawah!
                }
            }, 800);
        }
    } catch (err) {
        searchStatus.innerText = "Gagal mengambil data dari server.";
        searchResults.innerHTML = "";
    }
};


// ==========================================
// EVENT LISTENER FORM PENCARIAN
// ==========================================
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

    // Panggil fungsi eksekusi pencarian
    executeSearch(keyword, 1);
});


// ==========================================
// AUTO LOAD & REKOMENDASI SAAT WEB DIBUKA
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const savedKeyword = sessionStorage.getItem('yt_last_search_keyword');
    const savedResults = sessionStorage.getItem('yt_last_search_results');

    if (savedResults) {
        // 1. Kalau ada cache (user habis refresh), render ulang dari memori
        searchInput.value = savedKeyword || ""; 
        try {
            const videos = JSON.parse(savedResults);
            renderVideoList(videos); 
        } catch (e) {
            executeSearch("", 1); // Fallback ke trending murni
        }
    } else {
        // 2. 💡 KALAU BARU MASUK & KOSONG, PANGGIL TRENDING MURNI!
        // Panggil tanpa parameter biar executeSearch() nembak ke /trending
        executeSearch("", 1); 
    }
});

// ==========================================
// 💡 LOGIKA UPDATE UI INSTAN SAAT LAGU DI-KLIK
// ==========================================
document.addEventListener('app:play-url', (e) => {
    const playedUrl = e.detail.url;
    const allCards = Array.from(document.querySelectorAll('.video-card'));

    allCards.forEach(card => {
        if (card.dataset.url === playedUrl) {
            card.classList.add('playing-now');
        } else {
            card.classList.remove('playing-now');
        }
    });

    // 💡 LOGIKA TOMBOL PREV ABU-ABU (DISABLED)
    const btnPrev = document.getElementById('btnPrev');
    if (btnPrev) {
        const currentPage = parseInt(sessionStorage.getItem('yt_current_page')) || 1;
        const playingIndex = allCards.findIndex(card => card.dataset.url === playedUrl);

        // Kalau di Halaman 1 DAN lagunya urutan pertama (Index 0), matikan tombol Prev!
        if (currentPage === 1 && playingIndex === 0) {
            btnPrev.classList.add('disabled-btn');
        } else {
            // Selain itu, nyalakan lagi tombolnya
            btnPrev.classList.remove('disabled-btn');
        }
    }
});


// ==========================================
// 💡 LOGIKA AUTO PLAY NEXT / PAGINASI MAJU
// ==========================================
document.addEventListener('app:play-next', () => {
    const allCards = Array.from(document.querySelectorAll('.video-card'));
    const currentUrl = localStorage.getItem('yt_cached_url');
    const currentIndex = allCards.findIndex(card => card.dataset.url === currentUrl);

    if (currentIndex !== -1 && currentIndex < allCards.length - 1) {
        const nextCard = allCards[currentIndex + 1];
        setTimeout(() => nextCard.click(), 1000);
    } else if (currentIndex !== -1 && currentIndex === allCards.length - 1) {
        console.log("Memuat halaman berikutnya...");
        searchStatus.innerText = "Memuat kelanjutan daftar putar... 🔄";
        
        const lastKeyword = sessionStorage.getItem('yt_last_search_keyword') || "";
        const currentPage = parseInt(sessionStorage.getItem('yt_current_page')) || 1;
        const nextPage = currentPage + 1;

        // Tembak halaman baru, minta putar lagu PERTAMA ('first')
        executeSearch(lastKeyword, nextPage, 'first');
    }
});

// ==========================================
// 💡 LOGIKA AUTO PLAY PREV / PAGINASI MUNDUR
// ==========================================
document.addEventListener('app:play-prev', () => {
    const allCards = Array.from(document.querySelectorAll('.video-card'));
    const currentUrl = localStorage.getItem('yt_cached_url');
    const currentIndex = allCards.findIndex(card => card.dataset.url === currentUrl);
    const currentPage = parseInt(sessionStorage.getItem('yt_current_page')) || 1;

    if (currentIndex > 0) {
        // AMAN: Mundur 1 urutan di layar yang sama
        const prevCard = allCards[currentIndex - 1];
        prevCard.click();
    } else if (currentIndex === 0 && currentPage > 1) {
        // 💡 JURUS MUNDUR HALAMAN!
        console.log("Mencapai awal daftar. Memuat halaman sebelumnya...");
        searchStatus.innerText = "Memuat halaman sebelumnya... 🔄";
        
        const lastKeyword = sessionStorage.getItem('yt_last_search_keyword') || "";
        const prevPage = currentPage - 1;

        // Tembak halaman sebelumnya, minta putar lagu TERAKHIR ('last')
        executeSearch(lastKeyword, prevPage, 'last');
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

    // E. Masuk ke Echo Ping-Pong
    const echoOut = initEchoDelay(audioCtx, distOut, 'echo-delay-container');

    // F. Masuk ke True Reverb (Tercelup Gema Ruangan)
    const finalOut = initReverbPedal(audioCtx, echoOut, 'reverb-container');

    // 5. Output Akhir dicolok ke Speaker HP/Browser
    finalOut.connect(audioCtx.destination);


    isSetup = true;
});
