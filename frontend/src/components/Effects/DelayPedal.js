export function initDelayPedal(audioCtx, inputL, inputR, containerId) {
    const savedL = localStorage.getItem('audio_delay_l') || '0';
    const savedR = localStorage.getItem('audio_delay_r') || '0';
    const savedLowCut = localStorage.getItem('audio_delay_lowcut') || '80'; 

    document.getElementById(containerId).innerHTML = `
        <div class="track">
            <label><span>Delay L (Kiri)</span> <span id="valDelayL">${savedL} ms</span></label>
            <input type="range" class="horizontal" id="slDelayL" min="0" max="50" value="${savedL}">

            <label style="margin-top:10px;"><span>Delay R (Kanan)</span> <span id="valDelayR">${savedR} ms</span></label>
            <input type="range" class="horizontal" id="slDelayR" min="0" max="50" value="${savedR}">
            
            <label style="margin-top:10px; color:#00C851;"><span>Bypass Sub (Crossover)</span> <span id="valDelayLowCut">${savedLowCut} Hz</span></label>
            <input type="range" class="horizontal" id="slDelayLowCut" min="20" max="600" value="${savedLowCut}">
        </div>
    `;

    // ==========================================
    // 1. TERMINAL OUTPUT UTAMA
    // ==========================================
    const outNodeL = audioCtx.createGain();
    const outNodeR = audioCtx.createGain();

    // ==========================================
    // 2. SAKLAR PINTAR (DETEKTOR DELAY)
    // ==========================================
    const directL = audioCtx.createGain(); directL.gain.value = savedL === '0' ? 1 : 0;
    const directR = audioCtx.createGain(); directR.gain.value = savedR === '0' ? 1 : 0;

    const crossL = audioCtx.createGain(); crossL.gain.value = savedL === '0' ? 0 : 1;
    const crossR = audioCtx.createGain(); crossR.gain.value = savedR === '0' ? 0 : 1;

    // ==========================================
    // 3. KOMPONEN FILTER (CASCADING -24 dB/Octave)
    // ==========================================
    const freq = parseFloat(savedLowCut);
    
    // --- Pembelah Bass Kiri (Lolos tanpa delay) ---
    const lpfL1 = audioCtx.createBiquadFilter(); lpfL1.type = 'lowpass'; lpfL1.frequency.value = freq;
    const lpfL2 = audioCtx.createBiquadFilter(); lpfL2.type = 'lowpass'; lpfL2.frequency.value = freq;
    
    // --- Pembelah Bass Kanan (Lolos tanpa delay) ---
    const lpfR1 = audioCtx.createBiquadFilter(); lpfR1.type = 'lowpass'; lpfR1.frequency.value = freq;
    const lpfR2 = audioCtx.createBiquadFilter(); lpfR2.type = 'lowpass'; lpfR2.frequency.value = freq;

    // --- Pembelah Treble Kiri (Masuk ke delay) ---
    const hpfL1 = audioCtx.createBiquadFilter(); hpfL1.type = 'highpass'; hpfL1.frequency.value = freq;
    const hpfL2 = audioCtx.createBiquadFilter(); hpfL2.type = 'highpass'; hpfL2.frequency.value = freq;
    
    // --- Pembelah Treble Kanan (Masuk ke delay) ---
    const hpfR1 = audioCtx.createBiquadFilter(); hpfR1.type = 'highpass'; hpfR1.frequency.value = freq;
    const hpfR2 = audioCtx.createBiquadFilter(); hpfR2.type = 'highpass'; hpfR2.frequency.value = freq;

    // --- Mesin Delay ---
    const delayL = audioCtx.createDelay(); delayL.delayTime.value = parseFloat(savedL) / 1000;
    const delayR = audioCtx.createDelay(); delayR.delayTime.value = parseFloat(savedR) / 1000;

    // ==========================================
    // 4. RAKIT KABEL (ROUTING BERUNTUN)
    // ==========================================
    
    // --- CHANNEL KIRI ---
    inputL.connect(directL); directL.connect(outNodeL); 

    inputL.connect(crossL); 
    crossL.connect(lpfL1); lpfL1.connect(lpfL2); lpfL2.connect(outNodeL); // Bass bypass tebing curam
    crossL.connect(hpfL1); hpfL1.connect(hpfL2); hpfL2.connect(delayL); delayL.connect(outNodeL); // Treble delay tebing curam

    // --- CHANNEL KANAN ---
    inputR.connect(directR); directR.connect(outNodeR); 

    inputR.connect(crossR); 
    crossR.connect(lpfR1); lpfR1.connect(lpfR2); lpfR2.connect(outNodeR); 
    crossR.connect(hpfR1); hpfR1.connect(hpfR2); hpfR2.connect(delayR); delayR.connect(outNodeR); 


    // ==========================================
    // 5. UI EVENTS (UPDATE 8 FILTER SEKALIGUS)
    // ==========================================
    document.getElementById('slDelayL').addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        delayL.delayTime.value = val / 1000;
        document.getElementById('valDelayL').innerText = val + " ms";
        localStorage.setItem('audio_delay_l', val);

        if (val === 0) {
            directL.gain.value = 1; crossL.gain.value = 0;
        } else {
            directL.gain.value = 0; crossL.gain.value = 1;
        }
    });

    document.getElementById('slDelayR').addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        delayR.delayTime.value = val / 1000;
        document.getElementById('valDelayR').innerText = val + " ms";
        localStorage.setItem('audio_delay_r', val);

        if (val === 0) {
            directR.gain.value = 1; crossR.gain.value = 0;
        } else {
            directR.gain.value = 0; crossR.gain.value = 1;
        }
    });

    document.getElementById('slDelayLowCut').addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        
        // Update frekuensi 8 node secara bersamaan
        lpfL1.frequency.value = lpfL2.frequency.value = val;
        lpfR1.frequency.value = lpfR2.frequency.value = val;
        hpfL1.frequency.value = hpfL2.frequency.value = val;
        hpfR1.frequency.value = hpfR2.frequency.value = val;

        document.getElementById('valDelayLowCut').innerText = val + " Hz";
        localStorage.setItem('audio_delay_lowcut', val);
    });

    return { outL: outNodeL, outR: outNodeR };
}
