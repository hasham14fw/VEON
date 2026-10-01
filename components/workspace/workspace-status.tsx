'use client';

import React from 'react';
import type {Work} from './use-workspace';

export function WorkspaceStatus({w}: {w: Work}) {
  return (
    <>
      {w.notice && (
        <div className="notice" role="status">
          {w.notice}
          <button onClick={() => w.setNotice('')}>Dismiss</button>
        </div>
      )}
    </>
  );
}
