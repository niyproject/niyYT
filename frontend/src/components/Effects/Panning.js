export function initPanning(audioCtx, inputL, inputR, containerId) {
    const savedPan = localStorage.getItem('audio_pan') || '0';
    
    document.getElementById(containerId).innerHTML = `
        <div class="track">
            <label><span>Panning (L-R Hard Mute)</span> <span id="valPan">Tengah</span></label>
            <input type="range" class="horizontal" id="slPan" min="-1" max="1" step="0.1" value="${savedPan}">
        </div>
    `;

    const gainL = audioCtx.createGain();
    const gainR = audioCtx.createGain();
    
    const initialVal = parseFloat(savedPan);
    gainL.gain.value = Math.min(1, 1 - initialVal);
    gainR.gain.value = Math.min(1, 1 + initialVal);

    inputL.connect(gainL);
    inputR.connect(gainR);

    const updateLabel = (val) => {
        document.getElementById('valPan').innerText = val === 0 ? "Tengah" : (val < 0 ? "Kiri" : "Kanan");
    };
    updateLabel(initialVal);

    document.getElementById('slPan').addEventListener('input', (e) => {
        let val = parseFloat(e.target.value);
        gainL.gain.value = Math.min(1, 1 - val);
        gainR.gain.value = Math.min(1, 1 + val);
        updateLabel(val);
        localStorage.setItem('audio_pan', val);
    });

    return { outL: gainL, outR: gainR };
}
