'use client';
import React, { useState } from 'react';
import { CloudRain } from 'lucide-react';

interface Props {
  roofAreaSqFt: number;
}

const FC_MONTHLY_RAIN = [0.4, 0.4, 1.2, 1.7, 2.3, 1.5, 1.6, 1.5, 1.2, 1.0, 0.7, 0.4];
const FC_ANNUAL_RAIN = FC_MONTHLY_RAIN.reduce((a, b) => a + b, 0);

export default function RunoffCalculator({ roofAreaSqFt }: Props) {
  const [downspouts, setDownspouts] = useState(2);
  const [stormInches, setStormInches] = useState(1.0);

  const runoffCoeff = 0.95;
  const roofPerDownspout = roofAreaSqFt / downspouts;
  const gallonsPerStorm = Math.round(roofPerDownspout * (stormInches / 12) * 7.48 * runoffCoeff);
  const annualGallons = Math.round(roofAreaSqFt * (FC_ANNUAL_RAIN / 12) * 7.48 * runoffCoeff);
  const rainGardenSqFt = Math.round(roofPerDownspout * 0.12);
  const rainGardenDepth = 8;

  return (
    <div className="border-t border-stone-100 pt-6">
      <h3 className="font-bold text-lg flex items-center gap-2 mb-4" style={{ color: '#2C2416' }}>
        <CloudRain size={20} style={{ color: '#5C7A4E' }} />
        Rooftop Runoff & Rain Garden Calculator
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="text-xs font-bold uppercase text-stone-500 block mb-2">Number of Downspouts</label>
          <div className="flex items-center gap-3">
            <input type="range" min={1} max={8} value={downspouts} onChange={e => setDownspouts(+e.target.value)}
              className="flex-1" style={{ accentColor: '#5C7A4E' }} />
            <span className="font-bold text-lg w-6">{downspouts}</span>
          </div>
        </div>
        <div>
          <label className="text-xs font-bold uppercase text-stone-500 block mb-2">Design Storm Size</label>
          <div className="flex gap-2">
            {[0.5, 1.0, 1.5, 2.0].map(s => (
              <button key={s} onClick={() => setStormInches(s)}
                className="flex-1 py-2 rounded text-sm font-bold border transition"
                style={{
                  backgroundColor: stormInches === s ? '#5C7A4E' : 'white',
                  color: stormInches === s ? 'white' : '#57534e',
                  borderColor: stormInches === s ? '#5C7A4E' : '#d6d3d1',
                }}>
                {s}&quot;
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-700">{gallonsPerStorm.toLocaleString()}</div>
          <div className="text-xs text-blue-500 mt-1">Gallons/storm<br/>per downspout</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-700">{annualGallons.toLocaleString()}</div>
          <div className="text-xs text-green-500 mt-1">Annual runoff<br/>gallons</div>
        </div>
        <div className="bg-amber-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-amber-700">{rainGardenSqFt}</div>
          <div className="text-xs text-amber-500 mt-1">Rain garden sq ft<br/>per downspout</div>
        </div>
        <div className="bg-stone-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-stone-700">{rainGardenDepth}&quot;</div>
          <div className="text-xs text-stone-500 mt-1">Basin depth<br/>(FC clay soil)</div>
        </div>
      </div>

      <p className="text-xs text-stone-400 italic mt-4">
        Based on Fort Collins avg {FC_ANNUAL_RAIN.toFixed(1)}&quot; annual rainfall. Rain garden sizing per City of Fort Collins Stormwater guidelines.
      </p>
    </div>
  );
}
