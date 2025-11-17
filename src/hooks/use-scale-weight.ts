
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';

const BALANCA_URL = 'ws://192.168.18.8:8081';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export function useScaleWeight() {
  const [weight, setWeight] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (socketRef.current && socketRef.current.readyState !== WebSocket.CLOSED) {
        socketRef.current.onclose = null; // Prevent onclose from firing during manual reconnection
        socketRef.current.close();
    }
    
    setConnectionStatus('connecting');

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
        console.log("WebSocket desconectado. Tentando reconectar em 3 segundos...");
        setConnectionStatus('disconnected');
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      };

      socket.onerror = (error) => {
        console.error("Erro no WebSocket:", error);
        setConnectionStatus('error');
        socket.close(); // Isso vai disparar o onclose e a lógica de reconexão
      };

    } catch (error) {
      console.error("Falha ao construir o WebSocket:", error);
      setConnectionStatus('error');
      reconnectTimeoutRef.current = setTimeout(connect, 3000);
    }
  }, []);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.onclose = null; // Impede a reconexão ao desmontar o componente
        socketRef.current.close();
      }
    };
  }, [connect]);

  return { weight, connectionStatus };
}

    