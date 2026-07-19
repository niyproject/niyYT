// Import HANYA fungsi perakit Node dari masing-masing efek
import { initDelayNode } from './Mixing/Delay';
import { initPanningNode } from './Mixing/Panning';
import { initGraphicEQNode } from './Mixing/GraphicEQ';
import { initDistortionNode } from './Mixing/Distortion';
import { initEchoDelayNode } from './Mixing/EchoDelay';
import { initReverbNode } from './Mixing/Reverb';

export function initAudioRouting(audioCtx, sourceNode) {
    // 1. Pemisah Jalur (Splitter ke L & R)
    const splitter = audioCtx.createChannelSplitter(2);
    sourceNode.connect(splitter);

    // Bikin titik colokan awal biar gampang dioper
    const chL = audioCtx.createGain();
    const chR = audioCtx.createGain();
    splitter.connect(chL, 0);
    splitter.connect(chR, 1);

    // ==========================================
    // 2. ESTAFET KABEL (DAISY CHAIN) MURNI
    // (Perhatikan: Tidak ada lagi ID container string HTML di sini!)
    // ==========================================

    // A. Masuk ke Delay (Haas Effect)
    const delayOut = initDelayNode(audioCtx, chL, chR);

    // B. Masuk ke Panning
    const panOut = initPanningNode(audioCtx, delayOut.outL, delayOut.outR);

    // C. Masuk ke 30-Band Graphic EQ (Kiri & Kanan)
    const eqOut = initGraphicEQNode(audioCtx, panOut.outL, panOut.outR);

    // Penggabung Jalur (Merger L & R jadi Mono/Stereo Gabungan)
    const merger = audioCtx.createChannelMerger(2);
    eqOut.outL.connect(merger, 0, 0);
    eqOut.outR.connect(merger, 0, 1);

    // D. Masuk ke Distortion
    const distOut = initDistortionNode(audioCtx, merger);

    // E. Masuk ke Echo Ping-Pong
    const echoOut = initEchoDelayNode(audioCtx, distOut);

    // F. Masuk ke True Reverb (Tercelup Gema Ruangan)
    const finalOut = initReverbNode(audioCtx, echoOut);

    // 3. Output Akhir dicolok ke Speaker HP/Browser
    finalOut.connect(audioCtx.destination);
}
