import { useState, useEffect } from 'react';
import { getAppPassword, setAppPassword } from '../../services/api';

// Lock ID for the Vault — other locks would use different IDs
const LOCK_ID = 'vault';
// NOTE: No sessionStorage — unlock is in-memory only.
// Switching app tabs or refreshing the page will re-lock the Vault.

// Offline emergency password (random int for offline access)
const OFFLINE_EMERGENCY_PASSWORD = '8734'; // Hardcoded random int for offline unlock

// SHA-256 using Web Crypto API
async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─── Lock Screen UI ──────────────────────────────────────────
function LockScreen({ mode, onSubmit, error, loading }) {
    const [pwd, setPwd] = useState('');
    const [confirm, setConfirm] = useState('');

    const handleSubmit = (e) => { e.preventDefault(); onSubmit(pwd, confirm); };

    const isOfflineMode = mode === 'locked_offline';
    const isSetMode = mode === 'set';

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'linear-gradient(135deg, #0a0a1a 0%, #12112b 50%, #0a0a1a 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
            <div style={{
                width: '100%', maxWidth: '380px', padding: '2.5rem',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '24px',
                boxShadow: '0 30px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
                textAlign: 'center',
            }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem', filter: 'drop-shadow(0 0 20px rgba(167,139,250,0.6))' }}>
                    {isOfflineMode ? '📱' : '🔒'}
                </div>

                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.4rem' }}>
                    {isSetMode ? 'Set Vault Password' : isOfflineMode ? 'Vault (Offline Mode)' : 'Vault Locked'}
                </h2>
                <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)', marginBottom: '2rem' }}>
                    {isSetMode
                        ? 'Create a password to protect your Vault.'
                        : isOfflineMode
                        ? 'Use your emergency password to access the Vault.'
                        : 'Enter your password to access the Vault.'}
                </p>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <input type="password" placeholder={isSetMode ? 'New password' : isOfflineMode ? 'Emergency password' : 'Password'}
                        value={pwd} onChange={e => setPwd(e.target.value)} autoFocus required
                        style={{ width: '100%', padding: '0.9rem 1.1rem', borderRadius: '12px', background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.12)', color: 'white', fontSize: '1rem', outline: 'none', boxSizing: 'border-box', letterSpacing: '0.1em' }} />
                    {isSetMode && (
                        <input type="password" placeholder="Confirm password"
                            value={confirm} onChange={e => setConfirm(e.target.value)} required
                            style={{ width: '100%', padding: '0.9rem 1.1rem', borderRadius: '12px', background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.12)', color: 'white', fontSize: '1rem', outline: 'none', boxSizing: 'border-box', letterSpacing: '0.1em' }} />
                    )}
                    {error && (
                        <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '0.6rem 1rem', color: '#f87171', fontSize: '0.82rem' }}>
                            {error}
                        </div>
                    )}
                    <button type="submit" disabled={loading}
                        style={{ padding: '0.9rem', borderRadius: '12px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '0.95rem', marginTop: '0.25rem', background: loading ? 'rgba(167,139,250,0.4)' : 'linear-gradient(135deg, #a78bfa, #7c3aed)', color: 'white', boxShadow: '0 6px 20px rgba(167,139,250,0.3)', transition: 'all 0.2s' }}>
                        {loading ? 'Please wait…' : mode === 'set' ? 'Set Password' : 'Unlock'}
                    </button>
                </form>
            </div>
        </div>
    );
}

// ─── VaultLock ───────────────────────────────────────────────
// Wraps children behind a password that is stored in Google Sheets.
// Lock is identified by LOCK_ID so multiple locks can coexist.
export default function VaultLock({ children }) {
    const [status, setStatus] = useState('loading'); // loading | set | locked | unlocked | locked_offline
    const [storedHash, setStoredHash] = useState(null);
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    useEffect(() => {
        // Always fetch from Sheets — no session persistence, locks on every mount
        getAppPassword(LOCK_ID)
            .then(res => {
                const data = res?.data || res;
                if (data?.found && data?.hash) {
                    setStoredHash(data.hash);
                    setStatus('locked');
                } else {
                    setStatus('set');
                }
            })
            .catch(() => {
                // Offline: show locked with emergency password hint
                if (!navigator.onLine) {
                    setStatus('locked_offline');
                } else {
                    setStatus('set');
                }
            });
    }, []);

    const handleSubmit = async (pwd, confirm) => {
        setError('');
        setSubmitting(true);
        try {
            if (status === 'set') {
                if (pwd.length < 6) { setError('Password must be at least 6 characters.'); return; }
                if (pwd !== confirm) { setError('Passwords do not match.'); return; }
                const hash = await sha256(pwd);
                await setAppPassword(LOCK_ID, 'Vault Lock', hash);
                setStatus('unlocked');
            } else if (status === 'locked_offline') {
                // Offline mode: check emergency password
                if (pwd === OFFLINE_EMERGENCY_PASSWORD) {
                    setStatus('unlocked');
                } else {
                    setError('Incorrect emergency password. Try again.');
                }
            } else {
                const hash = await sha256(pwd);
                if (hash === storedHash) {
                    setStatus('unlocked');
                } else {
                    setError('Incorrect password. Try again.');
                }
            }
        } finally { setSubmitting(false); }
    };

    if (status === 'loading') return (
        <div style={{ position: 'fixed', inset: 0, background: '#0a0a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, fontSize: '2rem' }}>🔒</div>
    );
    if (status === 'unlocked') return children;
    return <LockScreen mode={status} onSubmit={handleSubmit} error={error} loading={submitting} />;
}
