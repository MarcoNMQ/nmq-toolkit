import { describe, expect, it } from 'vitest';
import {
  decodeImageDimensions, inspectImageFile, isValidYoutubeId, sha256Hex,
  validateImageAssetMetadata, validateVideoAsset,
} from '../pmaxAssetValidation';

/** Builds a minimal, real PNG file (1x1 IHDR header is enough — we only
 *  read width/height, never decode pixel data) for the given dimensions. */
function makePngBuffer(width: number, height: number): Buffer {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdrLen = Buffer.alloc(4); ihdrLen.writeUInt32BE(13, 0);
  const ihdrType = Buffer.from('IHDR');
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 2; // color type
  const crc = Buffer.alloc(4); // not validated by our decoder
  return Buffer.concat([signature, ihdrLen, ihdrType, ihdrData, crc]);
}

/** Builds a minimal real JPEG with just SOI + a bare SOF0 segment carrying
 *  the given dimensions — enough for our marker scanner, not a renderable image. */
function makeJpegBuffer(width: number, height: number): Buffer {
  const soi = Buffer.from([0xff, 0xd8]);
  const sof0Marker = Buffer.from([0xff, 0xc0]);
  const length = Buffer.alloc(2); length.writeUInt16BE(8, 0); // length field itself + precision + h + w + 1 component byte(minimal)
  const body = Buffer.alloc(6);
  body[0] = 8; // precision
  body.writeUInt16BE(height, 1);
  body.writeUInt16BE(width, 3);
  body[5] = 0;
  const eoi = Buffer.from([0xff, 0xd9]);
  return Buffer.concat([soi, sof0Marker, length, body, eoi]);
}

describe('decodeImageDimensions', () => {
  it('reads real width/height from a PNG IHDR chunk', () => {
    const decoded = decodeImageDimensions(makePngBuffer(1200, 628));
    expect(decoded).toEqual({ format: 'png', width: 1200, height: 628 });
  });

  it('reads real width/height from a JPEG SOF0 segment', () => {
    const decoded = decodeImageDimensions(makeJpegBuffer(1200, 1200));
    expect(decoded).toEqual({ format: 'jpeg', width: 1200, height: 1200 });
  });

  it('returns null for a file that is not actually an image, regardless of extension', () => {
    const fakeImage = Buffer.from('this is just a text file pretending to be a .jpg', 'utf8');
    expect(decodeImageDimensions(fakeImage)).toBeNull();
  });

  it('returns null for a truncated/corrupt PNG', () => {
    const truncated = makePngBuffer(1200, 628).subarray(0, 10);
    expect(decodeImageDimensions(truncated)).toBeNull();
  });
});

describe('inspectImageFile', () => {
  it('returns mime type, dimensions, size and a checksum for a valid PNG', () => {
    const buf = makePngBuffer(600, 314);
    const meta = inspectImageFile(buf);
    expect(meta).not.toBeNull();
    expect(meta!.mimeType).toBe('image/png');
    expect(meta!.width).toBe(600);
    expect(meta!.height).toBe(314);
    expect(meta!.fileSizeBytes).toBe(buf.length);
    expect(meta!.checksum).toBe(sha256Hex(buf));
  });

  it('returns null for an undecodable file', () => {
    expect(inspectImageFile(Buffer.from('not an image'))).toBeNull();
  });
});

describe('validateImageAssetMetadata', () => {
  it('passes a landscape image meeting the spec', () => {
    const errors = validateImageAssetMetadata('marketing_image_landscape', { width: 1200, height: 628, fileSizeBytes: 500_000, mimeType: 'image/jpeg' }, 'Landscape 1');
    expect(errors).toEqual([]);
  });

  it('blocks an undersized image', () => {
    const errors = validateImageAssetMetadata('marketing_image_square', { width: 100, height: 100, mimeType: 'image/png' }, 'Square 1');
    expect(errors.some((e) => e.includes('below the minimum'))).toBe(true);
  });

  it('blocks a wrong aspect ratio', () => {
    const errors = validateImageAssetMetadata('logo_square', { width: 400, height: 128, mimeType: 'image/png' }, 'Logo 1');
    expect(errors.some((e) => e.includes("doesn't match the required"))).toBe(true);
  });

  it('blocks an oversized file', () => {
    const errors = validateImageAssetMetadata('marketing_image_square', { width: 1200, height: 1200, fileSizeBytes: 6_000_000, mimeType: 'image/jpeg' }, 'Square 1');
    expect(errors.some((e) => e.includes('max 5120 KB'))).toBe(true);
  });

  it('blocks an unsupported mime type', () => {
    const errors = validateImageAssetMetadata('marketing_image_square', { width: 1200, height: 1200, mimeType: 'image/gif' }, 'Square 1');
    expect(errors.some((e) => e.includes('unsupported image format'))).toBe(true);
  });

  it('blocks missing dimensions outright', () => {
    const errors = validateImageAssetMetadata('marketing_image_square', {}, 'Square 1');
    expect(errors.some((e) => e.includes('could not read image dimensions'))).toBe(true);
  });
});

describe('isValidYoutubeId / validateVideoAsset', () => {
  it('accepts a well-formed 11-character ID', () => {
    expect(isValidYoutubeId('dQw4w9WgXcQ')).toBe(true);
  });
  it('rejects a malformed ID', () => {
    expect(isValidYoutubeId('too-short')).toBe(false);
  });
  it('blocks a video under the 10-second minimum', () => {
    const { errors } = validateVideoAsset('dQw4w9WgXcQ', 'Video 1', 5);
    expect(errors.some((e) => e.includes('below'))).toBe(true);
  });
  it('warns, but does not block, when duration is unknown', () => {
    const { errors, warnings } = validateVideoAsset('dQw4w9WgXcQ', 'Video 1');
    expect(errors).toEqual([]);
    expect(warnings.length).toBe(1);
  });
});
