import './Mixing.css';

export function initEchoDelay(audioCtx, inputNode, containerId) {
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

    // Terminal Output Akhir
    const echoOutput = audioCtx.createGain();

    // 1. Jalur Kering (Murni)
    inputNode.connect(echoOutput);

    // 2. Jalur Basah (Efek) - Pakai Keran Volume
    const wetGain = audioCtx.createGain();

    // Splitter untuk misahin kabel Kiri dan Kanan
    const splitter = audioCtx.createChannelSplitter(2);
    inputNode.connect(splitter);

    const delayL = audioCtx.createDelay(2.0);
    const delayR = audioCtx.createDelay(2.0);
    const fbGainL = audioCtx.createGain();
    const fbGainR = audioCtx.createGain();

    // Set nilai awal
    const timeInSec = parseFloat(savedTime) / 1000;
    delayL.delayTime.value = timeInSec;
    delayR.delayTime.value = timeInSec;

    const fbVal = parseFloat(savedFeedback);
    fbGainL.gain.value = fbVal / 100;
    fbGainR.gain.value = fbVal / 100;
    
    // Kunci Fix: Kalau memori nyimpan angka 0, matikan total suara efeknya
    wetGain.gain.value = fbVal === 0 ? 0 : 0.8; 

    // 3. Routing Kabel Stereo (Kiri di Kiri, Kanan di Kanan)
    splitter.connect(delayL, 0); // Sinyal Kiri masuk Delay Kiri
    delayL.connect(fbGainL);
    fbGainL.connect(delayL);

    splitter.connect(delayR, 1); // Sinyal Kanan masuk Delay Kanan
    delayR.connect(fbGainR);
    fbGainR.connect(delayR);

    // Merger untuk gabungin lagi Kiri dan Kanan sebelum masuk wetGain
    const merger = audioCtx.createChannelMerger(2);
    delayL.connect(merger, 0, 0);
    delayR.connect(merger, 0, 1);

    merger.connect(wetGain);
    wetGain.connect(echoOutput);

    // ==========================================
    // UI EVENTS
    // ==========================================
    document.getElementById('slEchoTime').addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        delayL.delayTime.value = val / 1000;
        delayR.delayTime.value = val / 1000;
        document.getElementById('valEchoTime').innerText = val + " ms";
        localStorage.setItem('audio_echo_time', val);
    });

    document.getElementById('slEchoFb').addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        fbGainL.gain.value = val / 100;
        fbGainR.gain.value = val / 100;

        // Kunci Fix: Kalau slider ditarik ke 0, putus keran suara efeknya total
        if (val === 0) {
            wetGain.gain.value = 0;
        } else {
            wetGain.gain.value = 0.8; // Volume normal efek
        }

        document.getElementById('valEchoFb').innerText = val + " %";
        localStorage.setItem('audio_echo_fb', val);
    });

    return echoOutput;
}
