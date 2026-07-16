export function initReverbPedal(audioCtx, inputNode, containerId) {
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

    const pedalOutput = audioCtx.createGain();
    const dryGain = audioCtx.createGain();
    const wetGain = audioCtx.createGain();
    
    // Mesin pembuat ruangan
    const convolver = audioCtx.createConvolver();

    // Fungsi pencetak akustik ruangan virtual (White noise memudar)
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

    // Render ruangan awal
    convolver.buffer = generateImpulseResponse(parseFloat(savedTime));

    const setMix = (val) => {
        const wetPercent = val / 100;
        wetGain.gain.value = wetPercent;
        dryGain.gain.value = 1 - (wetPercent * 0.3); // Kurangi suara murni dikit biar gak balapan
    };
    setMix(parseFloat(savedMix));

    // Routing Kabel
    inputNode.connect(dryGain);
    dryGain.connect(pedalOutput);

    inputNode.connect(convolver);
    convolver.connect(wetGain);
    wetGain.connect(pedalOutput);

    // UI Events (Pakai 'change' biar browser HP gak berat generate IR terus-terusan pas digeser)
    document.getElementById('slRevTime').addEventListener('change', (e) => {
        const val = parseFloat(e.target.value);
        convolver.buffer = generateImpulseResponse(val);
        localStorage.setItem('audio_reverb_time', val);
    });
    
    document.getElementById('slRevTime').addEventListener('input', (e) => {
        document.getElementById('valRevTime').innerText = e.target.value + " dtk";
    });

    document.getElementById('slRevMix').addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        setMix(val);
        document.getElementById('valRevMix').innerText = val + " %";
        localStorage.setItem('audio_reverb_mix', val);
    });

    return pedalOutput;
}
