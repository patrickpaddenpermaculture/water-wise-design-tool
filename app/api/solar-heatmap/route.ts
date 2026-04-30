import { NextResponse } from 'next/server';

const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

function fluxToRGBA(normalized: number): [number, number, number, number] {
  if (normalized <= 0) return [0, 0, 0, 0];
  let r, g, b;
  if (normalized < 0.25) {
    const t = normalized / 0.25;
    r = 0; g = Math.round(t * 255); b = 255;
  } else if (normalized < 0.5) {
    const t = (normalized - 0.25) / 0.25;
    r = 0; g = 255; b = Math.round((1 - t) * 255);
  } else if (normalized < 0.75) {
    const t = (normalized - 0.5) / 0.25;
    r = Math.round(t * 255); g = 255; b = 0;
  } else {
    const t = (normalized - 0.75) / 0.25;
    r = 255; g = Math.round((1 - t) * 255); b = 0;
  }
  return [r, g, b, 190];
}

export async function POST(req: Request) {
  try {
    const { lat, lng } = await req.json();

    const layersRes = await fetch(
      `https://solar.googleapis.com/v1/dataLayers:get?location.latitude=${lat}&location.longitude=${lng}&radiusMeters=60&view=ANNUAL_FLUX&key=${GOOGLE_KEY}`
    );
    const layersData = await layersRes.json();

    if (!layersData.annualFluxUrl) {
      return NextResponse.json({ error: 'No solar flux data available for this location', details: layersData }, { status: 404 });
    }

    const tiffRes = await fetch(`${layersData.annualFluxUrl}&key=${GOOGLE_KEY}`);
    if (!tiffRes.ok) throw new Error('Failed to fetch flux TIFF');
    const tiffBuffer = await tiffRes.arrayBuffer();

    const { fromArrayBuffer } = await import('geotiff');
    const tiff = await fromArrayBuffer(tiffBuffer);
    const image = await tiff.getImage();
    const width = image.getWidth();
    const height = image.getHeight();
    const rasters = await image.readRasters();
    const fluxData = rasters[0] as Float32Array;

    let min = Infinity, max = -Infinity;
    for (let i = 0; i < fluxData.length; i++) {
      const v = fluxData[i];
      if (v > 0) { min = Math.min(min, v); max = Math.max(max, v); }
    }

    const rgba = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < fluxData.length; i++) {
      const v = fluxData[i];
      const norm = v <= 0 ? 0 : (v - min) / (max - min);
      const [r, g, b, a] = fluxToRGBA(norm);
      rgba[i * 4] = r; rgba[i * 4 + 1] = g; rgba[i * 4 + 2] = b; rgba[i * 4 + 3] = a;
    }

    const { PNG } = await import('pngjs');
    const png = new PNG({ width, height });
    png.data = Buffer.from(rgba.buffer);
    const pngBuffer = PNG.sync.write(png);
    const base64 = `data:image/png;base64,${pngBuffer.toString('base64')}`;

    return NextResponse.json({
      heatmapBase64: base64,
      width,
      height,
      bounds: layersData.boundingBox,
      minFlux: Math.round(min),
      maxFlux: Math.round(max),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
