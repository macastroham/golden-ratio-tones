# Golden 13-Tone Scale Generator & Neurological Entrainment Engine

A high-precision, web-based psychoacoustic synthesizer built using the native Web Audio API (`AudioContext`). This progressive web platform utilizes the unique mathematical properties of the Golden Ratio ($\phi \approx 1.6180339887$) and Fibonacci integer relationships to generate immersive, inharmonic acoustic environments, specialized binaural beats, and target brainwave entrainment states.

Optimized extensively for standard modern desktop and mobile touch viewports (including iPadOS and iOS Safari/Edge architectures), the application runs natively in any secure browser environment without external dependencies or compilation tools.

---

## 🛠️ Mathematical Architecture

Unlike standard Western 12-Tone Equal Temperament (12-TET) systems that rely on integer octave doublings ($2:1$), this synthesizer operates across two distinct mathematical tuning paradigms:

### 1. 833.09c Continuous Spiral Scale
Derived from stacking the "Golden Interval" continuously. Because $\phi$ is the most irrational number, its continued fraction expansion consists entirely of $1$s, making it impossible to resolve into clean integer fractions. Stacking this interval 13 times nearly closes a complete cycle modulo 1200 cents:
* **Golden Interval:** $1200 \times \log_2(\phi) \approx 833.0923 \text{ cents}$
* **13-Step Reset:** $(13 \times 833.0923) \pmod{1200} \approx 30.17 \text{ cents}$ (an acoustic micro-unison loop)

### 2. 13:8 Fibonacci Integer Scale
Utilizes the $13:8$ integer fraction fraction ($1.625$) as a close rational approximation of the Golden Ratio ($1.618$). This architecture maps the 13 keys to progressive power fractions of the $13:8$ interval, yielding an organic, structural resonance that contrasts sharply with the seamless spiral scale.

---

## 🔊 Digital Signal Processing (DSP) Pipeline

To transform sterile, cold digital waveforms into warm, rich, and therapeutic soundscapes, each active voice passes through a specialized dual-channel hardware node pipeline:

