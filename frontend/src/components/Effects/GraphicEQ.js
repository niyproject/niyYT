import './GraphicEQ.css';

const eqFrequencies = [
    25, 31, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630,
    800, 1000, 1250, 1600, 2000, 2500, 3150, 4000, 5000, 6300, 8000, 10000, 12500, 16000, 20000
];

export function initGraphicEQ(audioCtx, inputL, inputR, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = `
        <div class="eq-title">CH 1: LEFT (Kiri)</div><div class="eq-rack" id="eqContainerL"></div>
        <div class="eq-title">CH 2: RIGHT (Kanan)</div><div class="eq-rack" id="eqContainerR"></div>
    `;

    const createFilterChain = (channelInput, channelStr, rackId) => {
        let prevNode = channelInput;
        let lastNode;
        let html = "";
        
        const nodes = eqFrequencies.map((freq, index) => {
            const savedGain = localStorage.getItem(`audio_eq_${channelStr}_${index}`) || '0';
            let filter = audioCtx.createBiquadFilter();
            
            filter.type = (index === 0) ? "lowshelf" : (index === eqFrequencies.length - 1) ? "highshelf" : "peaking";
            filter.frequency.value = freq;
            filter.gain.value = parseInt(savedGain);
            if (filter.type === "peaking") filter.Q.value = 4.31;

            // Sambung seri: Output node sebelumnya -> Input node ini
            prevNode.connect(filter);
            prevNode = filter;
            lastNode = filter;

            // Buat HTML Slider
            let label = freq >= 1000 ? (freq/1000).toString().replace('.', 'k') + (freq%1000==0?'k':'') : freq;
            if(["1.2k", "1.6k", "2.5k", "3.1k", "6.3k", "12.5k"].includes(label)) {} // bypass lama
            
            html += `
                <div class="eq-band">
                    <span>${label}</span>
                    <input type="range" class="vertical-slider" id="eq_sl_${channelStr}_${index}" min="-15" max="15" value="${savedGain}" step="1">
                    <div class="eq-val" id="eq_val_${channelStr}_${index}">${savedGain > 0 ? '+'+savedGain : savedGain} dB</div>
                </div>`;
            return filter;
        });

        document.getElementById(rackId).innerHTML = html;

        // Pasang Listener
        eqFrequencies.forEach((_, index) => {
            document.getElementById(`eq_sl_${channelStr}_${index}`).addEventListener('input', (e) => {
                let dbVal = parseInt(e.target.value);
                nodes[index].gain.value = dbVal;
                document.getElementById(`eq_val_${channelStr}_${index}`).innerText = (dbVal > 0 ? "+" : "") + dbVal + " dB";
                localStorage.setItem(`audio_eq_${channelStr}_${index}`, dbVal);
            });
        });

        // Kembalikan node terakhir (ujung kabel setelah melewati 30 filter)
        return lastNode; 
    };

    const finalOutL = createFilterChain(inputL, 'L', 'eqContainerL');
    const finalOutR = createFilterChain(inputR, 'R', 'eqContainerR');

    return { outL: finalOutL, outR: finalOutR };
}
