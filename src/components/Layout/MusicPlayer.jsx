import { useRef, useState, useEffect, useCallback } from 'react';
import { useAudio, STATIONS } from '../../context/AudioContext';

// ── YouTube helpers ────────────────────────────────────────────
const YT_IDS = ['1RcVIuZ8Wdk', 'PXpERbbAvBs', '0dcFWLV_OlI'];
function pickRandom() { return YT_IDS[Math.floor(Math.random() * YT_IDS.length)]; }

function extractYTId(url) {
    try {
        const u = new URL(url);
        if (u.hostname.includes('youtu.be')) return u.pathname.slice(1);
        if (u.hostname.includes('youtube.com')) return u.searchParams.get('v');
    } catch (_) { }
    return null;
}

function ytEmbedUrl(videoId) {
    return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&loop=1&playlist=${videoId}&controls=0&rel=0&modestbranding=1`;
}

function loadYTApi() {
    if (window.YT || document.getElementById('yt-api-script')) return;
    const s = document.createElement('script');
    s.id = 'yt-api-script';
    s.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(s);
}

const LS_RADIO_KEY = 'luna_radio_url';

// ─────────────────────────────────────────────────────────────
export default function MusicPlayer() {
    const audioRef = useRef(null);
    const ytDivRef = useRef(null);
    const ytPlayer = useRef(null);
    const pendingYT = useRef(null);

    const { registerMusic, volume, setMusicVolume, playing, setPlaying,
        station, selectStation } = useAudio();
    const [muted, setMuted] = useState(false);
    const [prevVol, setPrevVol] = useState(volume);
    const [showPicker, setShowPicker] = useState(false);

    // Radio station state
    const [radioUrl, setRadioUrl] = useState(() => localStorage.getItem(LS_RADIO_KEY) || '');
    const [radioInput, setRadioInput] = useState('');
    const [showRadioInput, setShowRadioInput] = useState(false);
    const [trackName, setTrackName] = useState(''); // live track title from YT

    // ── YT Player helpers ─────────────────────────────────────
    const createYTPlayer = useCallback((videoId) => {
        if (!window.YT || !window.YT.Player) { pendingYT.current = videoId; return; }
        if (ytPlayer.current) {
            try { ytPlayer.current.destroy(); } catch (_) { }
            ytPlayer.current = null;
        }
        ytPlayer.current = new window.YT.Player(ytDivRef.current, {
            height: '1', width: '1',
            videoId,
            playerVars: {
                autoplay: 1, controls: 0, loop: 1,
                playlist: videoId, rel: 0, modestbranding: 1,
                playsinline: 1,
                mute: 1 // ← muted autoplay is ALWAYS allowed by browsers
            },
            events: {
                onReady: (e) => {
                    // Start muted (browser always allows muted autoplay) then unmute on first interaction
                    e.target.mute();
                    e.target.setVolume(0);
                    e.target.playVideo();
                    // setPlaying driven by onStateChange only
                    
                    // Unmute as soon as user taps anywhere
                    const unmute = () => {
                        try {
                            e.target.unMute();
                            e.target.setVolume(muted ? 0 : Math.round(volume * 100));
                        } catch (_) { }
                        document.removeEventListener('click', unmute);
                        document.removeEventListener('touchstart', unmute);
                    };
                    document.addEventListener('click', unmute);
                    document.addEventListener('touchstart', unmute, { passive: true });

                    // Grab the video title for the bottom bar
                    try {
                        const title = e.target.getVideoData()?.title;
                        if (title) {
                            setTrackName(title);
                            if ('mediaSession' in navigator) {
                                navigator.mediaSession.metadata = new window.MediaMetadata({
                                    title: title,
                                    artist: 'Luna Radio (YouTube)',
                                    album: 'Luna Vault',
                                    artwork: [{ src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' }]
                                });
                            }
                        }
                    } catch (_) { }
                },
                onStateChange: (e) => {
                    if (e.data === window.YT.PlayerState.PLAYING) setPlaying(true);
                    if (e.data === window.YT.PlayerState.PAUSED) setPlaying(false);
                    if (e.data === -1) setPlaying(false); // UNSTARTED
                }
            },
        });
    }, [volume, muted, setPlaying]);

    const destroyYT = () => {
        if (ytPlayer.current) {
            try { ytPlayer.current.destroy(); } catch (_) { }
            ytPlayer.current = null;
        }
    };

    // ── Mount / API bootstrap ─────────────────────────────────
    useEffect(() => {
        loadYTApi();
        window.onYouTubeIframeAPIReady = () => {
            if (pendingYT.current) {
                createYTPlayer(pendingYT.current);
                pendingYT.current = null;
            }
        };
        if (window.YT && window.YT.Player) {/* already ready */ }
    }, []); // eslint-disable-line

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.volume = volume;
        registerMusic(audio);

        const tryAutoplay = () => {
            if (STATIONS[0].id === 'ambience') {
                // YT player starts muted and unmutes on first tap (handled in onReady)
                createYTPlayer(pickRandom());
            } else {
                // For html5 audio, start muted and unmute on first interaction
                audio.src = STATIONS[0].url;
                audio.muted = true;
                audio.play().catch(() => { });
                const onFirstInteraction = () => {
                    audio.muted = false;
                    audio.volume = volume;
                    document.removeEventListener('click', onFirstInteraction);
                    document.removeEventListener('touchstart', onFirstInteraction);
                };
                document.addEventListener('click', onFirstInteraction);
                document.addEventListener('touchstart', onFirstInteraction, { passive: true });
            }
        };

        tryAutoplay();

        // Setup Media Session API for background controls
        if ('mediaSession' in navigator) {
            navigator.mediaSession.setActionHandler('play', () => togglePlay());
            navigator.mediaSession.setActionHandler('pause', () => togglePlay());
            // Pre-fill initial metadata
            navigator.mediaSession.metadata = new window.MediaMetadata({
                title: STATIONS[0].desc,
                artist: STATIONS[0].label,
                album: 'Luna Vault',
                artwork: [{ src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' }]
            });
        }
    }, []); // eslint-disable-line

    // Sync volume to YT player
    useEffect(() => {
        if (!ytPlayer.current) return;
        if (station.id === 'ambience' || station.id === 'radio') {
            try { ytPlayer.current.setVolume(muted ? 0 : Math.round(volume * 100)); }
            catch (_) { }
        }
    }, [volume, muted, station.id]);

    // ── Controls ──────────────────────────────────────────────
    const togglePlay = () => {
        if (station.id === 'ambience' || station.id === 'radio') {
            if (!ytPlayer.current) return;
            try {
                if (playing) { ytPlayer.current.pauseVideo(); setPlaying(false); }
                else { ytPlayer.current.playVideo(); setPlaying(true); }
            } catch (_) { }
            return;
        }
        const a = audioRef.current;
        if (!a) return;
        if (a.paused) a.play().catch(() => { });
        else a.pause();
    };

    const toggleMute = () => {
        if (muted) {
            setMusicVolume(prevVol);
            if (audioRef.current) audioRef.current.volume = prevVol;
            try { ytPlayer.current?.unMute(); ytPlayer.current?.setVolume(Math.round(prevVol * 100)); } catch (_) { }
            setMuted(false);
        } else {
            setPrevVol(volume);
            setMusicVolume(0);
            if (audioRef.current) audioRef.current.volume = 0;
            try { ytPlayer.current?.mute(); } catch (_) { }
            setMuted(true);
        }
    };

    const onVolumeChange = (e) => {
        const v = parseFloat(e.target.value);
        setMusicVolume(v);
        if (audioRef.current) audioRef.current.volume = v;
        try { ytPlayer.current?.unMute(); ytPlayer.current?.setVolume(Math.round(v * 100)); } catch (_) { }
        setMuted(v === 0);
    };

    // Start playing a URL (YouTube or stream)
    const playUrl = useCallback((url) => {
        if (!url) return;
        const ytId = extractYTId(url);
        if (ytId) {
            if (audioRef.current) audioRef.current.pause();
            createYTPlayer(ytId);
        } else {
            destroyYT();
            setPlaying(false);
            const a = audioRef.current;
            if (!a) return;
            a.src = url;
            a.play().catch(() => { });
        }
    }, [createYTPlayer, setPlaying]);

    // Save & play the custom radio URL
    const applyRadioUrl = () => {
        const url = radioInput.trim();
        if (!url) return;
        localStorage.setItem(LS_RADIO_KEY, url);
        setRadioUrl(url);
        setRadioInput('');
        setShowRadioInput(false);
        playUrl(url);
    };

    // Switch station
    const handleStation = (st) => {
        setShowPicker(false);

        if (st.id === 'radio') {
            selectStation(st);
            if (radioUrl) {
                playUrl(radioUrl);
            } else {
                // No URL yet — show the input
                setShowRadioInput(true);
                setShowPicker(true); // keep picker open so input is visible
            }
            return;
        }

        selectStation(st);
        setShowRadioInput(false);

        if (st.id === 'ambience') {
            if (audioRef.current) audioRef.current.pause();
            destroyYT();
            setTrackName('');
            createYTPlayer(pickRandom());
        } else {
            destroyYT();
            setTrackName('');
            setPlaying(false);
            const a = audioRef.current;
            if (!a) return;
            a.src = st.url;
            a.play().catch(() => { });

            if ('mediaSession' in navigator) {
                navigator.mediaSession.metadata = new window.MediaMetadata({
                    title: st.desc,
                    artist: st.label,
                    album: 'Luna Vault',
                    artwork: [{ src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' }]
                });
            }
        }
    };

    // ── Render ────────────────────────────────────────────────
    return (
        <div className="music-player">
            <audio ref={audioRef} />
            <div ref={ytDivRef} style={{ position: 'fixed', left: '-9999px', bottom: 0, width: '1px', height: '1px', pointerEvents: 'none' }} />

            {/* Station picker */}
            {showPicker && (
                <div className="station-picker">
                    {STATIONS.map(st => (
                        <div key={st.id}>
                            <button
                                className={`station-option ${st.id === station.id ? 'active' : ''}`}
                                onClick={() => handleStation(st)}
                            >
                                <span className="station-icon">{st.icon}</span>
                                <span className="station-meta">
                                    <strong>{st.label}</strong>
                                    <small>{st.id === 'radio' && radioUrl ? radioUrl.slice(0, 36) + '…' : st.desc}</small>
                                </span>
                                {st.id === station.id && <span className="station-check">✓</span>}
                            </button>

                            {/* Inline URL input for Radio */}
                            {st.id === 'radio' && (showRadioInput || station.id === 'radio') && (
                                <div className="radio-url-row">
                                    <input
                                        className="radio-url-input"
                                        placeholder="Paste YouTube or stream URL…"
                                        value={radioInput}
                                        onChange={e => setRadioInput(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && applyRadioUrl()}
                                        autoFocus
                                    />
                                    <button className="radio-url-btn" onClick={applyRadioUrl}>▶</button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Station label */}
            <button className="player-info player-info-btn" onClick={() => { setShowPicker(p => !p); if (station.id === 'radio') setShowRadioInput(true); }} title="Choose station">
                <div className={`live-dot ${playing ? 'playing' : 'paused'}`} />
                <div className="equalizer">
                    <div className={`eq-bar ${playing ? 'playing' : ''}`} />
                    <div className={`eq-bar ${playing ? 'playing' : ''}`} />
                    <div className={`eq-bar ${playing ? 'playing' : ''}`} />
                </div>
                <span className="player-station">
                    {station.icon} {station.label}
                    {trackName ? ` · ${trackName}` : ` · ${station.desc}`}
                </span>
                {playing && <span className="player-live">LIVE</span>}
                <span className="station-caret">{showPicker ? '▲' : '▼'}</span>
            </button>

            {/* Play / Pause */}
            <button className="play-btn" onClick={togglePlay} title={playing ? 'Pause' : 'Play'}>
                {playing ? '⏸' : '▶'}
            </button>

            {/* Volume */}
            <div className="player-volume">
                <button className="mute-btn settings-btn" onClick={toggleMute} title="Mute/Unmute">
                    {muted || volume === 0 ? '🔇' : volume < 0.4 ? '🔉' : '🔊'}
                </button>
                <input type="range" className="volume-slider" min="0" max="1" step="0.01"
                    value={muted ? 0 : volume} onChange={onVolumeChange} />
            </div>
        </div>
    );
}
