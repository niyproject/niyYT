import './Mixing.css';

function makeDistortionCurve(amount) {
    let k = amount, n = 44100, curve = new Float32Array(n), deg = Math.PI/180;
    for (let i = 0; i < n; ++i) {
        let x = i * 2 / n - 1;
        curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
    }
    return curve;
}

export function initDistortion(audioCtx, inputNode, containerId) {
    const savedDist = localStorage.getItem('audio_dist') || '0';

    document.getElementById(containerId).innerHTML = `
        <div class="track">
            <label><span>Distortion (Fuzz)</span> <span id="valDist">${savedDist} %</span></label>
            <input type="range" class="horizontal" id="slDist" min="0" max="100" value="${savedDist}">
        </div>
    `;

    const distNode = audioCtx.createWaveShaper();
    distNode.curve = makeDistortionCurve(parseFloat(savedDist) * 4);
    
    inputNode.connect(distNode);

    document.getElementById('slDist').addEventListener('input', (e) => {
        let val = parseFloat(e.target.value);
        distNode.curve = makeDistortionCurve(val * 4);
        document.getElementById('valDist').innerText = val + " %";
        localStorage.setItem('audio_dist', val);
    });

    return distNode;
}
