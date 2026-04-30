// app/api/google-spatial-data/route.ts
import { NextResponse } from 'next/server';

const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export async function POST(req: Request) {
  try {
    const { address } = await req.json();

    // 1. Geocode the address to get Lat/Lng
    const geoRes = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_KEY}`
    );
    const geoData = await geoRes.json();
    
    if (!geoData.results[0]) throw new Error("Address not found");
    const { lat, lng } = geoData.results[0].geometry.location;

    // 2. Fetch Solar/LiDAR Metadata (Building insights)
    // This provides the Digital Surface Model (DSM) and Shade data locations
    const solarRes = await fetch(
      `https://solar.googleapis.com/v1/buildingInsights:findClosest?location.latitude=${lat}&location.longitude=${lng}&key=${GOOGLE_KEY}`
    );
    const solarData = await solarRes.json();

    // 3. Satellite top-down view (aerial)
    const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=20&size=600x600&maptype=satellite&key=${GOOGLE_KEY}`;

    // 4. Street View front-of-house image
    const streetViewUrl = `https://maps.googleapis.com/maps/api/streetview?size=800x500&location=${lat},${lng}&fov=90&pitch=0&key=${GOOGLE_KEY}`;

    // 5. Check if Street View actually exists at this location
    const svMetaRes = await fetch(
      `https://maps.googleapis.com/maps/api/streetview/metadata?location=${lat},${lng}&key=${GOOGLE_KEY}`
    );
    const svMeta = await svMetaRes.json();
    const hasStreetView = svMeta.status === 'OK';

    return NextResponse.json({
      lat,
      lng,
      solarPotential: solarData,
      staticMapUrl,
      streetViewUrl: hasStreetView ? streetViewUrl : null,
      hasStreetView,
      formattedAddress: geoData.results[0].formatted_address,
      bounds: geoData.results[0].geometry.viewport
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
