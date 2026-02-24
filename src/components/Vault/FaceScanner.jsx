import React, { useState, useEffect, useRef } from 'react';
import * as faceapi from 'face-api.js';
import { saveFaceGroups } from '../../services/api';

/**
 * FaceScanner Component
 * Handles ML model loading, image processing, and face clustering.
 */
export default function FaceScanner({ folderId, images, onComplete, onCancel }) {
    const [status, setStatus] = useState('loading'); // loading | ready | scanning | clustering | complete
    const [progress, setProgress] = useState(0);
    const [log, setLog] = useState('Initializing face-api.js...');
    const [results, setResults] = useState(null);
    const abortRef = useRef(false);

    // 1. Load Models on Mount
    useEffect(() => {
        const loadModels = async () => {
            try {
                setLog('Loading neural networks (SSD Mobilenet, Landmark, Descriptor)...');
                // Using CDN-hosted models for simplicity
                const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
                await Promise.all([
                    faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
                ]);
                setStatus('ready');
                setLog('Ready to scan ' + images.length + ' images.');
            } catch (err) {
                console.error('Face API model load failed:', err);
                setLog('Error loading models. Check your internet connection.');
            }
        };
        loadModels();
        return () => { abortRef.current = true; };
    }, [images.length]);

    // 2. The Scanning and Clustering Logic
    const startScan = async () => {
        if (status !== 'ready') return;
        setStatus('scanning');
        const descriptorsFound = [];

        for (let i = 0; i < images.length; i++) {
            if (abortRef.current) return;
            const imgData = images[i];
            setProgress(Math.round((i / images.length) * 100));
            setLog(`Processing image ${i + 1}/${images.length}: ${imgData.title || imgData.id}`);

            try {
                // Load image from URL (requires CORS-friendly Drive thumbnail link)
                const img = await faceapi.fetchImage(imgData.src);
                const detections = await faceapi.detectAllFaces(img)
                    .withFaceLandmarks()
                    .withFaceDescriptors();

                if (detections.length > 0) {
                    detections.forEach(det => {
                        descriptorsFound.push({
                            imageId: imgData.id,
                            src: imgData.src, // Thumbnail
                            largeSrc: imgData.largeSrc,
                            descriptor: det.descriptor
                        });
                    });
                }
            } catch (e) {
                console.warn('Failed to process image:', imgData.id, e);
            }
        }

        if (abortRef.current) return;
        setLog(`Clustering ${descriptorsFound.length} faces...`);
        setStatus('clustering');

        // 3. Simple Clustering (Euclidean Distance)
        const groups = clusterFaces(descriptorsFound);

        setResults(groups);
        setStatus('complete');
        setLog(`Found ${groups.length} face groups!`);
    };

    const clusterFaces = (faces) => {
        const groups = [];
        const threshold = 0.55; // Distance threshold for "same person"

        faces.forEach(face => {
            let matchedGroup = null;

            // Compare with existing group centers (first member acts as center for simplicity)
            for (const group of groups) {
                const distance = faceapi.euclideanDistance(face.descriptor, group.members[0].descriptor);
                if (distance < threshold) {
                    matchedGroup = group;
                    break;
                }
            }

            if (matchedGroup) {
                matchedGroup.members.push(face);
            } else {
                groups.push({
                    id: 'GROUP-' + (groups.length + 1),
                    members: [face]
                });
            }
        });

        // Convert to serializable format for storage
        return groups.map(g => ({
            groupId: g.id,
            label: '(unknown)',
            coverImageId: g.members[0].imageId,
            memberImageIds: [...new Set(g.members.map(m => m.imageId))],
            // We keep member metadata locally for the UI preview
            _members: g.members.map(m => ({ id: m.imageId, src: m.src }))
        }));
    };

    const handleSave = async (finalGroups) => {
        setLog('Saving to Google Sheets...');
        try {
            await saveFaceGroups(folderId, finalGroups);
            onComplete(finalGroups);
        } catch (err) {
            setLog('Failed to save. Data might be too large or network error.');
        }
    };

    return (
        <div style={{
            padding: '2rem', background: 'var(--bg-card, #1e1e30)', borderRadius: '20px',
            border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center'
        }}>
            <h3 style={{ marginBottom: '1rem' }}>🧬 AI Face Recognition</h3>
            <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: '1.5rem' }}>
                {log}
            </p>

            {(status === 'scanning' || status === 'clustering') && (
                <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden', marginBottom: '2rem' }}>
                    <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg, #a78bfa, #7c3aed)', transition: 'width 0.3s ease' }} />
                </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                {status === 'ready' && (
                    <button className="btn btn-primary" onClick={startScan}>Start Scan</button>
                )}
                {status === 'complete' && (
                    <button className="btn btn-primary" onClick={() => onComplete(results)}>View Results</button>
                )}
                <button className="btn btn-ghost" onClick={onCancel} disabled={status === 'scanning'}>
                    {status === 'complete' ? 'Back' : 'Cancel'}
                </button>
            </div>

            <p style={{ marginTop: '1.5rem', fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>
                Powered by face-api.js & TensorFlow.js. All processing happens locally in your browser.
            </p>
        </div>
    );
}
