import {env} from '@/lib/horizon/env';
export function database(){if(!env.DB)throw new Error('Situation storage unavailable');return env.DB;}
