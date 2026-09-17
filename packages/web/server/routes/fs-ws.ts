import type { WebSocket, WebSocketServer } from 'ws';
import {
  classifyError,
  errorMessage,
  FsSession,
  handleDelete,
  handleGitStatus,
  handleList,
  handleMkdir,
  handleRead,
  handleRename,
  handleSearch,
  handleStat,
  handleWriteFile,
  resolveRoot,
} from '../../server/lib/fs-ws/fs-core';
import { ClientMessage, ServerMessage } from '../lib/fs-ws/fs-protocol';

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
        switch (parsed.type) {
          case 'list':
            send(ws, await handleList(session, parsed));
            break;
          case 'read':
            send(ws, await handleRead(session, parsed));
            break;
          case 'stat':
            send(ws, await handleStat(session, parsed));
            break;
          case 'search':
            await handleSearch(session, parsed, (matches, done) => {
              send(ws, {
                id: parsed.id,
                type: 'search:result',
                matches,
                done,
              });
            });
            break;
          case 'git:status': {
            const entries = await handleGitStatus(session);
            send(ws, {
              id: parsed.id,
              type: 'git:status:result',
              entries,
            });
            break;
          }
          case 'write': {
            const finalPath = await handleWriteFile(session, parsed);
            send(ws, {
              id: parsed.id,
              type: 'mutation:result',
              path: finalPath,
            });
            break;
          }
          case 'mkdir': {
            const finalPath = await handleMkdir(session, parsed);
            send(ws, {
              id: parsed.id,
              type: 'mutation:result',
              path: finalPath,
            });
            break;
          }
          case 'rename': {
            const finalPath = await handleRename(session, parsed);
            send(ws, {
              id: parsed.id,
              type: 'mutation:result',
              path: finalPath,
            });
            break;
          }
          case 'delete': {
            const finalPath = await handleDelete(session, parsed);
            send(ws, {
              id: parsed.id,
              type: 'mutation:result',
              path: finalPath,
            });
            break;
          }
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
