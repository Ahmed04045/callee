// src/lib/imageUpload.js
//
// Thin wrapper around Supabase Storage — both avatar and event-photo
// uploads follow the same shape (validate, upload, get a public URL), so
// this is the one place that logic lives.

import { supabase } from './supabaseClient';

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB

export function validateImageFile(file) {
  if (!file) return 'No file selected.';
  if (!file.type.startsWith('image/')) return 'That file isn\'t an image.';
  if (file.size > MAX_FILE_BYTES) return 'Image is too large — 5MB max.';
  return null;
}

/**
 * @param {string} bucket - 'avatars' | 'event-photos'
 * @param {string} path - full object path, e.g. `${userId}/avatar.jpg`
 * @param {File} file
 * @returns {Promise<{url: string|null, error: string|null}>}
 */
export async function uploadImage(bucket, path, file) {
  const validationError = validateImageFile(file);
  if (validationError) return { url: null, error: validationError };

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: true, cacheControl: '3600' });

  if (uploadError) return { url: null, error: uploadError.message };

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  // Cache-bust: re-uploading to the same path keeps the same public URL,
  // so without this a browser/CDN could keep serving the old cached image
  // even after a successful re-upload.
  return { url: `${data.publicUrl}?t=${Date.now()}`, error: null };
}

export async function deleteImage(bucket, path) {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  return { error: error?.message ?? null };
}

export function fileExtension(file) {
  const parts = file.name.split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : 'jpg';
}