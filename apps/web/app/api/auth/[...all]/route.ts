export const runtime = 'nodejs';

import { auth } from '@/lib/auth/server';
import { toNextJsHandler } from 'better-auth/next-js';

const handler = toNextJsHandler(auth);

export const { GET, POST } = handler;
