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
    if (!audioCtx) return;
    spatialLfoNode = audioCtx.createOscillator();
    spatialLfoNode.type = 'sine';
    spatialLfoNode.frequency.setValueAtTime(pannerLfoSpeed, audioCtx.currentTime);
    const lfoGain = audioCtx.createGain();
    lfoGain.gain.setValueAtTime(400, audioCtx.currentTime); 
    spatialLfoNode.connect(lfoGain);
    lfoGain.connect(spaceFilterNode.frequency);
    spatialLfoNode.start();
}

function updateFilterFrequency() {
    if (!spaceFilterNode || !audioCtx) return;
    const targetCutoff = 300 + (filterDepthPercent / 100) * 4700;
    spaceFilterNode.frequency.setValueAtTime(targetCutoff, audioCtx.currentTime);
}

function updateWaveShaperCurve(amount) {
    if (!distortionNode) return;
    const k = typeof amount === 'number' ? amount : 40, n_samples = 44100, curve = new Float32Array(n_samples);
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

function updateSlidersUI() {
    document.getElementById('root-freq').value = rootFrequency;
    document.getElementById('root-val').innerText = rootFrequency;
    document.getElementById('hypnotic-detune').value = binauralDetuneHz;
    document.getElementById('detune-val').innerText = binauralDetuneHz.toFixed(2);
    document.getElementById('space-swirl').value = Math.round((pannerLfoSpeed / 2.0) * 100);
    document.getElementById('swirl-val').innerText = document.getElementById('space-swirl').value;
    document.getElementById('filter-cutoff').value = filterDepthPercent;
    document.getElementById('filter-val').innerText = filterDepthPercent;
    document.querySelector(`input[name="tuning-mode"][value="${currentTuningMode}"]`).checked = true;
    
    const subtitle = document.getElementById('scale-subtitle');
    subtitle.innerText = currentTuningMode === 'fibonacci' ? 
        "Mathematical audio synthesis based on the 13:8 Fibonacci Integer Proportions" : 
        "Mathematical audio synthesis based on the Golden Ratio interval (833.09 cents)";
    subtitle.style.color = currentTuningMode === 'fibonacci' ? "#a78bfa" : "#94a3b8";
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
            e.preventDefault(); e.stopPropagation();
            document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('selected'));
            currentKeyboardMode === 'toggle' ? toggleVoice(i) : voiceOn(i);
        });
        key.addEventListener('pointerup', (e) => { e.preventDefault(); if (currentKeyboardMode === 'touch') voiceOff(i); });
        key.addEventListener('pointerleave', (e) => { e.preventDefault(); if (currentKeyboardMode === 'touch') voiceOff(i); });
    });
}

function loadNeuroPreset(presetKey) {
    const preset = NEURO_PRESETS[presetKey]; if (!preset) return;
    if (!audioCtx) initAudio();
    clearAllTones(); 

    currentTuningMode = preset.tuningMode; rootFrequency = preset.rootFreq; binauralDetuneHz = preset.detune;
    filterDepthPercent = preset.filterDepth; pannerLfoSpeed = (preset.swirlSpeed / 100) * 2.0;

    updateFilterFrequency();
    if (spatialLfoNode && audioCtx) spatialLfoNode.frequency.setValueAtTime(pannerLfoSpeed, audioCtx.currentTime);

    updateSlidersUI(); updateKeyboardLabels();
    currentKeyboardMode = 'toggle';
    document.getElementById('keyboard-mode-title').innerText = "The Phi Keyboard Array (Toggle Mode)";
    document.querySelector('input[name="keyboard-mode"][value="toggle"]').checked = true;

    preset.chords.forEach(index => voiceOn(index));
    document.querySelectorAll('.preset-btn').forEach(btn => btn.dataset.preset === presetKey ? btn.classList.add('selected') : btn.classList.remove('selected'));
}

function toggleVoice(index) {
    if (!audioCtx) initAudio();
    activeVoices[index] ? voiceOff(index) : voiceOn(index);
}

function voiceOn(index) {
    if (!audioCtx) initAudio(); if (activeVoices[index]) return;
    const baseFreq = calculateGoldenFrequency(index, rootFrequency);
    
    const oscLeft = audioCtx.createOscillator(), oscRight = audioCtx.createOscillator();
    const pannerLeft = audioCtx.createStereoPanner(), pannerRight = audioCtx.createStereoPanner();
    const voiceGain = audioCtx.createGain();
    
    oscLeft.frequency.setValueAtTime(baseFreq, audioCtx.currentTime);
    pannerLeft.pan.setValueAtTime(-1.0, audioCtx.currentTime); 
    oscRight.frequency.setValueAtTime(baseFreq + binauralDetuneHz, audioCtx.currentTime);
    pannerRight.pan.setValueAtTime(1.0, audioCtx.currentTime); 

    voiceGain.gain.setValueAtTime(0, audioCtx.currentTime);
    voiceGain.gain.linearRampToValueAtTime(0.18, audioCtx.currentTime + 0.5);

    oscLeft.connect(pannerLeft); pannerLeft.connect(voiceGain);
    oscRight.connect(pannerRight); pannerRight.connect(voiceGain);
    voiceGain.connect(distortionNode);
    
    oscLeft.start(); oscRight.start();
    activeVoices[index] = { oscLeft, oscRight, voiceGain };
    updateKeyboardLabels();
}

function voiceOff(index) {
    const voice = activeVoices[index]; if (!voice) return;
    const now = audioCtx.currentTime;
    voice.voiceGain.gain.setValueAtTime(voice.voiceGain.gain.value, now);
    voice.voiceGain.gain.exponentialRampToValueAtTime(0.0001, now + releaseTime);
    voice.oscLeft.stop(now + releaseTime); voice.oscRight.stop(now + releaseTime);
    delete activeVoices[index];
    updateKeyboardLabels();
}

function clearAllTones() {
    Object.keys(activeVoices).forEach(index => voiceOff(index));
    document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('selected'));
}

// SAFE CHROMODYNAMIC ENVELOPING PHOTIC ENGINE
function drawSafeMandala() {
    const canvas = document.getElementById('mandala-canvas'); if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let angleOffset = 0, baseHue = 40;

    function render() {
        requestAnimationFrame(render);
        canvas.width = canvas.clientWidth * window.devicePixelRatio;
        canvas.height = canvas.clientHeight * window.devicePixelRatio;
        
        // ALPHA-BLENDED MOTION TRAILS: Generates the deep liquid afterglow
        ctx.fillStyle = 'rgba(17, 24, 39, 0.06)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const voiceCount = Object.keys(activeVoices).length;
        const centerX = canvas.width / 2, centerY = canvas.height / 2, maxRadius = Math.min(centerX, centerY) * 0.85;
        
        if (!photicVisualsEnabled || voiceCount === 0) {
            ctx.strokeStyle = '#334155'; ctx.lineWidth = 1 * window.devicePixelRatio;
            ctx.beginPath(); ctx.arc(centerX, centerY, maxRadius * 0.2, 0, Math.PI * 2); ctx.stroke();
            return;
        }

        const pulsePeriod = Date.now() * 0.001 * (binauralDetuneHz * Math.PI);
        baseHue = (baseHue + 0.06) % 360; angleOffset += 0.003;

        // Trace 8 Interwoven Color-Shifted Concentric Rings
        for (let ring = 1; ring <= 8; ring++) {
            const direction = ring % 2 === 0 ? 1 : -1;
            const expansionFactor = 0.6 + Math.sin(pulsePeriod + (ring * 0.4) * direction) * 0.2;
            const ringScale = (ring / 8) * maxRadius * expansionFactor;
            
            // Chromatic Dispersion via golden angles around the hue wheel
            const currentHue = Math.round((baseHue + (ring * 137.5)) % 360);
            const alphaValue = 0.12 + (Math.sin(pulsePeriod + ring) * 0.06);
            
            ctx.strokeStyle = `hsla(${currentHue}, 85%, 60%, ${alphaValue})`;
            ctx.lineWidth = (2.2 - (ring * 0.2)) * window.devicePixelRatio;
            
            ctx.beginPath();
            for (let i = 0; i <= 13; i++) {
                const angle = (i * (Math.PI * 2) / 13) + (angleOffset * direction * (1 + ring * 0.08));
                const r = ringScale * (1 + 0.15 * Math.sin(angle * PHI_CONSTANT));
                ctx.lineTo(centerX + Math.cos(angle) * r, centerY + Math.sin(angle) * r);
            }
            ctx.closePath(); ctx.stroke();
        }
    }
    render();
}

function drawOscilloscope() {
    const canvas = document.getElementById('oscilloscope'), canvasCtx = canvas.getContext('2d');
    const bufferLength = analyserNode.frequencyBinCount, dataArray = new Uint8Array(bufferLength);
    function render() {
        requestAnimationFrame(render); analyserNode.getByteTimeDomainData(dataArray);
        canvas.width = canvas.clientWidth * window.devicePixelRatio;
        canvas.height = canvas.clientHeight * window.devicePixelRatio;
        canvasCtx.fillStyle = '#111827'; canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
        canvasCtx.lineWidth = 2 * window.devicePixelRatio; canvasCtx.strokeStyle = '#fbbf24'; canvasCtx.beginPath();
        const sliceWidth = canvas.width / bufferLength; let x = 0;
        for (let i = 0; i < bufferLength; i++) {
            const y = ((dataArray[i] / 128.0) * canvas.height) / 2;
            i === 0 ? canvasCtx.moveTo(x, y) : canvasCtx.lineTo(x, y); x += sliceWidth;
        }
        canvasCtx.lineTo(canvas.width, canvas.height / 2); canvasCtx.stroke();
    }
    render();
}

// System Binders
document.getElementById('activation-overlay').addEventListener('pointerdown', (e) => {
    e.preventDefault(); initAudio(); initializeKeyboardListeners();
    document.getElementById('activation-overlay').style.opacity = '0';
    setTimeout(() => document.getElementById('activation-overlay').style.drop = 'none', 500);
    document.getElementById('activation-overlay').style.display = 'none';
});
document.getElementById('clear-btn').addEventListener('pointerdown', clearAllTones);
document.getElementById('photic-toggle').addEventListener('change', (e) => photicVisualsEnabled = e.target.checked);
document.getElementById('root-freq').addEventListener('input', (e) => { rootFrequency = parseFloat(e.target.value); document.getElementById('root-val').innerText = rootFrequency; updateKeyboardLabels(); });
document.getElementById('hypnotic-detune').addEventListener('input', (e) => {
    binauralDetuneHz = parseFloat(e.target.value); document.getElementById('detune-val').innerText = binauralDetuneHz.toFixed(2);
    Object.keys(activeVoices).forEach(i => activeVoices[i].oscRight.frequency.setValueAtTime(calculateGoldenFrequency(i, rootFrequency) + binauralDetuneHz, audioCtx.currentTime));
});
document.getElementById('space-swirl').addEventListener('input', (e) => { pannerLfoSpeed = (parseInt(e.target.value) / 100) * 2.0; document.getElementById('swirl-val').innerText = e.target.value; if (spatialLfoNode) spatialLfoNode.frequency.setValueAtTime(pannerLfoSpeed, audioCtx.currentTime); });
document.getElementById('filter-cutoff').addEventListener('input', (e) => { filterDepthPercent = parseInt(e.target.value); document.getElementById('filter-val').innerText = filterDepthPercent; updateFilterFrequency(); });
document.getElementById('warmth').addEventListener('input', (e) => { const val = parseInt(e.target.value); document.getElementById('warmth-val').innerText = val; updateWaveShaperCurve(val); });
document.getElementById('release').addEventListener('input', (e) => { releaseTime = parseFloat(e.target.value); document.getElementById('release-val').innerText = releaseTime.toFixed(1); });
document.getElementById('master-volume').addEventListener('input', (e) => { const val = parseInt(e.target.value) / 100; document.getElementById('volume-val').innerText = e.target.value; if (masterGainNode) masterGainNode.gain.setValueAtTime(val, audioCtx.currentTime); });
document.querySelectorAll('.preset-btn').forEach(btn => btn.addEventListener('pointerdown', () => loadNeuroPreset(btn.dataset.preset)));

updateKeyboardLabels();
