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
    // 1. TERMINAL OUTPUT UTAMA (DENGAN HEADROOM)
    // ==========================================
    const outNodeL = audioCtx.createGain(); outNodeL.gain.value = 0.85; // Mencegah clipping digital
    const outNodeR = audioCtx.createGain(); outNodeR.gain.value = 0.85; 

    // ==========================================
    // 2. KOMPONEN FILTER (FASE & KURVA SEMPURNA)
    // ==========================================
    const freq = parseFloat(savedLowCut);

    // Pembalik Fase HPF (Linkwitz-Riley -24dB Correction)
    const invertHPFL = audioCtx.createGain(); invertHPFL.gain.value = -1;
    const invertHPFR = audioCtx.createGain(); invertHPFR.gain.value = -1;

    // Pembelah Bass Kiri & Kanan (Q disetel ke 0.707 agar respons datar/flat)
    const lpfL1 = audioCtx.createBiquadFilter(); lpfL1.type = 'lowpass'; lpfL1.frequency.value = freq; lpfL1.Q.value = 0.707;
    const lpfL2 = audioCtx.createBiquadFilter(); lpfL2.type = 'lowpass'; lpfL2.frequency.value = freq; lpfL2.Q.value = 0.707;
    const lpfR1 = audioCtx.createBiquadFilter(); lpfR1.type = 'lowpass'; lpfR1.frequency.value = freq; lpfR1.Q.value = 0.707;
    const lpfR2 = audioCtx.createBiquadFilter(); lpfR2.type = 'lowpass'; lpfR2.frequency.value = freq; lpfR2.Q.value = 0.707;

    // Pembelah Treble Kiri & Kanan (Q disetel ke 0.707 agar respons datar/flat)
    const hpfL1 = audioCtx.createBiquadFilter(); hpfL1.type = 'highpass'; hpfL1.frequency.value = freq; hpfL1.Q.value = 0.707;
    const hpfL2 = audioCtx.createBiquadFilter(); hpfL2.type = 'highpass'; hpfL2.frequency.value = freq; hpfL2.Q.value = 0.707;
    const hpfR1 = audioCtx.createBiquadFilter(); hpfR1.type = 'highpass'; hpfR1.frequency.value = freq; hpfR1.Q.value = 0.707;
    const hpfR2 = audioCtx.createBiquadFilter(); hpfR2.type = 'highpass'; hpfR2.frequency.value = freq; hpfR2.Q.value = 0.707;

    // ==========================================
    // 3. MESIN DELAY MURNI
    // ==========================================
    const delayL = audioCtx.createDelay(); delayL.delayTime.value = parseFloat(savedL) / 1000;
    const delayR = audioCtx.createDelay(); delayR.delayTime.value = parseFloat(savedR) / 1000;

    // ==========================================
    // 4. RAKIT KABEL (LOGIKAL & LINIER)
    // ==========================================

    // --- JALUR KIRI ---
    // Bass (LPF) -> Langsung ke output
    inputL.connect(lpfL1); lpfL1.connect(lpfL2); lpfL2.connect(outNodeL);

    // Treble (HPF) -> Pembalik Fase -> Filter -> Delay -> Output
    inputL.connect(invertHPFL); 
    invertHPFL.connect(hpfL1); hpfL1.connect(hpfL2); 
    hpfL2.connect(delayL); 
    delayL.connect(outNodeL);

    // --- JALUR KANAN ---
    // Bass (LPF) -> Langsung ke output
    inputR.connect(lpfR1); lpfR1.connect(lpfR2); lpfR2.connect(outNodeR);

    // Treble (HPF) -> Pembalik Fase -> Filter -> Delay -> Output
    inputR.connect(invertHPFR); 
    invertHPFR.connect(hpfR1); hpfR1.connect(hpfR2); 
    hpfR2.connect(delayR); 
    delayR.connect(outNodeR);


    // ==========================================
    // 5. UI EVENTS
    // ==========================================
    document.getElementById('slDelayL').addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        delayL.delayTime.value = val / 1000;
        document.getElementById('valDelayL').innerText = val + " ms";
        localStorage.setItem('audio_delay_l', val);
    });

    document.getElementById('slDelayR').addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        delayR.delayTime.value = val / 1000;
        document.getElementById('valDelayR').innerText = val + " ms";
        localStorage.setItem('audio_delay_r', val);
    });

    document.getElementById('slDelayLowCut').addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);

        // Update frekuensi ke-8 node filter secara real-time
        lpfL1.frequency.value = lpfL2.frequency.value = val;
        lpfR1.frequency.value = lpfR2.frequency.value = val;
        hpfL1.frequency.value = hpfL2.frequency.value = val;
        hpfR1.frequency.value = hpfR2.frequency.value = val;

        document.getElementById('valDelayLowCut').innerText = val + " Hz";
        localStorage.setItem('audio_delay_lowcut', val);
    });

    return { outL: outNodeL, outR: outNodeR };
}
