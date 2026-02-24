import { useState } from 'react';

const ACTIONS = [
    { icon: '✏️', label: 'New Journal Entry', tab: 'journal' },
    { icon: '✅', label: 'Add Todo', tab: 'todos' },
    { icon: '💡', label: 'New Insight', tab: 'insights' },
    { icon: '🔥', label: 'Log Habit', tab: 'habits' },
];

export default function QuickCapture({ onNavigate }) {
    const [open, setOpen] = useState(false);

    return (
        <div className="fab">
            {open && (
                <div className="fab-menu">
                    {ACTIONS.map(a => (
                        <button key={a.tab} className="fab-item" onClick={() => { onNavigate(a.tab); setOpen(false); }}>
                            <span>{a.icon}</span> {a.label}
                        </button>
                    ))}
                </div>
            )}
            <button className={`fab-btn ${open ? 'open' : ''}`} onClick={() => setOpen(o => !o)} title="Quick Capture">
                +
            </button>
        </div>
    );
}
