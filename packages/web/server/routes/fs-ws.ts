import type { WebSocket, WebSocketServer } from 'ws';

import { ClientMessage, ServerMessage } from '../lib/fs-ws/fs-protocol';
import {
  classifyError,
  errorMessage,
  FsSession,
  handleList,
  handleRead,
  handleSearch,
  resolveRoot,
} from '../../server/lib/fs-ws/fs-core';

function send(ws: WebSocket, message: ServerMessage): void {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

export function setupFsWebSocket(wss: WebSocketServer): void {
  wss.on('connection', async (ws, req) => {
    let session: FsSession | null = null;

    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const rawRoot = url.searchParams.get('root');

    if (!rawRoot) {
      send(ws, {
        id: '',
        type: 'error',
        message: 'missing root',
        code: 'EINVAL',
      });
      ws.close();
      return;
    }

    try {
      session = { root: await resolveRoot(rawRoot) };
    } catch {
      send(ws, {
        id: '',
        type: 'error',
        message: 'invalid root directory',
        code: 'EINVAL',
      });
      ws.close();
      return;
    }

    ws.on('message', async (data) => {
      if (!session) return;

      let parsed: ClientMessage;

      try {
        parsed = ClientMessage.parse(JSON.parse(String(data)));
      } catch {
        return;
      }

      try {
        if (parsed.type === 'list') {
          send(ws, await handleList(session, parsed));
        } else if (parsed.type === 'read') {
          send(ws, await handleRead(session, parsed));
        } else if (parsed.type === 'search') {
          await handleSearch(session, parsed, (matches, done) => {
            send(ws, { id: parsed.id, type: 'search:result', matches, done });
          });
        }
      } catch (err) {
        send(ws, {
          id: parsed.id,
          type: 'error',
          message: errorMessage(err),
          code: classifyError(err),
        });
      }
    });

    ws.on('close', () => {
      session = null;
    });
  });
}
