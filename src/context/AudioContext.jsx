import { createContext, useContext, useRef, useState, useCallback } from 'react';

const AudioCtx = createContext(null);

// ── Curated ambient radio stations ────────────────────────────
export const STATIONS = [
    {
        id: 'ambience',
        label: 'Ambience',
        icon: '🌧️',
        url: '',   // generated locally via Web Audio API — no stream needed
        desc: 'Rain & Nature · Generated Locally',
    },
    {
        id: 'jazz',
        label: 'Jazz',
        icon: '🎷',
        url: 'https://ice1.somafm.com/secretagent-128-mp3',
        desc: 'Secret Agent · Smooth Jazz',
    },
    {
        id: 'sleep',
        label: 'Sleep',
        icon: '😴',
        url: 'https://ice1.somafm.com/dronezone-128-mp3',
        desc: 'Drone Zone · Deep Atmospheric',
    },
    {
        id: 'piano',
        label: 'Piano',
        icon: '🎹',
        url: 'https://ice1.somafm.com/fluid-128-mp3',
        desc: 'Fluid · Calming Instrumental',
    },
    {
        id: 'chill',
        label: 'Chill',
        icon: '✨',
        url: 'https://ice1.somafm.com/lush-128-mp3',
        desc: 'Lush · Electronic Chill',
    },
    {
        id: 'radio',
        label: 'Radio',
        icon: '📻',
        url: '',
        desc: 'Your custom station',
        isCustom: true,
    },
];

export function AudioProvider({ children }) {
    const musicRef = useRef(null);
    const contentRef = useRef(null);
    const prevVol = useRef(1);
    const [volume, setVolume] = useState(0.8);
    const [behavior, setBehavior] = useState('duck'); // 'duck' | 'pause'
    const [playing, setPlaying] = useState(false);
    const [station, setStation] = useState(STATIONS[0]); // default: Study

    // Called by MusicPlayer on mount
    const registerMusic = useCallback((audioEl) => {
        musicRef.current = audioEl;
        if (audioEl) {
            audioEl.volume = volume;
            audioEl.addEventListener('play', () => setPlaying(true));
            audioEl.addEventListener('pause', () => setPlaying(false));
        }
    }, []); // eslint-disable-line

    // Switch station — wait for canplay before playing
    const selectStation = useCallback((st) => {
        setStation(st);
    }, []);

    // Smooth volume fade
    function _smoothVolume(target, ms = 400) {
        const audio = musicRef.current;
        if (!audio) return;
        const steps = 20;
        const delay = ms / steps;
        const start = audio.volume;
        const delta = (target - start) / steps;
        let i = 0;
        const id = setInterval(() => {
            i++;
            audio.volume = Math.min(1, Math.max(0, audio.volume + delta));
            if (i >= steps) { audio.volume = target; clearInterval(id); }
        }, delay);
    }

    const onContentAudioPlay = useCallback((audioEl) => {
        contentRef.current = audioEl;
        const audio = musicRef.current;
        if (!audio) return;
        if (behavior === 'duck') {
            prevVol.current = audio.volume;
            _smoothVolume(0.2);
        } else {
            audio.pause();
        }
    }, [behavior]);

    const onContentAudioStop = useCallback(() => {
        const audio = musicRef.current;
        if (!audio) return;
        if (behavior === 'duck') {
            _smoothVolume(prevVol.current);
        } else {
            audio.play().catch(() => { });
        }
        contentRef.current = null;
    }, [behavior]);

    const setMusicVolume = useCallback((v) => {
        setVolume(v);
        prevVol.current = v;
        if (musicRef.current) musicRef.current.volume = v;
    }, []);

    return (
        <AudioCtx.Provider value={{
            registerMusic,
            onContentAudioPlay, onContentAudioStop,
            volume, setMusicVolume,
            behavior, setBehavior,
            playing, setPlaying,
            station, selectStation,
        }}>
            {children}
        </AudioCtx.Provider>
    );
}

export function useAudio() {
    const ctx = useContext(AudioCtx);
    if (!ctx) throw new Error('useAudio must be inside AudioProvider');
    return ctx;
}
