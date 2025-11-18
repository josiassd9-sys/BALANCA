'use client';

import { useEffect, useState, useCallback } from 'react';

export function LiveWeightFromBalanca() {
  const [weight, setWeight] = useState<number>(0);
  const [lastUpdate, setLastUpdate] = useState<number>(0);

  const fetchPeso = useCallback(async () => {
    try {
      // Busca via API route do Next.js (mesmo domínio, sem CORS)
      const response = await fetch('/api/peso', {
        cache: 'no-store',
      });
      
      if (!response.ok) throw new Error('Erro HTTP');
      
      const data = await response.json();
      console.log('[LiveWeight] Recebido:', data);
      
      if (data.peso !== undefined && !isNaN(data.peso)) {
        console.log('[LiveWeight] Peso:', data.peso, 'kg');
        setWeight(data.peso);
        setLastUpdate(Date.now());
      }
    } catch (error) {
      console.error('[LiveWeight] Erro:', error);
    }
  }, []);

  useEffect(() => {
    console.log('[LiveWeight] Iniciando polling HTTP...');
    
    let active = true;

    function loop() {
      if (!active) return;
      fetchPeso();
      setTimeout(loop, 100);
    }

    loop();

    return () => {
      active = false;
    };
  }, [fetchPeso]);

  return { weight, refresh: fetchPeso, lastUpdate };
}
