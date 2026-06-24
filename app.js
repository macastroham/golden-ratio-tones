// Web Audio Context State Management
let audioCtx = null;
let masterGainNode = null;
let distortionNode = null;
let analyserNode = null;
let spaceFilterNode = null;
let spatialLfoNode = null;

// Audio Configuration Variables
let rootFrequency = 440.00;
let releaseTime = 4.5; 
let activeVoices = {}; 

// Hypnotic Parameter Variables
let binauralDetuneHz = 1.62; 
let pannerLfoSpeed = 0.3; 
let filterDepthPercent = 65;
let photicVisualsEnabled = true;

// Interaction and Tuning State Variables
let currentTuningMode = 'spiral'; 
let currentKeyboardMode = 'toggle'; 

// The Golden Scale Constants
const PHI_INTERVAL_CENTS = 833.0923;
const PHI_CONSTANT = 1.6180339887;

// Fibonacci 13:8 Progression Multipliers
const FIBONACCI_MULTIPLIERS = [
    1.0000, 1.6250, 1.3164, 1.0696, 1.7381, 1.4082, 1.1441, 
    1.8592, 1.5106, 1.2274, 1.9945, 1.6205, 1.3167
];

const NEURO_PRESETS = {
    alpha: { tuningMode: "fibonacci", rootFreq: 440, detune: 10.00, filterDepth: 75, swirlSpeed: 45, chords: [0, 4, 7, 11] },
    theta: { tuningMode: "spiral", rootFreq: 220, detune: 6.18, filterDepth: 45, swirlSpeed: 25, chords: [0, 3, 6, 9] },
    delta: { tuningMode: "spiral", rootFreq: 110, detune: 1.62, filterDepth: 25, swirlSpeed: 10, chords: [0, 5, 12] },
    ptsd: { tuningMode: "spiral", rootFreq: 110, detune: 4.50, filterDepth: 35, swirlSpeed: 15, chords: [0, 3, 7] },
    beta: { tuningMode: "fibonacci", rootFreq: 440, detune: 20.00, filterDepth: 85, swirlSpeed: 50, chords: [0, 2, 5, 9] },
    gamma: { tuningMode: "spiral", rootFreq: 220, detune: 40.00, filterDepth: 95, swirlSpeed: 70, chords: [0, 4, 12] }
};

function initAudio() {
    if (audioCtx) return; 
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContextClass();
    masterGainNode = audioCtx.createGain();
    masterGainNode.gain.setValueAtTime(0.7, audioCtx.currentTime);
    analyserNode = audioCtx.createAnalyser();
    analyserNode.fftSize = 2048;
    spaceFilterNode = audioCtx.createBiquadFilter();
    spaceFilterNode.type = 'lowpass';
    updateFilterFrequency();
    spaceFilterNode.Q.setValueAtTime(4.0, audioCtx.currentTime);
    distortionNode = audioCtx.createWaveShaper();
    updateWaveShaperCurve(40);
    setupSpatialLFO();
    distortionNode.connect(spaceFilterNode);
    spaceFilterNode.connect(masterGainNode);
    masterGainNode.connect(analyserNode);
    analyserNode.connect(audioCtx.destination);
    drawOscilloscope();
    drawSafeMandala();
}

function setupSpatialLFO() {
    spatialLfoNode = audioCtx.createOscillator();
    spatialLfoNode.frequency.setValueAtTime(pannerLfoSpeed, audioCtx.currentTime);
    const lfoGain = audioCtx.createGain();
    lfoGain.gain.setValueAtTime(400, audioCtx.currentTime); 
    spatialLfoNode.connect(lfoGain);
    lfoGain.connect(spaceFilterNode.frequency);
    spatialLfoNode.start();
}

function updateFilterFrequency() {
    if (!spaceFilterNode) return;
    const targetCutoff = 300 + (filterDepthPercent / 100) * 4700;
    spaceFilterNode.frequency.setValueAtTime(targetCutoff, audioCtx.currentTime);
}

function updateWaveShaperCurve(amount) {
    if (!distortionNode) return;
    const k = amount, n_samples = 44100, curve = new Float32Array(n_samples);
    for (let i = 0; i < n_samples; ++i) {
        const x = (i * 2) / n_samples - 1;
        curve[i] = (3 + k) * x * 20 * (Math.PI / 180) / (Math.PI + k * Math.abs(x));
    }
    distortionNode.value = curve;
}

function calculateGoldenFrequency(step, root) {
    if (currentTuningMode === 'fibonacci') return root * FIBONACCI_MULTIPLIERS[step];
    return root * Math.pow(2, ((step * PHI_INTERVAL_CENTS) % 1200) / 1200);
}

function updateKeyboardLabels() {
    document.querySelectorAll('.phi-key').forEach(key => {
        const i = parseInt(key.dataset.index);
        key.querySelector('.freq-label').innerText = `${calculateGoldenFrequency(i, rootFrequency).toFixed(1)}Hz`;
        activeVoices[i] ? key.classList.add('active') : key.classList.remove('active');
    });
}

function initializeKeyboardListeners() {
    document.querySelectorAll('.phi-key').forEach(key => {
        const i = parseInt(key.dataset.index);
        key.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('selected'));
            currentKeyboardMode === 'toggle' ? toggleVoice(i) : voiceOn(i);
        });
        key.addEventListener('pointerup', () => { if(currentKeyboardMode === 'touch') voiceOff(i); });
        key.addEventListener('pointerleave', () => { if(currentKeyboardMode === 'touch') voiceOff(i); });
    });
}

function loadNeuroPreset(presetKey) {
    const preset = NEURO_PRESETS[presetKey];
    if (!preset) return;
    if (!audioCtx) initAudio();
    clearAllTones(); 
    currentTuningMode = preset.tuningMode;
    rootFrequency = preset.rootFreq;
    binauralDetuneHz = preset.detune;
    filterDepthPercent = preset.filterDepth;
    pannerLfoSpeed = (preset.swirlSpeed / 100) * 2.0;
    updateFilterFrequency();
    if (spatialLfoNode) spatialLfoNode.frequency.setValueAtTime(pannerLfoSpeed, audioCtx.currentTime);
    
    document.getElementById('root-freq').value = rootFrequency;
    document.getElementById('root-val').innerText = rootFrequency;
    document.getElementById('hypnotic-detune').value = binauralDetuneHz;
    document.getElementById('detune-val').innerText = binauralDetuneHz.toFixed(2);
    document.querySelector(`input[name="tuning-mode"][value="${currentTuningMode}"]`).checked = true;

    currentKeyboardMode = 'toggle';
    document.querySelector('input[name="keyboard-mode"][value="toggle"]').checked = true;
    preset.chords.forEach(index => voiceOn(index));
    document.querySelectorAll('.preset-btn').forEach(btn => btn.dataset.preset === presetKey ? btn.classList.add('selected') : btn.classList.remove('selected'));
    updateKeyboardLabels();
}

function toggleVoice(index) {
    if (!audioCtx) initAudio();
    activeVoices[index] ? voiceOff(index) : voiceOn(index);
}

function voiceOn(index) {
    if (activeVoices[index]) return;
    const baseFreq = calculateGoldenFrequency(index, rootFrequency);
    const oscL = audioCtx.createOscillator(), oscR = audioCtx.createOscillator();
    const panL = audioCtx.createStereoPanner(), panR = audioCtx.createStereoPanner();
    const voiceG = audioCtx.createGain();
    
    oscL.frequency.value = baseFreq;
    oscR.frequency.value = baseFreq + binauralDetuneHz;
    panL.pan.value = -1; panR.pan.value = 1;
    voiceG.gain.setValueAtTime(0, audioCtx.currentTime);
    voiceG.gain.linearRampToValueAtTime(0.18, audioCtx.currentTime + 0.5);

    oscL.connect(panL); panL.connect(voiceG);
    oscR.connect(panR); panR.connect(voiceG);
    voiceG.connect(distortionNode);
    oscL.start(); oscR.start();
    activeVoices[index] = { oscL, oscR, voiceG };
    updateKeyboardLabels();
}

function voiceOff(index) {
    const v = activeVoices[index]; if (!v) return;
    const now = audioCtx.currentTime;
    v.voiceG.gain.setValueAtTime(v.voiceG.gain.value, now);
    v.voiceG.gain.exponentialRampToValueAtTime(0.0001, now + releaseTime);
    v.oscL.stop(now + releaseTime); v.oscR.stop(now + releaseTime);
    delete activeVoices[index];
    updateKeyboardLabels();
}

function clearAllTones() {
    Object.keys(activeVoices).forEach(i => voiceOff(i));
    document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('selected'));
}

// FIXED PHOTIC MANDALA ENGINE WITH REMAPPED CONSTANTS
function drawSafeMandala() {
    const canvas = document.getElementById('mandala-canvas'); if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let angleOffset = 0, baseHue = 0;

    function render() {
        requestAnimationFrame(render);
        canvas.width = canvas.clientWidth * window.devicePixelRatio;
        canvas.height = canvas.clientHeight * window.devicePixelRatio;
        
        // Soft liquid back-clear trail sweep
        ctx.fillStyle = 'rgba(13, 15, 18, 0.08)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const voiceCount = Object.keys(activeVoices).length;
        const centerX = canvas.width / 2, centerY = canvas.height / 2, maxR = Math.min(centerX, centerY) * 0.9;

        if (!photicVisualsEnabled || voiceCount === 0) {
            // Draw a neat dark gold resting anchor circle when no sound is running
            ctx.strokeStyle = 'rgba(251, 191, 36, 0.2)'; ctx.lineWidth = 1 * window.devicePixelRatio;
            ctx.beginPath(); ctx.arc(centerX, centerY, maxR * 0.2, 0, Math.PI * 2); ctx.stroke();
            return;
        }

        // FIXED: Explicitly referenced aligned parameter 'pulsePeriod' instead of unmapped 'pulse'
        const pulsePeriod = Date.now() * 0.001 * (binauralDetuneHz * Math.PI);
        baseHue = (baseHue + 0.1) % 360;
        angleOffset += 0.003;

        for (let ring = 1; ring <= 8; ring++) { 
            const dir = ring % 2 === 0 ? 1 : -1;
            const expand = 0.6 + Math.sin(pulsePeriod + ring * 0.5) * 0.2;
            const rScale = (ring / 8) * maxR * expand;
            const hue = (baseHue + (ring * 137.5)) % 360;
            
            ctx.strokeStyle = `hsla(${hue}, 80%, 60%, ${0.15 + (Math.sin(pulsePeriod + ring) * 0.05)})`;
            ctx.lineWidth = (2.5 - (ring * 0.2)) * window.devicePixelRatio;
            ctx.beginPath();
            for (let i = 0; i <= 13; i++) {
                const a = (i * (Math.PI * 2) / 13) + (angleOffset * dir * (1 + ring * 0.1));
                const r = rScale * (1 + 0.15 * Math.sin(a * PHI_CONSTANT));
                const x = centerX + Math.cos(a) * r;
                const y = centerY + Math.sin(a) * r;
                
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath(); ctx.stroke();
        }
    }
    render();
}

function drawOscilloscope() {
    const canvas = document.getElementById('oscilloscope'), ctx = canvas.getContext('2d');
    const buffer = analyserNode.frequencyBinCount, data = new Uint8Array(buffer);
    function render() {
        requestAnimationFrame(render);
        analyserNode.getByteTimeDomainData(data);
        canvas.width = canvas.clientWidth * window.devicePixelRatio;
        canvas.height = canvas.clientHeight * window.devicePixelRatio;
        ctx.fillStyle = '#111827'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.lineWidth = 2 * window.devicePixelRatio; ctx.strokeStyle = '#fbbf24';
        ctx.beginPath();
        const slice = canvas.width / buffer; let x = 0;
        for (let i = 0; i < buffer; i++) {
            const v = data[i] / 128.0, y = (v * canvas.height) / 2;
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); x += slice;
        }
        ctx.lineTo(canvas.width, canvas.height / 2); ctx.stroke();
    }
    render();
}

// DOM Interface Controllers
document.getElementById('activation-overlay').addEventListener('pointerdown', (e) => {
    e.preventDefault(); initAudio(); initializeKeyboardListeners();
    document.getElementById('activation-overlay').style.display = 'none';
});
document.getElementById('clear-btn').addEventListener('pointerdown', clearAllTones);
document.getElementById('photic-toggle').addEventListener('change', (e) => photicVisualsEnabled = e.target.checked);
document.querySelectorAll('.preset-btn').forEach(btn => btn.addEventListener('pointerdown', () => loadNeuroPreset(btn.dataset.preset)));
document.getElementById('root-freq').addEventListener('input', (e) => {
    rootFrequency = parseFloat(e.target.value);
    document.getElementById('root-val').innerText = rootFrequency;
    updateKeyboardLabels();
});
document.getElementById('hypnotic-detune').addEventListener('input', (e) => {
    binauralDetuneHz = parseFloat(e.target.value);
    document.getElementById('detune-val').innerText = binauralDetuneHz.toFixed(2);
});
document.getElementById('space-swirl').addEventListener('input', (e) => {
    pannerLfoSpeed = (parseInt(e.target.value) / 100) * 2.0;
    if (spatialLfoNode) spatialLfoNode.frequency.setValueAtTime(pannerLfoSpeed, audioCtx.currentTime);
    document.getElementById('swirl-val').innerText = e.target.value;
});
document.getElementById('filter-cutoff').addEventListener('input', (e) => {
    filterDepthPercent = parseInt(e.target.value);
    document.getElementById('filter-val').innerText = filterDepthPercent;
    updateFilterFrequency();
});
document.getElementById('warmth').addEventListener('input', (e) => {
    updateWaveShaperCurve(parseInt(e.target.value));
    document.getElementById('warmth-val').innerText = e.target.value;
});
document.getElementById('release').addEventListener('input', (e) => {
    releaseTime = parseFloat(e.target.value);
    document.getElementById('release-val').innerText = releaseTime.toFixed(1);
});
document.getElementById('master-volume').addEventListener('input', (e) => {
    const v = parseInt(e.target.value) / 100;
    if (masterGainNode) masterGainNode.gain.setValueAtTime(v, audioCtx.currentTime);
    document.getElementById('volume-val').innerText = e.target.value;
});

updateKeyboardLabels();
