import './VideoPlayer.css';
import { fetchDirectUrl } from '../../api/youtube';

let playUrlHandler = null;

export function renderVideoPlayer(containerId, onVideoReady) {
    const container = document.getElementById(containerId);

    // Suntikkan HTML Player Murni
    container.innerHTML = `
        <div class="video-container" id="vidContainer" style="display:none; padding: 15px; background: #1a1a1a; border-radius: 12px; margin-bottom: 20px;">
            <div id="topHeaderBar" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding: 0 5px;">
                <div id="videoTitleDisplay" style="color: #fff; font-size: 15px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-right: 15px; font-family: 'Poppins', sans-serif;">
                    Pilih lagu di bawah...
                </div>
                <div id="statusIconDisplay" style="color: #fff; font-size: 18px; flex-shrink: 0; cursor: pointer;">
                    <i class="fa-solid fa-music"></i>
                </div>
            </div>

            <div class="video-wrapper">
                <div id="playerWrapper" style="position: relative; width: 100%; border-radius: 8px; overflow: hidden; background: #000; aspect-ratio: 16/9;">
                    <video id="mainPlayer" crossorigin="anonymous" playsinline style="width:100%; height: 100%; display: block;"></video>
                    <div id="thumbOverlay" style="display: none; position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 10; background-color: #000; cursor: pointer;">
                        <img id="overlayImage" src="" style="width: 100%; height: 100%; object-fit: cover; opacity: 0.5;">
                        <div id="overlaySpinner" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); display: none;">
                            <div class="loading-spinner"></div>
                        </div>
                        <div id="overlayErrorText" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); display: none; color: white; font-size: 20px; font-weight: bold; text-align: center; width: 90%;">
                            Video tidak dapat diputar!
                        </div>
                        <div id="overlayStandbyPlay" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 60px; color: rgba(255,0,0,0.8); display: none;">
                            <i class="fa-solid fa-circle-play"></i>
                        </div>
                    </div>
                </div>

                <div class="custom-controls" style="margin-top: 15px;">
                    <div class="progress-area" style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
                        <span id="currentTimeDisplay" style="color: #fff; font-size: 12px; font-family: 'Poppins', sans-serif;">00:00</span>
                        <input type="range" id="progressBar" min="0" max="100" value="0" style="flex: 1; cursor: pointer; accent-color: #ff0000; height: 4px; border-radius: 2px; outline: none;">
                        <span id="durationDisplay" style="color: #fff; font-size: 12px; font-family: 'Poppins', sans-serif;">00:00</span>
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
                            <button class="ctrl-btn" id="btnToggleAudio" title="Mode Audio Only"><i class="fa-brands fa-itunes"></i></button>
                            <button class="ctrl-btn" id="btnPip" title="Picture in Picture"><i class="fa-solid fa-clone"></i></button>
                            <button class="ctrl-btn" id="btnFullscreen" title="Fullscreen"><i class="fa-solid fa-expand"></i></button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- LAYOUT MINI PLAYER (AUDIO MODE) -->
            <div id="miniPlayerLayout" class="mini-player-layout">
                <img id="miniPlayerThumb" src="" alt="Thumb" class="mini-thumb">
                <div class="mini-right-content">
                    <div class="mini-top-row">
                        <div id="miniVideoTitle" style="color: #fff; font-size: 14px; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 85%;">Loading...</div>
                        <div id="btnMiniClose" style="color: #aaa; cursor: pointer; font-size: 16px;"><i class="fa-solid fa-xmark"></i></div>
                    </div>
                    <div class="mini-controls-row">
                        <button class="ctrl-btn" id="btnMiniPrev" style="font-size: 12px;"><i class="fa-solid fa-backward-step"></i></button>
                        <button class="ctrl-btn" id="btnMiniRewind" style="font-size: 12px;"><i class="fa-solid fa-backward"></i></button>
                        <button class="ctrl-btn play-btn" id="btnMiniPlay" style="font-size: 14px; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center;"><i class="fa-solid fa-play"></i></button>
                        <button class="ctrl-btn" id="btnMiniForward" style="font-size: 12px;"><i class="fa-solid fa-forward"></i></button>
                        <button class="ctrl-btn" id="btnMiniNext" style="font-size: 12px;"><i class="fa-solid fa-forward-step"></i></button>
                        <button class="ctrl-btn" id="btnToggleVideo" style="margin-left: auto; color: #1db954;" title="Mode Video"><i class="fa-solid fa-film"></i></button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Ambil semua elemen DOM dari HTML di atas
    const videoTitleDisplay = document.getElementById('videoTitleDisplay');
    const statusIconDisplay = document.getElementById('statusIconDisplay');
    const overlayErrorText = document.getElementById('overlayErrorText');
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

    const btnToggleAudio = document.getElementById('btnToggleAudio');
    const btnToggleVideo = document.getElementById('btnToggleVideo');
    const miniPlayerThumb = document.getElementById('miniPlayerThumb');
    const miniVideoTitle = document.getElementById('miniVideoTitle');
    const btnMiniClose = document.getElementById('btnMiniClose');
    const btnMiniPlay = document.getElementById('btnMiniPlay');
    const btnMiniPrev = document.getElementById('btnMiniPrev');
    const btnMiniNext = document.getElementById('btnMiniNext');
    const btnMiniRewind = document.getElementById('btnMiniRewind');
    const btnMiniForward = document.getElementById('btnMiniForward');

    let stallTimer = null;
    let activeStreamUrl = null;
    let pendingResumeHandler = null;

    // Logika Overlay Manajemen
    const showOverlay = (mode, thumbUrl) => {
        if(thumbUrl) {
            overlayImage.src = thumbUrl;
            localStorage.setItem('yt_cached_thumb', thumbUrl);
        } else {
            overlayImage.src = localStorage.getItem('yt_cached_thumb') || '';
        }
        thumbOverlay.style.display = 'block';
        overlaySpinner.style.display = 'none';
        overlayStandbyPlay.style.display = 'none';
        if(overlayErrorText) overlayErrorText.style.display = 'none';

        if (mode === 'standby') {
            overlayImage.style.filter = 'none';
            overlayStandbyPlay.style.display = 'block';
        } else if (mode === 'error') {
            overlayImage.style.filter = 'blur(4px) brightness(0.5)';
            if(overlayErrorText) overlayErrorText.style.display = 'block';
        } else {
            overlayImage.style.filter = 'blur(2px) brightness(0.6)';
            overlaySpinner.style.display = 'block';
        }
    };
    const hideOverlay = () => { thumbOverlay.style.display = 'none'; };

    // Sakelar Mode Audio & Video
    btnToggleAudio.addEventListener('click', () => {
        vidContainer.classList.add('switching-mode');
        setTimeout(() => {
            miniPlayerThumb.src = localStorage.getItem('yt_cached_thumb') || '';
            miniVideoTitle.innerText = localStorage.getItem('yt_cached_title') || 'No Title';
            vidContainer.classList.add('mini-audio-mode');
            localStorage.setItem('yt_player_mode', 'audio');
            vidContainer.classList.remove('switching-mode');
        }, 300);
    });

    btnToggleVideo.addEventListener('click', () => {
        vidContainer.classList.add('switching-mode');
        setTimeout(() => {
            vidContainer.classList.remove('mini-audio-mode');
            localStorage.setItem('yt_player_mode', 'video');
            vidContainer.classList.remove('switching-mode');
        }, 300);
    });

    // Tombol Close Player
    const executeClosePlayer = () => {
        if (!statusIconDisplay.innerHTML.includes('fa-music')) {
            player.pause();
            player.removeAttribute('src');
            player.load();
            clearStallDetector();
            activeStreamUrl = null;
            localStorage.removeItem('yt_cached_url');
            localStorage.removeItem('yt_cached_title');
            localStorage.removeItem('yt_saved_time');
            videoTitleDisplay.innerText = "Pilih lagu di bawah...";
            statusIconDisplay.innerHTML = '<i class="fa-solid fa-music"></i>';
            hideOverlay();
            vidContainer.classList.remove('mini-audio-mode');
            document.dispatchEvent(new CustomEvent('app:play-url', { detail: { url: null } }));
            vidContainer.classList.add('closing');
            setTimeout(() => {
                vidContainer.style.display = 'none';
                vidContainer.classList.remove('closing');
            }, 350);
        }
    };
    statusIconDisplay.addEventListener('click', executeClosePlayer);
    btnMiniClose.addEventListener('click', executeClosePlayer);

    // Playback Logic & Seek
    player.addEventListener('play', () => {
        btnPlayPause.innerHTML = '<i class="fa-solid fa-pause"></i>';
        btnMiniPlay.innerHTML = '<i class="fa-solid fa-pause"></i>';
    });
    player.addEventListener('pause', () => {
        btnPlayPause.innerHTML = '<i class="fa-solid fa-play"></i>';
        btnMiniPlay.innerHTML = '<i class="fa-solid fa-play"></i>';
    });

    const togglePlayState = () => {
        const savedUrl = localStorage.getItem('yt_cached_url');
        if (!player.src || player.src === window.location.href || player.readyState === 0) {
            showOverlay('loading');
            if (savedUrl) loadAndPlayVideo(savedUrl);
            return;
        }
        if (player.paused) {
            player.play().then(() => hideOverlay()).catch(() => {
                showOverlay('loading');
                if (savedUrl) loadAndPlayVideo(savedUrl);
            });
        } else {
            player.pause();
        }
    };
    btnPlayPause.addEventListener('click', togglePlayState);
    btnMiniPlay.addEventListener('click', togglePlayState);

    const seekBackward = () => { if (player.duration) player.currentTime = Math.max(0, player.currentTime - 5); };
    const seekForward = () => { if (player.duration) player.currentTime = Math.min(player.duration, player.currentTime + 5); };
    document.getElementById('btnSeekBack').addEventListener('click', seekBackward);
    document.getElementById('btnSeekForward').addEventListener('click', seekForward);
    btnMiniRewind.addEventListener('click', seekBackward);
    btnMiniForward.addEventListener('click', seekForward);

    // Progress Bar Sync
    player.addEventListener('timeupdate', () => {
        progressBar.value = (player.currentTime / player.duration) * 100 || 0;
        const format = (sec) => {
            const m = Math.floor(sec / 60);
            const s = Math.floor(sec % 60);
            return `${m}:${s.toString().padStart(2, '0')}`;
        };
        currentTimeDisplay.innerText = format(player.currentTime);
        if(player.duration) durationDisplay.innerText = format(player.duration);
    });

    progressBar.addEventListener('input', (e) => {
        player.currentTime = (e.target.value / 100) * player.duration;
    });

    document.getElementById('btnNext').addEventListener('click', () => document.dispatchEvent(new CustomEvent('app:play-next')));
    document.getElementById('btnPrev').addEventListener('click', () => document.dispatchEvent(new CustomEvent('app:play-prev')));
    btnMiniNext.addEventListener('click', () => document.dispatchEvent(new CustomEvent('app:play-next')));
    btnMiniPrev.addEventListener('click', () => document.dispatchEvent(new CustomEvent('app:play-prev')));

    // Core Stream Loader
    const loadAndPlayVideo = async (url) => {
        vidContainer.style.display = "block";
        try {
            const data = await fetchDirectUrl(url);
            activeStreamUrl = `/stream-video?url=${encodeURIComponent(data.directUrl)}`;
            player.src = activeStreamUrl;
            player.controls = false;
            player.addEventListener('loadedmetadata', function onMeta() {
                const savedTime = localStorage.getItem('yt_saved_time');
                if (savedTime && parseFloat(savedTime) > 0) player.currentTime = parseFloat(savedTime);
                player.removeEventListener('loadedmetadata', onMeta);
            });
            await player.play();
            clearStallDetector();
        } catch (e) {
            showOverlay('standby');
            btnPlayPause.innerHTML = '<i class="fa-solid fa-play"></i>';
            btnMiniPlay.innerHTML = '<i class="fa-solid fa-play"></i>';
            statusIconDisplay.innerHTML = '<i class="fa-solid fa-music"></i>';
            btnMiniClose.innerHTML = '<i class="fa-solid fa-xmark"></i>';
        }
    };

    // Stall Detector Logic
    const startStallDetector = () => {
        clearStallDetector();
        stallTimer = setTimeout(() => {
            if (activeStreamUrl && !player.paused) {
                const lastTime = player.currentTime;
                localStorage.setItem('yt_saved_time', lastTime);
                player.pause();
                player.removeAttribute('src');
                player.load();
                player.src = activeStreamUrl;
                player.load();

                if (pendingResumeHandler) player.removeEventListener('loadedmetadata', pendingResumeHandler);
                pendingResumeHandler = function onResume() {
                    player.currentTime = lastTime;
                    player.play().catch(() => hideOverlay());
                    player.removeEventListener('loadedmetadata', pendingResumeHandler);
                    pendingResumeHandler = null;
                };
                player.addEventListener('loadedmetadata', pendingResumeHandler);
            }
        }, 6000);
    };

    const clearStallDetector = () => { if (stallTimer) { clearTimeout(stallTimer); stallTimer = null; } };

    // ==========================================
    // SINKRONISASI ICON MINI PLAYER DENGAN STATUS LAGU
    // ==========================================
    player.addEventListener('waiting', () => {
        statusIconDisplay.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
        btnMiniClose.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
        
        // 💡 FIX: TAMBAHKAN BARIS INI BUNG! 
        // Biar layar utama ditutup sama thumbnail ngeblur + animasi muter muter
        showOverlay('loading'); 
        
        startStallDetector();
    });

    player.addEventListener('playing', () => {
        statusIconDisplay.innerHTML = '<i class="fa-solid fa-xmark"></i>';
        btnMiniClose.innerHTML = '<i class="fa-solid fa-xmark"></i>';
        hideOverlay();
        clearStallDetector();
    });

    player.addEventListener('error', () => {
        const err = player.error;
        if (!err) return;

        const currentSrc = player.getAttribute('src');
        if (!currentSrc || currentSrc === '') return;

        if (err.code === 4) {
            statusIconDisplay.innerHTML = '<i class="fa-solid fa-triangle-exclamation" style="color: #ff4444;"></i>';
            btnMiniClose.innerHTML = '<i class="fa-solid fa-triangle-exclamation" style="color: #ff4444;"></i>';
            showOverlay('error');
        }
    });

    player.addEventListener('stalled', () => {
        // 💡 FIX: TAMBAHKAN DI SINI JUGA BIAR MAKIN AMAN
        showOverlay('loading');
        
        startStallDetector();
    });

    player.addEventListener('ended', () => document.dispatchEvent(new CustomEvent('app:play-next')));
    player.addEventListener('timeupdate', () => {
        if (player.currentTime > 0 && player.readyState >= 2 && !player.paused) {
            clearStallDetector();
            localStorage.setItem('yt_saved_time', player.currentTime);
        }
    });

    player.oncanplay = () => { hideOverlay(); onVideoReady(player); };

    thumbOverlay.addEventListener('click', () => {
        if (overlayStandbyPlay.style.display !== 'none') togglePlayState();
    });

    // Global Command Event Interceptor
    if (playUrlHandler) document.removeEventListener('app:play-url', playUrlHandler);
    playUrlHandler = async (e) => {
        const url = e.detail.url;
        const thumb = e.detail.thumbnail;
        const title = e.detail.title || 'Memuat stream...';
        const isLocal = e.detail.isLocal;
        const fileHandle = e.detail.fileHandle;

        if (activeStreamUrl && activeStreamUrl.startsWith('blob:')) URL.revokeObjectURL(activeStreamUrl);

        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: title,
                artist: isLocal ? 'Lagu Offline Lokal' : 'YT Audio Mixer',
                artwork: [{ src: thumb || 'https://via.placeholder.com/512', sizes: '512x512', type: 'image/jpeg' }]
            });
            navigator.mediaSession.setActionHandler('play', () => player.play());
            navigator.mediaSession.setActionHandler('pause', () => player.pause());
            navigator.mediaSession.setActionHandler('previoustrack', () => document.dispatchEvent(new CustomEvent('app:play-prev')));
            navigator.mediaSession.setActionHandler('nexttrack', () => document.dispatchEvent(new CustomEvent('app:play-next')));
        }

        // Jalur Lagu Lokal Luring
        if (isLocal && fileHandle) {
            vidContainer.style.display = "block";
            localStorage.setItem('yt_cached_title', title);
            localStorage.setItem('yt_cached_thumb', thumb);
            localStorage.setItem('yt_cached_url', title);
            videoTitleDisplay.innerText = title;
            miniVideoTitle.innerText = title;
            if(thumb) miniPlayerThumb.src = thumb;
            statusIconDisplay.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
            btnMiniClose.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
            showOverlay('loading', thumb);

            try {
                const file = await fileHandle.getFile();
                activeStreamUrl = URL.createObjectURL(file);
                player.src = activeStreamUrl;
                await player.play();
                clearStallDetector();
            } catch (err) { showOverlay('error'); }
            return;
        }

        if (!url) return;
        localStorage.setItem('yt_cached_title', title);
        videoTitleDisplay.innerText = title;
        miniVideoTitle.innerText = title;
        if(thumb) miniPlayerThumb.src = thumb;
        statusIconDisplay.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
        btnMiniClose.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
        showOverlay('loading', thumb);
        clearStallDetector();

        if (url !== localStorage.getItem('yt_cached_url')) {
            localStorage.setItem('yt_saved_time', '0');
            player.pause();
            player.currentTime = 0;
            player.removeAttribute('src');
            player.load();
        }
        localStorage.setItem('yt_cached_url', url);
        loadAndPlayVideo(url);
    };
    document.addEventListener('app:play-url', playUrlHandler);

    // Boot Restore Session Memory
    const savedUrl = localStorage.getItem('yt_cached_url');
    if (savedUrl) {
        videoTitleDisplay.innerText = localStorage.getItem('yt_cached_title') || '';
        miniVideoTitle.innerText = localStorage.getItem('yt_cached_title') || '';
        if (localStorage.getItem('yt_cached_thumb')) miniPlayerThumb.src = localStorage.getItem('yt_cached_thumb');
        vidContainer.style.display = "block";
        showOverlay('standby');
        if (localStorage.getItem('yt_player_mode') === 'audio') vidContainer.classList.add('mini-audio-mode');
    }

    // Utility Screen Actions
    document.getElementById('btnPip').addEventListener('click', async () => {
        if (document.pictureInPictureElement) await document.exitPictureInPicture();
        else await player.requestPictureInPicture().catch(() => {});
    });
    document.getElementById('btnFullscreen').addEventListener('click', async () => {
        if (document.fullscreenElement) await document.exitFullscreen();
        else await vidContainer.requestFullscreen().catch(() => {});
    });
    player.addEventListener('enterpictureinpicture', () => vidContainer.classList.add('is-pip'));
    player.addEventListener('leavepictureinpicture', () => vidContainer.classList.remove('is-pip'));
}
