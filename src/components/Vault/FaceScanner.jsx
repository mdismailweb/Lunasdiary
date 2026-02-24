import React, { useState, useEffect, useRef } from 'react';
import * as faceapi from 'face-api.js';
import { saveFaceGroups, getVaultMedia } from '../../services/api';

/**
 * FaceScanner Component
 * Handles ML model loading, image processing, and face clustering.
 */
export default function FaceScanner({ folderId, images, onComplete, onCancel }) {
    const [status, setStatus] = useState('loading'); // loading | ready | fetching | scanning | clustering | complete
    const [progress, setProgress] = useState(0);
    const [discoveryCount, setDiscoveryCount] = useState(0);
    const [log, setLog] = useState('Initializing face-api.js...');

    const [results, setResults] = useState(null);
    const abortRef = useRef(false);

    // 1. Load Models on Mount
    useEffect(() => {
        const loadModels = async () => {
            try {
                setLog('Loading neural networks (SSD Mobilenet, Landmark, Descriptor)...');
                const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
                await Promise.all([
                    faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
                ]);
                setStatus('ready');
                setLog('Scanner ready.');
            } catch (err) {
                console.error('Face API model load failed:', err);
                setLog('Error loading models. Check your internet connection.');
            }
        };
        loadModels();
        return () => { abortRef.current = true; };
    }, []);

    const startQuickScan = () => startScan(images);

    const startDeepScan = async () => {
        setStatus('fetching');
        setLog('Searching for every image in the folder...');
        let allMedia = [];
        let nextToken = null;
        let batchCount = 0;

        try {
            do {
                if (abortRef.current) return;
                batchCount++;
                setLog(`Fetching batch ${batchCount}... (${allMedia.length} found)`);

                const res = await getVaultMedia(folderId, nextToken);
                const items = res?.data?.items || res?.items || (Array.isArray(res) ? res : []);
                nextToken = res?.data?.continuationToken || res?.continuationToken || null;

                const formatted = items.map(item => ({
                    id: item.id, src: item.thumbnailLink, width: 400, height: 300,
                    largeSrc: item.viewLink || item.thumbnailLink,
                    title: item.name, type: item.mimeType?.startsWith('video/') ? 'video' : 'image',
                }));

                allMedia = [...allMedia, ...formatted];
                setDiscoveryCount(allMedia.length);
            } while (nextToken);


            setLog(`Found ${allMedia.length} images. Starting scan...`);
            startScan(allMedia);
        } catch (err) {
            console.error('Deep fetch failed:', err);
            setLog('Error fetching images. Try Quick Scan?');
            setStatus('ready');
        }
    };

    const startScan = async (scanItems) => {
        setStatus('scanning');
        const descriptorsFound = [];

        for (let i = 0; i < scanItems.length; i++) {
            if (abortRef.current) return;
            const imgData = scanItems[i];
            setProgress(Math.round((i / scanItems.length) * 100));
            setLog(`Scanning face ${i + 1}/${scanItems.length}: ${imgData.title || imgData.id}`);

            try {
                const img = await faceapi.fetchImage(imgData.src);
                const detections = await faceapi.detectAllFaces(img)
                    .withFaceLandmarks()
                    .withFaceDescriptors();

                if (detections.length > 0) {
                    detections.forEach(det => {
                        descriptorsFound.push({
                            imageId: imgData.id,
                            src: imgData.src,
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

        const groups = clusterFaces(descriptorsFound);
        setResults(groups);
        setStatus('complete');
        setLog(`Identified ${groups.length} distinct people!`);
    };

    const clusterFaces = (faces) => {
        const groups = [];
        const threshold = 0.55;

        faces.forEach(face => {
            let matchedGroup = null;
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

        return groups.map(g => ({
            groupId: g.id,
            label: '(unknown)',
            coverImageId: g.members[0].imageId,
            memberImageIds: [...new Set(g.members.map(m => m.imageId))],
            _members: g.members.map(m => ({ id: m.imageId, src: m.src }))
        }));
    };

    return (
        <div style={{
            padding: '2.5rem', background: 'var(--bg-card, #1e1e30)', borderRadius: '24px',
            border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center', maxWidth: '600px', margin: '0 auto'
        }}>
            <h3 style={{ marginBottom: '0.5rem', fontWeight: 800, fontSize: '1.4rem' }}>🧬 AI Face Recognition</h3>
            <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: '2rem', minHeight: '3em' }}>
                {log}
            </p>

            {(status === 'fetching' || status === 'scanning' || status === 'clustering') && (
                <div style={{ marginBottom: '2.5rem' }}>
                    <div style={{ width: '100%', height: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '5px', overflow: 'hidden', marginBottom: '1rem', position: 'relative' }}>
                        <div style={{
                            width: (status === 'fetching' || status === 'clustering') ? '100%' : `${progress}%`,
                            height: '100%',
                            background: (status === 'fetching' || status === 'clustering')
                                ? 'linear-gradient(90deg, #a78bfa 0%, #7c3aed 50%, #a78bfa 100%)'
                                : 'linear-gradient(90deg, #a78bfa, #7c3aed)',
                            backgroundSize: '200% 100%',
                            transition: 'width 0.3s ease',
                            animation: (status === 'fetching' || status === 'clustering') ? 'loading-slide 2s linear infinite' : 'none'
                        }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {status === 'fetching' ? `Discovery Phase (${discoveryCount} found)...` : status === 'clustering' ? 'Grouping Phase...' : `${progress}% SCANNED`}
                        </span>
                    </div>

                </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                {status === 'ready' && (
                    <>
                        <div onClick={startQuickScan} style={{
                            flex: 1, minWidth: '150px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '16px', padding: '1.25rem', cursor: 'pointer', transition: 'all 0.2s'
                        }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}>
                            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⚡</div>
                            <h4 style={{ margin: 0, fontSize: '0.9rem' }}>Quick Scan</h4>
                            <p style={{ fontSize: '0.7rem', opacity: 0.5, marginTop: '0.3rem' }}>Latest {images.length} images</p>
                        </div>

                        <div onClick={startDeepScan} style={{
                            flex: 1, minWidth: '150px', background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.3)',
                            borderRadius: '16px', padding: '1.25rem', cursor: 'pointer', transition: 'all 0.2s'
                        }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(167,139,250,0.15)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(167,139,250,0.1)'}>
                            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🛸</div>
                            <h4 style={{ margin: 0, fontSize: '0.9rem' }}>Deep Scan</h4>
                            <p style={{ fontSize: '0.7rem', opacity: 0.6, marginTop: '0.3rem' }}>Whole folder (Slow)</p>
                        </div>
                    </>
                )}
                {status === 'complete' && (
                    <button className="btn btn-primary" style={{ padding: '0.75rem 2.5rem' }} onClick={() => onComplete(results)}>View Results</button>
                )}
                {(status === 'ready' || status === 'complete') && (
                    <button className="btn btn-ghost" style={{ width: '100%', marginTop: '0.5rem' }} onClick={onCancel}>
                        {status === 'complete' ? 'Back' : 'Cancel'}
                    </button>
                )}
            </div>

            <p style={{ marginTop: '2rem', fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>
                Powered by face-api.js. Images are never uploaded for processing.
            </p>

            <style>{`
                @keyframes loading-slide {
                    0% { background-position: 100% 0; }
                    100% { background-position: -100% 0; }
                }
            `}</style>

        </div>
    );
}

