import { useState } from 'react';

export default function Lightbox({ images, startIndex = 0, onClose }) {
    const [idx, setIdx] = useState(startIndex);
    if (!images || images.length === 0) return null;

    const prev = () => setIdx(i => (i - 1 + images.length) % images.length);
    const next = () => setIdx(i => (i + 1) % images.length);

    return (
        <div className="lightbox-overlay" onClick={onClose}>
            <button className="lightbox-close" onClick={onClose} title="Close">✕</button>

            {images.length > 1 && (
                <button className="lightbox-nav lightbox-prev" onClick={e => { e.stopPropagation(); prev(); }}>‹</button>
            )}

            {images[idx].isVideo ? (
                <video
                    className="lightbox-img"
                    controls
                    autoPlay
                    src={images[idx].url}
                    onClick={e => e.stopPropagation()}
                />
            ) : (
                <img
                    className="lightbox-img"
                    src={images[idx].url || images[idx]}
                    alt={`Image ${idx + 1}`}
                    onClick={e => e.stopPropagation()}
                />
            )}

            {images.length > 1 && (
                <button className="lightbox-nav lightbox-next" onClick={e => { e.stopPropagation(); next(); }}>›</button>
            )}
        </div>
    );
}
