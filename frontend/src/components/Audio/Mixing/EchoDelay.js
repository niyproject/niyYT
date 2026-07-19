import './Mixing.css';

// ==========================================
// FUNGSI 1: MURNI MENGGAMBAR UI
// ==========================================
export function renderEchoDelayUI(containerId) {
    const savedTime = localStorage.getItem('audio_echo_time') || '250';
    const savedFeedback = localStorage.getItem('audio_echo_fb') || '40';

    document.getElementById(containerId).innerHTML = `
        <div class="track" style="border-left: 4px solid #00d2ff; padding-left: 10px; margin-bottom: 20px;">
            <h4 style="margin:0 0 10px 0; color:#00d2ff;">Stereo Echo</h4>
            <label><span>Jeda Pantulan (Time)</span> <span id="valEchoTime">${savedTime} ms</span></label>
            <input type="range" class="horizontal" id="slEchoTime" min="50" max="800" value="${savedTime}">

            <label style="margin-top:10px;"><span>Panjang Buntut & Volume</span> <span id="valEchoFb">${savedFeedback} %</span></label>
            <input type="range" class="horizontal" id="slEchoFb" min="0" max="90" value="${savedFeedback}">
        </div>
    `;

    document.getElementById('slEchoTime').addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        document.getElementById('valEchoTime').innerText = val + " ms";
        localStorage.setItem('audio_echo_time', val);
        document.dispatchEvent(new CustomEvent('audio:echo-time-changed', { detail: { value: val } }));
    });

    document.getElementById('slEchoFb').addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        document.getElementById('valEchoFb').innerText = val + " %";
        localStorage.setItem('audio_echo_fb', val);
        document.dispatchEvent(new CustomEvent('audio:echo-fb-changed', { detail: { value: val } }));
    });
}

// ==========================================
// FUNGSI 2: MURNI MERAKIT AUDIO NODE
// ==========================================
export function initEchoDelayNode(audioCtx, inputNode) {
    const savedTime = localStorage.getItem('audio_echo_time') || '250';
    const savedFeedback = localStorage.getItem('audio_echo_fb') || '40';

    const echoOutput = audioCtx.createGain();
    inputNode.connect(echoOutput);

    const wetGain = audioCtx.createGain();
    const splitter = audioCtx.createChannelSplitter(2);
    inputNode.connect(splitter);

    const delayL = audioCtx.createDelay(2.0);
    const delayR = audioCtx.createDelay(2.0);
    const fbGainL = audioCtx.createGain();
    const fbGainR = audioCtx.createGain();

    const timeInSec = parseFloat(savedTime) / 1000;
    delayL.delayTime.value = timeInSec;
    delayR.delayTime.value = timeInSec;

    const fbVal = parseFloat(savedFeedback);
    fbGainL.gain.value = fbVal / 100;
    fbGainR.gain.value = fbVal / 100;
    wetGain.gain.value = fbVal === 0 ? 0 : 0.8;

    splitter.connect(delayL, 0);
    delayL.connect(fbGainL);
    fbGainL.connect(delayL);

    splitter.connect(delayR, 1);
    delayR.connect(fbGainR);
    fbGainR.connect(delayR);

    const merger = audioCtx.createChannelMerger(2);
    delayL.connect(merger, 0, 0);
    delayR.connect(merger, 0, 1);

    merger.connect(wetGain);
    wetGain.connect(echoOutput);

    // --- TERIMA SIGNAL EVENT DARI REMOTE UI ---
    document.addEventListener('audio:echo-time-changed', (e) => {
        const timeSec = e.detail.value / 1000;
        delayL.delayTime.value = timeSec;
        delayR.delayTime.value = timeSec;
    });

    document.addEventListener('audio:echo-fb-changed', (e) => {
        const val = e.detail.value;
        fbGainL.gain.value = val / 100;
        fbGainR.gain.value = val / 100;
        wetGain.gain.value = val === 0 ? 0 : 0.8;
    });

    return echoOutput;
}
