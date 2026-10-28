// Image/video asset inspection for PMAX. This app has no binary file-storage
// backend (Facebook ads and Search sitelinks are also reference-only), so
// assets are decoded once at attach time — server-side, from the actual file
// bytes, never trusted from a filename/extension — and only the resulting
// metadata (width/height/mime/size/checksum) is kept in the store. This
// module is pure and synchronous so it's trivially unit-testable; the API
// route that calls it (api/campaign/pmax/inspect-asset) is the only place
// that touches a request body.

import { createHash } from 'crypto';
import {
  PMAX_IMAGE_SPECS, PMAX_MAX_IMAGE_FILE_SIZE_KB, PMAX_RATIO_TOLERANCE,
  PMAX_MIN_VIDEO_DURATION_SECONDS,
} from './pmaxDefaults';
import type { PmaxAssetRole } from './pmaxTypes';

export interface DecodedImage {
  format: 'png' | 'jpeg';
  width: number;
  height: number;
}

/**
 * Reads real pixel dimensions out of the file's own bytes — a renamed
 * non-image file (or a corrupt one) fails to decode here regardless of what
 * its extension claims. Supports PNG and JPEG, the two formats the report
 * asks this app to prefer for generated packages; anything else returns
 * null and the caller treats it as "could not decode".
 */
export function decodeImageDimensions(buf: Buffer): DecodedImage | null {
  // PNG: 8-byte signature, then an IHDR chunk whose first 8 bytes after the
  // signature are length+type, followed by 4-byte BE width then height.
  if (buf.length >= 24 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    if (width > 0 && height > 0) return { format: 'png', width, height };
    return null;
  }

  // JPEG: starts with SOI (FFD8), then a sequence of markers. The frame
  // marker (SOF0..SOF15, excluding DHT 0xC4/JPG 0xC8/DAC 0xCC) holds
  // dimensions as: marker(2) length(2) precision(1) height(2) width(2).
  if (buf.length >= 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let offset = 2;
    while (offset + 4 <= buf.length) {
      if (buf[offset] !== 0xff) { offset += 1; continue; }
      const marker = buf[offset + 1];
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
        offset += 2;
        continue;
      }
      const segmentLength = buf.readUInt16BE(offset + 2);
      const isSofMarker = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isSofMarker) {
        if (offset + 9 > buf.length) return null;
        const height = buf.readUInt16BE(offset + 5);
        const width = buf.readUInt16BE(offset + 7);
        if (width > 0 && height > 0) return { format: 'jpeg', width, height };
        return null;
      }
      if (marker === 0xda) break; // start of scan — no more markers to read
      offset += 2 + segmentLength;
    }
    return null;
  }

  return null;
}

export function sha256Hex(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex');
}

export interface ImageAssetMetadata {
  mimeType: string;
  width: number;
  height: number;
  fileSizeBytes: number;
  checksum: string;
}

/** Decodes + hashes an uploaded image file. Returns null if the bytes don't
 *  decode as a supported format — the caller should then reject the upload
 *  rather than storing unverified dimensions. */
export function inspectImageFile(buf: Buffer): ImageAssetMetadata | null {
  const decoded = decodeImageDimensions(buf);
  if (!decoded) return null;
  return {
    mimeType: decoded.format === 'png' ? 'image/png' : 'image/jpeg',
    width: decoded.width,
    height: decoded.height,
    fileSizeBytes: buf.length,
    checksum: sha256Hex(buf),
  };
}

/** Image/logo roles this module knows real specs for. */
export type PmaxImageRole = keyof typeof PMAX_IMAGE_SPECS;

export function isPmaxImageRole(role: PmaxAssetRole): role is PmaxImageRole {
  return role in PMAX_IMAGE_SPECS;
}

/** Blocking checks for one already-decoded image asset against its role's
 *  spec. Returns an empty array when valid. Pure — no file I/O. */
export function validateImageAssetMetadata(
  role: PmaxImageRole,
  meta: { width?: number; height?: number; fileSizeBytes?: number; mimeType?: string },
  label: string,
): string[] {
  const errors: string[] = [];
  const spec = PMAX_IMAGE_SPECS[role];

  if (meta.fileSizeBytes != null && meta.fileSizeBytes > PMAX_MAX_IMAGE_FILE_SIZE_KB * 1024) {
    errors.push(`${label}: file is ${(meta.fileSizeBytes / 1024).toFixed(0)} KB (max ${PMAX_MAX_IMAGE_FILE_SIZE_KB} KB).`);
  }
  if (meta.mimeType && meta.mimeType !== 'image/png' && meta.mimeType !== 'image/jpeg') {
    errors.push(`${label}: unsupported image format "${meta.mimeType}" — use JPG or PNG.`);
  }
  if (!meta.width || !meta.height) {
    errors.push(`${label}: could not read image dimensions — the file may be corrupt or not a real image.`);
    return errors;
  }
  if (meta.width < spec.minWidth || meta.height < spec.minHeight) {
    errors.push(`${label}: ${meta.width}×${meta.height} is below the minimum ${spec.minWidth}×${spec.minHeight}.`);
  }
  const actualRatio = meta.width / meta.height;
  if (Math.abs(actualRatio - spec.ratio) / spec.ratio > PMAX_RATIO_TOLERANCE) {
    errors.push(`${label}: aspect ratio ${actualRatio.toFixed(2)}:1 doesn't match the required ${spec.ratio.toFixed(2)}:1 for this role.`);
  }
  return errors;
}

const YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{11}$/;

export function isValidYoutubeId(id: string): boolean {
  return YOUTUBE_ID_RE.test(id.trim());
}

/** Video metadata is mostly unverifiable without hitting the YouTube API
 *  (out of scope here), so this only blocks on the things we CAN check from
 *  what the user enters: a well-formed ID and, when they supply a duration,
 *  that it meets Google's minimum. Missing/unknown duration is a warning,
 *  never a blocker. */
export function validateVideoAsset(
  videoId: string,
  label: string,
  durationSeconds?: number,
): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isValidYoutubeId(videoId)) {
    errors.push(`${label}: "${videoId}" is not a valid 11-character YouTube video ID.`);
  }
  if (durationSeconds != null && durationSeconds < PMAX_MIN_VIDEO_DURATION_SECONDS) {
    errors.push(`${label}: video is ${durationSeconds}s, below Google's ${PMAX_MIN_VIDEO_DURATION_SECONDS}s minimum.`);
  }
  if (durationSeconds == null) {
    warnings.push(`${label}: duration/orientation not verified — Google may reject this video if it's under ${PMAX_MIN_VIDEO_DURATION_SECONDS}s.`);
  }
  return { errors, warnings };
}
