import { io, type Socket } from 'socket.io-client';
import type { AuthResponse, IntentResponse } from './types.ts';

const SERVER_URL = import.meta.env.VITE_SERVER_URL as string | undefined;

export const socket: Socket = io(SERVER_URL, {
  autoConnect: false,
  transports: ['websocket', 'polling'],
});

function serverBase(): string {
  return SERVER_URL?.replace(/\/$/, '') ?? '';
}

export function connectSocket(): Socket {
  if (!socket.connected) {
    socket.connect();
  }
  return socket;
}

export function disconnectSocket(): void {
  if (socket.connected) {
    socket.disconnect();
  }
}

export async function fetchDevToken(id: string, name: string): Promise<string> {
  const url = `${serverBase()}/dev/token?id=${encodeURIComponent(id)}&name=${encodeURIComponent(name)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`dev token failed (${res.status})`);
  }
  const data = (await res.json()) as { initData?: string };
  if (!data.initData) {
    throw new Error('dev token missing initData');
  }
  return data.initData;
}

export function auth(initData: string, roomId: string): Promise<AuthResponse> {
  return new Promise((resolve) => {
    const doEmit = () => {
      socket.emit('auth', { initData, roomId }, (res: AuthResponse) => {
        resolve(res ?? { ok: false, error: 'Empty auth response' });
      });
    };

    if (socket.connected) {
      doEmit();
      return;
    }

    const onConnect = () => {
      cleanup();
      doEmit();
    };
    const onError = (err: Error) => {
      cleanup();
      resolve({ ok: false, error: err.message || 'Connection error' });
    };
    const cleanup = () => {
      socket.off('connect', onConnect);
      socket.off('connect_error', onError);
    };

    socket.once('connect', onConnect);
    socket.once('connect_error', onError);
    socket.connect();
  });
}

export function startMatch(): Promise<AuthResponse> {
  return new Promise((resolve) => {
    if (!socket.connected) {
      resolve({ ok: false, error: 'Socket not connected' });
      return;
    }
    socket.emit('lobby:start', (res: AuthResponse) => {
      resolve(res ?? { ok: false, error: 'Empty start response' });
    });
  });
}

export function sendIntent(payload: Record<string, unknown>): Promise<IntentResponse> {
  return new Promise((resolve) => {
    if (!socket.connected) {
      resolve({ ok: false, error: 'Socket not connected' });
      return;
    }

    socket.emit('intent', payload, (res: IntentResponse) => {
      resolve(res ?? { ok: false, error: 'Empty intent response' });
    });
  });
}
