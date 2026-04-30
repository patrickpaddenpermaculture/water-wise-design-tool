'use client';
import React, { useState } from 'react';
import { Sun, Loader2, Info } from 'lucide-react';
import RunoffCalculator from './RunoffCalculator';

interface Props {
  lat: number;
  lng: number;
  solarData: any;
  aerialPreview: string;
}

export default function SolarAnalysis({ lat, lng, solarData, aerialPreview }: Props) {
  const [loading, setLoading] = useState(false);
  const [heatmap, setHeatmap] = useState<{ heatmapBase64: string; minFlux: number; maxFlux: number } | null>(null);
  const [error, setError] = useState('');

  const runAnalysis = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/solar-heatmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng }),
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else setHeatmap(data);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };

  const solar = solarData?.solarPotential;
  const roofAreaM2 = solar?.wholeRoofStats?.areaMeters2;
  const roofAreaSqFt = roofAreaM2 ? Math.round(roofAreaM2 * 10.764) : null;
  const annualSunHours = solar?.wholeRoofStats?.sunshineQuantiles?.[5];
  const bestSegment = solar?.roofSegmentStats?.reduce((best: any, seg: any) =>
    (seg.stats?.sunshineQuantiles?.[9] || 0) > (best?.stats?.sunshineQuantiles?.[9] || 0) ? seg : best, null);

  return (
    <div className="bg-white border border-stone-200 shadow-sm rounded-lg p-8 space-y-6">
      <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: '#2C2416' }}>
        <Sun size={24} style={{ color: '#C8604A' }} />
        Solar & Microclimate Analysis
      </h2>

      {solar && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {roofAreaSqFt && (
            <div className="bg-stone-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold" style={{ color: '#5C7A4E' }}>{roofAreaSqFt.toLocaleString()}</div>
              <div className="text-xs text-stone-500 uppercase tracking-wider mt-1">Roof sq ft</div>
            </div>
          )}
          {annualSunHours && (
            <div className="bg-stone-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold" style={{ color: '#C8604A' }}>{Math.round(annualSunHours)}</div>
              <div className="text-xs text-stone-500 uppercase tracking-wider mt-1">Annual Sun Hours</div>
            </div>
          )}
          {bestSegment && (
            <div className="bg-stone-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold" style={{ color: '#2C2416' }}>
                {bestSegment.pitchDegrees ? `${Math.round(bestSegment.pitchDegrees)}°` : 'N/A'}
              </div>
              <div className="text-xs text-stone-500 uppercase tracking-wider mt-1">Best Roof Pitch</div>
            </div>
          )}
        </div>
      )}

      {!heatmap ? (
        <div className="border-2 border-dashed border-stone-200 rounded-lg p-8 text-center">
          <p className="text-stone-500 mb-4 text-sm">Generate a solar flux heat map using Google LiDAR data — shows which areas receive the most sun throughout the year.</p>
          <button
            onClick={runAnalysis}
            disabled={loading}
            className="text-white px-8 py-3 rounded-full font-bold flex items-center gap-2 mx-auto transition disabled:opacity-50"
            style={{ backgroundColor: '#C8604A' }}
          >
            {loading ? <><Loader2 size={18} className="animate-spin" /> Analyzing...</> : <><Sun size={18} /> Generate Solar Heat Map</>}
          </button>
          {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative rounded-lg overflow-hidden border border-stone-200" style={{ aspectRatio: '1/1' }}>
            <img src={aerialPreview} className="w-full h-full object-cover" alt="Aerial" />
            <img
              src={heatmap.heatmapBase64}
              className="absolute inset-0 w-full h-full object-cover"
              style={{ mixBlendMode: 'multiply', opacity: 0.75 }}
              alt="Solar flux heat map"
            />
            <div className="absolute bottom-3 left-3 bg-black/70 text-white rounded-lg p-3 text-xs">
              <div className="mb-1 font-bold">Annual Solar Flux</div>
              <div className="w-24 h-3 rounded" style={{ background: 'linear-gradient(to right, #0000ff, #00ffff, #00ff00, #ffff00, #ff0000)' }} />
              <div className="flex justify-between w-24 mt-1">
                <span>{heatmap.minFlux}</span>
                <span>{heatmap.maxFlux} kWh/m²</span>
              </div>
            </div>
          </div>
          <p className="text-xs text-stone-400 italic flex items-center gap-1">
            <Info size={12} /> Red = highest sun, blue = lowest. Powered by Google Solar API LiDAR.
          </p>
        </div>
      )}

      {roofAreaSqFt && (
        <RunoffCalculator roofAreaSqFt={roofAreaSqFt} />
      )}
    </div>
  );
}
