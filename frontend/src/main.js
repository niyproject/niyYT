import { renderVideoPlayer } from './components/Video/VideoPlayer';
import { executeSearch, renderVideoList } from './components/Video/VideoList';
import { initAudioRouting } from './components/Audio/routing';
import { openAboutModal } from './components/PopupModal/About';
import { openPlaylistModal } from './components/PopupModal/Playlist';

import { renderDelayUI } from './components/Audio/Mixing/Delay';
import { renderPanningUI } from './components/Audio/Mixing/Panning';
import { renderGraphicEQUI } from './components/Audio/Mixing/GraphicEQ';
import { renderDistortionUI } from './components/Audio/Mixing/Distortion';
import { renderEchoDelayUI } from './components/Audio/Mixing/EchoDelay';
import { renderReverbUI } from './components/Audio/Mixing/Reverb';

import { registerSW } from 'virtual:pwa-register';

let isAudioSetup = false;

// ==========================================
// TAB NAVIGATION EVENT LOGIC
// ==========================================
const btnNavSearch = document.getElementById('btn-nav-search');
const btnNavMixer = document.getElementById('btn-nav-mixer');
const tabSearch = document.getElementById('tab-search');
const tabMixer = document.getElementById('tab-mixer');

btnNavSearch.addEventListener('click', () => {
    btnNavSearch.classList.add('active'); btnNavMixer.classList.remove('active');
    tabSearch.classList.add('active'); tabMixer.classList.remove('active');
});

btnNavMixer.addEventListener('click', () => {
    btnNavMixer.classList.add('active'); btnNavSearch.classList.remove('active');
    tabMixer.classList.add('active'); tabSearch.classList.remove('active');
});

// ==========================================
// SEARCH SUBMIT CONTROLLER
// ==========================================
const searchForm = document.getElementById('searchForm');
const searchInput = document.getElementById('searchInput');
const searchStatus = document.getElementById('search-status');

searchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const keyword = searchInput.value.trim();
    if (!keyword) return;

    const isLink = keyword.includes('youtube.com/') || keyword.includes('youtu.be/');
    if (isLink) {
        searchStatus.innerText = "Memuat video dari link...";
        document.getElementById('search-results').innerHTML = "";
        let videoId = keyword.includes('youtu.be/') ? keyword.split('youtu.be/')[1].split('?')[0] : new URLSearchParams(keyword.split('?')[1]).get('v');
        const thumbUrl = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : '';
        document.dispatchEvent(new CustomEvent('app:play-url', { detail: { url: keyword, thumbnail: thumbUrl } }));
        return;
    }
    executeSearch(keyword, 1);
});

/*
// ==========================================
// BOOTLOADER CACHE MEMORY RESTORE
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const savedKeyword = sessionStorage.getItem('yt_last_search_keyword');
    const savedResults = sessionStorage.getItem('yt_last_search_results');
    if (savedResults && savedKeyword !== 'Custom Playlist') {
        searchInput.value = savedKeyword || "";
        try {
            renderVideoList(JSON.parse(savedResults));
        } catch (e) { executeSearch("", 1); }
    } else {
        executeSearch("", 1); // Panggil tab trending saat web kosong pertama dibuka
    }
});
*/

// ==========================================
// BOOTLOADER CACHE MEMORY RESTORE & UI RENDER
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // 💡 1. RENDER SELURUH UI MIXER SEKARANG JUGA!
    // Langsung gambar semuanya ke tab Mixer tanpa perlu nunggu lagu di-play
    renderGraphicEQUI('eq-container');
    renderDelayUI('delay-container');
    renderDistortionUI('distortion-container');
    renderPanningUI('panning-container');
    renderEchoDelayUI('echo-delay-container');
    renderReverbUI('reverb-container');

    // 2. Logic Cache YouTube bawaan lu
    const savedKeyword = sessionStorage.getItem('yt_last_search_keyword');
    const savedResults = sessionStorage.getItem('yt_last_search_results');
    
    if (savedResults && savedKeyword !== 'Custom Playlist') {
        searchInput.value = savedKeyword || "";
        try {
            renderVideoList(JSON.parse(savedResults));
        } catch (e) { executeSearch("", 1); }
    } else {
        executeSearch("", 1); // Panggil tab trending saat web kosong pertama dibuka
    }
});

// ==========================================
// SELECTION BORDER AND BUTTON INTERCEPTOR
// ==========================================
document.addEventListener('app:play-url', (e) => {
    const playedUrl = e.detail.url || e.detail.title;
    const allCards = Array.from(document.querySelectorAll('.video-card'));
    allCards.forEach(card => {
        if (card.dataset.url === playedUrl) card.classList.add('playing-now');
        else card.classList.remove('playing-now');
    });

    const btnPrev = document.getElementById('btnPrev');
    if (btnPrev) {
        const currentPage = parseInt(sessionStorage.getItem('yt_current_page')) || 1;
        const playingIndex = allCards.findIndex(card => card.dataset.url === playedUrl);
        if (currentPage === 1 && playingIndex === 0) btnPrev.classList.add('disabled-btn');
        else btnPrev.classList.remove('disabled-btn');
    }
});

// ==========================================
// AUTO PLAY CONTROLLER (NEXT & PREV ENGINE)
// ==========================================
document.addEventListener('app:play-next', () => {
    const allCards = Array.from(document.querySelectorAll('.video-card'));
    const currentUrl = localStorage.getItem('yt_cached_url');
    const currentIndex = allCards.findIndex(card => card.dataset.url === currentUrl);

    if (currentIndex !== -1 && currentIndex < allCards.length - 1) {
        setTimeout(() => allCards[currentIndex + 1].click(), 1000);
    } else if (currentIndex !== -1 && currentIndex === allCards.length - 1) {
        const lastKeyword = sessionStorage.getItem('yt_last_search_keyword') || "";
        const currentPage = parseInt(sessionStorage.getItem('yt_current_page')) || 1;
        executeSearch(lastKeyword, currentPage + 1, 'first');
    }
});

document.addEventListener('app:play-prev', () => {
    const allCards = Array.from(document.querySelectorAll('.video-card'));
    const currentUrl = localStorage.getItem('yt_cached_url');
    const currentIndex = allCards.findIndex(card => card.dataset.url === currentUrl);
    const currentPage = parseInt(sessionStorage.getItem('yt_current_page')) || 1;

    if (currentIndex > 0) {
        allCards[currentIndex - 1].click();
    } else if (currentIndex === 0 && currentPage > 1) {
        const lastKeyword = sessionStorage.getItem('yt_last_search_keyword') || "";
        executeSearch(lastKeyword, currentPage - 1, 'last');
    }
});

document.addEventListener('app:resume-audio', () => {
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
});

// ==========================================
// ICON TOGGLE DROPDOWN MENU HANDLER
// ==========================================
const btnMoreMenu = document.getElementById('btnMoreMenu');
const dropdownMenu = document.getElementById('dropdownMenu');
const menuIcon = btnMoreMenu.querySelector('i');

btnMoreMenu.addEventListener('click', (e) => {
    e.stopPropagation();
    const isVisible = dropdownMenu.style.display === 'block';
    dropdownMenu.style.display = isVisible ? 'none' : 'block';
    menuIcon.className = isVisible ? 'fa-solid fa-ellipsis-vertical' : 'fa-solid fa-xmark';
});

document.addEventListener('click', (e) => {
    if (dropdownMenu.style.display === 'block' && !dropdownMenu.contains(e.target)) {
        dropdownMenu.style.display = 'none'; menuIcon.className = 'fa-solid fa-ellipsis-vertical';
    }
});

// ==========================================
// SYSTEM DETECTOR OFFLINE SONG FILE HANDLER
// ==========================================
document.getElementById('btnMenuOffline').addEventListener('click', async () => {
    dropdownMenu.style.display = 'none'; menuIcon.className = 'fa-solid fa-ellipsis-vertical';
    try {
        const dirHandle = await window.showDirectoryPicker();
        const localSongs = [];
        searchStatus.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Membaca folder...';

        for await (const entry of dirHandle.values()) {
            if (entry.kind === 'file') {
                const file = await entry.getFile();
                if (file.type.startsWith('audio/') || file.type.startsWith('video/') || file.name.endsWith('.mp3') || file.name.endsWith('.wav')) {
                    localSongs.push({
                        title: file.name.replace(/\.[^/.]+$/, ""),
                        fileHandle: entry, isLocal: true,
                        thumbnail: 'https://via.placeholder.com/300x169/222222/FFFFFF?text=Offline+Audio'
                    });
                }
            }
        }
        if (localSongs.length === 0) { searchStatus.innerText = "Folder ini kosong bung."; return; }
        searchStatus.innerText = `Menampilkan ${localSongs.length} lagu offline`;
        renderVideoList(localSongs);
    } catch (err) { searchStatus.innerText = "Ketik judul lagu di atas untuk mencari..."; }
});


// ==========================================
// INIT AUDIO ROUTING & WEB AUDIO API ENGINE BOOT
// ==========================================
renderVideoPlayer('video-card-container', (videoElement) => {
    if (isAudioSetup) return;
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const sourceNode = audioCtx.createMediaElementSource(videoElement);

    document.body.addEventListener('click', () => {
        if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    });

    initAudioRouting(audioCtx, sourceNode); // Oper terminal kabel ke routing.js
    isAudioSetup = true;
});

// ==========================================
// MODAL MANAGEMENT OPEN/CLOSE HANDLER
// ==========================================
document.getElementById('btnMenuPlaylist').addEventListener('click', () => { 
    dropdownMenu.style.display = 'none'; 
    menuIcon.className = 'fa-solid fa-ellipsis-vertical'; 
    openPlaylistModal(); // Panggil fungsi pembangun DOM
});

document.getElementById('btnMenuAbout').addEventListener('click', () => { 
    dropdownMenu.style.display = 'none'; 
    menuIcon.className = 'fa-solid fa-ellipsis-vertical'; 
    openAboutModal(); // Panggil fungsi pembangun DOM
});


// ==========================================
// PWA SERVICE WORKER REGISTRATION
// ==========================================
registerSW({
    immediate: true,
    onNeedRefresh() {
        console.log('Update PWA tersedia. Silakan refresh aplikasi.');
    },
    onOfflineReady() {
        console.log('PWA berhasil diinstal dan siap berjalan!');
    }
});
