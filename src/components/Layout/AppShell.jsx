import { useState } from 'react';
import Sidebar from './Sidebar';
import MusicPlayer from './MusicPlayer';

export default function AppShell({ activeTab, onNavigate, userName, children }) {
    return (
        <>
            <div className="app-shell">
                <Sidebar active={activeTab} onNavigate={onNavigate} userName={userName} />
                <main className="content-area tab-enter" key={activeTab}>
                    {children}
                </main>
            </div>
            <MusicPlayer />
        </>
    );
}
