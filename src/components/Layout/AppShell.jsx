import { useState } from 'react';
import Sidebar from './Sidebar';
import MusicPlayer from './MusicPlayer';

export default function AppShell({ activeTab, onNavigate, userName, isOffline, preload, onPreload, children }) {
    const progress = preload?.total > 0 ? (preload.current / preload.total) * 100 : 0;

    return (
        <>
            {/* ── Floating Preloader Pill ── */}
            {preload?.active && (
                <div style={{
                    position: 'fixed', bottom: '2rem', right: '2rem',
                    background: 'var(--surface, #1a1a2e)',
                    border: '1px solid rgba(167, 139, 250, 0.4)',
                    borderRadius: '100px',
                    padding: '0.6rem 1.25rem',
                    display: 'flex', alignItems: 'center', gap: '12px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.5), 0 0 15px rgba(167, 139, 250, 0.1)',
                    zIndex: 10000,
                    animation: 'pill-bounce 2s infinite ease-in-out, fade-in-up 0.5s ease'
                }}>
                    <div className="spinner-mini" style={{ width: '14px', height: '14px' }} />
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Caching Vault
                        </span>
                        <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>
                            {preload.current} / {preload.total} items
                        </span>
                    </div>

                    <div style={{ width: '80px', height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '10px', overflow: 'hidden' }}>
                        <div style={{ 
                            width: `${progress}%`, height: '100%', 
                            background: 'var(--accent)', 
                            transition: 'width 0.3s ease-out',
                            boxShadow: '0 0 8px var(--accent)'
                        }} />
                    </div>
                </div>
            )}

            <div className={`app-shell ${isOffline ? 'is-offline' : ''}`}>
                <Sidebar 
                    active={activeTab} 
                    onNavigate={onNavigate} 
                    userName={userName} 
                    isOffline={isOffline} 
                    onPreload={onPreload}
                    isPreloading={preload?.active}
                />

                <main className="content-area tab-enter" key={activeTab}>
                    {children}
                </main>
            </div>
            <MusicPlayer />
        </>
    );
}
