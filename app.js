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

// Interaction and Tuning State Variables
let currentTuningMode = 'spiral'; 
let currentKeyboardMode = 'toggle'; 

// The Golden Scale Constants
const PHI_INTERVAL_CENTS = 833.0923;

// Fibonacci 13:8 Progression Multipliers
const FIBONACCI_MULTIPLIERS = [
    1.0000, 1.6250, 1.3164, 1.0696, 1.7381, 1.4082, 1.1441, 
    1.8592, 1.5106, 1.2274, 1.9945, 1.6205, 1.3167
];

// Neurological Engine Configuration Blueprint Map
const NEURO_PRESETS = {
    alpha: {
        name: "Alpha Flow",
        tuningMode: "fibonacci",
        rootFreq: 440,
        detune: 10.00,
        filterDepth: 75,
        swirlSpeed: 45,
        chords: [0, 4, 7, 11] // Structured, clear harmonic framework
    },
    theta: {
        name: "Theta Trance",
        tuningMode: "spiral",
        rootFreq: 220, // Grounded octave lower root anchor
        detune: 6.18,  // Phi * 10 dynamic theta offset target
        filterDepth: 45,
        swirlSpeed: 25,
        chords: [0, 3, 6, 9]  // Flowing, ambiguous dream clusters
    },
    delta: {
        name: "Deep Delta",
        tuningMode: "spiral",
        rootFreq: 110, // Sub bass anchor line
        detune: 1.62,  // True golden ratio beat configuration
        filterDepth: 25, // Deeply buried, dark atmosphere sub cutoff
        swirlSpeed: 10,  // Viscous, ultra-slow landscape movement
        chords: [0, 5, 12]
    },
    astral: {
        name: "Astral Flight",
        tuningMode: "spiral",
        rootFreq: 220,
        detune: 4.00,  // The Delta/Theta dimensional crossover threshold
        filterDepth: 60,
        swirlSpeed: 65,  // Fast panning cycles to build floating dissociation
        chords: [0, 1, 5]  // Incommensurate, dense structural geometry cluster
    }
};

// Initialize the Hypnotic Audio Ecosystem
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

// Synchronizes sliders and radio components to mirror background computational logic state shifts
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
            // Clear current preset selection styling on manual key intervention
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

// Core execution engine for deploying entrainment states cleanly
function loadNeuroPreset(presetKey) {
    const preset = NEURO_PRESETS[presetKey];
    if (!preset) return;

    if (!audioCtx) initAudio();
    clearAllTones(); // Clear old notes cleanly

    // 1. Structural Logic Mappings Assignment
    currentTuningMode = preset.tuningMode;
    rootFrequency = preset.rootFreq;
    binauralDetuneHz = preset.detune;
    filterDepthPercent = preset.filterDepth;
    pannerLfoSpeed = (preset.swirlSpeed / 100) * 2.0;

    // 2. Hardware Graph Parameters Intersect Updating
    updateFilterFrequency();
    if (spatialLfoNode && audioCtx) {
        spatialLfoNode.frequency.setValueAtTime(pannerLfoSpeed, audioCtx.currentTime);
    }

    // 3. System Viewport State Synchronizations
    updateSlidersUI();
    updateKeyboardLabels();

    // 4. Force System to Toggle Latch Mode for uninterrupted drone entrainment
    currentKeyboardMode = 'toggle';
    document.getElementById('keyboard-mode-title').innerText = "The Phi Keyboard Array (Toggle Mode)";
    document.querySelector('input[name="keyboard-mode"][value="toggle"]').checked = true;

    // 5. Fire Sequential Voices Attacks Across Target Chords Mapping Matrix Arrays
    preset.chords.forEach(index => {
        voiceOn(index);
    });

    // 6. Manage Selected Stylings States Across Preset Button Interfaces
    document.querySelectorAll('.preset-btn').forEach(btn => {
        if (btn.dataset.preset === presetKey) {
            btn.classList.add('selected');
        } else {
            btn.classList.remove('selected');
        }
    });
}

function toggleVoice(index) {
    if (!audioCtx) initAudio();
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();

    if (activeVoices[index]) {
        voiceOff(index);
    } else {
        voiceOn(index);
    }
}

function voiceOn(index) {
    if (!audioCtx) initAudio();
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    if (activeVoices[index]) return;

    const baseFreq = calculateGoldenFrequency(index, rootFrequency);
    
    const oscLeft = audioCtx.createOscillator();
    oscLeft.type = 'sine';
    oscLeft.frequency.setValueAtTime(baseFreq, audioCtx.currentTime);
    
    const pannerLeft = audioCtx.createStereoPanner();
    pannerLeft.pan.setValueAtTime(-1.0, audioCtx.currentTime); 

    const oscRight = audioCtx.createOscillator();
    oscRight.type = 'sine';
    oscRight.frequency.setValueAtTime(baseFreq + binauralDetuneHz, audioCtx.currentTime);
    
    const pannerRight = audioCtx.createStereoPanner();
    pannerRight.pan.setValueAtTime(1.0, audioCtx.currentTime); 

    const voiceGain = audioCtx.createGain();
    voiceGain.gain.setValueAtTime(0, audioCtx.currentTime);
    voiceGain.gain.linearRampToValueAtTime(0.18, audioCtx.currentTime + 0.5);

    oscLeft.connect(pannerLeft);
    pannerLeft.connect(voiceGain);

    oscRight.connect(pannerRight);
    pannerRight.connect(voiceGain);

    voiceGain.connect(distortionNode);
    
    oscLeft.start();
    oscRight.start();

    activeVoices[index] = { oscLeft, oscRight, voiceGain };
    
    const keyElement = document.querySelector(`.phi-key[data-index="${index}"]`);
    if (keyElement) keyElement.classList.add('active');
}

function voiceOff(index) {
    const voice = activeVoices[index];
    if (!voice) return;

    const keyElement = document.querySelector(`.phi-key[data-index="${index}"]`);
    if (keyElement) keyElement.classList.remove('active');

    const now = audioCtx.currentTime;
    voice.voiceGain.gain.setValueAtTime(voice.voiceGain.gain.value, now);
    voice.voiceGain.gain.exponentialRampToValueAtTime(0.0001, now + releaseTime);

    voice.oscLeft.stop(now + releaseTime);
    voice.oscRight.stop(now + releaseTime);
    delete activeVoices[index];
}

function clearAllTones() {
    Object.keys(activeVoices).forEach(index => {
        voiceOff(index);
    });
    document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('selected'));
}

function drawOscilloscope() {
    const canvas = document.getElementById('oscilloscope');
    const canvasCtx = canvas.getContext('2d');
    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    canvas.width = canvas.clientWidth * window.devicePixelRatio;
    canvas.height = canvas.clientHeight * window.devicePixelRatio;

    function render() {
        requestAnimationFrame(render);
        analyserNode.getByteTimeDomainData(dataArray);

        canvasCtx.fillStyle = '#111827';
        canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
        canvasCtx.lineWidth = 2 * window.devicePixelRatio;
        canvasCtx.strokeStyle = '#fbbf24';
        canvasCtx.beginPath();

        const sliceWidth = canvas.width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 128.0;
            const y = (v * canvas.height) / 2;

            if (i === 0) canvasCtx.moveTo(x, y);
            else canvasCtx.lineTo(x, y);
            x += sliceWidth;
        }

        canvasCtx.lineTo(canvas.width, canvas.height / 2);
        canvasCtx.stroke();
    }
    render();
}

// DOM Event Bindings
document.getElementById('activation-overlay').addEventListener('pointerdown', (e) => {
    e.preventDefault();
    initAudio();
    initializeKeyboardListeners();
    document.getElementById('activation-overlay').style.opacity = '0';
    setTimeout(() => document.getElementById('activation-overlay').style.display = 'none', 500);
});

document.getElementById('clear-btn').addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    clearAllTones();
});

// Bindings for newly mapped Preset Module trigger loops
document.querySelectorAll('.preset-btn').forEach(btn => {
    const handlePresetTap = (e) => {
        e.preventDefault();
        e.stopPropagation();
        loadNeuroPreset(btn.dataset.preset);
    };
    btn.addEventListener('pointerdown', handlePresetTap);
});

document.getElementById('root-freq').addEventListener('input', (e) => {
    rootFrequency = parseFloat(e.target.value);
    document.getElementById('root-val').innerText = rootFrequency;
    document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('selected'));
    updateKeyboardLabels(); 
});

document.querySelectorAll('input[name="tuning-mode"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        currentTuningMode = e.target.value;
        document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('selected'));
        
        const subtitle = document.getElementById('scale-subtitle');
        if (currentTuningMode === 'fibonacci') {
            subtitle.innerText = "Mathematical audio synthesis based on the 13:8 Fibonacci Integer Proportions";
            subtitle.style.color = "#a78bfa";
        } else {
            subtitle.innerText = "Mathematical audio synthesis based on the Golden Ratio interval (833.09 cents)";
            subtitle.style.color = "#94a3b8";
        }
        
        Object.keys(activeVoices).forEach(index => {
            const targetFreq = calculateGoldenFrequency(index, rootFrequency);
            if (audioCtx) {
                activeVoices[index].oscLeft.frequency.setValueAtTime(targetFreq, audioCtx.currentTime);
                activeVoices[index].oscRight.frequency.setValueAtTime(targetFreq + binauralDetuneHz, audioCtx.currentTime);
            }
        });
        updateKeyboardLabels(); 
    });
});

document.querySelectorAll('input[name="keyboard-mode"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        currentKeyboardMode = e.target.value;
        const titleElement = document.getElementById('keyboard-mode-title');
        if (currentKeyboardMode === 'touch') {
            titleElement.innerText = "The Phi Keyboard Array (Touch Mode)";
            clearAllTones(); 
        } else {
            titleElement.innerText = "The Phi Keyboard Array (Toggle Mode)";
        }
        updateKeyboardLabels();
    });
});

document.getElementById('hypnotic-detune').addEventListener('input', (e) => {
    binauralDetuneHz = parseFloat(e.target.value);
    document.getElementById('detune-val').innerText = binauralDetuneHz.toFixed(2);
    document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('selected'));
    
    Object.keys(activeVoices).forEach(index => {
        const baseFreq = calculateGoldenFrequency(index, rootFrequency);
        if (audioCtx) {
            activeVoices[index].oscRight.frequency.setValueAtTime(baseFreq + binauralDetuneHz, audioCtx.currentTime);
        }
    });
});

document.getElementById('space-swirl').addEventListener('input', (e) => {
    const intensity = parseInt(e.target.value);
    document.getElementById('swirl-val').innerText = intensity;
    pannerLfoSpeed = (intensity / 100) * 2.0; 
    document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('selected'));
    if (spatialLfoNode && audioCtx) {
        spatialLfoNode.frequency.setValueAtTime(pannerLfoSpeed, audioCtx.currentTime);
    }
});

document.getElementById('filter-cutoff').addEventListener('input', (e) => {
    filterDepthPercent = parseInt(e.target.value);
    document.getElementById('filter-val').innerText = filterDepthPercent;
    document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('selected'));
    updateFilterFrequency();
});

document.getElementById('warmth').addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    document.getElementById('warmth-val').innerText = val;
    updateWaveShaperCurve(val);
});

document.getElementById('release').addEventListener('input', (e) => {
    releaseTime = parseFloat(e.target.value);
    document.getElementById('release-val').innerText = releaseTime.toFixed(1);
});

document.getElementById('master-volume').addEventListener('input', (e) => {
    const val = parseInt(e.target.value) / 100;
    document.getElementById('volume-val').innerText = e.target.value;
    if (masterGainNode) masterGainNode.gain.setValueAtTime(val, audioCtx.currentTime);
});

// Run layout verification pass
updateKeyboardLabels();
