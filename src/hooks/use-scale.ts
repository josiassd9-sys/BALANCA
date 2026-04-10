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
  connectionPriority?: ConnectionPriority;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
export type ConnectionType = 'ws' | 'http' | 'tcp' | 'none';
export type ConnectionPriority = 'http-ws-tcp' | 'ws-http-tcp' | 'tcp-http-ws' | 'tcp-ws-http';

const DEFAULT_BROWSER_URL = typeof process.env.NEXT_PUBLIC_BROWSER_URL === 'string'
  ? process.env.NEXT_PUBLIC_BROWSER_URL
  : 'https://www.google.com';
const DEFAULT_CONNECTION_PRIORITY: ConnectionPriority = 'http-ws-tcp';

const isConnectionPriority = (value: unknown): value is ConnectionPriority => (
  value === 'http-ws-tcp'
  || value === 'ws-http-tcp'
  || value === 'tcp-http-ws'
  || value === 'tcp-ws-http'
);

export function useScale() {
  // Estado original
  const [weight, setWeight] = useState(0);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [connectionType, setConnectionType] = useState<ConnectionType>('none');
  const [config, setConfig] = useState<ScaleConfig>({
    host: '',
    wsPort: undefined,
    httpPort: undefined,
    tcpHost: '',
    tcpPort: undefined,
    browserUrl: DEFAULT_BROWSER_URL,
    connectionPriority: DEFAULT_CONNECTION_PRIORITY,
  });

  const socketRef = useRef<WebSocket | null>(null);
  const suppressWsCloseRef = useRef(false);
  const httpIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const tcpListenerRef = useRef<any>(null);
  const tcpErrorListenerRef = useRef<(() => void) | null>(null);
  const tcpClientRef = useRef<{ disconnect?: () => Promise<void> } | null>(null);
  const httpFailureCountRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ======= Novos estados para compatibilidade com bloco menor =======
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const scheduleReconnect = (delayMs = 700) => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    reconnectTimeoutRef.current = setTimeout(() => {
      connect();
    }, delayMs);
  };

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
      try {
        if (typeof tcpListenerRef.current === 'function') {
          tcpListenerRef.current();
        } else if (typeof tcpListenerRef.current.remove === 'function') {
          tcpListenerRef.current.remove();
        }
      } catch (err) {
        console.warn('[useScale] Falha ao remover listener TCP:', err);
      }
      tcpListenerRef.current = null;
    }

    if (tcpErrorListenerRef.current) {
      try {
        tcpErrorListenerRef.current();
      } catch (err) {
        console.warn('[useScale] Falha ao remover listener de erro TCP:', err);
      }
      tcpErrorListenerRef.current = null;
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

    httpFailureCountRef.current = 0;

    if (tcpClientRef.current?.disconnect) {
      void tcpClientRef.current.disconnect().catch((err) => {
        console.warn('[useScale] Falha ao desconectar cliente TCP:', err);
      });
      tcpClientRef.current = null;
    }

    setStatus('disconnected');
    setConnectionType('none');
    // Atualiza compatibilidade
    setIsConnected(false);
  };

  const isValidPort = (value: number): boolean => Number.isInteger(value) && value > 0 && value <= 65535;

  const hasAnyUsableNetworkConfig = (): boolean => {
    const host = config.host?.trim();
    const wsPort = Number(config.wsPort);
    const httpPort = Number(config.httpPort);
    const tcpPort = Number(config.tcpPort);

    return Boolean(host)
      && (isValidPort(wsPort) || isValidPort(httpPort) || isValidPort(tcpPort));
  };

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

  const fetchHttpWeight = async (): Promise<number> => {
    const endpoints = ['/peso', '/weight'];

    for (const endpoint of endpoints) {
      const httpUrl = `http://${config.host}:${config.httpPort}${endpoint}`;
      const response = await fetch(httpUrl, { cache: 'no-store' });
      if (!response.ok) {
        continue;
      }

      const text = await response.text();
      const parsedWeight = parseWeightPayload(text);
      if (parsedWeight !== null) {
        return parsedWeight;
      }
    }

    throw new Error('Resposta HTTP sem peso válido');
  };

  const startHttpPolling = (onTransportUnstable?: () => void) => {
    if (httpIntervalRef.current) {
      clearInterval(httpIntervalRef.current);
      httpIntervalRef.current = null;
    }

    httpFailureCountRef.current = 0;

    const poll = async () => {
      try {
        const parsedWeight = await fetchHttpWeight();
        httpFailureCountRef.current = 0;

        setWeight(parsedWeight);
        setStatus('connected');
        setConnectionType('http');
        setIsConnected(true);
        setError(null);
      } catch (err: unknown) {
        httpFailureCountRef.current += 1;
        console.error('[useScale] Erro no polling HTTP:', err);

        if (httpFailureCountRef.current >= 3) {
          if (httpIntervalRef.current) {
            clearInterval(httpIntervalRef.current);
            httpIntervalRef.current = null;
          }
          setStatus('connecting');
          setConnectionType('none');
          setIsConnected(false);
          setError('HTTP instável. Tentando próximo protocolo...');
          onTransportUnstable?.();
          return;
        }

        setError(err instanceof Error ? err.message : 'HTTP polling failed');
      }
    };

    void poll();
    httpIntervalRef.current = setInterval(() => {
      void poll();
    }, 800);
  };

  const tryConnectHttp = async (): Promise<boolean> => {
    const host = config.host.trim();
    const httpPort = Number(config.httpPort);
    if (!host || !isValidPort(httpPort)) {
      return false;
    }

    try {
      const parsedWeight = await fetchHttpWeight();
      setWeight(parsedWeight);
      setStatus('connected');
      setConnectionType('http');
      setIsConnected(true);
      setError(null);
      startHttpPolling(() => scheduleReconnect(450));
      return true;
    } catch (err) {
      console.warn('[useScale] HTTP indisponível na tentativa inicial:', err);
      return false;
    }
  };

  const tryConnectWs = async (): Promise<boolean> => {
    const host = config.host.trim();
    const wsPort = Number(config.wsPort);
    if (!host || !isValidPort(wsPort)) {
      return false;
    }

    const wsUrl = `ws://${host}:${wsPort}`;
    console.log('[useScale] Tentando WebSocket:', wsUrl);

    const ws = await new Promise<WebSocket | null>((resolve) => {
      const candidate = new WebSocket(wsUrl);
      const timeoutId = setTimeout(() => {
        try {
          candidate.close();
        } catch {
          // ignore
        }
        resolve(null);
      }, 2500);

      candidate.onopen = () => {
        clearTimeout(timeoutId);
        resolve(candidate);
      };

      candidate.onerror = () => {
        clearTimeout(timeoutId);
        try {
          candidate.close();
        } catch {
          // ignore
        }
        resolve(null);
      };
    });

    if (!ws) {
      return false;
    }

    setStatus('connected');
    setConnectionType('ws');
    setIsConnected(true);
    setError(null);

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

      console.warn('[useScale] WS desconectado. Reaplicando prioridade de protocolos.');
      setStatus('connecting');
      setConnectionType('none');
      setIsConnected(false);
      scheduleReconnect(450);
    };

    socketRef.current = ws;
    return true;
  };

  const tryConnectTcp = async (): Promise<boolean> => {
    if (!Capacitor.isNativePlatform()) {
      return false;
    }

    const host = config.host.trim();
    const tcpHost = (config.tcpHost || host).trim();
    const tcpPort = Number(config.tcpPort);

    if (!tcpHost || !isValidPort(tcpPort)) {
      return false;
    }

    console.log('[useScale] Tentando TCP:', tcpHost, tcpPort);

    try {
      const { TcpClientService } = await import('@/services/tcp-client');
      const client = new TcpClientService();
      await client.connect({ host: tcpHost, port: tcpPort });
      tcpClientRef.current = client;

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

      const unsubscribeError = await client.addErrorListener((err: string) => {
        console.error('[useScale] Erro TCP:', err);
        setStatus('connecting');
        setConnectionType('none');
        setIsConnected(false);
        setError(err || 'Erro TCP');
        scheduleReconnect(450);
      });

      tcpListenerRef.current = unsubscribe;
      tcpErrorListenerRef.current = unsubscribeError;
      return true;
    } catch (err) {
      console.warn('[useScale] TCP indisponível na tentativa atual:', err);
      return false;
    }
  };

  // Conectar a balança
  const connect = () => {
    disconnect();

    if (!hasAnyUsableNetworkConfig()) {
      setStatus('disconnected');
      setConnectionType('none');
      setIsConnected(false);
      setError(null);
      return;
    }

    setStatus('connecting');
    setError(null);

    const priority = isConnectionPriority(config.connectionPriority)
      ? config.connectionPriority
      : DEFAULT_CONNECTION_PRIORITY;
    const protocolOrder = priority.split('-') as Array<'http' | 'ws' | 'tcp'>;

    void (async () => {
      for (const protocol of protocolOrder) {
        if (protocol === 'http' && await tryConnectHttp()) return;
        if (protocol === 'ws' && await tryConnectWs()) return;
        if (protocol === 'tcp' && await tryConnectTcp()) return;
      }

      setStatus('error');
      setConnectionType('none');
      setIsConnected(false);
      setError('Nenhum protocolo disponível com a prioridade configurada.');
    })();
  };

  // ===== Carregar config salva =====
  useEffect(() => {
    try {
      const saved = localStorage.getItem('scaleConfig');
      if (saved) {
        const parsed = JSON.parse(saved);
        setConfig((prev) => {
          const resolvedHost = parsed.host || prev.host;
          const rawTcpHost = parsed.tcpHost || parsed.host || prev.tcpHost;
          const resolvedTcpHost =
            rawTcpHost === '127.0.0.1' || rawTcpHost === 'localhost'
              ? resolvedHost
              : rawTcpHost;

          return {
            ...prev,
            host: resolvedHost,
            wsPort: parsed.wsPort || prev.wsPort,
            httpPort: parsed.httpPort || prev.httpPort,
            tcpHost: resolvedTcpHost,
            tcpPort: parsed.tcpPort || prev.tcpPort,
            browserUrl: parsed.browserUrl || prev.browserUrl,
            connectionPriority: isConnectionPriority(parsed.connectionPriority)
              ? parsed.connectionPriority
              : prev.connectionPriority,
          };
        });
      }
    } catch (e) {
      console.error("Erro ao ler scaleConfig do localStorage", e);
    }
  }, []);

  // Reconectar se config mudar
  useEffect(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    reconnectTimeoutRef.current = setTimeout(() => {
      connect();
    }, 280);

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [config.host, config.wsPort, config.httpPort, config.tcpHost, config.tcpPort, config.connectionPriority]);

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