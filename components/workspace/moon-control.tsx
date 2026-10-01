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
  return null;
}
