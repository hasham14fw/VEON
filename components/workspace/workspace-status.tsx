'use client';

import React from 'react';
import type {Work} from './use-workspace';

export function WorkspaceStatus({w}: {w: Work}) {
  return (
    <>
      {w.error && (
        <div className="error" role="alert">
          {w.error} <button onClick={w.refresh}>Reload workspace</button>
        </div>
      )}
      {w.notice && (
        <div className="notice" role="status">
          {w.notice}
          <button onClick={() => w.setNotice('')}>Dismiss</button>
        </div>
      )}
    </>
  );
}
