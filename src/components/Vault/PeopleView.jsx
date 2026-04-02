import React, { useState, useEffect } from 'react';
import { getFaceGroups } from '../../services/api';

/**
 * PeopleView Component
 * Aggregates all saved face groups from all folders.
 */
export default function PeopleView({ folders }) {
    const [allGroups, setAllGroups] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadAll = async () => {
            setLoading(true);
            try {
                // Fetch groups for each folder in parallel
                const promises = folders.map(f => getFaceGroups(f.folderId));
                const responses = await Promise.all(promises);

                const combined = [];
                responses.forEach((res, i) => {
                    const folderGroups = res.data?.groups || [];
                    folderGroups.forEach(g => {
                        combined.push({
                            ...g,
                            folderName: folders[i].name
                        });
                    });
                });

                // Group by label/name if possible, otherwise keep separate
                setAllGroups(combined);
            } catch (e) {
                console.error('Failed to load combined people view:', e);
            } finally {
                setLoading(false);
            }
        };
        if (folders.length > 0) loadAll();
        else setLoading(false);
    }, [folders]);

    if (loading) return <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.5 }}>Loading people...</div>;

    if (allGroups.length === 0) return (
        <div className="empty-state">
            <div className="empty-emoji">👥</div>
            <p>No people identified yet.</p>
            <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.5rem' }}>
                Open a folder and click "Scan Faces" to start grouping.
            </p>
        </div>
    );

    return (
        <div className="fade-in people-view-container">
            <style>{`
                .people-view-container h2 { font-size: 1.4rem; fontWeight: 700; margin-bottom: 1.5rem; }
                .people-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1.5rem; }
                
                @media (max-width: 768px) {
                    .people-view-container h2 { font-size: 1.1rem; margin-bottom: 1rem; }
                    .people-grid { grid-template-columns: repeat(2, 1fr); gap: 0.75rem; }
                    .person-card { border-radius: 12px !important; }
                    .person-card-info { padding: 0.75rem !important; }
                    .person-card-name { font-size: 0.85rem !important; }
                }
            `}</style>

            <h2>👥 People</h2>

            <div className="people-grid">
                {allGroups.map((group, idx) => (
                    <div key={idx} className="person-card" style={{
                        background: 'rgba(255,255,255,0.04)', borderRadius: '20px', overflow: 'hidden',
                        border: '1px solid rgba(255,255,255,0.08)', transition: 'transform 0.2s',
                        cursor: 'default'
                    }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        <div style={{ position: 'relative', width: '100%', aspectRatio: '1/1' }}>
                            <img
                                src={`https://drive.google.com/thumbnail?id=${group.coverImageId}&sz=w400`}
                                alt={group.label}
                                referrerPolicy="no-referrer"
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        </div>
                        <div className="person-card-info" style={{ padding: '1rem' }}>
                            <h4 className="person-card-name" style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>{group.label}</h4>
                            <p style={{ margin: '0.2rem 0 0', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Found in {group.folderName}
                            </p>
                            <div style={{ marginTop: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <span style={{ fontSize: '0.7rem', color: 'var(--accent)', fontWeight: 800 }}>
                                    {group.memberImageIds.length} PHOTOS
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
