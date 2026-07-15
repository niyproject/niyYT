export function initDelayPedal(audioCtx, inputL, inputR, containerId) {
    const savedL = localStorage.getItem('audio_delay_l') || '0';
    const savedR = localStorage.getItem('audio_delay_r') || '0';

    document.getElementById(containerId).innerHTML = `
        <div class="track">
            <label><span>Delay L (Kiri)</span> <span id="valDelayL">${savedL} ms</span></label>
            <input type="range" class="horizontal" id="slDelayL" min="0" max="50" value="${savedL}">

            <label style="margin-top:10px;"><span>Delay R (Kanan)</span> <span id="valDelayR">${savedR} ms</span></label>
            <input type="range" class="horizontal" id="slDelayR" min="0" max="50" value="${savedR}">
        </div>
    `;

    // Audio Logic
    const haasDelayL = audioCtx.createDelay();
    const haasDelayR = audioCtx.createDelay();
    
    haasDelayL.delayTime.value = parseFloat(savedL) / 1000;
    haasDelayR.delayTime.value = parseFloat(savedR) / 1000;

    inputL.connect(haasDelayL);
    inputR.connect(haasDelayR);

    // UI Events
    document.getElementById('slDelayL').addEventListener('input', (e) => {
        haasDelayL.delayTime.value = e.target.value / 1000;
        document.getElementById('valDelayL').innerText = e.target.value + " ms";
        localStorage.setItem('audio_delay_l', e.target.value);
    });

    document.getElementById('slDelayR').addEventListener('input', (e) => {
        haasDelayR.delayTime.value = e.target.value / 1000;
        document.getElementById('valDelayR').innerText = e.target.value + " ms";
        localStorage.setItem('audio_delay_r', e.target.value);
    });

    // Return Ujung Kabelnya
    return { outL: haasDelayL, outR: haasDelayR };
}
