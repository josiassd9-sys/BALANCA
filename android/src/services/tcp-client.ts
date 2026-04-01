import { registerPlugin } from '@capacitor/core';
const TcpClient = registerPlugin<any>('TcpClient');

type OnDataCb = (data: string) => void;

export async function connectTcp(host: string, port: number): Promise<void> {
  console.log('[TcpClientService] connectTcp called', { host, port, isNative: (window as any).Capacitor?.isNative });
  if (!TcpClient || typeof (TcpClient as any).connect !== 'function') {
    console.error('[TcpClientService] TcpClient plugin is not available or not implemented on this platform');
    throw new Error('TcpClient plugin is not available');
  }
  await (TcpClient as any).connect({ host, port });
}

export async function sendTcp(data: string): Promise<void> {
  console.log('[TcpClientService] sendTcp called', { data });
  if (!TcpClient || typeof (TcpClient as any).send !== 'function') {
    throw new Error('TcpClient plugin is not available');
  }
  await (TcpClient as any).send({ data });
}

export async function closeTcp(): Promise<void> {
  console.log('[TcpClientService] closeTcp called');
  if (!TcpClient || typeof (TcpClient as any).close !== 'function') {
    throw new Error('TcpClient plugin is not available');
  }
  await (TcpClient as any).close();
}

export function addTcpListener(onData: OnDataCb) {
  console.log('[TcpClientService] addTcpListener called');
  if (!TcpClient || typeof (TcpClient as any).addListener !== 'function') {
    console.warn('[TcpClientService] addListener not available on TcpClient plugin');
    return async () => {};
  }
  const listener = (TcpClient as any).addListener('onData', (event: any) => {
    console.log('[TcpClientService] onData event', event);
    onData(event.data);
  });
  return async () => {
    await listener.remove();
  };
}
