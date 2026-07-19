import './PopupModal.css';

export function openAboutModal() {
    if (document.getElementById('modalAbout')) return;

    const modal = document.createElement('div');
    modal.id = 'modalAbout';
    modal.className = 'modal-overlay';

    modal.innerHTML = `
        <div class="modal-content" style="text-align: center;">
            <span class="modal-close" id="closeAbout">&times;</span>
            <div style="margin-bottom: 15px;">
                <!-- 💡 LOGO ASLI LU KEMBALI! -->
                <img src="/logo.png" alt="NiyYT Logo" style="width: 60px; height: 60px; object-fit: contain; border-radius: 12px;">
                <h2 style="color: #cc0000; margin: 10px 0 5px 0; font-size: 22px;">NiyYT</h2>
            </div>
            <p style="color: #333; font-size: 13px; line-height: 1.6; text-align: justify; margin-bottom: 15px;">
                <strong>NiyYT (YT Audio Mixer)</strong> adalah pemutar media cerdas yang dirancang untuk memberikan pengalaman kontrol audio tingkat lanjut layaknya studio profesional.<br><br>
                Dilengkapi dengan mesin <i>Digital Signal Processing</i> (DSP), aplikasi ini memungkinkan Anda mengatur efek suara seperti <i>Graphic Equalizer</i>, <i>Delay</i>, <i>Reverb</i>, dan <i>Distorsi</i> secara langsung. Dibangun untuk efisiensi maksimal, NiyYT mampu menghemat kuota dengan mengekstrak jalur audio murni, serta mendukung pemutaran fail lokal secara luring.
            </p>
            <div style="margin-top: 15px; font-size: 11px; color: #888; font-weight: 600;">
                Versi 1.0.0 &copy; 2026 NiyProject
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const destroyModal = () => modal.remove();

    modal.querySelector('#closeAbout').addEventListener('click', destroyModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) destroyModal();
    });
}
