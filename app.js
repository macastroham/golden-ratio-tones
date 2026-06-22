// Web Audio Context State Management
let audioCtx = null;
let masterGainNode = null;
let distortionNode = null;
let analyserNode = null;

// Audio Configuration Variables
let rootFrequency = 440.00;
let releaseTime = 2.5;
let activeVoices = {}; // Tracks running oscillators by key index

// Interaction and Tuning State Variables
let currentTuningMode = 'spiral'; // 'spiral' or 'fibonacci'
let currentKeyboardMode = 'toggle'; // 'toggle' or 'touch'

// The Golden Scale Constants
const PHI_INTERVAL_CENTS = 833.0923;

// Fibonacci 13:8 Progression Multipliers
const FIBONACCI_MULTIPLIERS = [
    1.0000, // K0: Root (1/1)
    1.6250, // K1: 13/8 Ratio
    1.3164, // K2: (13/8)^2 / 2
    1.0696, // K3: (13/8)^3 / 4
    1.7381, // K4: (13/8)^4 / 4
    1.4082, // K5: (13/8)^5 / 8
    1.1441, // K6: (13/8)^6 / 16
    1.8592, // K7: (13/8)^7 / 16
    1.5106, // K8: (13/8)^8 / 32
    1.2274, // K9: (13/8)^9 / 64
    1.9945, // K10: (13/8)^10 / 64
    1.6205, // K11: (13/8)^11 / 128
    1.3167  // K12: (13/8)^12 / 256
];

// Initialize the Audio Nodes Ecosystem
function initAudio() {
    if (audioCtx) return; 
    
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContextClass();
    
    // Master Gain
    masterGainNode = audioCtx.createGain();
    masterGainNode.gain.setValueAtTime(0.7, audioCtx.currentTime);

    // Analyser Node for Visuals
    analyserNode = audioCtx.createAnalyser();
    analyserNode.fftSize = 2048;

    // Waveshaper Distortion Node for Warmth
    distortionNode = audioCtx.createWaveShaper();
    updateWaveShaperCurve(40);

    // Connections: [Voice] -> Distortion -> Master Gain -> Analyser -> Output
    distortionNode.connect(masterGainNode);
    masterGainNode.connect(analyserNode);
    analyserNode.connect(audioCtx.destination);
    
    drawOscilloscope();
}

// Generate hyperbolic tangent (tanh) distortion curve for warm even harmonics
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

// Calculate precise frequency depending on chosen tuning mode architecture
function calculateGoldenFrequency(step, root) {
    if (currentTuningMode === 'fibonacci') {
        return root * FIBONACCI_MULTIPLIERS[step];
    } else {
        const totalCents = (step * PHI_INTERVAL_CENTS) % 1200;
        return root * Math.pow(2, totalCents / 1200);
    }
}

// Dynamically populate the DOM with the 13 mathematical keys and mount responsive routing
function buildKeyboard() {
    const keyboardContainer = document.getElementById('keyboard');
    keyboardContainer.innerHTML = ''; 

    for (let i = 0; i < 13; i++) {
        const key = document.createElement('div');
        key.classList.add('phi-key');
        key.dataset.index = i;
        
        const currentFreq = calculateGoldenFrequency(i, rootFrequency).toFixed(1);
        key.innerHTML = `<span>K${i}</span><span style="font-size:0.65rem; color:#64748b">${currentFreq}Hz</span>`;

        // Intercept downward interactions
        key.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (currentKeyboardMode === 'toggle') {
                toggleVoice(i);
            } else {
                // Touch Mode: Trigger immediate entry phase
                voiceOn(i);
            }
        });

        // Intercept extraction/lifting actions (Only performs structural work in Touch mode)
        key.addEventListener('pointerup', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (currentKeyboardMode === 'touch') {
                voiceOff(i);
            }
        });

        // Safety handler for tracking finger trailing off physical borders on an iPad screen
        key.addEventListener('pointerleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (currentKeyboardMode === 'touch') {
                voiceOff(i);
            }
        });
        
        // Retain visual active illumination if the voice is already latch running
        if (activeVoices[i]) {
            key.classList.add('active');
        }

        keyboardContainer.appendChild(key);
    }
}

// Latch Controller for Toggle Mode Branch
function toggleVoice(index) {
    if (!audioCtx) initAudio();
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();

    if (activeVoices[index]) {
        voiceOff(index);
    } else {
        voiceOn(index);
    }
}

// Trigger Voice Attack Phase
function voiceOn(index) {
    if (!audioCtx) initAudio();
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    
    // Prevent oscillator thread stacking errors if user slams keys rapidly
    if (activeVoices[index]) return;

    const freq = calculateGoldenFrequency(index, rootFrequency);
    
    const osc = audioCtx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

    const voiceGain = audioCtx.createGain();
    voiceGain.gain.setValueAtTime(0, audioCtx.currentTime);
    voiceGain.gain.linearRampToValueAtTime(0.25, audioCtx.currentTime + 0.05);

    osc.connect(voiceGain);
    voiceGain.connect(distortionNode);
    osc.start();

    activeVoices[index] = { osc, voiceGain };
    
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

    voice.osc.stop(now + releaseTime);
    delete activeVoices[index];
}

// Panic Function: Instantly clear all active tone channels
function clearAllTones() {
    Object.keys(activeVoices).forEach(index => {
        voiceOff(index);
    });
}

// Real-Time Canvas Oscilloscope Rendering Loop
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

// Tuning Scale Radio Selection Management + Subtitle Synchronization
document.querySelectorAll('input[name="tuning-mode"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        currentTuningMode = e.target.value;
        
        const subtitle = document.getElementById('scale-subtitle');
        if (currentTuningMode === 'fibonacci') {
            subtitle.innerText = "Mathematical audio synthesis based on the 13:8 Fibonacci Integer Proportions";
            subtitle.style.color = "#a78bfa"; // Soft purple shift for distinct visual context
        } else {
            subtitle.innerText = "Mathematical audio synthesis based on the Golden Ratio interval (833.09 cents)";
            subtitle.style.color = "#94a3b8"; // Restores standard slate gray
        }
        
        // Dynamically recalculate frequencies of any actively running oscillators
        Object.keys(activeVoices).forEach(index => {
            const targetFreq = calculateGoldenFrequency(index, rootFrequency);
            if (audioCtx) {
                activeVoices[index].osc.frequency.setValueAtTime(targetFreq, audioCtx.currentTime);
            }
        });
        
        buildKeyboard(); 
    });
});

// Keyboard Mode Input Controls Tracking (Toggle vs Touch Mode execution states)
document.querySelectorAll('input[name="keyboard-mode"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        currentKeyboardMode = e.target.value;
        
        const titleElement = document.getElementById('keyboard-mode-title');
        if (currentKeyboardMode === 'touch') {
            titleElement.innerText = "The Phi Keyboard Array (Touch Mode)";
            clearAllTones(); // Purge trailing background tones when pivoting to active touch performance
        } else {
            titleElement.innerText = "The Phi Keyboard Array (Toggle Mode)";
        }
        buildKeyboard();
    });
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
