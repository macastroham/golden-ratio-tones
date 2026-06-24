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

// Expanded Neurological Configuration Engine Array Matrix
const NEURO_PRESETS = {
    alpha: {
        name: "Alpha Flow",
        tuningMode: "fibonacci",
        rootFreq: 440,
        detune: 10.00,
        filterDepth: 75,
        swirlSpeed: 45,
        chords: [0, 4, 7, 11]
    },
    theta: {
        name: "Theta Trance",
        tuningMode: "spiral",
        rootFreq: 220, 
        detune: 6.18,  
        filterDepth: 45,
        swirlSpeed: 25,
        chords: [0, 3, 6, 9]  
    },
    delta: {
        name: "Deep Delta",
        tuningMode: "spiral",
        rootFreq: 110, 
        detune: 1.62,  
        filterDepth: 25, 
        swirlSpeed: 10,  
        chords: [0, 5, 12]
    },
    ptsd: {
        name: "Trauma Down-Reg",
        tuningMode: "spiral",
        rootFreq: 110, 
        detune: 4.50,  
        filterDepth: 35, 
        swirlSpeed: 15,  
        chords: [0, 3, 7]  
    },
    beta: {
        name: "Beta Cognition",
        tuningMode: "fibonacci",
        rootFreq: 440, 
        detune: 20.00, 
        filterDepth: 85, 
        swirlSpeed: 50,  
        chords: [0, 2, 5, 9] 
    },
    gamma: {
        name: "Gamma Epiphany",
        tuningMode: "spiral",
        rootFreq: 220, 
        detune: 40.00, 
        filterDepth: 95, 
        swirlSpeed: 70,  
        chords: [0, 4, 12] 
    }
};

// Initialize the Audio Nodes Ecosystem
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
    const k = typeof amount === 'number' ? amount : 40;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    
    for (let i = 0; i < n_samples; ++i) {
        const x = (i * 2) / n_samples - 1;
        curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
    }
    distortionNode.value = curve;
}

function calculateGoldenFrequency(step, root) {
    if (currentTuningMode === 'fibonacci') {
        return root * FIBONACCI_MULTIPLIERS[step];
    } else {
        const totalCents = (step * PHI_INTERVAL_CENTS) % 1200;
        return root * Math.pow(2, totalCents / 1200);
    }
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
    if (currentTuningMode === 'fibonacci') {
        subtitle.innerText = "Mathematical audio synthesis based on the 13:8 Fibonacci Integer Proportions";
        subtitle.style.color = "#a78bfa";
    } else {
        subtitle.innerText = "Mathematical audio synthesis based on the Golden Ratio interval (833.09 cents)";
        subtitle.style.color = "#94a3b8";
    }
}

function updateKeyboardLabels() {
    const keys = document.querySelectorAll('.phi-key');
    keys.forEach(key => {
        const i = parseInt(key.dataset.index);
        const currentFreq = calculateGoldenFrequency(i, rootFrequency).toFixed(1);
        const labelSpan = key.querySelector('.freq-label');
        if (labelSpan) {
            labelSpan.innerText = `${currentFreq}Hz`;
        }
        
        if (activeVoices[i]) {
            key.classList.add('active');
        } else {
            key.classList.remove('active');
        }
    });
}

function initializeKeyboardListeners() {
    const keys = document.querySelectorAll('.phi-key');
    keys.forEach(key => {
        const i = parseInt(key.dataset.index);

        key.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('selected'));
            
            if (currentKeyboardMode === 'toggle') {
                toggleVoice(i);
            } else {
                voiceOn(i);
            }
        });

        key.addEventListener('pointerup', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (currentKeyboardMode === 'touch') {
                voiceOff(i);
            }
        });

        key.addEventListener('pointerleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (currentKeyboardMode === 'touch') {
                voiceOff(i);
            }
        });
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
    pannerLfoSpeed = (preset.swirlSpeed /
