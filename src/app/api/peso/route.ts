import { NextResponse } from "next/server";

const HTTP_PORT = process.env.SCALE_HTTP_PORT || '3005';
const SCALE_HOST = process.env.SCALE_HOST || '192.168.18.8';

const CANDIDATES = [
  `http://${SCALE_HOST}:${HTTP_PORT}/peso`,
  `http://127.0.0.1:${HTTP_PORT}/peso`,
  "http://localhost:3000/peso",
];

console.log('[API /peso] Tentando endpoints:', CANDIDATES);

async function fetchWithTimeout(url: string, ms = 1200) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
    clearTimeout(id);
    return res;
  } catch {
    clearTimeout(id);
    return null;
  }
}

export async function GET() {
  for (const base of CANDIDATES) {
    try {
      const res = await fetchWithTimeout(base);
      if (res && res.ok) {
        const text = await res.text().catch(() => "");
        
        // Parse do formato Saturno: ST,GS,+0070,00kg
        const match = text.match(/([+-]?[0-9]+[.,][0-9]+)/) || text.match(/([+-]?[0-9]+)/);
        
        if (match && match[1]) {
          const peso = parseFloat(match[1].replace(',', '.')) || 0;
          return NextResponse.json({ peso, raw: text });
        }
        
        return NextResponse.json({ peso: 0, raw: text });
      }
    } catch {}
  }
  // fallback
  return NextResponse.json({ peso: 0, error: 'Não conectado' });
}
