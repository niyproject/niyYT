import './VideoList.css';

const searchResults = document.getElementById('search-results');
const searchStatus = document.getElementById('search-status');

// FUNGSI UTAMA: Cetak Kartu Antrean Pemutar ke Layar
export const renderVideoList = (videos) => {
    searchResults.innerHTML = "";
    searchStatus.innerText = videos.length === 0 ? "Tidak ada hasil ditemukan." : "";
    const currentPlayingUrl = localStorage.getItem('yt_cached_url');

    videos.forEach(video => {
        const card = document.createElement('div');
        card.className = 'video-card';
        card.dataset.url = video.url || video.title;

        if (video.url === currentPlayingUrl || video.title === currentPlayingUrl) {
            card.classList.add('playing-now');
        }

        // ==========================================
        // 1. KARTU OFFLINE LOKAL
        // ==========================================
        if (video.isLocal) {
            card.className = 'video-card result-card';
            card.style.cssText = 'padding: 12px; border-bottom: 1px solid #333; cursor: pointer; display: flex; align-items: center; gap: 12px;';
            card.innerHTML = `
                <div style="background: #333; width: 50px; height: 50px; border-radius: 8px; display: flex; justify-content: center; align-items: center; color: #aaa;">
                    <i class="fa-solid fa-music fa-lg"></i>
                </div>
                <div style="flex: 1; overflow: hidden;">
                    <div style="color: #fff; font-weight: 600; white-space: nowrap; text-overflow: ellipsis; overflow: hidden;">${video.title}</div>
                    <div style="color: #aaa; font-size: 12px; margin-top: 4px;"><i class="fa-solid fa-folder"></i> Penyimpanan Lokal</div>
                </div>
            `;
            card.addEventListener('click', () => {
                document.dispatchEvent(new CustomEvent('app:play-url', {
                    detail: { title: video.title, isLocal: true, fileHandle: video.fileHandle, thumbnail: video.thumbnail }
                }));
            });
        } 
        // ==========================================
        // 2. KARTU CHANNEL YOUTUBE (DENGAN FALLBACK AVATAR)
        // ==========================================
        else if (video.type === 'channel') {
            const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(video.title)}&background=333&color=fff`;
            card.innerHTML = `
                <div class="thumb-wrapper" style="width: 70px; height: 70px; flex-shrink: 0; margin-right: 15px;">
                    <img src="${video.image || fallbackAvatar}" 
                         onerror="this.onerror=null; this.src='${fallbackAvatar}';" 
                         class="video-thumb" 
                         style="border-radius: 50%; object-fit: cover; width: 100%; height: 100%;" 
                         alt="Channel Avatar" 
                         loading="lazy">
                </div>
                <div class="video-info" style="flex: 1; display: flex; flex-direction: column; justify-content: center;">
                    <div class="video-title" style="font-size: 15px; font-weight: 700;">${video.title}</div>
                    <div class="video-author" style="color: #1db954; font-size: 12px; margin-top: 4px;">
                        <i class="fa-solid fa-circle-check"></i> Channel YouTube
                    </div>
                </div>
            `;
            // Klik Channel: Muat daftar video dari channel tersebut
            card.addEventListener('click', () => {
                fetchPlaylistOrChannel(video.url);
            });
        }
        // ==========================================
        // 3. KARTU PLAYLIST YOUTUBE
        // ==========================================
        else if (video.type === 'playlist') {
            card.innerHTML = `
                <div class="thumb-wrapper" style="position: relative;">
                    <img src="${video.image || video.thumbnail}" class="video-thumb" alt="Playlist Thumbnail" loading="lazy">
                    <div style="position: absolute; right: 0; bottom: 0; top: 0; width: 40%; background: rgba(0,0,0,0.7); display: flex; flex-direction: column; justify-content: center; align-items: center; color: #fff;">
                        <i class="fa-solid fa-list-ul fa-lg"></i>
                        <span style="font-size: 10px; margin-top: 4px; font-weight: bold;">PLAYLIST</span>
                    </div>
                </div>
                <div class="video-info">
                    <div class="video-title">${video.title}</div>
                    <div class="video-author">${video.author.name} • Playlist</div>
                </div>
            `;
            // Klik Playlist: Muat daftar lagu dari playlist tersebut
            card.addEventListener('click', () => {
                fetchPlaylistOrChannel(video.url);
            });
        } 
        // ==========================================
        // 4. KARTU VIDEO BIASA (BISA DIPUTAR)
        // ==========================================
        else {
            card.innerHTML = `
                <div class="thumb-wrapper">
                    <img src="${video.image || video.thumbnail}" class="video-thumb" alt="Thumbnail" loading="lazy">
                    <div class="play-overlay">▶</div>
                </div>
                <div class="video-info">
                    <div class="video-title">${video.title}</div>
                    <div class="video-author">${video.author.name} • ${video.timestamp}</div>
                </div>
            `;
            card.addEventListener('click', () => {
                document.dispatchEvent(new CustomEvent('app:play-url', {
                    detail: { url: video.url, thumbnail: video.image || video.thumbnail, title: video.title }
                }));
            });
        }

        searchResults.appendChild(card);
    });

    // SISTEM PAGINASI
    const isLocalMode = videos.length > 0 && videos[0].isLocal;
    if (videos.length > 0 && !isLocalMode) {
        const currentPage = parseInt(sessionStorage.getItem('yt_current_page')) || 1;
        const lastKeyword = sessionStorage.getItem('yt_last_search_keyword') || "";
        const paginationWrapper = document.createElement('div');
        paginationWrapper.style.cssText = "display: flex; justify-content: center; align-items: center; gap: 20px; margin-top: 30px; padding-bottom: 30px;";

        const btnPrev = document.createElement('button');
        btnPrev.className = 'btn-control';
        btnPrev.innerHTML = '<i class="fa-solid fa-chevron-left"></i> Prev Page';
        if (currentPage === 1) {
            btnPrev.style.opacity = "0.4"; btnPrev.style.cursor = "not-allowed";
        } else {
            btnPrev.onclick = () => { executeSearch(lastKeyword, currentPage - 1, false); window.scrollTo({ top: 0, behavior: 'smooth' }); };
        }

        const pageText = document.createElement('span');
        pageText.style.cssText = "color: #fff; font-size: 14px; font-weight: bold;";
        pageText.innerText = `Page ${currentPage}`;

        const btnNext = document.createElement('button');
        btnNext.className = 'btn-control';
        btnNext.innerHTML = 'Next Page <i class="fa-solid fa-chevron-right"></i>';
        btnNext.onclick = () => { executeSearch(lastKeyword, currentPage + 1, false); window.scrollTo({ top: 0, behavior: 'smooth' }); };

        paginationWrapper.appendChild(btnPrev);
        paginationWrapper.appendChild(pageText);
        paginationWrapper.appendChild(btnNext);
        searchResults.appendChild(paginationWrapper);
    }
};

// HELPER: Fetch Playlist / Channel Isi Video
const fetchPlaylistOrChannel = async (targetUrl) => {
    searchStatus.innerText = "Membuka isi playlist / channel...";
    searchResults.innerHTML = "";

    try {
        const res = await fetch(`/playlist?url=${encodeURIComponent(targetUrl)}`);
        if (!res.ok) throw new Error("Gagal memuat playlist");
        const videos = await res.json();
        
        // Tandai tiap item sebagai video agar dapat diputar
        const formattedVideos = videos.map(v => ({ ...v, type: 'video' }));
        renderVideoList(formattedVideos);
    } catch (err) {
        searchStatus.innerText = "Gagal memuat isi playlist / channel.";
    }
};

// FUNGSI UTAMA: Eksekutor Pencari Data
export const executeSearch = async (keyword = "", page = 1, autoPlayAction = false) => {
    searchStatus.innerText = `Memuat halaman ${page}...`;
    searchResults.innerHTML = "";

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
        const url = keyword ? `/search?q=${encodeURIComponent(keyword)}&page=${page}` : `/trending?page=${page}`;
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

        if (autoPlayAction && videos.length > 0) {
            setTimeout(() => {
                const cards = searchResults.querySelectorAll('.video-card');
                if (autoPlayAction === 'first' && cards.length > 0) cards[0].click();
                else if (autoPlayAction === 'last' && cards.length > 0) cards[cards.length - 1].click();
            }, 800);
        }
    } catch (err) {
        searchStatus.innerText = "Gagal mengambil data dari server.";
        searchResults.innerHTML = "";
    }
};
