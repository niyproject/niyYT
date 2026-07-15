export function initEchoDelay(audioCtx, inputNode, containerId) {
    const savedEcho = localStorage.getItem('audio_echo') || '0';

    document.getElementById(containerId).innerHTML = `
        <div class="track">
            <label><span>Echo Feedback (Analog Tape)</span> <span id="valDelay">${savedEcho} %</span></label>
            <input type="range" class="horizontal" id="slDelay" min="0" max="80" value="${savedEcho}">
        </div>
    `;

    // Bikin ujung colokan output dari pedal Echo ini
    const pedalOutput = audioCtx.createGain();

    // Jalur 1: Bypass (Suara asli langsung tembus ke output)
    inputNode.connect(pedalOutput);

    // Audio Engine: Efek
    const echoDelayNode = audioCtx.createDelay(2.0);
    echoDelayNode.delayTime.value = 0.4; // Jeda pantulan 400ms
    
    const echoFilter = audioCtx.createBiquadFilter();
    echoFilter.type = 'lowpass';
    echoFilter.frequency.value = 2000;

    const feedbackGain = audioCtx.createGain();
    const wetGain = audioCtx.createGain();

    // Set nilai awal dari memory
    let initialVal = parseFloat(savedEcho);
    feedbackGain.gain.value = initialVal / 100;
    wetGain.gain.value = initialVal === 0 ? 0 : (initialVal / 100) + 0.2;

    // Routing Internal (Jalur 2: Suara mantul)
    inputNode.connect(echoDelayNode);
    echoDelayNode.connect(echoFilter);
    echoFilter.connect(feedbackGain);
    feedbackGain.connect(echoDelayNode);
    
    // Hasil pantulan digabung ke colokan output pedal
    echoDelayNode.connect(wetGain);
    wetGain.connect(pedalOutput); 

    // UI Events
    document.getElementById('slDelay').addEventListener('input', (e) => {
        let val = parseFloat(e.target.value);
        feedbackGain.gain.value = val / 100;
        wetGain.gain.value = val == 0 ? 0 : (val / 100) + 0.2;
        
        document.getElementById('valDelay').innerText = val + " %";
        localStorage.setItem('audio_echo', val);
    });

    // Kembalikan colokan output-nya untuk dioper ke speaker
    return pedalOutput;
}
