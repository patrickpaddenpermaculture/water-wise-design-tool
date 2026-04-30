'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { Upload, X, Award, MapPin, Layers, Box, CheckCircle2, ChevronRight, Info, Loader2, Apple, Search, Menu, ExternalLink, Hammer, Waves, BoxSelect, Droplets, Sun, Wind, ThermometerSnowflake, FileText, Sprout, Home } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useGenerationLimit } from './hooks/useGenerationLimit';
import PaywallModal from './components/PaywallModal';
import SolarAnalysis from './components/SolarAnalysis';

const Lazy3DViewer = React.lazy(() => import('./Lazy3DViewer'));

export default function LandscapeTool() {
  // --- GENERATION LIMIT ---
  const { remaining, isLimitReached, consume } = useGenerationLimit();
  const [showPaywall, setShowPaywall] = useState(false);

  // --- INTAKE STATE ---
  const [address, setAddress] = useState('');
  const [referencePreview, setReferencePreview] = useState<string | null>(null);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [aerialPreview, setAerialPreview] = useState<string | null>(null);
  const [aerialFile, setAerialFile] = useState<File | null>(null);
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [isFetchingLidar, setIsFetchingLidar] = useState(false);
  const [show3DViewer, setShow3DViewer] = useState(false);
  const [streetViewUrl, setStreetViewUrl] = useState<string | null>(null);
  const [showStreetViewConfirm, setShowStreetViewConfirm] = useState(false);
  const [formattedAddress, setFormattedAddress] = useState('');
  const [siteLat, setSiteLat] = useState<number | null>(null);
  const [siteLng, setSiteLng] = useState<number | null>(null);
  const [solarData, setSolarData] = useState<any>(null);

  // --- DESIGN STATE ---
  const [loading, setLoading] = useState(false);
  const [design, setDesign] = useState<{ url: string; promptUsed: string } | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [detailedPlan, setDetailedPlan] = useState<{ url: string; promptUsed: string } | null>(null);
  const [breakdown, setBreakdown] = useState('');
  const [breakdownLoading, setBreakdownLoading] = useState(false);

  // --- PREFERENCES ---
  const [nativePlanting, setNativePlanting] = useState(true);
  const [hasDownspout, setHasDownspout] = useState(false);
  const [collectionArea, setCollectionArea] = useState<'under500' | 'over500' | 'unknown'>('unknown');
  const [includeHardscape, setIncludeHardscape] = useState(false);
  const [hardscapeMaterial, setHardscapeMaterial] = useState('Natural Stone');
  
  // Design Context State
  const [designFocus, setDesignFocus] = useState('Passive Water Harvesting (Swales/Basins)');
  const [aestheticStyle, setAestheticStyle] = useState('Naturalistic / Wild (Meandering)');

  // Edible Categories
  const [edibleHerbs, setEdibleHerbs] = useState(false);
  const [edibleMedicinal, setEdibleMedicinal] = useState(false);
  const [edibleBerries, setEdibleBerries] = useState(false);
  const [edibleDwarfFruit, setEdibleDwarfFruit] = useState(false);
  const [edibleFullFruit, setEdibleFullFruit] = useState(false);

  const [exposure, setExposure] = useState<'Full Sun' | 'Partial Shade' | 'Deep Shade'>('Full Sun');
  const [slope, setSlope] = useState<'Flat' | 'Gentle' | 'Steep'>('Flat');
  const [windy, setWindy] = useState(false);

  useEffect(() => {
    return () => { if (modelUrl) URL.revokeObjectURL(modelUrl); };
  }, [modelUrl]);

  // --- HANDLERS ---
  const handleAddressSubmit = async () => {
    if (!address) return;
    setIsFetchingLidar(true);
    try {
      const res = await fetch('/api/google-spatial-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });
      const data = await res.json();
      if (data.staticMapUrl) setAerialPreview(data.staticMapUrl);
      if (data.streetViewUrl) {
        setStreetViewUrl(data.streetViewUrl);
        setShowStreetViewConfirm(true);
      }
      if (data.formattedAddress) setFormattedAddress(data.formattedAddress);
      if (data.lat) setSiteLat(data.lat);
      if (data.lng) setSiteLng(data.lng);
      if (data.solarPotential) setSolarData(data.solarPotential);
    } catch (err) {
      console.error("Spatial fetch failed", err);
    } finally {
      setIsFetchingLidar(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.readAsDataURL(file);
    });
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>, mode: 'reference' | 'aerial') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      if (mode === 'reference') {
        setReferenceFile(file);
        setReferencePreview(result);
      } else {
        setAerialFile(file);
        setAerialPreview(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handle3DFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (modelUrl) URL.revokeObjectURL(modelUrl);
    setModelUrl(URL.createObjectURL(file));
    setShow3DViewer(true);
  };

  const handleCaptureTopView = async () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    const resizedDataURL = canvas.toDataURL('image/png'); 
    setAerialPreview(resizedDataURL);
    setShow3DViewer(false);
  };

  // --- STEP 1: CONCEPT DESIGN ---
  const generateDesign = async () => {
    // Check generation limit before anything
    const allowed = consume();
    if (!allowed) {
      setShowPaywall(true);
      return;
    }
    setLoading(true);
    let features: string[] = [];
    
    features.push('dark colored shredded cedar mulch (no landscaping rock)');
    if (nativePlanting) features.push('Native Colorado plants, flowers, and ground covers replacing traditional turf');
    
    if (hasDownspout) {
      if (collectionArea === 'under500') {
        features.push('two integrated rain gardens/infiltration basins (approx 20 sq ft, 8 inches deep each) heavily mulched with water-tolerant and water-loving perennials');
      } else if (collectionArea === 'over500') {
        features.push('three cascading lunar/kidney-bean shaped infiltration basins (15, 20, and 25 sq ft) with decorative stone overflows and passive perennial irrigation');
      } else {
        features.push('rain garden/infiltration basins that passively irrigate perennial systems');
      }
      features.push('Note: No standing water or ponds; focus on subtle land-shaping and high infiltration potential');
    }

    if (includeHardscape) {
      features.push(`hardscape features made of ${hardscapeMaterial}`);
    }

    if (edibleHerbs) features.push('culinary herbs');
    if (edibleMedicinal) features.push('medicinal perennial plants');
    if (edibleBerries) features.push('berry shrubs');
    if (edibleDwarfFruit) features.push('dwarf fruit trees');
    if (edibleFullFruit) features.push('full-sized fruit trees');

    const finalPrompt = `ACT AS: Padden Permaculture Ecological Landscape Design Agent. CONTEXT: Professional architectural visualization for ${address}. SITE CONDITIONS: ${exposure}, ${slope} terrain, ${windy ? 'high wind' : 'sheltered'}. STYLE FOCUS: ${aestheticStyle}. PRIMARY GOAL: ${designFocus}. INCLUSIONS: ${features.join(', ')}. STYLE: Realistic 3D rendering, high-end permaculture design, maturity visualization. AVOID: standing water, ponds, or bright blue water features. Focus on dry-stream aesthetics and earthworks.`;
    
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: finalPrompt,
          isEdit: !!referenceFile,
          imageBase64: referenceFile ? await fileToBase64(referenceFile) : null,
          aspect: '16:9',
          n: 1,
        }),
      });
      const data = await res.json();
      console.log('[generate] response:', JSON.stringify(data).slice(0, 500));
      if (data.data?.[0]?.url) {
        setDesign({ url: data.data[0].url, promptUsed: finalPrompt });
      } else if (data.error) {
        alert(`Design generation failed: ${data.error}`);
      } else {
        alert(`Unexpected response from server. Check console for details.`);
      }
    } catch (err: any) {
      console.error('[generate] fetch error:', err);
      alert(`Connection error: ${err.message}`);
    }
    setLoading(false);
  };

  // --- STEP 2: DETAILED PLAN (Integrated Alpha-Numeric Key Logic) ---
  const generateDetailedPlan = async () => {
    setPlanLoading(true);
    try {
      const currentDate = new Date().toLocaleDateString();
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `ACT AS: Senior Landscape Architect at Padden Permaculture. 
          TASK: Create a professional 2D Technical Planting Plan based on ${designFocus}.
          KEY SYSTEM: Use 2-letter alpha codes (e.g., 'Ar' for Aronia, 'Bp' for Blue Penstemon) placed clearly inside or adjacent to specific plant symbols.
          LAYOUT: Organize the design into "Functional Guilds" (e.g., Rain Basin Area, Dappled Shade Zone, Pollinator Border).
          TITLE BLOCK: Incorporate a professional architectural TITLE BLOCK with "PADDEN PERMACULTURE" in clean sans-serif font.
          TITLE BLOCK FIELDS: Project: ${address || 'Client Property'}, Date: ${currentDate}, Scale: 1"=10'.
          TECHNICAL SYMBOLS: Use professional 2D CAD symbols for plants. Label dark cedar mulch areas.
          PLAN INDICATORS: Include a visual GRAPHIC SCALE BAR (0-20') and a modern North Arrow ("N").
          PLANT KEY: Every alpha-numeric code must correspond to a visual plant list key in the corner.
          STYLE: Professional landscape drafting quality, clean black-and-white lines with subtle color fills for zones.`,
          isEdit: true,
          imageBase64: aerialPreview?.split(',')[1],
          contextUrl: design?.url,
          aspect: '1:1',
        }),
      });
      const data = await res.json();
      if (data.data?.[0]?.url) setDetailedPlan({ url: data.data[0].url, promptUsed: "Detailed Technical Plan" });
    } catch (err) {
      alert('Plan failed');
    }
    setPlanLoading(false);
  };

  // --- STEP 3: DATA BREAKDOWN (Functional Tables & Zone Analysis) ---
  const generateBreakdown = async () => {
    if (!detailedPlan) return;
    setBreakdownLoading(true);
    try {
      const res = await fetch('/api/breakdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          imageUrl: detailedPlan.url, 
          tier: 'Full Master Plan',
          microclimate: { exposure, slope, windy },
          customPrompt: `Analyze the generated plan and provide:
          1. A PLANTING TABLE with columns: [Key Code (2-letters), Common Name, Botanical Name, Quantity, Function/Notes].
          2. Group the table by FUNCTIONAL ZONES based on the design (e.g., 'Rain Garden Area', 'Dappled Shade Understory').
          3. A "Seasonal Interest" summary showing bloom times and winter structure.
          4. Maintenance guidelines for the first 2 seasons (Irrigation and Weeding).`
        }),
      });
      const data = await res.json();
      if (data.breakdown) setBreakdown(data.breakdown);
    } catch (err) {
      console.error('Breakdown failed');
    }
    setBreakdownLoading(false);
  };

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: '#FAFAF7', color: '#2C2416' }}>
      {/* HEADER */}
      <header style={{ backgroundColor: '#2C2416' }} className="text-white">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div>
              <div className="font-bold text-xl tracking-tight">Padden Permaculture</div>
              <div className="text-xs tracking-widest uppercase opacity-70">Ecological Landscape Design and Build</div>
            </div>
          </div>
          <nav className="hidden lg:flex gap-6 items-center text-sm font-semibold">
            <a
              href="https://calendly.com/padden-permaculture"
              target="_blank"
              rel="noopener noreferrer"
              style={{ backgroundColor: '#C8604A' }}
              className="px-5 py-2 rounded-full font-bold text-white hover:opacity-90 transition"
            >
              Book a Consultation
            </a>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section style={{ backgroundColor: '#F0EDE6', borderBottom: '1px solid #DDD8CF' }} className="py-12">
        <div className="max-w-5xl mx-auto px-6">
          <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: '#2C2416' }}>AI Landscape Design Studio</h1>
          <p className="text-xl max-w-2xl leading-relaxed mb-6" style={{ color: '#5a503f' }}>
            Generate a professional permaculture design for your property — then book a real consultation with Patrick to bring it to life.
          </p>
          <a
            href="https://calendly.com/padden-permaculture"
            target="_blank"
            rel="noopener noreferrer"
            style={{ backgroundColor: '#C8604A' }}
            className="inline-flex items-center gap-2 px-7 py-3 rounded-full font-bold text-white hover:opacity-90 transition text-base shadow-md"
          >
            Book a Consultation <ChevronRight size={18} />
          </a>
        </div>
      </section>

      <main className="max-w-5xl mx-auto py-12 px-6">
        {!design && (
          <div className="space-y-10">
            {/* INTAKE SECTION */}
            <div className="bg-white border border-stone-200 shadow-sm rounded-lg p-8">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2" style={{ color: '#2C2416' }}>
                <span className="text-white w-8 h-8 rounded-full flex items-center justify-center text-sm" style={{ backgroundColor: '#5C7A4E' }}>1</span>
                Initial Site Data
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <label className="block font-bold text-stone-700">Property Address (for LiDAR)</label>
                  <input 
                    type="text" 
                    value={address} 
                    onChange={(e) => setAddress(e.target.value)}
                    onBlur={handleAddressSubmit}
                    placeholder="Enter address..."
                    className="w-full p-3 border border-stone-300 rounded-md outline-none"
                    style={{ '--tw-ring-color': '#5C7A4E' } as React.CSSProperties}
                    onFocus={(e) => e.target.style.boxShadow = '0 0 0 2px #5C7A4E'}
                    onBlurCapture={(e) => e.target.style.boxShadow = ''}
                  />
                  
                  {/* Street View Confirmation */}
                  {showStreetViewConfirm && streetViewUrl && (
                    <div className="mt-4 border-2 border-[#C8604A] rounded-lg overflow-hidden">
                      <div className="bg-[#C8604A] text-white px-4 py-2 text-sm font-bold flex items-center gap-2">
                        <MapPin size={14}/> Is this your property?
                      </div>
                      <img src={streetViewUrl} className="w-full h-48 object-cover" alt="Street View" />
                      <div className="p-3 bg-amber-50 flex gap-2">
                        <button
                          onClick={() => { setReferencePreview(streetViewUrl); setShowStreetViewConfirm(false); }}
                          className="flex-1 bg-[#5C7A4E] text-white py-2 rounded font-bold text-sm hover:bg-[#4a6340]"
                        >
                          ✓ Yes, use this photo
                        </button>
                        <button
                          onClick={() => setShowStreetViewConfirm(false)}
                          className="flex-1 bg-white border border-slate-300 text-slate-600 py-2 rounded font-bold text-sm hover:bg-slate-50"
                        >
                          No, I'll upload my own
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="pt-4 space-y-2">
                    <label className="block font-bold text-stone-700">Satellite / Top-Down View</label>
                    {aerialPreview ? (
                      <div className="relative h-32 w-full border rounded overflow-hidden">
                        <img src={aerialPreview} className="w-full h-full object-cover" />
                        <button onClick={() => setAerialPreview(null)} className="absolute top-1 right-1 bg-black text-white p-1 rounded-full"><X size={12}/></button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <label className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-stone-300 rounded-md py-4 cursor-pointer hover:bg-stone-50 transition">
                          <Layers size={20} className="text-stone-400 mb-1" />
                          <span className="text-xs font-medium text-stone-500 text-center px-2">Upload Aerial Image</span>
                          <input type="file" accept="image/*" onChange={(e) => handleFile(e, 'aerial')} className="hidden" />
                        </label>
                        <label className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-stone-300 rounded-md py-4 cursor-pointer hover:bg-stone-50 transition">
                          <Box size={20} className="text-stone-400 mb-1" />
                          <span className="text-xs font-medium text-stone-500 text-center px-2">Upload 3D (.glb)</span>
                          <input type="file" accept=".glb" onChange={handle3DFile} className="hidden" />
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="block font-bold text-stone-700">Perspective / 3D Photo</label>
                  {referencePreview ? (
                    <div className="relative h-full w-full border border-stone-200 rounded-md overflow-hidden bg-stone-50">
                      <img src={referencePreview} className="object-contain w-full h-full" alt="Preview" />
                      <button onClick={() => {setReferenceFile(null); setReferencePreview(null);}} className="absolute top-2 right-2 bg-stone-800 text-white rounded-full p-1"><X size={14}/></button>
                    </div>
                  ) : (
                    <label className="flex h-48 flex-col items-center justify-center border-2 border-dashed border-stone-300 rounded-md py-6 cursor-pointer hover:bg-stone-50 transition">
                      <Upload className="text-stone-400 mb-2" size={24} />
                      <span className="text-sm font-medium text-stone-500">Upload Yard Photo</span>
                      <input type="file" accept="image/*" onChange={(e) => handleFile(e, 'reference')} className="hidden" />
                    </label>
                  )}
                </div>
              </div>

              {show3DViewer && modelUrl && (
                <div className="mt-8 space-y-4">
                   <div className="bg-stone-900 rounded-lg overflow-hidden h-96 relative">
                    <Suspense fallback={<div className="flex items-center justify-center h-full text-white"><Loader2 className="animate-spin" /> Loading Model...</div>}>
                      <Lazy3DViewer modelUrl={modelUrl} onCapture={handleCaptureTopView} />
                    </Suspense>
                  </div>
                  <button onClick={handleCaptureTopView} className="w-full text-white py-3 rounded-md font-bold flex items-center justify-center gap-2 transition" style={{ backgroundColor: '#C8604A' }}
                    onMouseOver={(e) => (e.currentTarget.style.opacity = '0.9')}
                    onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}>
                    <BoxSelect size={18} /> Confirm Top-Down Orientation
                  </button>
                </div>
              )}
            </div>

            {/* SOLAR ANALYSIS */}
            {aerialPreview && siteLat && siteLng && (
              <SolarAnalysis
                lat={siteLat}
                lng={siteLng}
                solarData={{ solarPotential: solarData }}
                aerialPreview={aerialPreview}
              />
            )}

            {/* PREFERENCES SECTION */}
            <div className="bg-white border border-stone-200 shadow-sm rounded-lg p-8">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2" style={{ color: '#2C2416' }}>
                <span className="text-white w-8 h-8 rounded-full flex items-center justify-center text-sm" style={{ backgroundColor: '#5C7A4E' }}>2</span>
                Site Parameters
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 border-b pb-8">
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm font-bold text-stone-600 uppercase tracking-wider"><Sun size={16}/> Solar Exposure</label>
                  <select value={exposure} onChange={(e) => setExposure(e.target.value as any)} className="w-full p-3 border border-stone-300 rounded-md bg-white">
                    <option>Full Sun</option>
                    <option>Partial Shade</option>
                    <option>Deep Shade</option>
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm font-bold text-stone-600 uppercase tracking-wider"><Droplets size={16}/> Grading / Slope</label>
                  <select value={slope} onChange={(e) => setSlope(e.target.value as any)} className="w-full p-3 border border-stone-300 rounded-md bg-white">
                    <option>Flat</option>
                    <option>Gentle</option>
                    <option>Steep</option>
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm font-bold text-stone-600 uppercase tracking-wider"><Wind size={16}/> Site Wind</label>
                   <button
                    onClick={() => setWindy(!windy)}
                    className="w-full p-3 border rounded-md font-bold transition-all text-white"
                    style={{ backgroundColor: windy ? '#5C7A4E' : '#e5e7eb', color: windy ? 'white' : '#6b7280', borderColor: windy ? '#5C7A4E' : '#d1d5db' }}
                  >
                    {windy ? 'High Wind Corridor' : 'Sheltered Area'}
                   </button>
                </div>
              </div>

              <div className="space-y-6">
                {/* Design Focus / Zoning */}
                <div className="p-6 border border-stone-200 rounded-lg bg-stone-50/30">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2" style={{ color: '#2C2416' }}>
                    <Layers size={20}/> Design Emphasis & Style
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-xs font-bold uppercase text-stone-500">Primary Focus Area</p>
                      <select 
                        value={designFocus} 
                        onChange={(e) => setDesignFocus(e.target.value)}
                        className="w-full p-2 border rounded bg-white text-sm"
                      >
                        <option>Passive Water Harvesting (Swales/Basins)</option>
                        <option>Pollinator Habitat / Native Restoration</option>
                        <option>Edible Polyculture / Food Forest</option>
                        <option>Low-Maintenance Privacy Screening</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-bold uppercase text-stone-500">Aesthetic Style</p>
                      <select 
                        value={aestheticStyle} 
                        onChange={(e) => setAestheticStyle(e.target.value)}
                        className="w-full p-2 border rounded bg-white text-sm"
                      >
                        <option>Naturalistic / Wild (Meandering)</option>
                        <option>Structured / Modern (Clean Edges)</option>
                        <option>Riparian / Creek-Bed Aesthetic</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Restoration Toggle */}
                <div
                  className="p-6 border rounded-lg transition-all"
                  style={{ borderColor: nativePlanting ? '#5C7A4E' : '#e5e7eb', backgroundColor: nativePlanting ? '#f0f5ee' : 'transparent' }}
                >
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={nativePlanting} onChange={(e) => setNativePlanting(e.target.checked)} className="w-5 h-5" style={{ accentColor: '#5C7A4E' }} />
                    <div>
                      <span className="font-bold text-lg block">Replace turf with Native Colorado plants</span>
                      <span className="text-sm text-stone-500">Includes native flowers and ground covers</span>
                    </div>
                  </label>
                </div>

                {/* Hardscape Section */}
                <div
                  className="p-6 border rounded-lg transition-all"
                  style={{ borderColor: includeHardscape ? '#5C7A4E' : '#e5e7eb', backgroundColor: includeHardscape ? '#f0f5ee' : 'transparent' }}
                >
                  <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={includeHardscape} onChange={(e) => setIncludeHardscape(e.target.checked)} className="w-5 h-5" style={{ accentColor: '#5C7A4E' }} />
                      <span className="font-bold text-lg">Include Hardscape Features</span>
                    </label>
                    {includeHardscape && (
                      <select 
                        value={hardscapeMaterial} 
                        onChange={(e) => setHardscapeMaterial(e.target.value)}
                        className="p-2 border border-stone-300 rounded bg-white text-sm font-medium"
                      >
                        <option>Natural Stone</option>
                        <option>Pavers</option>
                        <option>Crushed Granite</option>
                      </select>
                    )}
                  </div>
                </div>

                {/* Downspout/Rain Garden Section */}
                <div
                  className="p-6 border rounded-lg transition-all"
                  style={{ borderColor: hasDownspout ? '#5C7A4E' : '#e5e7eb', backgroundColor: hasDownspout ? '#f0f5ee' : 'transparent' }}
                >
                  <label className="flex items-center gap-3 cursor-pointer mb-4">
                    <input type="checkbox" checked={hasDownspout} onChange={(e) => setHasDownspout(e.target.checked)} className="w-5 h-5" style={{ accentColor: '#5C7A4E' }} />
                    <span className="font-bold text-lg">Is there a downspout?</span>
                  </label>
                  {hasDownspout && (
                    <div className="ml-8 space-y-4 animate-in fade-in slide-in-from-top-2">
                      <p className="text-sm font-medium italic" style={{ color: '#5C7A4E' }}>We recommend an infiltration basin or rain garden to passively irrigate perennial systems.</p>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-stone-500">Collection Area Size</label>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { id: 'under500', label: 'Less than 500 sq ft' },
                            { id: 'over500', label: 'More than 500 sq ft' },
                            { id: 'unknown', label: "I don't know" }
                          ].map((opt) => (
                            <button
                              key={opt.id}
                              onClick={() => setCollectionArea(opt.id as any)}
                              className="px-4 py-2 rounded-full text-sm font-bold border transition-colors"
                              style={{
                                backgroundColor: collectionArea === opt.id ? '#5C7A4E' : 'white',
                                color: collectionArea === opt.id ? 'white' : '#57534e',
                                borderColor: collectionArea === opt.id ? '#5C7A4E' : '#d6d3d1',
                              }}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Edibles Section */}
                <div className="p-6 border border-stone-200 rounded-lg">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2" style={{ color: '#2C2416' }}><Apple size={20}/> Edible Perennial Species</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    {[
                      { state: edibleHerbs, setter: setEdibleHerbs, label: 'Culinary Herbs' },
                      { state: edibleMedicinal, setter: setEdibleMedicinal, label: 'Medicinal Plants' },
                      { state: edibleBerries, setter: setEdibleBerries, label: 'Berry Shrubs' },
                      { state: edibleDwarfFruit, setter: setEdibleDwarfFruit, label: 'Dwarf Fruit' },
                      { state: edibleFullFruit, setter: setEdibleFullFruit, label: 'Full Fruit' },
                    ].map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => item.setter(!item.state)}
                        className="p-3 rounded-md border text-xs font-bold transition-all"
                        style={{
                          backgroundColor: item.state ? '#5C7A4E' : 'white',
                          color: item.state ? 'white' : '#78716c',
                          borderColor: item.state ? '#5C7A4E' : '#e7e5e4',
                        }}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={isLimitReached ? () => setShowPaywall(true) : generateDesign}
                disabled={loading}
                className="w-full py-5 rounded-md text-xl font-bold transition shadow-lg flex items-center justify-center gap-3 text-white disabled:opacity-50"
                style={{ backgroundColor: isLimitReached ? '#d97706' : '#5C7A4E' }}
              >
                {loading ? (
                  <><Loader2 className="animate-spin" /> Step 1: Generating Concept...</>
                ) : isLimitReached ? (
                  <>🔒 Unlock Unlimited Designs</>
                ) : (
                  <>Step 1: Generate Design Concept</>
                )}
              </button>
              {!isLimitReached && (
                <p className="text-center text-sm text-stone-500">
                  {remaining} free design{remaining !== 1 ? 's' : ''} remaining today
                </p>
              )}
            </div>
          </div>
        )}

        {design && (
          <div className="space-y-12 animate-in fade-in duration-700">
            <div className="pl-6 py-2 flex justify-between items-end" style={{ borderLeft: '4px solid #5C7A4E' }}>
              <div>
                <h2 className="text-3xl font-bold" style={{ color: '#2C2416' }}>Concept Visualization</h2>
                <p className="font-medium italic text-stone-500">Permaculture rendering for {address || 'the property'}</p>
              </div>
              <button onClick={() => setDesign(null)} className="text-stone-400 hover:text-red-500 flex items-center gap-1 text-sm font-bold uppercase"><X size={16}/> Reset</button>
            </div>

            <div className="bg-white border border-stone-200 p-2 shadow-xl rounded-lg overflow-hidden">
              <img src={design.url} className="w-full h-auto object-contain rounded" alt="Concept" />
            </div>

            {/* CONSULTATION CTA — shown after concept image */}
            <div className="rounded-xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-md" style={{ backgroundColor: '#2C2416', color: '#FAFAF7' }}>
              <div>
                <p className="text-xl font-bold mb-1">Love what you see?</p>
                <p className="opacity-80 text-base">Patrick can design and build this for your property.</p>
              </div>
              <a
                href="https://calendly.com/padden-permaculture"
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 px-8 py-3 rounded-full font-bold text-white text-base transition hover:opacity-90 shadow-lg"
                style={{ backgroundColor: '#C8604A' }}
              >
                Book Now
              </a>
            </div>

            {!detailedPlan ? (
              <div className="p-10 rounded-lg border-2 border-dashed border-stone-300 text-center bg-stone-50">
                <h3 className="text-2xl font-bold mb-2" style={{ color: '#2C2416' }}>Translate to Technical Plan</h3>
                <p className="text-stone-600 mb-8 max-w-lg mx-auto">Convert this concept into a technical 2D drawing featuring alpha-numeric plant keys, functional zones, and professional title blocks.</p>
                <button
                  onClick={generateDetailedPlan}
                  disabled={planLoading}
                  className="text-white px-10 py-4 rounded-full font-bold transition shadow-lg disabled:opacity-50 flex items-center justify-center gap-3 mx-auto"
                  style={{ backgroundColor: '#5C7A4E' }}
                >
                  {planLoading ? <><Loader2 className="animate-spin" /> Generating Plan...</> : <><Layers size={20}/> Step 2: Generate Detailed Plan View</>}
                </button>
              </div>
            ) : (
              <div className="space-y-12 animate-in slide-in-from-bottom-6">
                <div className="pl-6 py-2" style={{ borderLeft: '4px solid #C8604A' }}>
                  <h2 className="text-3xl font-bold" style={{ color: '#2C2416' }}>Technical Master Plan (2D)</h2>
                  <p className="font-medium italic text-stone-500">Scaled top-view with Alpha-Numeric Plant Key and Padden Permaculture title block</p>
                </div>
                <div className="bg-white border border-stone-200 p-2 shadow-2xl rounded-lg overflow-hidden">
                  <img src={detailedPlan.url} className="w-full h-auto object-contain rounded" alt="Detailed Plan" />
                </div>

                {!breakdown ? (
                  <button
                    onClick={generateBreakdown}
                    disabled={breakdownLoading}
                    className="w-full text-white py-5 rounded-md text-xl font-bold transition shadow-lg flex items-center justify-center gap-3 disabled:opacity-50"
                    style={{ backgroundColor: '#C8604A' }}
                  >
                    {breakdownLoading ? <><Loader2 className="animate-spin" /> Extracting Functional Data...</> : <><FileText size={20}/> Step 3: Generate Plant List & Breakdown</>}
                  </button>
                ) : (
                  <div className="bg-white rounded-lg p-10 border border-stone-200 shadow-xl animate-in fade-in">
                    <div className="flex justify-between items-center mb-10 border-b pb-6">
                      <h3 className="text-2xl font-bold" style={{ color: '#2C2416' }}>Project Specification & Analysis</h3>
                      <button onClick={() => window.print()} className="flex items-center gap-2 text-sm font-bold text-stone-400 hover:text-stone-700">
                        <ExternalLink size={16}/> Export as PDF
                      </button>
                    </div>
                    <div className="prose prose-stone max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{breakdown}</ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="text-white py-12 mt-20" style={{ backgroundColor: '#2C2416' }}>
        <div className="max-w-5xl mx-auto px-6 text-center space-y-2">
          <p className="font-bold text-lg">Padden Permaculture</p>
          <p className="opacity-70 text-sm">Ecological Landscape Design and Build</p>
          <p className="opacity-60 text-sm">(970) 999-4306</p>
        </div>
      </footer>

      {/* Paywall modal — shown when daily limit is reached */}
      <PaywallModal open={showPaywall} onClose={() => setShowPaywall(false)} />
    </div>
  );
}
