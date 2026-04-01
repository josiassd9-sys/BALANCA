import { Capacitor } from '@capacitor/core';
import { SCALE_CONFIG } from '../config/scale';
import type { TcpClientPlugin } from '../plugins/TcpClientPlugin';
import { TcpClient } from '../plugins/TcpClientPlugin';

type CapacitorWithGetPlugin = typeof Capacitor & {
  getPlugin?: (name: string) => unknown;
};

function getTcpClient(): TcpClientPlugin | undefined {
  console.log('[getTcpClient] TcpClient:', typeof TcpClient, !!TcpClient);
  if (TcpClient) {
    console.log('[getTcpClient] Returning TcpClient');
    return TcpClient;
  }
  const plugin = (Capacitor as CapacitorWithGetPlugin).getPlugin?.('TcpClient');
  console.log('[getTcpClient] Fallback getPlugin result:', !!plugin);
  if (plugin && typeof plugin === 'object') {
    return plugin as TcpClientPlugin;
  }
  return undefined;
}

export class TcpClientService {
  /**
   * Attempt to open a TCP connection. If host/port are provided we use them,
   * otherwise we fall back to the static configuration object.
   * If tcpHost is localhost or 127.0.0.1, we use the main host instead.
   */
  async connect(overrides?: { host?: string; port?: number }): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      throw new Error('TCP client not available on this platform');
    }
    let host = overrides?.host ?? SCALE_CONFIG.tcpHost;
    const port = overrides?.port ?? SCALE_CONFIG.tcpPort;
    
    // Se tcpHost for localhost ou 127.0.0.1, usar o host principal
    if (host === '127.0.0.1' || host === 'localhost' || !host) {
      host = SCALE_CONFIG.tcpHost || '192.168.18.13';
    }
    
    if (!host || !port) {
      throw new Error('Host and port must be provided for TCP connection');
    }
    const client = getTcpClient();
    console.log('[TcpClientService.connect] Client found:', !!client);
    console.log('[TcpClientService.connect] Client.connect exists:', !!client?.connect);
    if (!client || !client.connect) {
      console.error('[TcpClientService.connect] FAILED - plugin unavailable', { client, hasConnect: !!client?.connect });
      throw new Error('TcpClient plugin not available');
    }
    console.log('[TcpClientService.connect] Calling native connect:', { host, port });
    await client.connect({ host, port });
    console.log('[TcpClientService.connect] Connection successful');
  }

  async disconnect(): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      const client = getTcpClient();
      await client?.disconnect?.();
    }
  }

  async send(data: string): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      const client = getTcpClient();
      await client?.send?.({ data });
    }
  }

  async close(): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      const client = getTcpClient();
      await client?.close?.();
    }
  }

  async addDataListener(callback: (data: string) => void): Promise<() => void> {
    if (Capacitor.isNativePlatform()) {
      const client = getTcpClient();
      if (client?.addListener) {
        const handle = await client.addListener('onData', (event: { data: string }) => {
          callback(event.data);
        });
        return () => handle.remove();
      }
    }
    return () => { };
  }

  async addErrorListener(callback: (error: string) => void): Promise<() => void> {
    if (Capacitor.isNativePlatform()) {
      const client = getTcpClient();
      if (client?.addListener) {
        const handle = await client.addListener('onError', (event: { error: string }) => {
          callback(event.error);
        });
        return () => handle.remove();
      }
    }
    return () => { };
  }
}
