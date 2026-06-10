// Vitest no-op mock for 'server-only' (Next.js convention)
// The real module prevents server code from being used client-side,
// but vitest runs in Node, so this is a harmless no-op.
export {};
