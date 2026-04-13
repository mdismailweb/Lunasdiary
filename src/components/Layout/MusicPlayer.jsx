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
const LS_MUSIC_MODAL_KEY = 'luna_music_modal_open';

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
    const [showModal, setShowModal] = useState(() => localStorage.getItem(LS_MUSIC_MODAL_KEY) === 'true');

    // Radio station state
    const [radioUrl, setRadioUrl] = useState(() => localStorage.getItem(LS_RADIO_KEY) || '');
    const [radioInput, setRadioInput] = useState('');
    const [showRadioInput, setShowRadioInput] = useState(false);
    const [trackName, setTrackName] = useState(''); // live track title from YT

    // Add method to open modal from header
    useEffect(() => {
        window.openMusicPlayer = () => {
            setShowModal(true);
            localStorage.setItem(LS_MUSIC_MODAL_KEY, 'true');
        };
        return () => delete window.openMusicPlayer;
    }, []);

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
                autoplay: 0, controls: 0, loop: 1,
                playlist: videoId, rel: 0, modestbranding: 1,
                playsinline: 1,
                mute: 1
            },
            events: {
                onReady: (e) => {
                    e.target.mute();
                    e.target.setVolume(Math.round(volume * 100));
                    
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
                    if (e.data === -1) setPlaying(false);
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
    }, []);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.volume = volume;
        registerMusic(audio);

        if ('mediaSession' in navigator) {
            navigator.mediaSession.setActionHandler('play', () => togglePlay());
            navigator.mediaSession.setActionHandler('pause', () => togglePlay());
            navigator.mediaSession.metadata = new window.MediaMetadata({
                title: STATIONS[0].desc,
                artist: STATIONS[0].label,
                album: 'Luna Vault',
                artwork: [{ src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' }]
            });
        }
    }, []);

    useEffect(() => {
        if (!ytPlayer.current) return;
        if (station.id === 'ambience' || station.id === 'radio') {
            try { ytPlayer.current.setVolume(muted ? 0 : Math.round(volume * 100)); }
            catch (_) { }
        }
    }, [volume, muted, station.id]);

    useEffect(() => {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
        }
    }, [playing]);

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

    const applyRadioUrl = () => {
        const url = radioInput.trim();
        if (!url) return;
        localStorage.setItem(LS_RADIO_KEY, url);
        setRadioUrl(url);
        setRadioInput('');
        setShowRadioInput(false);
        playUrl(url);
    };

    const handleStation = (st) => {
        if (st.id === 'radio') {
            selectStation(st);
            if (radioUrl) {
                playUrl(radioUrl);
            } else {
                setShowRadioInput(true);
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

    const closeModal = () => {
        setShowModal(false);
        localStorage.setItem(LS_MUSIC_MODAL_KEY, 'false');
    };

    // ── Render ────────────────────────────────────────────────
    return (
        <>
            <audio ref={audioRef} playsInline />
            <div ref={ytDivRef} style={{ position: 'fixed', left: '-9999px', bottom: 0, width: '1px', height: '1px', pointerEvents: 'none' }} />

            {/* Desktop bottom bar — hidden on mobile via CSS */}
            <div className="music-player" />

            {/* Compact popup */}
            {showModal && (
                <>
                    {/* Invisible backdrop to close on tap-outside */}
                    <div onClick={closeModal} style={{ position: 'fixed', inset: 0, zIndex: 6000 }} />

                    <div className="candy-theme" style={{
                        position: 'fixed',
                        top: '68px',
                        right: '12px',
                        zIndex: 6001,
                        width: '280px',
                        background: 'linear-gradient(135deg, #1a1930 0%, #221e3a 100%)',
                        border: '1px solid rgba(255,107,157,0.25)',
                        borderRadius: '16px',
                        boxShadow: '0 16px 40px rgba(0,0,0,0.6), 0 0 20px rgba(255,107,157,0.1)',
                        overflow: 'hidden',
                        animation: 'popup-drop 0.22s cubic-bezier(0.34,1.56,0.64,1) both'
                    }}>
                        {/* Header row */}
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '12px 14px 10px',
                            borderBottom: '1px solid rgba(255,255,255,0.07)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '1.4rem', display: 'inline-block', animation: playing ? 'spin-soft 3s linear infinite' : 'none' }}>💿</span>
                                <div>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ff6b9d', letterSpacing: '0.5px', textTransform: 'uppercase' }}>{station.label}</div>
                                    <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '155px' }}>{trackName || station.desc}</div>
                                </div>
                            </div>
                            <button onClick={closeModal} style={{
                                background: 'rgba(255,255,255,0.07)', border: 'none', color: 'rgba(255,255,255,0.5)',
                                width: '26px', height: '26px', borderRadius: '50%', cursor: 'pointer', fontSize: '0.8rem',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                            }}>✕</button>
                        </div>

                        {/* Play + Volume row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px' }}>
                            <button onClick={togglePlay} style={{
                                background: 'linear-gradient(135deg, #ff6b9d, #c084d0)',
                                border: 'none', color: '#fff', borderRadius: '50%',
                                width: '38px', height: '38px', fontSize: '1rem', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0, boxShadow: '0 4px 14px rgba(255,107,157,0.4)'
                            }}>
                                {playing ? '⏸' : '▶'}
                            </button>
                            <button onClick={toggleMute} style={{ background: 'none', border: 'none', fontSize: '1.1rem', cursor: 'pointer', flexShrink: 0, padding: 0 }}>
                                {muted || volume === 0 ? '🔇' : volume < 0.4 ? '🔉' : '🔊'}
                            </button>
                            <input
                                type="range" min="0" max="1" step="0.01"
                                value={muted ? 0 : volume} onChange={onVolumeChange}
                                style={{ flex: 1, accentColor: '#ff6b9d', cursor: 'pointer', height: '4px' }}
                            />
                            <span style={{ fontSize: '0.7rem', color: '#ff6b9d', fontWeight: 700, minWidth: '30px', textAlign: 'right' }}>
                                {Math.round((muted ? 0 : volume) * 100)}%
                            </span>
                        </div>

                        {/* Station pills */}
                        <div style={{ padding: '0 14px 12px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {STATIONS.map(st => (
                                <button key={st.id} onClick={() => handleStation(st)} style={{
                                    background: st.id === station.id ? 'linear-gradient(135deg, #ff6b9d, #c084d0)' : 'rgba(255,255,255,0.06)',
                                    border: st.id === station.id ? 'none' : '1px solid rgba(255,255,255,0.1)',
                                    color: '#fff', borderRadius: '100px', padding: '5px 11px',
                                    fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '4px'
                                }}>
                                    {st.icon} {st.label}
                                </button>
                            ))}
                        </div>

                        {/* Radio URL input */}
                        {station.id === 'radio' && (
                            <div style={{ padding: '0 14px 14px', display: 'flex', gap: '6px' }}>
                                <input
                                    placeholder="Paste YouTube or stream URL…"
                                    value={radioInput}
                                    onChange={e => setRadioInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && applyRadioUrl()}
                                    style={{
                                        flex: 1, fontSize: '0.72rem', padding: '6px 10px', borderRadius: '8px',
                                        background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,107,157,0.3)',
                                        color: '#fff', outline: 'none'
                                    }}
                                />
                                <button onClick={applyRadioUrl} style={{
                                    background: 'linear-gradient(135deg, #ff6b9d, #c084d0)', border: 'none',
                                    color: '#fff', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem'
                                }}>▶</button>
                            </div>
                        )}
                    </div>
                </>
            )}
        </>
    );
}

