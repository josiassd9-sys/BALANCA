import type { PluginListenerHandle } from '@capacitor/core';
import { registerPlugin } from '@capacitor/core';

export interface TcpClientPlugin {
  connect(options: { host: string; port: number }): Promise<{ connected: boolean }>;
  disconnect(): Promise<{ disconnected: boolean }>;
  send(options: { data: string }): Promise<{ sent: boolean }>;
  close(): Promise<{ disconnected: boolean }>;
  addListener(eventName: 'onData', listenerFunc: (event: { data: string }) => void): Promise<PluginListenerHandle>;
  addListener(eventName: 'onError', listenerFunc: (event: { error: string }) => void): Promise<PluginListenerHandle>;
}

// explicit registration with type ensures proper typing
export const TcpClient = registerPlugin<TcpClientPlugin>('TcpClient');
