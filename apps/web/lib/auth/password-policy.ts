export const PASSWORD_MIN_LENGTH = 12;

const COMMON = new Set([
  'password', 'password123', 'password1234', 'password1',
  '12345678', '123456789', '1234567890', '12345678901',
  'qwerty123', 'qwerty1234', 'qwertyuiop',
  'letmein12', 'letmein123',
  'adminadmin', 'administrator',
  'welcome12', 'welcome123',
  'monkey123', 'dragon123',
  'master123', 'football12',
  'baseball12', 'sunshine1',
  'iloveyou1', 'trustno1',
  'princess1', 'rockyou12',
  'charlie123', 'donald123',
  'jordan123', 'michael123',
  'superman1', 'batman123',
  'starwars1', 'pokemon12',
  'naruto123', 'dragonbal',
  'passw0rd1', 'p@ssword12',
  'changeme12', 'whatever12',
  'aaaaaaa123', '11111111111',
  'abc1234567', 'testtest12',
  'temp1234567', 'qazwsxedc1',
  'zaq12wsxc3', '1qaz2wsx3e',
]);

export function validatePassword(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return 'Password must be at least 12 characters';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter';
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one number';
  }
  if (isCommon(password)) {
    return 'This password is too common';
  }
  return null;
}

function isCommon(password: string): boolean {
  const lower = password.toLowerCase();
  if (COMMON.has(lower)) return true;
  const stripped = lower.replace(/[^a-z0-9]/g, '');
  if (COMMON.has(stripped)) return true;
  if (stripped.length < 8) return false;
  for (const common of COMMON) {
    if (common.length >= 8 && stripped.startsWith(common)) return true;
  }
  return false;
}

export function checkBreach(_password: string): Promise<boolean> {
  return Promise.resolve(false);
}
