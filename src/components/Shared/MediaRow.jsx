import { useState, useRef } from 'react';
import { useAudio } from '../../context/AudioContext';
import Lightbox from './Lightbox';
import { fileToBase64 } from '../../services/api';

function fileTypeIcon(ext) {
    const map = { pdf: '📄', doc: '📝', docx: '📝', xls: '📊', xlsx: '📊', ppt: '📋', pptx: '📋', txt: '📃', zip: '🗜️' };
    return map[ext?.toLowerCase()] || '📎';
}

// ── Audio Box ───────────────────────────────────────────────────
function AudioBox({ items = [], onUpload, onRecord, sourceId }) {
    const { onContentAudioPlay, onContentAudioStop } = useAudio();
    const [recording, setRecording] = useState(false);
    const [recTime, setRecTime] = useState(0);
    const [playing, setPlaying] = useState(null);
    const mediaRec = useRef(null);
    const timerRef = useRef(null);
    const audioEls = useRef({});

    const startRecord = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mr = new MediaRecorder(stream);
            const chunks = [];
            mr.ondataavailable = e => chunks.push(e.data);
            mr.onstop = async () => {
                const blob = new Blob(chunks, { type: 'audio/webm' });
                const file = new File([blob], `voice_memo_${Date.now()}.webm`, { type: 'audio/webm' });
                onRecord && onRecord(file);
                stream.getTracks().forEach(t => t.stop());
            };
            mr.start();
            mediaRec.current = mr;
            setRecording(true);
            setRecTime(0);
            timerRef.current = setInterval(() => setRecTime(t => t + 1), 1000);
        } catch (e) { alert('Microphone access denied'); }
    };

    const stopRecord = () => {
        mediaRec.current?.stop();
        clearInterval(timerRef.current);
        setRecording(false);
    };

    const togglePlay = (item, el) => {
        if (!el) return;
        if (el.paused) {
            el.play();
            onContentAudioPlay(el);
            setPlaying(item.media_id);
            el.onended = () => { onContentAudioStop(); setPlaying(null); };
        } else {
            el.pause();
            onContentAudioStop();
            setPlaying(null);
        }
    };

    return (
        <div className="media-box">
            <div className="media-box-title">🎙️ Audio</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, overflowY: 'auto' }}>
                {items.map(item => (
                    <div key={item.media_id} className="audio-bar">
                        <audio ref={el => audioEls.current[item.media_id] = el} src={item.drive_link} preload="none" />
                        <button className="play-mini" onClick={() => togglePlay(item, audioEls.current[item.media_id])}>
                            {playing === item.media_id ? '⏸' : '▶'}
                        </button>
                        <span className="audio-name">{item.display_name || item.filename}</span>
                        <span className="badge badge-ref">{item.media_id}</span>
                    </div>
                ))}
                {items.length === 0 && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No audio yet</span>}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {recording ? (
                    <div className="rec-indicator">
                        <div className="rec-dot" /> {Math.floor(recTime / 60)}:{String(recTime % 60).padStart(2, '0')}
                        <button className="btn btn-danger btn-sm" onClick={stopRecord}>⏹ Stop</button>
                    </div>
                ) : (
                    <button className="btn btn-ghost btn-sm" onClick={startRecord}>🔴 Record</button>
                )}
                <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}>
                    ⬆ Upload
                    <input type="file" accept="audio/*" hidden onChange={e => onUpload && onUpload(e.target.files[0])} />
                </label>
            </div>
        </div>
    );
}

// ── Images Box ──────────────────────────────────────────────────
function ImagesBox({ items = [], onUpload }) {
    const [lb, setLb] = useState(null);

    return (
        <div className="media-box">
            <div className="media-box-title">📷 Images</div>
            <div className="image-grid" style={{ flex: 1 }}>
                {items.map((item, i) => (
                    <div key={item.media_id} className="img-thumb" onClick={() => setLb(i)}>
                        <img src={item.thumbnail_link || item.drive_link} alt={item.filename} />
                        <span className="img-ref badge badge-ref">{item.media_id}</span>
                    </div>
                ))}
                {items.length === 0 && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', gridColumn: '1/-1' }}>No images yet</span>}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
                <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}>
                    📷 Capture
                    <input type="file" accept="image/*" capture="environment" hidden onChange={e => onUpload && onUpload(e.target.files[0])} />
                </label>
                <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}>
                    ⬆ Upload
                    <input type="file" accept="image/*" hidden onChange={e => onUpload && onUpload(e.target.files[0])} />
                </label>
            </div>
            {lb !== null && (
                <Lightbox
                    images={items.map(i => ({ url: i.drive_link }))}
                    startIndex={lb}
                    onClose={() => setLb(null)}
                />
            )}
        </div>
    );
}

// ── Files Box ───────────────────────────────────────────────────
function FilesBox({ items = [], onUpload }) {
    return (
        <div className="media-box">
            <div className="media-box-title">📎 Files</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, overflowY: 'auto' }}>
                {items.map(item => (
                    <a key={item.media_id} href={item.drive_link} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                        <div className="file-card">
                            <span className="file-icon">{fileTypeIcon(item.file_extension)}</span>
                            <span className="file-name">{item.display_name || item.filename}</span>
                            <span className="badge badge-ref">{item.media_id}</span>
                            <span className="file-size">{item.file_size_kb}KB</span>
                        </div>
                    </a>
                ))}
                {items.length === 0 && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No files yet</span>}
            </div>
            <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}>
                ⬆ Upload
                <input type="file" hidden onChange={e => onUpload && onUpload(e.target.files[0])} />
            </label>
        </div>
    );
}

// ── MediaRow — three boxes side by side ─────────────────────────
export default function MediaRow({ audioItems, imageItems, fileItems, onAudioUpload, onAudioRecord, onImageUpload, onFileUpload }) {
    return (
        <div className="media-row">
            <AudioBox items={audioItems} onUpload={onAudioUpload} onRecord={onAudioRecord} />
            <ImagesBox items={imageItems} onUpload={onImageUpload} />
            <FilesBox items={fileItems} onUpload={onFileUpload} />
        </div>
    );
}
