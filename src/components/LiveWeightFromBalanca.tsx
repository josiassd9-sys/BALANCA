'use client';

import { useEffect, useState, useCallback } from 'react';

type ScaleConfig = {
  ip: string;
  port: string;
};

export function LiveWeightFromBalanca(scaleConfig: ScaleConfig) {
  const [weight, setWeight] = useState<number>(0);
  const [lastUpdate, setLastUpdate] = useState<number>(0);

  const fetchPeso = useCallback(async () => {
    try {
      const apiUrl = `/api/peso?host=${scaleConfig.ip}&port=${scaleConfig.port}`;
      const response = await fetch(apiUrl, {
        cache: 'no-store',
      });
      
      if (!response.ok) throw new Error('Erro HTTP na API');
      
      const data = await response.json();
      
      if (data.error && data.error !== 'Formato de peso não reconhecido') {
        console.error('[LiveWeight] Erro da API:', data.error);
        return; // Não atualiza o peso se houver erro de conexão
      }
      
      if (data.peso !== undefined && !isNaN(data.peso)) {
        setWeight(data.peso);
        setLastUpdate(Date.now());
      }
    } catch (error) {
      console.error('[LiveWeight] Erro:', error);
    }
  }, [scaleConfig.ip, scaleConfig.port]);

  useEffect(() => {
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
