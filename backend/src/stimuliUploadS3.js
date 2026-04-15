/**
 * File: src/stimuliUploadS3.js
 * Purpose: Presigned S3 PUT for admin media uploads; builds the public URL stored in stimuli.storage_key.
 * Dependencies: @aws-sdk/client-s3, @aws-sdk/s3-request-presigner, node:crypto, node:path
 */

const path = require('path');
const crypto = require('crypto');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const PRESIGN_EXPIRES_SEC = 15 * 60;

/** MIME types allowed for stimulus media (must match browser PUT Content-Type). */
const ALLOWED_MEDIA_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/webm',
  'audio/ogg',
  'audio/mp4',
]);

const EXT_TO_TYPE = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
};

function getConfig() {
  const bucket = process.env.AWS_S3_BUCKET?.trim();
  const region = (
    process.env.AWS_REGION ||
    process.env.AWS_DEFAULT_REGION ||
    ''
  ).trim();
  const publicBase = process.env.AWS_S3_PUBLIC_BASE_URL?.trim();
  return { bucket, region, publicBase: publicBase || null };
}

function isStimuliUploadConfigured() {
  const { bucket, region } = getConfig();
  return Boolean(bucket && region);
}

function safeBasename(filename) {
  const base = path.basename(filename || '') || 'media';
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, '_');
  return cleaned.slice(0, 180) || 'media';
}

function inferContentType(filename) {
  const ext = path.extname(filename || '').toLowerCase();
  return EXT_TO_TYPE[ext] ?? null;
}

function normalizeContentType(raw, filename) {
  const trimmed = raw && String(raw).trim();
  if (trimmed) {
    const lower = trimmed.toLowerCase();
    if (ALLOWED_MEDIA_TYPES.has(lower)) return lower;
  }
  const inferred = inferContentType(filename);
  if (inferred && ALLOWED_MEDIA_TYPES.has(inferred)) return inferred;
  return null;
}

function buildPublicUrl(bucket, region, key, publicBase) {
  const encodedKey = key.split('/').map(encodeURIComponent).join('/');
  if (publicBase) {
    const base = publicBase.replace(/\/$/, '');
    return `${base}/${encodedKey}`;
  }
  return `https://${bucket}.s3.${region}.amazonaws.com/${encodedKey}`;
}

function buildObjectKey(filename) {
  const id = crypto.randomUUID();
  const name = safeBasename(filename);
  return `stimuli/${id}-${name}`;
}

/**
 * @param {{ filename: string, contentType?: string|null }} input
 * @returns {Promise<{ uploadUrl: string, publicUrl: string, key: string, contentType: string }>}
 */
async function createPresignedStimulusUpload(input) {
  const { bucket, region, publicBase } = getConfig();
  if (!bucket || !region) {
    const err = new Error('S3 upload is not configured (missing AWS_S3_BUCKET or AWS_REGION)');
    err.code = 'S3_NOT_CONFIGURED';
    throw err;
  }

  const filename = input.filename;
  if (!filename || !String(filename).trim()) {
    const err = new Error('filename is required');
    err.code = 'VALIDATION';
    throw err;
  }

  const contentType = normalizeContentType(input.contentType, filename);
  if (!contentType) {
    const err = new Error(
      'unsupported or missing content type; use a common image, video, or audio format'
    );
    err.code = 'VALIDATION';
    throw err;
  }

  const key = buildObjectKey(filename);
  // Default SDK behavior adds CRC32 checksum query params to presigned PUTs; browsers do not
  // send the matching checksum headers, so S3 returns 403. WHEN_REQUIRED avoids that for PutObject.
  const client = new S3Client({
    region,
    requestChecksumCalculation: 'WHEN_REQUIRED',
  });
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });
  const uploadUrl = await getSignedUrl(client, command, {
    expiresIn: PRESIGN_EXPIRES_SEC,
  });
  const publicUrl = buildPublicUrl(bucket, region, key, publicBase);

  return { uploadUrl, publicUrl, key, contentType };
}

module.exports = {
  ALLOWED_MEDIA_TYPES,
  isStimuliUploadConfigured,
  createPresignedStimulusUpload,
};
