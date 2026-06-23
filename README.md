# Golden 13-Tone Scale Generator & Neurological Entrainment Engine

A high-precision, web-based psychoacoustic synthesizer built using the native Web Audio API (AudioContext). This progressive web platform utilizes the unique mathematical properties of the Golden Ratio and Fibonacci integer relationships to generate immersive, inharmonic acoustic environments, specialized binaural beats, and target brainwave entrainment states.

Optimized extensively for standard modern desktop and mobile touch viewports (including iPadOS and iOS Safari/Edge architectures), the application runs natively in any secure browser environment without external dependencies or compilation tools.

---

## Mathematical Architecture

Unlike standard Western 12-Tone Equal Temperament (12-TET) systems that rely on integer octave doublings (2:1), this synthesizer operates across two distinct mathematical tuning paradigms:

### 1. 833.09c Continuous Spiral Scale
Derived from stacking the "Golden Interval" continuously. Because the Golden Ratio is an irrational number, its continued fraction expansion consists entirely of 1s, making it impossible to resolve into clean integer fractions. Stacking this interval 13 times nearly closes a complete cycle modulo 1200 cents:
* **Golden Interval:** 833.0923 cents
* **13-Step Reset:** At the 13th step, the scale loops back near the root, missing a true unison by an incredibly small fraction (30.17 cents).

### 2. 13:8 Fibonacci Integer Scale
Utilizes the 13:8 integer fraction (1.625) as a close rational approximation of the Golden Ratio (1.618). This architecture maps the 13 keys to progressive power fractions of the 13:8 interval, yielding an organic, structural resonance that contrasts sharply with the seamless spiral scale.

---

## Digital Signal Processing (DSP) Pipeline

To transform sterile, cold digital waveforms into warm, rich, and therapeutic soundscapes, each active voice passes through a specialized dual-channel hardware node pipeline:

[ Left Oscillator (Sine: f0) ]  ──► [ Stereo Panner (Left: -1.0) ] ──┐
                                                                    ├──► [ Voice Gain Envelope ] ──┐
[ Right Oscillator (Sine: f0+Δ)] ──► [ Stereo Panner (Right: 1.0) ] ──┘                              │
                                                                                                    ▼
[ Output Destination ] ◄── [ Analyser Node ] ◄── [ Master Gain ] ◄── [ Resonant Filter ] ◄── [ WaveShaper Tanh ]

* **Stereo Binaural Separation:** Every key triggers independent Left and Right oscillator threads. The Right channel is micro-detuned by a variable frequency offset. The brain's auditory cortex processes this difference to generate native binaural beats.
* **Hyperbolic Tangent (Tanh) Saturation:** Recreates classic analog tape warmth by introducing subtle, musical even-order harmonics via a customized mathematical distortion curve array.
* **Resonant Low-Pass Filter Modulation:** A sub-audible Low-Frequency Oscillator (LFO) slowly modulates a low-pass filter cutoff point, creating an undulating, organic "breathing" spatial perspective.

---

## Neurological Entrainment Presets

The dashboard contains four precision-engineered preset configurations optimized for stereo headphone usage:

* **Alpha Flow (13:8 Fibonacci | 10.00 Hz Detune):** Calm focus, creative visualization, and stress mitigation.
* **Theta Trance (833.09c Spiral | 6.18 Hz Detune):** Deep meditation, vivid internal imagery, and REM dream access.
* **Deep Delta (833.09c Spiral | 1.62 Hz Detune):** Sub-bass grounding line targeting cellular healing and deep sleep.
* **Astral Flight (833.09c Spiral | 4.00 Hz Detune):** Incommensurate chord clusters designed to induce spatial dissociation.

---

## Mobile Layout Optimization Notes

* **Pointer Event Unification:** Employs explicit pointerdown, pointerup, and pointerleave routines to prevent event duplication or trailing layout memory sticking in iPadOS/iOS environments.
* **Viewport Lock:** Locked via CSS touch-action properties and web view metadata selectors to completely eliminate accidental vertical bouncing or scale magnification during performance.
* **Hardware Initialization:** Subscribes strictly to current browser security guidelines; all background audio state variables remain securely uninitialized until the explicit gesture overlay is dismissed.

## License

This project is open-source and available under the MIT License.
