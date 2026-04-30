import { NextResponse } from 'next/server';

const RAG_SERVER = process.env.RAG_SERVER_URL || 'http://localhost:8765';
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      imageUrl,
      tier,
      microclimate = {},
      customPrompt = '',
      designFocus = '',
      aestheticStyle = '',
      edibles = [],
      nativePlanting = true,
      hardscape = false,
      hardscapeMaterial = '',
    } = body;

    const exposure = microclimate.exposure || 'Full Sun';
    const slope    = microclimate.slope    || 'Flat';

    // ── Step 1: Fetch Patrick's real design context from RAG ─────────────────
    let ragContext = '';
    try {
      const ragRes = await fetch(`${RAG_SERVER}/design-context`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exposure,
          slope,
          design_focus:       designFocus,
          aesthetic:          aestheticStyle,
          edibles,
          native_planting:    nativePlanting,
          hardscape,
          hardscape_material: hardscapeMaterial,
          custom_notes:       customPrompt,
          n_results:          12,
        }),
      });
      if (ragRes.ok) {
        const ragData = await ragRes.json();
        ragContext = ragData.context || '';
      }
    } catch (ragErr) {
      console.warn('[breakdown] RAG server unavailable, proceeding without context:', ragErr);
    }

    // ── Step 2: Call Anthropic with RAG context injected ─────────────────────
    if (!ANTHROPIC_KEY) {
      // Fallback: return structured placeholder if no API key
      return NextResponse.json({
        breakdown: buildFallbackBreakdown(exposure, slope, designFocus, ragContext),
      });
    }

    const systemPrompt = `You are Patrick Padden, founder of Padden Permaculture in Fort Collins, Colorado. 
You have 15+ years of experience designing regenerative landscapes. You specialize in:
- Permaculture design with food forests and edible landscapes
- Xeriscape and water-wise design for the Front Range
- Native plant integration with functional food plants
- Passive water harvesting (swales, rain gardens, infiltration basins)
- Polyculture guilds using nitrogen fixers, dynamic accumulators, and pollinators

Your design output is always grounded in Patrick's real past work. Reference specific plant species by both 
common and botanical name. Include key codes (2-letter abbreviations) for plant legends. 
Output clean markdown with tables where appropriate.`;

    const userPrompt = `Create a detailed landscape design breakdown for this design image.

## Site Conditions
- Sun Exposure: ${exposure}
- Slope: ${slope}
- Design Focus: ${designFocus || 'General Permaculture'}
- Aesthetic Style: ${aestheticStyle || 'Naturalistic'}
- Edible Elements Requested: ${edibles.length > 0 ? edibles.join(', ') : 'None specified'}
- Native Planting Priority: ${nativePlanting ? 'Yes' : 'No'}
- Hardscape: ${hardscape ? `Yes - ${hardscapeMaterial}` : 'No'}
${customPrompt ? `- Additional Notes: ${customPrompt}` : ''}

## Design Tier: ${tier || 'Standard'}

## Context from Patrick's Past Designs (use this to inform plant selection and pricing):
${ragContext || 'No specific past design context available — use general Patrick Padden style.'}

## Your Task:
Generate a professional landscape design breakdown with:

1. **Functional Planting Table** — markdown table with columns: Key Code | Common Name | Botanical Name | Qty | Layer | Function | Notes
2. **Zone Analysis** — describe how the zones are organized relative to sun/slope/water
3. **Water Management Notes** — how water is captured and distributed  
4. **Installation Sequence** — phased approach (Phase 1: Earthworks, Phase 2: Trees, Phase 3: Understory, etc.)
5. **Estimated Cost Range** — rough ranges based on Patrick's past project pricing
6. **Patrick's Design Notes** — 2-3 sentences in Patrick's voice explaining the design philosophy for this site

Keep the tone professional but accessible — this will be shown to a client.`;

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key':         ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'content-type':      'application/json',
      },
      body: JSON.stringify({
        model:      'claude-opus-4-5',
        max_tokens: 2000,
        system:     systemPrompt,
        messages: [
          {
            role:    'user',
            content: imageUrl
              ? [
                  { type: 'image', source: { type: 'url', url: imageUrl } },
                  { type: 'text',  text: userPrompt },
                ]
              : [{ type: 'text', text: userPrompt }],
          },
        ],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error('[breakdown] Anthropic error:', anthropicRes.status, errText);
      // Fall back to RAG-informed placeholder
      return NextResponse.json({
        breakdown: buildFallbackBreakdown(exposure, slope, designFocus, ragContext),
      });
    }

    const anthropicData = await anthropicRes.json();
    const breakdown = anthropicData.content?.[0]?.text || 'No breakdown generated.';

    return NextResponse.json({ breakdown });

  } catch (error: any) {
    console.error('[breakdown] Error:', error);
    return NextResponse.json({ error: 'Failed to process breakdown: ' + error.message }, { status: 500 });
  }
}

// ── Fallback when no API key is set ──────────────────────────────────────────
function buildFallbackBreakdown(
  exposure: string,
  slope: string,
  focus: string,
  ragContext: string
): string {
  return `### Functional Planting Table

| Key Code | Common Name | Botanical Name | Qty | Layer | Function |
|---|---|---|---|---|---|
| SB | Serviceberry | Amelanchier alnifolia | 3 | Shrub | Edible / Wildlife |
| SC | Siberian Peashrub | Caragana arborescens | 2 | Shrub | Nitrogen Fixer |
| YA | Yarrow | Achillea millefolium | 12 | Herb | Pollinator / Dynamic Acc. |
| PC | Purple Coneflower | Echinacea purpurea | 9 | Herb | Pollinator / Medicinal |
| BG | Blue Grama | Bouteloua gracilis | 18 | Ground | Native Turf / Low Water |

### Zone Analysis: ${exposure} / ${slope} Slope
This design prioritizes passive water harvesting suited to the ${slope.toLowerCase()} terrain.
${focus ? `Primary design focus: ${focus}.` : ''}

### Patrick's Design Notes
This site is well-suited for a layered permaculture approach. The ${exposure.toLowerCase()} conditions 
support a diverse edible canopy with nitrogen-fixing support species in the understory. 
Water is the limiting factor on the Front Range — every design element serves water harvesting.

---
*Note: Connect Anthropic API key (ANTHROPIC_API_KEY) for full AI-generated breakdowns using Patrick's portfolio data.*

${ragContext ? `\n---\n**Context from Patrick's portfolio:**\n${ragContext.substring(0, 600)}...` : ''}`;
}
