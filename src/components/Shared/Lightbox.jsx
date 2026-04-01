import { useState, useEffect } from 'react';
import * as api from '../../services/api';

function LightboxImage({ item, index }) {
    // Try Google's High-Res Preview Service (sz=w2500)
    const getInitialSrc = (url) => {
        if (!url) return '';
        const match = url.match(/\/d\/([^/]+)/) || url.match(/id=([^&/]+)/);
        if (!match) return url;
        return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w2500`;
    };

    const [src, setSrc] = useState(getInitialSrc(item.drive_link));
    const [failed, setFailed] = useState(false);

    // Reset when navigation occurs
    useEffect(() => {
        setSrc(getInitialSrc(item.drive_link));
        setFailed(false);
    }, [item.media_id]);

    const handleError = async () => {
        if (failed) return;
        setFailed(true);
        console.log(`Lightbox image ${item.media_id} failed, fetching base64 proxy...`);
        try {
            const res = await api.getThumbnailBase64(item.media_id);
            if (res && res.base64) {
                setSrc(res.base64);
            }
        } catch (e) {
            console.error('Lightbox proxy fail:', e);
        }
    };

    return (
        <img
            className="lightbox-img"
            src={src}
            alt={item.display_name || `Image ${index + 1}`}
            onClick={e => e.stopPropagation()}
            onError={handleError}
        />
    );
}

export default function Lightbox({ images, startIndex = 0, onClose }) {
    const [idx, setIdx] = useState(startIndex);
    if (!images || images.length === 0) return null;

    const prev = () => setIdx(i => (i - 1 + images.length) % images.length);
    const next = () => setIdx(i => (i + 1) % images.length);

    const currentItem = images[idx];

    return (
        <div className="lightbox-overlay" onClick={onClose}>
            <button className="lightbox-close" onClick={onClose} title="Close">✕</button>

            {images.length > 1 && (
                <button className="lightbox-nav lightbox-prev" onClick={e => { e.stopPropagation(); prev(); }}>‹</button>
            )}

            {currentItem.media_type === 'video' ? (
                <video
                    className="lightbox-img"
                    controls
                    autoPlay
                    src={currentItem.drive_link}
                    onClick={e => e.stopPropagation()}
                />
            ) : (
                <LightboxImage item={currentItem} index={idx} />
            )}

            {images.length > 1 && (
                <button className="lightbox-nav lightbox-next" onClick={e => { e.stopPropagation(); next(); }}>›</button>
            )}
        </div>
    );
}
