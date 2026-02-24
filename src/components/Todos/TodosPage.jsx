import { useState } from 'react';
import { useTodos } from '../../hooks/useTodos';
import TodoForm from './TodoForm';
import ConclusionModal from './ConclusionModal';
import { SkeletonCard } from '../Shared/Skeleton';

const PRIORITY_COLORS = { high: 'var(--danger)', medium: 'var(--warning)', low: 'var(--success)' };

export default function TodosPage() {
    const { todos, loading, create, complete, snooze, update } = useTodos();
    const [view, setView] = useState('list');   // 'list' | 'kanban'
    const [showForm, setShowForm] = useState(false);
    const [completing, setCompleting] = useState(null);
    const [filter, setFilter] = useState('pending');

    const today = new Date().toISOString().split('T')[0];

    const filtered = todos.filter(t => {
        if (filter === 'pending') return t.status === 'pending';
        if (filter === 'completed') return t.status === 'completed';
        if (filter === 'today') return t.status === 'pending' && String(t.due_date).substring(0, 10) === today;
        return t.status !== 'cancelled';
    });

    if (loading) return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[...Array(4)].map((_, i) => <SkeletonCard key={i} lines={2} />)}
        </div>
    );

    const kanbanCols = ['pending', 'completed'].map(status => ({
        status, items: todos.filter(t => t.status === status)
    }));

    return (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>✅ Todos</h2>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className={`filter-tab ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')}>List</button>
                    <button className={`filter-tab ${view === 'kanban' ? 'active' : ''}`} onClick={() => setView('kanban')}>Kanban</button>
                    <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>+ New Todo</button>
                </div>
            </div>

            {/* Filters */}
            <div className="filter-bar">
                {['all', 'pending', 'today', 'completed'].map(f => (
                    <button key={f} className={`filter-tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                ))}
            </div>

            {view === 'list' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {filtered.length === 0 && (
                        <div className="empty-state">
                            <div className="empty-emoji">✨</div>
                            <p>No todos here — all clear!</p>
                        </div>
                    )}
                    {filtered.map(todo => (
                        <div key={todo.todo_id} className={`todo-card ${parseInt(todo.rollover_count) > 0 ? 'rolled' : ''}`}>
                            <button
                                className={`check-circle ${todo.status === 'completed' ? 'checked' : ''}`}
                                disabled={todo.status === 'completed'}
                                onClick={() => todo.status !== 'completed' && setCompleting(todo)}
                            >
                                {todo.status === 'completed' ? '✓' : ''}
                            </button>
                            <div style={{ flex: 1 }}>
                                <div className="todo-title">{todo.title}</div>
                                {todo.description && <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: 2 }}>{todo.description}</div>}
                            </div>
                            <div className="todo-meta">
                                <div className={`priority-dot ${todo.priority}`} title={todo.priority} />
                                {todo.category && <span className="badge badge-ref">{todo.category}</span>}
                                <span className="due-date">{String(todo.due_date).substring(0, 10)}</span>
                                {parseInt(todo.rollover_count) > 0 && (
                                    <span className="rollover-badge">↩ {todo.rollover_count}</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    {kanbanCols.map(col => (
                        <div key={col.status} className="card">
                            <div className="section-title" style={{ textTransform: 'capitalize', marginBottom: '0.75rem' }}>
                                {col.status} ({col.items.length})
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {col.items.map(todo => (
                                    <div key={todo.todo_id} style={{ background: 'var(--surface2)', borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.75rem', fontSize: '0.85rem', fontWeight: 500 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <div className={`priority-dot ${todo.priority}`} />
                                            {todo.title}
                                        </div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 3 }}>{String(todo.due_date).substring(0, 10)}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showForm && (
                <div className="modal-overlay" onClick={() => setShowForm(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-title">New Todo</div>
                        <TodoForm onSave={async (params) => { await create(params); setShowForm(false); }} onCancel={() => setShowForm(false)} />
                    </div>
                </div>
            )}

            {completing && (
                <ConclusionModal
                    todo={completing}
                    onComplete={async (params) => { await complete({ todo_id: completing.todo_id, ...params }); setCompleting(null); }}
                    onClose={() => setCompleting(null)}
                />
            )}
        </div>
    );
}
