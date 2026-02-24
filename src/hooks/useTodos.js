import { useState, useEffect, useCallback } from 'react';
import * as api from '../services/api';
import { useToast } from '../context/ToastContext';

export function useTodos() {
    const [todos, setTodos] = useState([]);
    const [loading, setLoading] = useState(true);
    const { addToast } = useToast();

    const load = useCallback(async () => {
        try {
            const data = await api.getTodos();
            setTodos(data || []);
        } catch (e) {
            addToast('Failed to load todos', 'error');
        } finally { setLoading(false); }
    }, []);

    // Rollover check on mount — runs once per day
    useEffect(() => {
        api.rolloverTodos()
            .then(() => load())
            .catch(() => load());
    }, []);

    const create = async (params) => {
        try {
            const todo = await api.createTodo(params);
            setTodos(prev => [...prev, todo]);
            addToast('Todo added', 'success');
            return todo;
        } catch (e) {
            addToast('Failed to create todo', 'error');
            throw e;
        }
    };

    const update = async (params) => {
        try {
            await api.updateTodo(params);
            setTodos(prev => prev.map(t => t.todo_id === params.todo_id ? { ...t, ...params } : t));
        } catch (e) { addToast('Failed to update todo', 'error'); }
    };

    const complete = async (params) => {
        try {
            await api.completeTodo(params);
            setTodos(prev => prev.map(t => t.todo_id === params.todo_id ? { ...t, status: 'completed' } : t));
            addToast('Todo completed! 🎉', 'success');
        } catch (e) {
            addToast(e.message || 'Failed to complete todo', 'error');
            throw e;
        }
    };

    const snooze = async (todo_id, snooze_until) => {
        try {
            await api.snoozeTodo({ todo_id, snooze_until });
            setTodos(prev => prev.map(t => t.todo_id === todo_id ? { ...t, status: 'snoozed', snooze_until } : t));
            addToast('Todo snoozed', 'info');
        } catch (e) { addToast('Failed to snooze', 'error'); }
    };

    const todayTodos = todos.filter(t => {
        const today = new Date().toISOString().split('T')[0];
        return t.status === 'pending' && String(t.due_date).substring(0, 10) === today;
    });

    return { todos, todayTodos, loading, create, update, complete, snooze, refresh: load };
}
