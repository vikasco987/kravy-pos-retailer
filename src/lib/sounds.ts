/**
 * 🔊 KravySound — Centralized Sound Engine v3.1 (Mobile-Safe)
 * - Web Audio API synthesis (no MP3 files)
 * - iOS Safari + Android Chrome compatible
 * - AudioContext created on first user gesture (required by all mobile browsers)
 * - Every play awaits ctx.resume() so sounds never drop when context is suspended
 */

// ── Singleton AudioContext ────────────────────────────────────────────────────
let _ctx: AudioContext | null = null;
let _unlocked = false;

/** Create AudioContext lazily — must be called inside a user gesture on mobile */
/** Create AudioContext lazily — must be called inside a user gesture on mobile */
function getCtx(): AudioContext {
    if (!_ctx || _ctx.state === "closed") {
        _ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return _ctx;
}

/**
 * Ensures AudioContext is running.
 * Returns the context AFTER it's in "running" state, or null if we're on the server.
 */
async function resumedCtx(): Promise<AudioContext | null> {
    if (typeof window === "undefined") return null;
    let c = getCtx();
    
    if (c.state === "suspended") {
        try {
            console.log("KravySound: Resuming suspended context...");
            await c.resume();
        } catch (e) {
            console.warn("KravySound: Context resume failed, recreating...", e);
            // If resume fails, try creating a fresh one
            _ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            c = _ctx;
        }
    }
    return c;
}

// ── Mobile Unlock: pre-warm AudioContext on very first touch/click ─────────────
if (typeof window !== "undefined") {
    const unlock = async () => {
        if (_unlocked) return;
        try {
            const c = getCtx();
            await c.resume();
            
            _unlocked = true;
            console.log("KravySound: Audio Unlocked via user gesture 🔊 Status:", c.state);
        } catch (e) {
            console.error("KravySound: Unlock failed", e);
        }
    };
    window.addEventListener("mousedown",  unlock, { once: true, passive: true });
    window.addEventListener("touchstart", unlock, { once: true, passive: true });
    window.addEventListener("click",      unlock, { once: true, passive: true });
    window.addEventListener("keydown",    unlock, { once: true, passive: true });
}

// ── Core tone helper ───────────────────────────────────────────────────────────
function tone(
    c: AudioContext,
    freq: number,
    startAt: number,
    duration: number,
    volume: number = 0.3,
    type: OscillatorType = "sine"
) {
    try {
        const osc  = c.createOscillator();
        const gain = c.createGain();
        
        osc.connect(gain);
        gain.connect(c.destination);
        
        osc.type = type;
        osc.frequency.setValueAtTime(freq, startAt);
        
        gain.gain.setValueAtTime(0, startAt);
        gain.gain.linearRampToValueAtTime(volume, startAt + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
        
        osc.start(startAt);
        osc.stop(startAt + duration + 0.1);

        osc.onended = () => {
            osc.disconnect();
            gain.disconnect();
        };
    } catch (e) {
        console.error("KravySound: Play tone error", e);
    }
}

function noise(c: AudioContext, startAt: number, duration: number, volume = 0.04) {
    try {
        const buf  = c.createBuffer(1, c.sampleRate * duration, c.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        
        const src  = c.createBufferSource();
        src.buffer = buf;
        const gain = c.createGain();
        
        gain.gain.setValueAtTime(volume, startAt);
        gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
        
        src.connect(gain);
        gain.connect(c.destination);
        
        src.start(startAt);
        src.onended = () => {
            src.disconnect();
            gain.disconnect();
        };
    } catch (e) {
        console.error("KravySound: Play noise error", e);
    }
}

/** Wraps every sound function — resumes ctx first, then plays */
async function play(fn: (c: AudioContext) => void) {
    if (typeof window === "undefined") return;
    
    let c = getCtx();
    const currentState = c.state;
    console.log(`[KravySound] Pre-Play Check — Context State: ${currentState}, Unlocked: ${_unlocked}`);

    // If context is NOT running, try to fix it
    if ((c.state as any) !== "running") {
        try {
            await c.resume();
            if ((c.state as any) !== "running") {
                console.warn("[KravySound] Resume failed. Attempting fresh engine...");
                _ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
                c = _ctx;
                await c.resume().catch(e => console.error("[KravySound] Fresh engine resume failed:", e));
            }
        } catch (e) {
            console.error("[KravySound] Resume attempt failed:", e);
        }
    }

    // Final check before executing sound logic
    if ((c.state as any) === "running") {
        try {
            fn(c);
        } catch (e) {
            console.error("[KravySound] Runtime Playback Error:", e);
        }
    } else {
        console.warn(`[KravySound] BLOCKED: Browser state is still '${c.state}'. Direct user interaction needed.`);
    }
}

// ── Sound Library ──────────────────────────────────────────────────────────────
export const kravy = {

    /** 🖱️ Subtle button/nav click — Satisfying Mechanical Feel */
    click() {
        play(c => {
            const t = c.currentTime;
            // Sharp high-frequency "tack"
            tone(c, 1200, t, 0.04, 0.12, "sine");
            // Low-frequency "thump" for body
            tone(c, 300,  t, 0.06, 0.08, "sine");
            // Tiny noise burst for texture (the "jhan" part)
            noise(c, t, 0.03, 0.02);
        });
    },

    /** ✅ Success — form saved, action done */
    success() {
        play(c => {
            const t = c.currentTime;
            tone(c, 523, t,       0.15, 0.22);
            tone(c, 659, t + 0.1, 0.15, 0.22);
            tone(c, 784, t + 0.2, 0.28, 0.28);
        });
    },

    /** ❌ Error / fail */
    error() {
        play(c => {
            const t = c.currentTime;
            tone(c, 220, t,        0.15, 0.28, "sawtooth");
            tone(c, 180, t + 0.15, 0.22, 0.22, "sawtooth");
        });
    },

    /** 🗑️ Delete / trash */
    trash() {
        play(c => {
            const t = c.currentTime;
            tone(c, 400, t,        0.06, 0.18, "square");
            tone(c, 280, t + 0.06, 0.1,  0.14, "square");
            noise(c, t, 0.2, 0.04);
        });
    },

    /** 🛒 Add to cart */
    add() {
        play(c => {
            const t = c.currentTime;
            tone(c, 660, t,        0.08, 0.2);
            tone(c, 880, t + 0.08, 0.12, 0.2);
        });
    },

    /** ➖ Remove from cart */
    remove() {
        play(c => {
            const t = c.currentTime;
            tone(c, 440, t,        0.06, 0.2);
            tone(c, 330, t + 0.06, 0.1,  0.15);
        });
    },

    /** 🔔 New Order — business bell */
    orderBell() {
        play(c => {
            const t = c.currentTime;
            tone(c, 880, t,        0.5,  0.4);
            tone(c, 660, t + 0.2,  0.4,  0.3);
            tone(c, 880, t + 0.5,  0.5,  0.4);
            tone(c, 990, t + 0.7,  0.8,  0.35);
        });
    },

    /** ✅ Order accepted */
    orderAccept() {
        play(c => {
            const t = c.currentTime;
            [440, 554, 659, 880].forEach((f, i) =>
                tone(c, f, t + i * 0.1, 0.2, 0.22)
            );
        });
    },

    /** 🍽️ Order ready */
    orderReady() {
        play(c => {
            const t = c.currentTime;
            [523, 659, 784, 1047].forEach((f, i) =>
                tone(c, f, t + i * 0.1, 0.28, 0.22)
            );
        });
    },

    /** ❌ Order cancelled */
    orderCancel() {
        play(c => {
            const t = c.currentTime;
            tone(c, 440, t,        0.1,  0.28);
            tone(c, 370, t + 0.1,  0.15, 0.22);
            tone(c, 294, t + 0.25, 0.25, 0.18, "sawtooth");
        });
    },

    /** 📤 Image uploaded */
    upload() {
        play(c => {
            const t = c.currentTime;
            [300, 600, 900, 1200].forEach((f, i) =>
                tone(c, f, t + i * 0.05, 0.15, 0.1 + i * 0.04)
            );
        });
    },

    /** 💰 Payment / order placed */
    payment() {
        play(c => {
            const t = c.currentTime;
            noise(c, t, 0.05, 0.08);
            tone(c, 1047, t,        0.15, 0.32);
            tone(c, 1319, t + 0.12, 0.2,  0.28);
            noise(c, t + 0.15, 0.06, 0.06);
        });
    },

    /** 🔁 Toggle switch */
    toggle() {
        play(c => {
            const t = c.currentTime;
            tone(c, 600, t,        0.04, 0.14, "square");
            tone(c, 900, t + 0.04, 0.06, 0.1,  "square");
        });
    },

    /** ⭐ Review received */
    review() {
        play(c => {
            const t = c.currentTime;
            [523, 659, 784].forEach((f, i) =>
                tone(c, f, t + i * 0.15, 0.35, 0.18)
            );
        });
    },

    /** 📋 Copy */
    copy() {
        play(c => {
            const t = c.currentTime;
            tone(c, 700, t,        0.05, 0.12);
            tone(c, 900, t + 0.05, 0.08, 0.12);
        });
    },

    /** 🔍 Open / expand */
    open() {
        play(c => {
            const t = c.currentTime;
            [400, 600, 800].forEach((f, i) =>
                tone(c, f, t + i * 0.05, 0.1, 0.14)
            );
        });
    },

    /** 🚪 Close / dismiss */
    close() {
        play(c => {
            const t = c.currentTime;
            tone(c, 600, t,        0.05, 0.1);
            tone(c, 400, t + 0.05, 0.08, 0.1);
        });
    },

    /** 🔔 Gentle ping */
    ping() {
        play(c => {
            tone(c, 880, c.currentTime, 0.3, 0.18);
        });
    },

    /** 🖨️ Print */
    print() {
        play(c => {
            const t = c.currentTime;
            noise(c, t, 0.08, 0.05);
            for (let i = 0; i < 3; i++) noise(c, t + 0.1 + i * 0.12, 0.1, 0.04);
        });
    },
    /** 🚨 Continuous alert — like Zomato/Swiggy order alert */
    alertLoop() {
        play(c => {
            const t = c.currentTime;
            
            // 🎶 Aggressive Zomato-Style Buzz Alert
            // Using Sawtooth & Square for maximum intensity
            
            // Pulse 1
            tone(c, 880,  t,        0.1,  0.5, "sawtooth"); 
            tone(c, 440,  t,        0.1,  0.4, "square");
            
            // Pulse 2 (Shifted slightly)
            tone(c, 1174, t + 0.12, 0.1,  0.5, "sawtooth");
            tone(c, 587,  t + 0.12, 0.1,  0.4, "square");

            // Pulse 3 (Climax)
            tone(c, 1568, t + 0.24, 0.15, 0.5, "sawtooth");
            tone(c, 784,  t + 0.24, 0.15, 0.3, "square");
            
            // Piercing high "chirp" for attention
            tone(c, 3136, t + 0.05, 0.08, 0.2, "sine");
        });
    },
};
