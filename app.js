// Web Audio Context State Management
let audioCtx = null;
let masterGainNode = null;
let distortionNode = null;
let analyserNode = null;
let spaceFilterNode = null;
let spatialLfoNode = null;

// Audio Configuration Variables
let rootFrequency = 440.00;
let releaseTime = 4.5; // Bumped default value up for dreamier drone decays
let activeVoices = {}; // Tracks running dual-oscillators by key index

// Hypnotic Parameter Variables
let binauralDetuneHz = 1.62; // Golden Ratio approximation for micro-detuning
let pannerLfoSpeed = 0.3; // Spatial frequency panning LFO rate
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

// Initialize the Hypnotic Audio Ecosystem
function initAudio() {
    if (audioCtx) return; 
    
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContextClass();
    
    // Master Gain Node Setup
    masterGainNode = audioCtx.createGain();
    masterGainNode.gain.setValueAtTime(0.7, audioCtx.currentTime);

    // Analyser Node Setup
    analyserNode = audioCtx.createAnalyser();
    analyserNode.fftSize = 2048;

    // Resonant Low-Pass Filter Node Setup for atmospheric tides
    spaceFilterNode = audioCtx.createBiquadFilter();
    spaceFilterNode.type = 'lowpass';
    updateFilterFrequency();
    spaceFilterNode.Q.setValueAtTime(4.0, audioCtx.currentTime); // Sweet warm resonance

    // Waveshaper Distortion Node Setup
    distortionNode = audioCtx.createWaveShaper();
    updateWaveShaperCurve(40);

    // Dynamic Spatial Panning Module Configuration (LFO Node Modulating a Stereo Panner)
    setupSpatialLFO();

    // Node Routing Map: [Dual Voices] -> Distortion -> Space Filter -> Master Gain -> Analyser -> Output
    distortionNode.connect(spaceFilterNode);
    spaceFilterNode.connect(masterGainNode);
    masterGainNode.connect(analyserNode);
    analyserNode.connect(audioCtx.destination);
    
    drawOscilloscope();
}

// Configures a cyclic slow panner module to swirl drone soundscapes
function setupSpatialLFO() {
    if (!audioCtx) return;
    
    // Low Frequency Oscillator for movement
    spatialLfoNode = audioCtx.createOscillator();
    spatialLfoNode.type = 'sine';
    spatialLfoNode.frequency.setValueAtTime(pannerLfoSpeed, audioCtx.currentTime);
    
    // Custom gain step acts as filter depth mapping
    const lfoGain = audioCtx.createGain();
    lfoGain.gain.setValueAtTime(400, audioCtx.currentTime); // Swings filter cutoff by 400Hz up and down
    
    // Cross link the LFO directly into the lowpass filter frequency line to make it breathe automatically
    spatialLfoNode.connect(lfoGain);
    lfoGain.connect(spaceFilterNode.frequency);
    spatialLfoNode.start();
}

// Map filter range calculations safely
function updateFilterFrequency() {
    if (!spaceFilterNode || !audioCtx) return;
    // Map slider 10%-100% cleanly to warm audio ranges (300Hz to 5000Hz)
    const targetCutoff = 300 + (filterDepthPercent / 100) * 4700;
    spaceFilterNode.frequency.setValueAtTime(targetCutoff, audioCtx.currentTime);
}

// Generate hyperbolic tangent distortion curve
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

// Calculate base pitch frequencies
function calculateGoldenFrequency(step, root) {
    if (currentTuningMode === 'fibonacci') {
        return root * FIBONACCI_MULTIPLIERS[step];
    } else {
        const totalCents = (step * PHI_INTERVAL_CENTS) % 1200;
        return root * Math.pow(2, totalCents / 1200);
    }
}

// Dynamically populate the DOM and map interactions
function buildKeyboard() {
    const keyboardContainer = document.getElementById('keyboard');
    keyboardContainer.innerHTML = ''; 

    for (let i = 0; i < 13; i++) {
        const key = document.createElement('div');
        key.classList.add('phi-key');
        key.dataset.index = i;
        
        const currentFreq = calculateGoldenFrequency(i, rootFrequency).toFixed(1);
        key.innerHTML = `<span>K${i}</span><span style="font-size:0.65rem; color:#64748b">${currentFreq}Hz</span>`;

        key.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            e.stopPropagation();
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
        
        if (activeVoices[i]) {
            key.classList.add('active');
        }

        keyboardContainer.appendChild(key);
    }
}

// Unified Latch Controller
function toggleVoice(index) {
    if (!audioCtx) initAudio();
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();

    if (activeVoices[index]) {
        voiceOff(index);
    } else {
        voiceOn(index);
    }
}

// Trigger Voice Attack Phase using Dual-Oscillator Stereo Binaural structures
function voiceOn(index) {
    if (!audioCtx) initAudio();
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    if (activeVoices[index]) return;

    const baseFreq = calculateGoldenFrequency(index, rootFrequency);
    
    // Construct Left Ear Channel
    const oscLeft = audioCtx.createOscillator();
    oscLeft.type = 'sine';
    oscLeft.frequency.setValueAtTime(baseFreq, audioCtx.currentTime);
    
    const pannerLeft = audioCtx.createStereoPanner();
    pannerLeft.pan.setValueAtTime(-1.0, audioCtx.currentTime); // Hard Left

    // Construct Right Ear Channel with micro-detuned binaural beat offset
    const oscRight = audioCtx.createOscillator();
    oscRight.type = 'sine';
    oscRight.frequency.setValueAtTime(baseFreq + binauralDetuneHz, audioCtx.currentTime);
    
    const pannerRight = audioCtx.createStereoPanner();
    pannerRight.pan.setValueAtTime(1.0, audioCtx.currentTime); // Hard Right

    // Shared Voice Master Gain Envelope
    const voiceGain = audioCtx.createGain();
    voiceGain.gain.setValueAtTime(0, audioCtx.currentTime);
    // Extra smooth, long fade-in for majestic drone layer blends
    voiceGain.gain.linearRampToValueAtTime(0.18, audioCtx.currentTime + 0.5);

    // Internal Signal Paths: Osc -> Stereo Panners -> Master Voice Gain Node -> Distortion
    oscLeft.connect(pannerLeft);
    pannerLeft.connect(voiceGain);

    oscRight.connect(pannerRight);
    pannerRight.connect(voiceGain);

    voiceGain.connect(distortionNode);
    
    oscLeft.start();
    oscRight.start();

    // Cache the dual configuration context reference array safely
    activeVoices[index] = { oscLeft, oscRight, voiceGain };
    
    const keyElement = document.querySelector(`.phi-key[data-index="${index}"]`);
    if (keyElement) keyElement.classList.add('active');
}

// Trigger Voice Release Phase
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

// Panic Function
function clearAllTones() {
    Object.keys(activeVoices).forEach(index => {
        voiceOff(index);
    });
}

// Real-Time Oscilloscope Rendering Loop
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

// DOM Interface Control Bindings
document.getElementById('activation-overlay').addEventListener('pointerdown', (e) => {
    e.preventDefault();
    initAudio();
    document.getElementById('activation-overlay').style.opacity = '0';
    setTimeout(() => document.getElementById('activation-overlay').style.display = 'none', 500);
});

document.getElementById('clear-btn').addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    clearAllTones();
});

document.getElementById('root-freq').addEventListener('input', (e) => {
    rootFrequency = parseFloat(e.target.value);
    document.getElementById('root-val').innerText = rootFrequency;
    buildKeyboard(); 
});

// Tuning Scale Radio Selection Management
document.querySelectorAll('input[name="tuning-mode"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        currentTuningMode = e.target.value;
        const subtitle = document.getElementById('scale-subtitle');
        if (currentTuningMode === 'fibonacci') {
            subtitle.innerText = "Mathematical audio synthesis based on the 13:8 Fibonacci Integer Proportions";
            subtitle.style.color = "#a78bfa";
        } else {
            subtitle.innerText = "Mathematical audio synthesis based on the Golden Ratio interval (833.09 cents)";
            subtitle.style.color = "#94a3b8";
        }
        
        // Live shift working frequencies safely for running dual voices
        Object.keys(activeVoices).forEach(index => {
            const targetFreq = calculateGoldenFrequency(index, rootFrequency);
            if (audioCtx) {
                activeVoices[index].oscLeft.frequency.setValueAtTime(targetFreq, audioCtx.currentTime);
                activeVoices[index].oscRight.frequency.setValueAtTime(targetFreq + binauralDetuneHz, audioCtx.currentTime);
            }
        });
        buildKeyboard(); 
    });
});

// Keyboard Mode Input Controls Tracking
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
        buildKeyboard();
    });
});

// Hypnotic Parameter Slider Binding Adjustments
document.getElementById('hypnotic-detune').addEventListener('input', (e) => {
    binauralDetuneHz = parseFloat(e.target.value);
    document.getElementById('detune-val').innerText = binauralDetuneHz.toFixed(2);
    
    // Dynamically adjust active right-ear offsets instantly in live playback
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
    pannerLfoSpeed = (intensity / 100) * 2.0; // Scaled map up to 2Hz max speed
    if (spatialLfoNode && audioCtx) {
        spatialLfoNode.frequency.setValueAtTime(pannerLfoSpeed, audioCtx.currentTime);
    }
});

document.getElementById('filter-cutoff').addEventListener('input', (e) => {
    filterDepthPercent = parseInt(e.target.value);
    document.getElementById('filter-val').innerText = filterDepthPercent;
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

// Primary Initialization
buildKeyboard();
