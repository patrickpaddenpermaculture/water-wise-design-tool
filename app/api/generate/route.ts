import { NextRequest, NextResponse } from 'next/server';

const RAG_SERVER = process.env.RAG_SERVER_URL || 'http://localhost:8765';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid or empty request body' }, { status: 400 });
    }

    const {
      prompt,
      isEdit        = false,
      imageBase64   = null,
      aspect        = '16:9',
      n             = 3,
      // Design context for RAG enrichment
      designFocus   = '',
      aestheticStyle= '',
      exposure      = 'Full Sun',
      slope         = 'Flat',
      edibles       = [],
      nativePlanting= true,
    } = body;

    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      console.error('[generate] Missing XAI_API_KEY env var');
      return NextResponse.json({ error: 'Server misconfigured - no API key' }, { status: 500 });
    }

    // ── Enrich the prompt with Patrick's design vocabulary from RAG ──────────
    let enrichedPrompt = prompt;
    const ragAvailable = RAG_SERVER && !RAG_SERVER.includes('localhost');
    try {
      if (!ragAvailable) throw new Error('RAG server not available in this environment');
      const ragController = new AbortController();
      const ragTimeout = setTimeout(() => ragController.abort(), 4000);
      const ragRes = await fetch(`${RAG_SERVER}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: ragController.signal,
        body: JSON.stringify({
          query: [designFocus, aestheticStyle, exposure, ...edibles, 'Colorado permaculture landscape']
            .filter(Boolean).join(' '),
          n_results: 4,
          doc_type: 'design',
        }),
      });
      clearTimeout(ragTimeout);

      if (ragRes.ok) {
        const ragData = await ragRes.json();
        // Extract key plant names and design terms from top results
        const designTerms = ragData.results
          ?.slice(0, 3)
          .map((r: any) => r.text.substring(0, 200))
          .join(' ') || '';

        // Pull specific plant names from the text
        const plantMatches = designTerms.match(/[A-Z][a-z]+ [a-z]+cia|[A-Z][a-z]+ [a-z]+um|[A-Z][a-z]+ [a-z]+is|Black Locust|Serviceberry|Caragana|Penstemon|Yarrow|Echinacea|Elderberry|Currant|Gooseberry|Plum|Apple|Chokecherry/g);
        const plantList = plantMatches ? Array.from(new Set(plantMatches)).slice(0, 6).join(', ') : '';

        if (plantList) {
          enrichedPrompt = `${prompt}. Include these plants typical of Patrick Padden's permaculture style: ${plantList}. 
Use naturalistic curved planting beds, mulched pathways, layered canopy-shrub-herb structure typical of Colorado permaculture design. 
Realistic landscape rendering, overhead perspective, detailed plant textures.`;
        }
      }
    } catch (ragErr) {
      console.warn('[generate] RAG enrichment skipped:', ragErr);
      // Continue with original prompt
    }

    // ── Call xAI Grok image generation ───────────────────────────────────────
    const endpoint = isEdit
      ? 'https://api.x.ai/v1/images/edits'
      : 'https://api.x.ai/v1/images/generations';

    const requestBody: any = {
      prompt: isEdit
        ? `Transform the uploaded yard photo into a Padden Permaculture style design: ${enrichedPrompt}`
        : enrichedPrompt,
      model:           'grok-2-image',
      response_format: 'url',
      n,
    };

    if (aspect) {
      requestBody.aspect_ratio = aspect;
    }

    if (isEdit && imageBase64) {
      requestBody.image = { url: `data:image/jpeg;base64,${imageBase64}` };
    }

    const xaiRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const rawResponse = await xaiRes.text();

    if (!xaiRes.ok) {
      console.error('[generate] xAI error:', xaiRes.status, rawResponse);
      return NextResponse.json(
        { error: `xAI API error (${xaiRes.status}): ${rawResponse || '(no details)'}` },
        { status: xaiRes.status }
      );
    }

    let data;
    try {
      data = JSON.parse(rawResponse);
    } catch (parseErr) {
      console.error('[generate] JSON parse failed:', parseErr, rawResponse);
      return NextResponse.json({ error: 'xAI returned invalid response' }, { status: 500 });
    }

    return NextResponse.json({ ...data, promptUsed: enrichedPrompt });

  } catch (err: any) {
    console.error('[generate] Proxy crash:', err);
    return NextResponse.json({ error: 'Internal error: ' + (err.message || 'unknown') }, { status: 500 });
  }
}
