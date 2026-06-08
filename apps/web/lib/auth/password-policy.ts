export const PASSWORD_MIN_LENGTH = 12;

const COMMON = new Set([
  'password', 'password123', 'password1234', 'password1',
  'password12', 'password12345', 'password!', 'password.',
  '12345678', '123456789', '1234567890', '12345678901',
  '123456789012', '123456789a', '123456789ab',
  'qwerty123', 'qwerty1234', 'qwertyuiop', 'qwertyuiop1',
  'letmein12', 'letmein123', 'letmein1234',
  'adminadmin', 'administrator', 'admin12345',
  'welcome12', 'welcome123', 'welcome1', 'welcome1234',
  'monkey123', 'dragon123', 'dragonball',
  'master123', 'football12', 'football123',
  'baseball12', 'sunshine1', 'sunshine12',
  'iloveyou1', 'trustno1', 'trustno12',
  'princess1', 'rockyou12',
  'charlie123', 'donald123',
  'jordan123', 'michael123',
  'superman1', 'batman123',
  'starwars1', 'pokemon12',
  'naruto123', 'dragonbal',
  'passw0rd1', 'p@ssword12', 'p@ssw0rd12',
  'changeme12', 'whatever12', 'whatever123',
  'aaaaaaa123', '11111111111', '111111111111',
  'abc1234567', 'testtest12', 'testing123',
  'temp1234567', 'qazwsxedc1', 'zaq12wsxc3', '1qaz2wsx3e',
  'zxcvbnm123', 'asdfghjkl1', 'qwertasdfg1',
  'shadow123', 'hunter12', 'hunter123', 'hunter1234',
  'computer1', 'internet1',
  'mypass123', 'mypassword', 'mypassword1',
  'pass12345', 'password!@#',
  'secret123', 'secret1234',
  'summer123', 'winter123', 'spring123',
  'thunder1', 'lightning',
  'mustang1', 'corvette1',
  'cheese123', 'pepper123',
  'banana123', 'orange123',
]);

export function checkStrength(password: string): {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  color: string;
} {
  if (!password || password.length < 8) {
    return { score: 0, label: 'None', color: '#6b7280' };
  }

  let score = 0;
  const checks: { passed: boolean; weight: number }[] = [
    { passed: password.length >= 8, weight: 1 },
    { passed: password.length >= 12, weight: 1 },
    { passed: password.length >= 16, weight: 1 },
    { passed: /[A-Z]/.test(password), weight: 1 },
    { passed: /[a-z]/.test(password), weight: 1 },
    { passed: /[0-9]/.test(password), weight: 1 },
    { passed: /[^A-Za-z0-9]/.test(password), weight: 1 },
    { passed: /[A-Z].*[A-Z]/.test(password), weight: 0.5 },
    { passed: /[0-9].*[0-9]/.test(password), weight: 0.5 },
    { passed: /[^A-Za-z0-9].*[^A-Za-z0-9]/.test(password), weight: 0.5 },
  ];

  const totalWeight = checks.reduce((sum, c) => sum + (c.passed ? c.weight : 0), 0);

  if (totalWeight >= 7) score = 4;
  else if (totalWeight >= 5) score = 3;
  else if (totalWeight >= 3) score = 2;
  else if (totalWeight >= 1) score = 1;
  else score = 0;

  if (score >= 4) return { score: 4, label: 'Excellent', color: '#22c55e' };
  if (score === 3) return { score: 3, label: 'Strong', color: '#84cc16' };
  if (score === 2) return { score: 2, label: 'Fair', color: '#f59e0b' };
  if (score === 1) return { score: 1, label: 'Weak', color: '#f97316' };
  return { score: 0, label: 'Very weak', color: '#ef4444' };
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

export async function validatePassword(password: string): Promise<string | null> {
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
