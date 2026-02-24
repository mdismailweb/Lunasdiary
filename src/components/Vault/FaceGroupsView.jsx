import React, { useState } from 'react';
import { saveFaceGroups } from '../../services/api';

/**
 * FaceGroupsView Component
 * Displays detected groups, allows naming and picking a cover photo.
 */
export default function FaceGroupsView({ folderId, groups, onSave, onBack }) {
    const [groupState, setGroupState] = useState(groups);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    const updateGroupName = (index, name) => {
        const next = [...groupState];
        next[index].label = name;
        setGroupState(next);
    };

    const pickCover = (groupIndex, imageId) => {
        const next = [...groupState];
        next[groupIndex].coverImageId = imageId;
        setGroupState(next);
    };

    const handleSaveAll = async () => {
        setSaving(true);
        setError(null);
        try {
            await saveFaceGroups(folderId, groupState);
            onSave(groupState);
        } catch (err) {
            setError('Failed to save to Sheets. The data might be too large.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Scan Results</h2>
                    <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>
                        Identified {groupState.length} people/groups. Pick a cover photo and add names.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button className="btn btn-ghost" onClick={onBack}>Back to Scanning</button>
                    <button className="btn btn-primary" onClick={handleSaveAll} disabled={saving}>
                        {saving ? 'Saving...' : '💾 Save to Sheet'}
                    </button>
                </div>
            </div>

            {error && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', padding: '1rem', borderRadius: '12px', color: '#ef4444', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                    ⚠️ {error}
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {groupState.map((group, idx) => (
                    <div key={group.groupId} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', padding: '1.25rem' }}>
                        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                            {/* Group Header/Edit */}
                            <div style={{ width: '220px', flexShrink: 0 }}>
                                <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--accent)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                                    Person Name / Label
                                </label>
                                <input
                                    type="text"
                                    placeholder="Enter name..."
                                    value={group.label === '(unknown)' ? '' : group.label}
                                    onChange={(e) => updateGroupName(idx, e.target.value)}
                                    style={{ width: '100%', padding: '0.75rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', marginBottom: '0.5rem', outline: 'none' }}
                                />
                                <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                                    {group.memberImageIds.length} photos found.
                                </p>
                            </div>

                            {/* Members Grid */}
                            <div style={{ flex: 1, minWidth: '300px' }}>
                                <label style={{ display: 'block', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.8rem' }}>
                                    Select Cover Photo
                                </label>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    {group._members.map(member => {
                                        const isCover = group.coverImageId === member.id;
                                        return (
                                            <div
                                                key={member.id}
                                                onClick={() => pickCover(idx, member.id)}
                                                style={{
                                                    position: 'relative', width: '80px', height: '80px', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer',
                                                    border: isCover ? '3px solid var(--accent, #a78bfa)' : '2px solid transparent',
                                                    boxShadow: isCover ? '0 0 15px rgba(167,139,250,0.4)' : 'none',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                <img
                                                    src={member.src}
                                                    alt="face"
                                                    referrerPolicy="no-referrer"
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                />
                                                {isCover && (
                                                    <div style={{ position: 'absolute', top: '2px', right: '2px', background: 'var(--accent, #a78bfa)', color: 'white', fontSize: '8px', padding: '2px 4px', borderRadius: '4px', fontWeight: 800 }}>
                                                        COVER
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
