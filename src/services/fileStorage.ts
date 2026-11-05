import { useEffect, useState } from 'react';
import { supabase } from '@/db/supabase';
import type { LMSMaterial } from '@/types/campus';

// Private bucket (see supabase/00004_file_storage.sql). Rows store "storage:<path>" instead of a URL;
// a short-lived signed URL is made when someone opens the file.
export const PORTAL_BUCKET = 'student-portal-files';
const STORAGE_PREFIX = 'storage:';
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

function safeFileName(name: string) {
  const dot = name.lastIndexOf('.');
  const base = (dot > 0 ? name.slice(0, dot) : name).replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 80) || 'file';
  const ext = dot > 0 ? name.slice(dot).replace(/[^a-zA-Z0-9.]/g, '').slice(0, 10) : '';
  return `${base}${ext}`;
}

export function materialTypeFor(file: File): LMSMaterial['type'] {
  if (file.type.startsWith('video/')) return 'video';
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) return 'pdf';
  return 'document';
}

export async function uploadPortalFile(file: File, folder: string): Promise<string> {
  if (file.size > MAX_UPLOAD_BYTES) throw new Error('File is larger than the 50 MB limit.');
  const path = `${folder}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
  const { error } = await supabase.storage.from(PORTAL_BUCKET).upload(path, file, {
    contentType: file.type || 'application/octet-stream',
    upsert: false,
  });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  return `${STORAGE_PREFIX}${path}`;
}

export function isStoredFile(url: string) {
  return url.startsWith(STORAGE_PREFIX);
}

// Returns a URL the browser can open: signed for stored files, unchanged for external links.
export async function resolveFileUrl(url: string): Promise<string> {
  if (!isStoredFile(url)) return url;
  const { data, error } = await supabase.storage
    .from(PORTAL_BUCKET)
    .createSignedUrl(url.slice(STORAGE_PREFIX.length), 60 * 10);
  if (error || !data) throw new Error(error?.message || 'Could not open file.');
  return data.signedUrl;
}

// Opens the tab before the signed URL request so popup blockers treat it as part of the click.
export async function openPortalFile(url: string) {
  if (!isStoredFile(url)) {
    window.open(url, '_blank', 'noopener');
    return;
  }
  const tab = window.open('', '_blank');
  try {
    const signed = await resolveFileUrl(url);
    if (tab) tab.location.href = signed;
    else window.location.href = signed;
  } catch (err) {
    tab?.close();
    throw err;
  }
}

export async function deletePortalFile(url: string) {
  if (!isStoredFile(url)) return;
  await supabase.storage.from(PORTAL_BUCKET).remove([url.slice(STORAGE_PREFIX.length)]);
}

// ---------------------------------------------------------------- student photos

const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

// Shrinks to at most 600px on the long side and re-encodes as JPEG, so photos stay small.
async function downscale(file: File, max = 600): Promise<Blob> {
  const img = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not read that image.'))), 'image/jpeg', 0.85),
  );
}

export async function uploadStudentPhoto(studentId: string, file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file (JPG or PNG).');
  if (file.size > MAX_PHOTO_BYTES) throw new Error('Photo is larger than 8 MB.');
  const blob = await downscale(file);
  const path = `photos/${studentId}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from(PORTAL_BUCKET).upload(path, blob, { contentType: 'image/jpeg', upsert: false });
  if (error) throw new Error(`Photo upload failed: ${error.message}`);
  return `${STORAGE_PREFIX}${path}`;
}

// Signed URLs for stored files, cached for most of their 10-minute life.
const urlCache = new Map<string, { url: string; until: number }>();

export function useFileUrl(url?: string | null): string | null {
  const [resolved, setResolved] = useState<string | null>(() => (url && !isStoredFile(url) ? url : urlCache.get(url ?? '')?.url ?? null));
  useEffect(() => {
    if (!url) return setResolved(null);
    if (!isStoredFile(url)) return setResolved(url);
    const hit = urlCache.get(url);
    if (hit && hit.until > Date.now()) return setResolved(hit.url);
    let cancelled = false;
    resolveFileUrl(url)
      .then((signed) => {
        urlCache.set(url, { url: signed, until: Date.now() + 8 * 60 * 1000 });
        if (!cancelled) setResolved(signed);
      })
      .catch(() => !cancelled && setResolved(null));
    return () => {
      cancelled = true;
    };
  }, [url]);
  return resolved;
}
