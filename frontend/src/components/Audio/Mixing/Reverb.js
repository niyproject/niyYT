import './Mixing.css';

// ==========================================
// FUNGSI 1: MURNI MENGGAMBAR UI
// ==========================================
export function renderReverbUI(containerId) {
    const savedTime = localStorage.getItem('audio_reverb_time') || '2.5';
    const savedMix = localStorage.getItem('audio_reverb_mix') || '25';

    document.getElementById(containerId).innerHTML = `
        <div class="track" style="border-left: 4px solid #ff007f; padding-left: 10px;">
            <h4 style="margin:0 0 10px 0; color:#ff007f;">True Reverb (Gema Ruangan)</h4>
            <label><span>Ukuran Ruangan (Decay)</span> <span id="valRevTime">${savedTime} dtk</span></label>
            <input type="range" class="horizontal" id="slRevTime" min="1" max="5" step="0.5" value="${savedTime}">

            <label style="margin-top:10px;"><span>Tingkat Basah (Mix)</span> <span id="valRevMix">${savedMix} %</span></label>
            <input type="range" class="horizontal" id="slRevMix" min="0" max="100" value="${savedMix}">
        </div>
    `;

    document.getElementById('slRevTime').addEventListener('change', (e) => {
        const val = parseFloat(e.target.value);
        localStorage.setItem('audio_reverb_time', val);
        document.dispatchEvent(new CustomEvent('audio:reverb-time-changed', { detail: { value: val } }));
    });

    document.getElementById('slRevTime').addEventListener('input', (e) => {
        document.getElementById('valRevTime').innerText = e.target.value + " dtk";
    });

    document.getElementById('slRevMix').addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        document.getElementById('valRevMix').innerText = val + " %";
        localStorage.setItem('audio_reverb_mix', val);
        document.dispatchEvent(new CustomEvent('audio:reverb-mix-changed', { detail: { value: val } }));
    });
}

// ==========================================
// FUNGSI 2: MURNI MERAKIT AUDIO NODE
// ==========================================
export function initReverbNode(audioCtx, inputNode) {
    const savedTime = localStorage.getItem('audio_reverb_time') || '2.5';
    const savedMix = localStorage.getItem('audio_reverb_mix') || '25';

    const reverbOutput = audioCtx.createGain();
    const dryGain = audioCtx.createGain();
    const wetGain = audioCtx.createGain();
    const convolver = audioCtx.createConvolver();

    const generateImpulseResponse = (duration) => {
        const sampleRate = audioCtx.sampleRate;
        const length = sampleRate * duration;
        const impulse = audioCtx.createBuffer(2, length, sampleRate);
        const left = impulse.getChannelData(0);
        const right = impulse.getChannelData(1);

        for (let i = 0; i < length; i++) {
            const decay = Math.exp(-i / (sampleRate * (duration / 3)));
            left[i] = (Math.random() * 2 - 1) * decay;
            right[i] = (Math.random() * 2 - 1) * decay;
        }
        return impulse;
    };

    convolver.buffer = generateImpulseResponse(parseFloat(savedTime));

    const setMix = (val) => {
        const wetPercent = val / 100;
        wetGain.gain.value = wetPercent;
        dryGain.gain.value = 1 - (wetPercent * 0.3);
    };
    setMix(parseFloat(savedMix));

    inputNode.connect(dryGain);
    dryGain.connect(reverbOutput);

    inputNode.connect(convolver);
    convolver.connect(wetGain);
    wetGain.connect(reverbOutput);

    // --- TERIMA SIGNAL EVENT DARI REMOTE UI ---
    document.addEventListener('audio:reverb-time-changed', (e) => {
        convolver.buffer = generateImpulseResponse(e.detail.value);
    });

    document.addEventListener('audio:reverb-mix-changed', (e) => {
        setMix(e.detail.value);
    });

    return reverbOutput;
}
