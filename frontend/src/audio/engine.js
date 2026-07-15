export const eqFrequencies = [
    25, 31, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630,
    800, 1000, 1250, 1600, 2000, 2500, 3150, 4000, 5000, 6300, 8000, 10000, 12500, 16000, 20000
];

let audioCtx, sourceNode, distortionNode, echoDelayNode, feedbackGain, wetGain, echoFilter;
let splitter, merger, haasDelayL, haasDelayR, gainL, gainR;
let eqNodesL = [], eqNodesR = [];
let isSetup = false;

export function initAudioEngine(videoElement) {
    // Biar gak ke-trigger dua kali kalau user ngeklik berulang
    if (isSetup) return;

    // Inisialisasi AudioContext (Mesin Utama)
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    sourceNode = audioCtx.createMediaElementSource(videoElement);

    // Komponen Routing Utama
    splitter = audioCtx.createChannelSplitter(2);
    merger = audioCtx.createChannelMerger(2);
    haasDelayL = audioCtx.createDelay(); 
    haasDelayR = audioCtx.createDelay();
    gainL = audioCtx.createGain(); 
    gainR = audioCtx.createGain();

    // Inisialisasi 30 Filter Kiri & Kanan (Graphic EQ)
    const createFilters = () => eqFrequencies.map((freq, index) => {
        let filter = audioCtx.createBiquadFilter();
        // Ujung kiri lowpass, ujung kanan highpass, tengahnya peaking (bandpass)
        filter.type = (index === 0) ? "lowshelf" : (index === eqFrequencies.length - 1) ? "highshelf" : "peaking";
        filter.frequency.value = freq;
        filter.gain.value = 0; // Default flat 0 dB
        if (filter.type === "peaking") filter.Q.value = 4.31;
        return filter;
    });

    eqNodesL = createFilters();
    eqNodesR = createFilters();

    // Efek Distorsi (Fuzz)
    distortionNode = audioCtx.createWaveShaper();
    distortionNode.curve = makeDistortionCurve(0);

    // Efek Echo Delay (Analog Tape Style)
    echoDelayNode = audioCtx.createDelay(2.0);

    // 👇 TAMBAHKAN BARIS INI BUNG (Misal kita set pantulan tiap 400ms)
    echoDelayNode.delayTime.value = 0.4;

    feedbackGain = audioCtx.createGain();
    wetGain = audioCtx.createGain();
    feedbackGain.gain.value = 0;
    wetGain.gain.value = 0;

    // Filter peredam untuk Analog Delay (Rahasia suara pantulan "warm")
    echoFilter = audioCtx.createBiquadFilter();
    echoFilter.type = 'lowpass';
    echoFilter.frequency.value = 2000; // Frekuensi di atas 2kHz dipotong

    // ==========================================
    // ROUTING KABEL AUDIO (DUAL MONO)
    // ==========================================
    sourceNode.connect(splitter);

    // --- JALUR 1 (KIRI) ---
    splitter.connect(haasDelayL, 0);
    haasDelayL.connect(gainL);
    gainL.connect(eqNodesL[0]);
    for(let i = 0; i < eqNodesL.length - 1; i++) {
        eqNodesL[i].connect(eqNodesL[i+1]);
    }
    eqNodesL[eqNodesL.length - 1].connect(merger, 0, 0);

    // --- JALUR 2 (KANAN) ---
    splitter.connect(haasDelayR, 1);
    haasDelayR.connect(gainR);
    gainR.connect(eqNodesR[0]);
    for(let i = 0; i < eqNodesR.length - 1; i++) {
        eqNodesR[i].connect(eqNodesR[i+1]);
    }
    eqNodesR[eqNodesR.length - 1].connect(merger, 0, 1);

    // --- GABUNGAN & DISTORSI ---
    merger.connect(distortionNode);
    distortionNode.connect(audioCtx.destination); // Output bersih (Dry) ke speaker

    // --- JALUR ECHO (ANALOG TAPE STYLE) ---
    distortionNode.connect(echoDelayNode); // Cabang suara masuk ke delay
    
    // Looping Feedback (Pantulan)
    echoDelayNode.connect(echoFilter);     // 1. Suara delay masuk ke filter lowpass dulu
    echoFilter.connect(feedbackGain);      // 2. Setelah difilter, masuk ke gain (volume pantulan)
    feedbackGain.connect(echoDelayNode);   // 3. Dilempar balik ke delay (terjadi pengulangan)
    
    // Output basah (Wet) ke speaker
    echoDelayNode.connect(wetGain);
    wetGain.connect(audioCtx.destination);

    // Aktifkan pendengar event dari UI
    setupEventListeners();
    isSetup = true;
}

// Fungsi pembuat kurva distorsi
function makeDistortionCurve(amount) {
    let k = amount, n = 44100, curve = new Float32Array(n), deg = Math.PI/180;
    for (let i = 0; i < n; ++i) {
        let x = i * 2 / n - 1;
        curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
    }
    return curve;
}

// ==========================================
// PENDENGAR CUSTOM EVENTS DARI UI
// ==========================================
function setupEventListeners() {
    // Event Graphic EQ
    document.addEventListener('audio:eq-changed', (e) => {
        const { channel, index, value } = e.detail;
        if (channel === 'L' && eqNodesL[index]) eqNodesL[index].gain.value = value;
        if (channel === 'R' && eqNodesR[index]) eqNodesR[index].gain.value = value;
    });

    // Event Haas Delay Kiri & Kanan
    document.addEventListener('audio:delay-l-changed', (e) => { 
        haasDelayL.delayTime.value = e.detail.value / 1000; 
    });
    document.addEventListener('audio:delay-r-changed', (e) => { 
        haasDelayR.delayTime.value = e.detail.value / 1000; 
    });
    
    // Event Distorsi
    document.addEventListener('audio:distortion-changed', (e) => { 
        distortionNode.curve = makeDistortionCurve(e.detail.value * 4); 
    });

    // Event Panning
    document.addEventListener('audio:panning-changed', (e) => {
        let val = e.detail.value;
        gainL.gain.value = Math.min(1, 1 - val);
        gainR.gain.value = Math.min(1, 1 + val);
    });

    // Event Echo Delay (Mantul)
    document.addEventListener('audio:echo-changed', (e) => {
        feedbackGain.gain.value = e.detail.value / 100;
        wetGain.gain.value = e.detail.value == 0 ? 0 : (e.detail.value / 100) + 0.2;
    });
}
