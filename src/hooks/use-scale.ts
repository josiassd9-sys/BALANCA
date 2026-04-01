'use client';

import { useState, useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';

export interface ScaleConfig {
  host: string;
  wsPort?: number;
  httpPort?: number;
  tcpHost?: string;
  tcpPort?: number;
  browserUrl?: string;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
export type ConnectionType = 'ws' | 'http' | 'tcp' | 'none';

const DEFAULT_HOST = typeof process.env.NEXT_PUBLIC_SCALE_HOST === 'string'
  ? process.env.NEXT_PUBLIC_SCALE_HOST
  : '192.168.18.13';
const DEFAULT_WS_PORT = 3001;
const DEFAULT_HTTP_PORT = 3000;
const DEFAULT_TCP_HOST = typeof process.env.NEXT_PUBLIC_SCALE_TCP_HOST === 'string'
  ? process.env.NEXT_PUBLIC_SCALE_TCP_HOST
  : DEFAULT_HOST;
const DEFAULT_TCP_PORT = process.env.NEXT_PUBLIC_SCALE_TCP_PORT
  ? parseInt(process.env.NEXT_PUBLIC_SCALE_TCP_PORT, 10)
  : 8080;
const DEFAULT_BROWSER_URL = typeof process.env.NEXT_PUBLIC_BROWSER_URL === 'string'
  ? process.env.NEXT_PUBLIC_BROWSER_URL
  : 'https://www.google.com';

export function useScale() {
  // Estado original
  const [weight, setWeight] = useState(0);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [connectionType, setConnectionType] = useState<ConnectionType>('none');
  const [config, setConfig] = useState<ScaleConfig>({
    host: DEFAULT_HOST,
    wsPort: DEFAULT_WS_PORT,
    httpPort: DEFAULT_HTTP_PORT,
    tcpHost: DEFAULT_TCP_HOST,
    tcpPort: DEFAULT_TCP_PORT,
    browserUrl: DEFAULT_BROWSER_URL,
  });

  const socketRef = useRef<WebSocket | null>(null);
  const suppressWsCloseRef = useRef(false);
  const httpIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const tcpListenerRef = useRef<any>(null);

  // ======= Novos estados para compatibilidade com bloco menor =======
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Salvar configuração
  const saveConfig = () => {
    try {
      localStorage.setItem('scaleConfig', JSON.stringify(config));
      disconnect();
      setTimeout(connect, 100);
    } catch (e) {
      console.error("Failed to save scale config", e);
    }
  };

  // Desconectar todos os tipos
  const disconnect = () => {
    if (tcpListenerRef.current) {
      tcpListenerRef.current.remove();
      tcpListenerRef.current = null;
    }

    if (socketRef.current) {
      suppressWsCloseRef.current = true;
      socketRef.current.close();
      socketRef.current = null;
    }

    if (httpIntervalRef.current) {
      clearInterval(httpIntervalRef.current);
      httpIntervalRef.current = null;
    }

    setStatus('disconnected');
    setConnectionType('none');
    // Atualiza compatibilidade
    setIsConnected(false);
  };

  const isValidPort = (value: number): boolean => Number.isInteger(value) && value > 0 && value <= 65535;

  const parseNumericValue = (raw: string): number | null => {
    const compact = raw.trim().replace(/\s+/g, '');
    if (!compact) return null;

    const signal = compact.startsWith('-') ? -1 : 1;
    const unsigned = compact.replace(/^[+-]/, '').replace(/[^\d.,]/g, '');
    if (!unsigned) return null;

    const lastComma = unsigned.lastIndexOf(',');
    const lastDot = unsigned.lastIndexOf('.');

    let normalized = unsigned;
    if (lastComma !== -1 && lastDot !== -1) {
      const decimalSeparator = lastComma > lastDot ? ',' : '.';
      normalized = decimalSeparator === ','
        ? unsigned.replace(/\./g, '').replace(',', '.')
        : unsigned.replace(/,/g, '');
    } else if (lastComma !== -1) {
      normalized = unsigned.replace(',', '.');
    }

    const dotParts = normalized.split('.');
    if (dotParts.length > 2) {
      const decimalPart = dotParts.pop();
      normalized = `${dotParts.join('')}.${decimalPart}`;
    }

    const parsed = Number.parseFloat(normalized);
    if (!Number.isFinite(parsed)) return null;
    return signal * Math.abs(parsed);
  };

  // Parse avançado de peso com sinais
  const parseWeightFromString = (text: string): number | null => {
    const match = text.match(/([+-]?)\s*([\d.,]+)\s*(?:kg)?/i);
    if (!match || !match[2]) return null;

    const signal = match[1] || '';
    return parseNumericValue(`${signal}${match[2]}`);
  };

  const parseWeightPayload = (payload: string): number | null => {
    const text = payload.trim();
    if (!text) return null;

    try {
      const parsedJson: unknown = JSON.parse(text);
      if (parsedJson && typeof parsedJson === 'object' && 'weight' in parsedJson) {
        const weightValue = (parsedJson as { weight?: unknown }).weight;
        if (typeof weightValue === 'number' && Number.isFinite(weightValue)) {
          return weightValue;
        }
        if (typeof weightValue === 'string') {
          const fromString = parseWeightFromString(weightValue);
          if (fromString !== null) return fromString;

          const numeric = parseNumericValue(weightValue);
          if (numeric !== null) return numeric;
        }
      }
    } catch {
      // payload is not JSON, continue with text parsing
    }

    const fromScalePattern = parseWeightFromString(text);
    if (fromScalePattern !== null) return fromScalePattern;

    const numberMatch = text.match(/[+-]?\s*\d[\d.,]*/);
    if (!numberMatch) return null;

    return parseNumericValue(numberMatch[0]);
  };

  const startHttpPolling = () => {
    if (httpIntervalRef.current) {
      clearInterval(httpIntervalRef.current);
      httpIntervalRef.current = null;
    }

    const endpoints = ['/peso', '/weight'];

    const poll = async () => {
      try {
        let parsedWeight: number | null = null;

        for (const endpoint of endpoints) {
          const httpUrl = `http://${config.host}:${config.httpPort}${endpoint}`;
          const response = await fetch(httpUrl, { cache: 'no-store' });
          if (!response.ok) {
            continue;
          }

          const text = await response.text();
          parsedWeight = parseWeightPayload(text);
          if (parsedWeight !== null) {
            break;
          }
        }

        if (parsedWeight === null) {
          throw new Error('Resposta HTTP sem peso válido');
        }

        setWeight(parsedWeight);
        setStatus('connected');
        setConnectionType('http');
        setIsConnected(true);
        setError(null);
      } catch (err: unknown) {
        console.error('[useScale] Erro no polling HTTP:', err);
        setStatus('error');
        setConnectionType('none');
        setIsConnected(false);
        setError(err instanceof Error ? err.message : 'HTTP polling failed');
      }
    };

    void poll();
    httpIntervalRef.current = setInterval(() => {
      void poll();
    }, 800);
  };

  // Conectar a balança
  const connect = () => {
    disconnect();
    setStatus('connecting');
    setError(null);

    const host = config.host.trim();
    const wsPort = Number(config.wsPort);
    const httpPort = Number(config.httpPort);
    const tcpHost = (config.tcpHost || host).trim();
    const tcpPort = Number(config.tcpPort);

    // ===== TCP direto (somente native) =====
    if (Capacitor.isNativePlatform()) {
      if (!tcpHost || !isValidPort(tcpPort)) {
        setStatus('error');
        setConnectionType('none');
        setIsConnected(false);
        setError('Configuração TCP inválida. Verifique host e porta TCP.');
        return;
      }

      console.log('[useScale] Tentando TCP:', tcpHost, tcpPort);
      (async () => {
        try {
          const { TcpClientService } = await import('@/services/tcp-client');
          const client = new TcpClientService();
          await client.connect({ host: tcpHost, port: tcpPort });
          console.log('[useScale] TCP conectado com sucesso');

          setStatus('connected');
          setConnectionType('tcp');
          setIsConnected(true);
          setError(null);

          const unsubscribe = await client.addDataListener((data: string) => {
            const parsed = parseWeightPayload(data);
            if (parsed !== null) {
              setWeight(parsed);
            }
          });

          await client.addErrorListener((err: string) => {
            console.error('[useScale] Erro TCP:', err);
            setStatus('error');
            setConnectionType('none');
            setIsConnected(false);
            setError(err);
          });

          tcpListenerRef.current = unsubscribe;
          return; // TCP OK → não tenta WS/HTTP
        } catch (err: unknown) {
          console.error('[useScale] Falha na conexão TCP, tentando HTTP como fallback:', err);
          if (isValidPort(httpPort)) {
            console.log('[useScale] Iniciando fallback HTTP no native');
            startHttpPolling();
          } else {
            setStatus('error');
            setConnectionType('none');
            setIsConnected(false);
            setError(err instanceof Error ? err.message : 'TCP connection failed');
          }
        }
      })();
      // TCP é o único transporte no native — HTTP só como fallback se TCP falhar
      return;
    }

    if (!host || !isValidPort(wsPort) || !isValidPort(httpPort)) {
      setStatus('error');
      setConnectionType('none');
      setIsConnected(false);
      setError('Configuração de rede inválida. Verifique host e portas WS/HTTP.');
      return;
    }

    // ===== WebSocket (protocolo WS puro) =====
    const wsUrl = `ws://${host}:${wsPort}`;
    console.log('[useScale] Tentando WebSocket:', wsUrl);
    const ws = new WebSocket(wsUrl);
    let hasConnected = false;

    ws.onopen = () => {
      hasConnected = true;
      console.log('[useScale] WebSocket conectado');
      setStatus('connected');
      setConnectionType('ws');
      setIsConnected(true);
      setError(null);
      if (httpIntervalRef.current) {
        clearInterval(httpIntervalRef.current);
        httpIntervalRef.current = null;
      }
    };

    ws.onmessage = (event) => {
      const message = typeof event.data === 'string' ? event.data : String(event.data);
      const parsed = parseWeightPayload(message);
      if (parsed !== null) {
        setWeight(parsed);
      }
    };

    ws.onerror = () => {
      setError('Falha na conexão WebSocket');
    };

    ws.onclose = () => {
      if (suppressWsCloseRef.current) {
        suppressWsCloseRef.current = false;
        return;
      }

      if (!hasConnected) {
        console.warn('[useScale] WS indisponível, iniciando fallback HTTP');
      } else {
        console.warn('[useScale] WS desconectado, alternando para HTTP');
      }
      setStatus('connecting');
      setConnectionType('none');
      setIsConnected(false);
      startHttpPolling();
    };

    socketRef.current = ws;
  };

  // ===== Carregar config salva =====
  useEffect(() => {
    try {
      const saved = localStorage.getItem('scaleConfig');
      if (saved) {
        const parsed = JSON.parse(saved);
        setConfig((prev) => ({
          ...prev,
          host: parsed.host || prev.host,
          wsPort: parsed.wsPort || prev.wsPort,
          httpPort: parsed.httpPort || prev.httpPort,
          tcpHost: parsed.tcpHost || parsed.host || prev.tcpHost,
          tcpPort: parsed.tcpPort || prev.tcpPort,
          browserUrl: parsed.browserUrl || prev.browserUrl,
        }));
      }
    } catch (e) {
      console.error("Erro ao ler scaleConfig do localStorage", e);
    }
  }, []);

  // Reconectar se config mudar
  useEffect(() => {
    disconnect();
    connect();
  }, [config.host, config.wsPort, config.httpPort, config.tcpHost, config.tcpPort]);

  // ===== Retorno unificado =====
  return { 
    weight, 
    status, 
    connectionType, 
    config, 
    setConfig, 
    saveConfig, 
    isConnected,  // compatibilidade com hook menor
    error         // compatibilidade com hook menor
  };
}