export async function fetchDirectUrl(youtubeUrl) {
    // 💡 1. Baca status mode dari localStorage (default ke 'video')
    const currentMode = localStorage.getItem('yt_player_mode') || 'video';

    const response = await fetch('/get-direct-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // 💡 2. Sisipkan status mode ke dalam payload pengiriman
        body: JSON.stringify({ 
            url: youtubeUrl,
            mode: currentMode 
        })
    });
    if (!response.ok) throw new Error('Gagal mengekstrak URL');
    return await response.json();
}
