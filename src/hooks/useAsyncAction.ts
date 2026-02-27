import { useState, useCallback } from 'react';

type AsyncActionState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

export function useAsyncAction<T>() {
  const [state, setState] = useState<AsyncActionState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(async (fn: () => Promise<T>): Promise<T | null> => {
    setState({ data: null, loading: true, error: null });
    try {
      const result = await fn();
      setState({ data: result, loading: false, error: null });
      return result;
    } catch (err: any) {
      setState({ data: null, loading: false, error: err.message || 'An error occurred' });
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return { ...state, execute, reset };
}
