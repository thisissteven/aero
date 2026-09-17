import type { WsLikeSocket } from '../terminal/pty-session';
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
  handleWriteFile,
} from './fs-core';
import { ClientMessage, ServerMessage } from './fs-protocol';

function send(ws: WsLikeSocket, message: ServerMessage): void {
  if (ws.readyState === 1) {
    ws.send(JSON.stringify(message));
  }
}

export async function handleFsSocketMessage(
  ws: WsLikeSocket,
  session: FsSession,
  raw: string,
): Promise<void> {
  let parsed: ClientMessage;

  try {
    parsed = ClientMessage.parse(JSON.parse(raw));
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
      case 'search':
        await handleSearch(session, parsed, (matches, done) => {
          send(ws, { id: parsed.id, type: 'search:result', matches, done });
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
}
