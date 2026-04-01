import { useEffect, useState, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { SCALE_CONFIG } from '../config/scale';
import { connectTcp, addTcpListener, closeTcp } from '../services/tcp-client';

function parseWeight(msg: string): string {
  const m = msg.match(/[-+]?[0-9]*[.,]?[0-9]+/);
  return m ? m[0].replace(',', '.') : msg.trim();
}

export function useScale() {
  const [weight, setWeight] = useState<string>('---');
  const connectedRef = useRef(false);

  useEffect(() => {
    let removeListener: (() => Promise<void>) | undefined;

    async function start() {
      try {
        if (Capacitor.getPlatform() === 'android') {
          // respect any settings the user may have changed in the web UI
          let host = SCALE_CONFIG.host;
          let port = SCALE_CONFIG.port;
          try {
            const saved = localStorage.getItem('scaleConfig');
            if (saved) {
              const obj = JSON.parse(saved);
              if (obj.tcpHost) host = obj.tcpHost;
              if (obj.tcpPort) port = obj.tcpPort;
            }
          } catch (parseError) {
            console.warn('[useScale] Falha ao ler scaleConfig do localStorage, usando valores padrão.', parseError);
          }

          await connectTcp(host, port);
          connectedRef.current = true;
          removeListener = addTcpListener((data: string) => {
            setWeight(parseWeight(data));
          });
        } else {
          const ws: WebSocket = new WebSocket("ws://localhost:3000");
          ws.onmessage = (e) => setWeight(parseWeight(e.data));
          ws.onclose = () => setWeight('---');
        }
      } catch (err) {
        console.error('Erro ao conectar TCP', err);
      }
    }

    start();

    return () => {
      (async () => {
        try {
          if (removeListener) await removeListener();
          if (connectedRef.current) await closeTcp();
        } catch (cleanupError) {
          console.warn('[useScale] Falha na limpeza da conexão TCP.', cleanupError);
        }
      })();
    };
  }, []);

  return { weight };
}
