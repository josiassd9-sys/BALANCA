import { NextRequest, NextResponse } from "next/server";

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

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const scaleHost = searchParams.get('host') || '192.168.18.8';
  const scalePort = searchParams.get('port') || '3000';

  const endpoint = `http://${scaleHost}:${scalePort}/peso`;
  console.log('[API /peso] Tentando endpoint:', endpoint);

  try {
    const res = await fetchWithTimeout(endpoint);
    if (res && res.ok) {
      const text = await res.text().catch(() => "");
      
      // Parse do formato Saturno: ST,GS,+0070,00kg
      const match = text.match(/([+-]?[0-9]+[.,][0-9]+)/) || text.match(/([+-]?[0-9]+)/);
      
      if (match && match[1]) {
        const peso = parseFloat(match[1].replace(',', '.')) || 0;
        return NextResponse.json({ peso, raw: text });
      }
      
      return NextResponse.json({ peso: 0, raw: text, error: 'Formato de peso não reconhecido' });
    }
     return NextResponse.json({ peso: 0, error: `Não conectado à balança em ${endpoint}. Verifique o IP, porta e se o servidor da balança está rodando.` });
  } catch (error: any) {
     return NextResponse.json({ peso: 0, error: `Erro ao buscar peso: ${error.message}` });
  }
}
