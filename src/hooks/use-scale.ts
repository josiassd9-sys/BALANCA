
'use client';

import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

export interface ScaleConfig {
  host: string;
  wsPort: number;
  httpPort: number;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
export type ConnectionType = 'ws' | 'http' | 'none';

const DEFAULT_HOST = typeof process.env.NEXT_PUBLIC_SCALE_HOST === 'string' ? process.env.NEXT_PUBLIC_SCALE_HOST : '127.0.0.1';
const DEFAULT_WS_PORT = process.env.NEXT_PUBLIC_SCALE_WS_PORT ? parseInt(process.env.NEXT_PUBLIC_SCALE_WS_PORT, 10) : 3001;
const DEFAULT_HTTP_PORT = process.env.NEXT_PUBLIC_SCALE_HTTP_PORT ? parseInt(process.env.NEXT_PUBLIC_SCALE_HTTP_PORT, 10) : 3002;

export function useScale() {
  const [weight, setWeight] = useState(0);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [connectionType, setConnectionType] = useState<ConnectionType>('none');
  const [config, setConfig] = useState<ScaleConfig>({
    host: DEFAULT_HOST,
    wsPort: DEFAULT_WS_PORT,
    httpPort: DEFAULT_HTTP_PORT,
  });

  const socketRef = useRef<Socket | null>(null);
  const httpIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const saveConfig = () => {
    try {
      localStorage.setItem('scaleConfig', JSON.stringify(config));
      // Trigger reconnection with new config
      disconnect();
      setTimeout(connect, 100);
    } catch (e) {
      console.error("Failed to save scale config", e);
    }
  };

  const disconnect = () => {
    // Disconnect WebSocket
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    // Clear HTTP interval
    if (httpIntervalRef.current) {
      clearInterval(httpIntervalRef.current);
      httpIntervalRef.current = null;
    }
    setStatus('disconnected');
    setConnectionType('none');
  };

  const connect = () => {
    disconnect();
    setStatus('connecting');

    // 1. Attempt WebSocket Connection
    const wsUrl = `ws://${config.host}:${config.wsPort}`;
    const newSocket = io(wsUrl, {
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 1000,
      timeout: 2000,
    });

    newSocket.on('connect', () => {
      setStatus('connected');
      setConnectionType('ws');
      if (httpIntervalRef.current) {
        clearInterval(httpIntervalRef.current);
        httpIntervalRef.current = null;
      }
    });

    newSocket.on('weight', (newWeight: number) => {
      setWeight(newWeight);
    });

    newSocket.on('disconnect', () => {
      if (status !== 'error') {
         setStatus('disconnected');
         setConnectionType('none');
      }
    });
    
    newSocket.on('connect_error', () => {
      // WebSocket failed, so fall back to HTTP Polling
      setStatus('connecting'); // still trying
      newSocket.disconnect();
      
      const httpUrl = `http://${config.host}:${config.httpPort}/weight`;
      
      const poll = async () => {
        try {
          const response = await fetch(httpUrl);
          if (!response.ok) {
            throw new Error('HTTP request failed');
          }
          const data = await response.json();
          setWeight(data.weight);
          setStatus('connected');
          setConnectionType('http');
        } catch (err) {
          setStatus('error');
          setConnectionType('none');
          if (httpIntervalRef.current) {
             clearInterval(httpIntervalRef.current);
             httpIntervalRef.current = null;
          }
        }
      };

      // Poll immediately and then set interval
      poll();
      if (httpIntervalRef.current) clearInterval(httpIntervalRef.current);
      httpIntervalRef.current = setInterval(poll, 2000);
    });

    socketRef.current = newSocket;
  };

  useEffect(() => {
    // Load config from localStorage on initial mount
    try {
      const savedConfig = localStorage.getItem('scaleConfig');
      if (savedConfig) {
        setConfig(JSON.parse(savedConfig));
      }
    } catch (e) {
      console.error("Could not read scale config from localStorage.", e);
    }
    
    // Initial connection attempt
    connect();

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, []); // Empty array ensures this runs only once

  // Reconnect if config changes
  useEffect(() => {
      disconnect();
      connect();
  }, [config.host, config.wsPort, config.httpPort]);


  return { weight, status, connectionType, config, setConfig, saveConfig };
}
