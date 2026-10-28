import { NextRequest, NextResponse } from 'next/server';
import { inspectImageFile } from '@/lib/campaign/pmax/pmaxAssetValidation';

/** Decodes an uploaded PMAX image/logo file server-side and returns its
 *  real metadata (dimensions, mime type, size, checksum) — never trusts the
 *  filename/extension. The browser never stores the raw bytes; only this
 *  metadata gets saved onto the PmaxAsset record. */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
  }
  const buf = Buffer.from(await file.arrayBuffer());
  const meta = inspectImageFile(buf);
  if (!meta) {
    return NextResponse.json({ error: 'Could not decode this file as a JPG or PNG image — it may be corrupt, or not actually an image.' }, { status: 422 });
  }
  return NextResponse.json({ ...meta, sourceFilename: file.name });
}
