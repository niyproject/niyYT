export async function fetchDirectUrl(youtubeUrl) {
    const response = await fetch('/get-direct-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: youtubeUrl })
    });
    if (!response.ok) throw new Error('Gagal mengekstrak URL');
    return await response.json();
}
