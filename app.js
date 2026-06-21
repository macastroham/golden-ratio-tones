// Web Audio Context State Management
let audioCtx = null;
let masterGainNode = null;
let distortionNode = null;
let analyserNode = null;

// Audio Configuration Variables
let rootFrequency = 440.00;
let releaseTime = 2.5;
let activeVoices = {}; // Tracks running oscillators by key index

// The Golden Scale Constants
const PHI_INTERVAL_CENTS = 833.0923;

// Initialize the Audio Nodes Ecosystem
function initAudio() {
    // Create cross-browser audio context
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContextClass();
    
    // Master Gain
    masterGainNode = audioCtx.createGain();
    masterGainNode.gain.setValueAtTime(0.7, audioCtx.currentTime);

    // Analyser Node for Visuals
    analyserNode = audioCtx.createAnalyser();
    analyserNode.fftSize = 2048;

    // Waveshaper Distortion Node for "Warmth"
    distortionNode = audioCtx.createWaveShaper();
    updateWaveShaperCurve(40); // Initial 40% warmth setting

    // Connections: [Voice] -> Distortion -> Master Gain -> Analyser -> Output
    distortionNode.connect(masterGainNode);
    masterGainNode.connect(analyserNode);
    analyserNode.connect(audioCtx.destination);
    
    // Begin the visualization loop
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
        // Tanh curve approximation for classic harmonic saturation
        curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
    }
    distortionNode.value = curve;
}

// Calculate precise frequency for a given step of the 13-tone scale
function calculateGoldenFrequency(step, root) {
    // Cumulative cents calculation for the 13-tone structure
    const totalCents = (step * PHI_INTERVAL_CENTS) % 1200;
    return root * Math.pow(2, totalCents / 1200);
}

// Dynamically populate the DOM with the 13 mathematical keys
function buildKeyboard() {
    const keyboardContainer = document.getElementById('keyboard');
    keyboardContainer.innerHTML = ''; // Clear container

    for (let i = 0; i < 13; i++) {
        const key = document.createElement('div');
        key.classList.add('phi-key');
        key.dataset.index = i;
        
        // Label display calculating current frequency values dynamically
        const currentFreq = calculateGoldenFrequency(i, rootFrequency).toFixed(1);
        key.innerHTML = `<span>K${i}</span><span style="font-size:0.65rem; color:#64748b">${currentFreq}Hz</span>`;

        // Handle both mouse and mobile touch triggers uniformly
        key.addEventListener('mousedown', (e) => { e.preventDefault(); voiceOn(i); });
        key.addEventListener('touchstart', (e) => { e.preventDefault(); voiceOn(i); });
        
        keyboardContainer.appendChild(key);
    }
}

// Trigger Voice Attack Phase
function voiceOn(index) {
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    // If voice already running, slice it out cleanly first
    if (activeVoices[index]) {
        voiceOff(index);
    }

    const freq = calculateGoldenFrequency(index, rootFrequency);
    
    // Construct individual Voice Oscillator
    const osc = audioCtx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

    // Individual Envelope Node to control clickless gain stages
    const voiceGain = audioCtx.createGain();
    voiceGain.gain.setValueAtTime(0, audioCtx.currentTime);
    // Smooth linear attack to avoid digital clicks
    voiceGain.gain.linearRampToValueAtTime(0.25, audioCtx.currentTime + 0.05);

    // Route voice through distortion engine
    osc.connect(voiceGain);
    voiceGain.connect(distortionNode);
    
    osc.start();

    // Store references for tracking release phase termination
    activeVoices[index] = { osc, voiceGain };
    document.querySelector(`.phi-key[data-index="${index}"]`).classList.add('active');
}

// Trigger Voice Release Phase
function voiceOff(index) {
    const voice = activeVoices[index];
    if (!voice) return;

    const targetKey = document.querySelector(`.phi-key[data-index="${index}"]`);
    if (targetKey) targetKey.classList.remove('active');

    const now = audioCtx.currentTime;
    // Set immediate anchor for exponential ramp calculation safety
    voice.voiceGain.gain.setValueAtTime(voice.voiceGain.gain.value, now);
    voice.voiceGain.gain.exponentialRampToValueAtTime(0.0001, now + releaseTime);

    // Cleanly kill oscillator thread once completely silent
    voice.osc.stop(now + releaseTime);
    delete activeVoices[index];
}

// Global Touch/Mouse Up listener to ensure stuck notes are avoided
function globalRelease() {
    Object.keys(activeVoices).forEach(index => {
        voiceOff(index);
    });
}
window.addEventListener('mouseup', globalRelease);
window.addEventListener('touchend', globalRelease);

// Real-Time Canvas Oscilloscope Rendering Loop
function drawOscilloscope() {
    const canvas = document.getElementById('oscilloscope');
    const canvasCtx = canvas.getContext('2d');
    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    // Adjust internal resolution to match viewport layout sizing
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

// DOM Interface Event Binding Layout
document.getElementById('activation-overlay').addEventListener('click', () => {
    initAudio();
    document.getElementById('activation-overlay').style.opacity = '0';
    setTimeout(() => document.getElementById('activation-overlay').style.display = 'none', 500);
});

document.getElementById('root-freq').addEventListener('input', (e) => {
    rootFrequency = parseFloat(e.target.value);
    document.getElementById('root-val').innerText = rootFrequency;
    buildKeyboard(); // Refresh key text displays with updated values
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

// Primary Boot Sequence Configuration Execution
buildKeyboard();
