'use client';

import {useState, useEffect, useCallback} from 'react';
import type {Workspace} from '@/lib/horizon/model';
import React from 'react';

export function Tag({children}: {children: React.ReactNode}) {
  return (
    <span className={'h-tag ' + String(children).toLowerCase().replaceAll(' ', '-')}>
      {children}
    </span>
  );
}

export const stamp = (v: string) =>
  new Date(v).toLocaleString('en-GB', {timeZone: 'Asia/Dubai'}) + ' Dubai';

export function exportJSON(data: unknown, name: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'}));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function useWorkspace() {
  const [data, setData] = useState<Workspace | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const refresh = useCallback(async () => {
    try {
      const r = await fetch('/api/workspace');
      if (r.status === 401) {
        window.location.href = '/login';
        return;
      }
      const d = (await r.json()) as Workspace & {error?: string};
      if (!r.ok) throw Error(d.error);
      setData(d);
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function mutate(action: string, payload: Record<string, unknown>) {
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/workspace', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({action, ...payload}),
      });
      const result = (await r.json()) as {error?: string};
      if (!r.ok) throw Error(result.error);
      await refresh();
      setNotice('Saved to workspace');
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  return {data, error, busy, notice, setNotice, setError, refresh, mutate};
}

export type Work = ReturnType<typeof useWorkspace>;
