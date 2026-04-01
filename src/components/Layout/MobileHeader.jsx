import React from 'react';

/**
 * MobileHeader - Top Header for branding and status
 */
export default function MobileHeader({ userName, isOffline }) {
    return (
        <header className="mobile-header">
            <div className="mobile-header-branding">
                <span className="mobile-header-logo">🌙</span>
                <span className="mobile-header-title">Luna's Notes</span>
            </div>
            
            <div className="mobile-header-status">
                {isOffline && <span className="status-badge offline">☁️ Offline</span>}
                <div className="mobile-user-avatar">{userName?.charAt(0) || 'U'}</div>
            </div>
        </header>
    );
}
