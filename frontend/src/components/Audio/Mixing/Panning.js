import './Mixing.css';

// ==========================================
// FUNGSI 1: MURNI MENGGAMBAR UI
// ==========================================
export function renderPanningUI(containerId) {
    const savedPan = localStorage.getItem('audio_pan') || '0';

    document.getElementById(containerId).innerHTML = `
        <div class="track">
            <label><span>Panning (L-R Hard Mute)</span> <span id="valPan">Tengah</span></label>
            <input type="range" class="horizontal" id="slPan" min="-1" max="1" step="0.1" value="${savedPan}">
        </div>
    `;

    const updateLabel = (val) => {
        document.getElementById('valPan').innerText = val === 0 ? "Tengah" : (val < 0 ? "Kiri" : "Kanan");
    };
    updateLabel(parseFloat(savedPan));

    document.getElementById('slPan').addEventListener('input', (e) => {
        let val = parseFloat(e.target.value);
        updateLabel(val);
        localStorage.setItem('audio_pan', val);
        document.dispatchEvent(new CustomEvent('audio:panning-changed', { detail: { value: val } }));
    });
}

// ==========================================
// FUNGSI 2: MURNI MERAKIT AUDIO NODE
// ==========================================
export function initPanningNode(audioCtx, inputL, inputR) {
    const savedPan = localStorage.getItem('audio_pan') || '0';
    const gainL = audioCtx.createGain();
    const gainR = audioCtx.createGain();

    const initialVal = parseFloat(savedPan);
    gainL.gain.value = Math.min(1, 1 - initialVal);
    gainR.gain.value = Math.min(1, 1 + initialVal);

    inputL.connect(gainL);
    inputR.connect(gainR);

    document.addEventListener('audio:panning-changed', (e) => {
        let val = e.detail.value;
        gainL.gain.value = Math.min(1, 1 - val);
        gainR.gain.value = Math.min(1, 1 + val);
    });

    return { outL: gainL, outR: gainR };
}
