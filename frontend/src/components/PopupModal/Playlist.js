import './PopupModal.css';
import { renderVideoList } from '../Video/VideoList';

export function openPlaylistModal() {
    if (document.getElementById('modalPlaylist')) return;

    const modal = document.createElement('div');
    modal.id = 'modalPlaylist';
    modal.className = 'modal-overlay';
    
    modal.innerHTML = `
        <div class="modal-content">
            <span class="modal-close" id="closePlaylist">&times;</span>
            <h3 style="color: #000; margin-top: 0; margin-bottom: 15px; font-size: 16px; text-align: center;">Masukkan link playlist anda</h3>
            <form id="playlistForm" style="display: flex; flex-direction: column; gap: 15px;">
                <input type="text" id="playlistInput" placeholder="ex: https://www.youtube.com/playlist?list=..." style="padding: 12px 15px; border-radius: 20px; border: 1px solid #ccc; background: #e0e0e0; color: #333; outline: none; width: 100%; box-sizing: border-box; font-family: 'Poppins', sans-serif;">
                <button type="submit" style="background: #cc0000; color: white; border: none; padding: 10px 20px; border-radius: 20px; font-weight: bold; cursor: pointer; width: 50%; align-self: center; font-family: 'Poppins', sans-serif;">Submit</button>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    const destroyModal = () => modal.remove();

    modal.querySelector('#closePlaylist').addEventListener('click', destroyModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) destroyModal();
    });

    modal.querySelector('#playlistForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const playlistUrl = document.getElementById('playlistInput').value.trim();
        if(!playlistUrl) return;

        // Hancurkan modal setelah submit
        destroyModal();

        const searchStatus = document.getElementById('search-status');
        const searchResults = document.getElementById('search-results');
        
        searchStatus.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memuat daftar lagu playlist...';
        searchResults.innerHTML = "";

        try {
            const response = await fetch(`/playlist?url=${encodeURIComponent(playlistUrl)}`);
            if (!response.ok) throw new Error();
            
            const videos = await response.json();
            
            sessionStorage.setItem('yt_last_search_keyword', 'Custom Playlist');
            sessionStorage.setItem('yt_last_search_results', JSON.stringify(videos));
            sessionStorage.setItem('yt_current_page', 1);
            
            searchStatus.innerText = `Menampilkan ${videos.length} lagu dari playlist`;
            renderVideoList(videos);

        } catch (err) {
            console.error("Gagal load playlist:", err);
            searchStatus.innerText = "Gagal mengambil playlist bung. Pastikan link valid.";
            searchResults.innerHTML = "";
        }
    });
}
