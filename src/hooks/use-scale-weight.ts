
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';

const BALANCA_URL = 'wss://192.168.18.8:3005';

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
    
    // Se já existe um socket, feche-o antes de criar um novo.
    // Isso evita múltiplas conexões e garante que o onclose não dispare reconexão indesejada.
    if (socketRef.current) {
        socketRef.current.onclose = null; // Impede que o onclose antigo dispare
        socketRef.current.close();
    }
    
    // Define o status para 'connecting' no início de cada tentativa.
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
        // Só tenta reconectar se o status não for de erro, para evitar loops em falhas persistentes.
        if (connectionStatus !== 'error') {
            setConnectionStatus('disconnected');
        }
        console.log("WebSocket desconectado. Tentando reconectar em 3 segundos...");
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      };

      socket.onerror = (error) => {
        console.error("Erro no WebSocket:", error);
        setConnectionStatus('error'); // Define o estado de erro
        socket.close(); // Isso vai disparar o onclose, que por sua vez agenda a reconexão.
      };

    } catch (error) {
      console.error("Falha ao construir o WebSocket:", error);
      setConnectionStatus('error');
      // Agenda a reconexão mesmo se a construção do WebSocket falhar.
      reconnectTimeoutRef.current = setTimeout(connect, 3000);
    }
  }, [connectionStatus]); // Adiciona connectionStatus como dependência para reavaliar no onclose

  useEffect(() => {
    connect();

    return () => {
      // Limpeza ao desmontar o componente
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.onclose = null; // Impede a reconexão ao desmontar
        socketRef.current.close();
      }
    };
  }, [connect]); // Executa apenas uma vez na montagem

  return { weight, connectionStatus };
}
