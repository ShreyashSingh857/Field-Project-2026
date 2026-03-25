import { useState, useCallback } from 'react';

export function useToast() {
    const [toast, setToast] = useState(null);
    const showToast = useCallback((message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    }, []);
    return { toast, showToast };
}

export function Toast({ toast }) {
    if (!toast) return null;
    return <div className={`toast ${toast.type}`}>{toast.message}</div>;
}
