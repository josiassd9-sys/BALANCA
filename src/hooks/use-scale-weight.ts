
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';
type ConnectionConfig = { ip: string; port: string } | null;

export function useScaleWeight(config: ConnectionConfig) {
  const [weight, setWeight] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const socketRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    if (!config) {
      setConnectionStatus('disconnected');
      return;
    }

    if (socketRef.current && (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING)) {
        return; 
    }
    
    setConnectionStatus('connecting');
    
    const BALANCA_URL = `wss://${config.ip}:${config.port}`;

    try {
      const socket = new WebSocket(BALANCA_URL);
      socketRef.current = socket;

      socket.onopen = () => {
        console.log("WebSocket conectado com sucesso em", BALANCA_URL);
        setConnectionStatus('connected');
      };

      socket.onmessage = (event) => {
        const match = event.data.match(/ST,GS,([+-]?\d+),/);
        if (match && match[1]) {
          const weightValue = parseInt(match[1], 10);
          setWeight(isNaN(weightValue) ? 0 : weightValue);
        }
      };

      socket.onclose = () => {
        setConnectionStatus('disconnected');
        console.log("WebSocket desconectado.");
      };

      socket.onerror = (error) => {
        console.error("Erro no WebSocket:", error);
        setConnectionStatus('error');
        socket.close(); 
      };

    } catch (error) {
      console.error("Falha ao construir o WebSocket:", error);
      setConnectionStatus('error');
    }
  }, [config]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.onclose = null; 
      socketRef.current.close();
      socketRef.current = null;
    }
    setConnectionStatus('disconnected');
  }, []);


  useEffect(() => {
    if (config) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [config, connect, disconnect]);

  return { weight, connectionStatus, connect, disconnect };
}
