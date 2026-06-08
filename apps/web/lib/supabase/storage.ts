import { createServerClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

const MAX_SIZES: Record<string, number> = {
  avatars: 2 * 1024 * 1024,
  attachments: 50 * 1024 * 1024,
  exports: 100 * 1024 * 1024,
};

export async function signedUrl(bucket: string, path: string, ttlSeconds = 3600) {
  const supabase = await createServerClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, ttlSeconds);
  if (error) throw error;
  return data.signedUrl;
}

export async function uploadFile(bucket: string, path: string, file: File) {
  if (MAX_SIZES[bucket] && file.size > MAX_SIZES[bucket]) {
    throw new Error(`File exceeds ${MAX_SIZES[bucket]} byte limit for bucket ${bucket}`);
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw error;
  return data.path;
}

export async function deleteFile(bucket: string, path: string) {
  const supabase = await createServerClient();
  const { error } = await supabase.storage
    .from(bucket)
    .remove([path]);
  if (error) throw error;
}
