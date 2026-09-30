'use client';

import React, {useState, useEffect, useRef} from 'react';
import {Moon} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Switch} from '@/components/ui/switch';
import {localDay} from '@/lib/horizon/engine';
import type {Work} from './use-workspace';

export const zones = [
  'Asia/Dubai',
  'Europe/Kyiv',
  'Asia/Karachi',
  'Asia/Tashkent',
  'Asia/Almaty',
  'Asia/Dhaka',
];

export function MoonControl({w}: {w: Work}) {
  const replayInput = useRef<HTMLInputElement>(null);
  const [moon, setMoon] = useState<any>(null);
  const [at, setAt] = useState('');
  const [now, setNow] = useState(new Date().toISOString());
  const prefs = w.data?.preferences || {moon: false, timezone: 'Asia/Dubai'};

  useEffect(() => {
    const update = () => setNow(new Date().toISOString());
    const timer = setInterval(update, 60000);
    document.addEventListener('visibilitychange', update);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);

  const day = localDay(now, prefs.timezone);

  useEffect(() => {
    let active = true;
    if (prefs.moon) {
      setMoon(null);
      fetch(
        '/api/moon?timezone=' +
          encodeURIComponent(prefs.timezone) +
          (at ? '&at=' + encodeURIComponent(at + 'T12:00:00Z') : '')
      )
        .then((r) => r.json())
        .then((d) => {
          if (active) setMoon(d);
        })
        .catch(() => {
          if (active) setMoon({available: false});
        });
    }
    return () => {
      active = false;
    };
  }, [prefs.moon, prefs.timezone, at, day]);

  return (
    <div className="moon-area">
      <div className="display-toolbar">
        <label className="switch-label">
          <Moon size={17} />
          <Switch
            aria-label="Show moon phase"
            checked={prefs.moon}
            disabled={!w.data || w.busy}
            onCheckedChange={(moon) => w.mutate('preferences', {data: {...prefs, moon}})}
          />{' '}
          Show moon phase
        </label>
        {prefs.moon && (
          <>
            <label>
              Timezone
              <select
                aria-label="Moon timezone"
                value={prefs.timezone}
                onChange={(e) => w.mutate('preferences', {data: {...prefs, timezone: e.target.value}})}
              >
                {zones.map((z) => (
                  <option key={z}>{z}</option>
                ))}
              </select>
            </label>
            <label>
              Replay date
              <Input ref={replayInput} type="date" aria-label="Moon replay date" defaultValue="" />
            </label>
            <Button variant="outline" onClick={() => setAt(replayInput.current?.value || '')}>
              Apply date
            </Button>
            {at && (
              <Button
                variant="ghost"
                onClick={() => {
                  setAt('');
                  if (replayInput.current) replayInput.current.value = '';
                }}
              >
                Today
              </Button>
            )}
          </>
        )}
      </div>
      {prefs.moon && (
        <div className="moon-panel">
          <Moon size={28} />
          <div>
            <h3>
              {!moon
                ? 'Loading moon phase…'
                : moon.available
                ? `Full moon ${at ? 'on ' + moon.day : 'today'}: ${moon.fullMoon ? 'Yes' : 'No'}`
                : 'Moon phase unavailable'}
            </h3>
            <p>
              {moon?.available ? (
                <>
                  Next full moon:{' '}
                  {moon.next
                    ? new Date(moon.next).toLocaleString('en-GB', {timeZone: prefs.timezone})
                    : 'Outside cached interval'}{' '}
                  · {prefs.timezone}
                </>
              ) : (
                'A verified ephemeris is required to determine the phase.'
              )}
            </p>
            <small title="Yes means the exact full-moon instant falls within this local calendar date.">
              {moon?.source || 'US Naval Observatory'} · Astronomical context only; excluded from all risk scoring.
              {moon?.cached ? ' · Cached ephemeris' : ''}
            </small>
          </div>
        </div>
      )}
    </div>
  );
}
