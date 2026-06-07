import { authClient } from './client';

export async function enableTwoFactor(password: string) {
  const api = authClient.twoFactor;
  return (api as Record<string, CallableFunction>).enable({ password }) as Promise<{
    totpURI: string;
    secret: string;
  }>;
}

export async function disableTwoFactor(password: string) {
  const api = authClient.twoFactor;
  return (api as Record<string, CallableFunction>).disable({ password });
}

export async function verifyTwoFactor(code: string) {
  const api = authClient.twoFactor;
  return (api as Record<string, CallableFunction>).verifyTotp({ code });
}

export async function generateQRCode(totpURI: string): Promise<string> {
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(totpURI)}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to generate QR code');
  const blob = await response.blob();
  const arrayBuffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let base64 = '';
  for (let i = 0; i < bytes.length; i++) {
    base64 += String.fromCharCode(bytes[i]);
  }
  return `data:image/png;base64,${btoa(base64)}`;
}
