import './Mixing.css';

function makeDistortionCurve(amount) {
    let k = amount, n = 44100, curve = new Float32Array(n), deg = Math.PI/180;
    for (let i = 0; i < n; ++i) {
        let x = i * 2 / n - 1;
        curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
    }
    return curve;
}

// ==========================================
// FUNGSI 1: MURNI MENGGAMBAR UI
// ==========================================
export function renderDistortionUI(containerId) {
    const savedDist = localStorage.getItem('audio_dist') || '0';

    document.getElementById(containerId).innerHTML = `
        <div class="track">
            <label><span>Distortion (Fuzz)</span> <span id="valDist">${savedDist} %</span></label>
            <input type="range" class="horizontal" id="slDist" min="0" max="100" value="${savedDist}">
        </div>
    `;

    document.getElementById('slDist').addEventListener('input', (e) => {
        let val = parseFloat(e.target.value);
        document.getElementById('valDist').innerText = val + " %";
        localStorage.setItem('audio_dist', val);
        document.dispatchEvent(new CustomEvent('audio:distortion-changed', { detail: { value: val } }));
    });
}

// ==========================================
// FUNGSI 2: MURNI MERAKIT AUDIO NODE
// ==========================================
export function initDistortionNode(audioCtx, inputNode) {
    const savedDist = localStorage.getItem('audio_dist') || '0';

    const distNode = audioCtx.createWaveShaper();
    distNode.curve = makeDistortionCurve(parseFloat(savedDist) * 4);

    inputNode.connect(distNode);

    document.addEventListener('audio:distortion-changed', (e) => {
        distNode.curve = makeDistortionCurve(e.detail.value * 4);
    });

    return distNode;
}
