// Import semua efek dari folder Mixing
import { initDelay } from './Mixing/Delay';
import { initPanning } from './Mixing/Panning';
import { initGraphicEQ } from './Mixing/GraphicEQ';
import { initDistortion } from './Mixing/Distortion';
import { initEchoDelay } from './Mixing/EchoDelay';
import { initReverb } from './Mixing/Reverb';

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
    // 2. ESTAFET KABEL (DAISY CHAIN)
    // ==========================================

    // A. Masuk ke Delay (Haas Effect)
    const delayOut = initDelay(audioCtx, chL, chR, 'delay-container');

    // B. Masuk ke Panning
    const panOut = initPanning(audioCtx, delayOut.outL, delayOut.outR, 'panning-container');

    // C. Masuk ke 30-Band Graphic EQ (Kiri & Kanan)
    const eqOut = initGraphicEQ(audioCtx, panOut.outL, panOut.outR, 'eq-container');

    // Penggabung Jalur (Merger L & R jadi Mono/Stereo Gabungan)
    const merger = audioCtx.createChannelMerger(2);
    eqOut.outL.connect(merger, 0, 0);
    eqOut.outR.connect(merger, 0, 1);

    // D. Masuk ke Distortion
    const distOut = initDistortion(audioCtx, merger, 'distortion-container');

    // E. Masuk ke Echo Ping-Pong
    const echoOut = initEchoDelay(audioCtx, distOut, 'echo-delay-container');

    // F. Masuk ke True Reverb (Tercelup Gema Ruangan)
    const finalOut = initReverb(audioCtx, echoOut, 'reverb-container');

    // 3. Output Akhir dicolok ke Speaker HP/Browser
    finalOut.connect(audioCtx.destination);
}
