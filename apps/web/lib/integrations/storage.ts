import 'server-only';

import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

function getClient(): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
    },
    requestChecksumCalculation: 'whenRequired',
    responseChecksumValidation: 'whenRequired',
  });
}

const BUCKET = process.env.R2_BUCKET_NAME ?? 'rejira-1';

const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'application/pdf',
  'text/plain', 'text/csv',
  'application/json',
  'application/zip',
];

const MAX_SIZE = 10 * 1024 * 1024;

export { ALLOWED_TYPES, MAX_SIZE };

export function isAllowedFile(type: string, size: number): boolean {
  return ALLOWED_TYPES.includes(type) && size <= MAX_SIZE;
}

export async function getPresignedUploadUrl(
  key: string,
  contentType: string
): Promise<string> {
  const client = getClient();
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(client, command, { expiresIn: 600 });
}

export async function getPresignedDownloadUrl(key: string): Promise<string> {
  const client = getClient();
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });
  return getSignedUrl(client, command, { expiresIn: 3600 });
}

export async function deleteFile(key: string): Promise<void> {
  const client = getClient();
  const command = new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });
  await client.send(command);
}
