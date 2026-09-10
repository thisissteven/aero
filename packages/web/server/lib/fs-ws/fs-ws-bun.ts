import {
  classifyError,
  errorMessage,
  FsSession,
  handleList,
  handleRead,
  handleSearch,
} from './fs-core';
import { ClientMessage, ServerMessage } from './fs-protocol';
import type { WsLikeSocket } from '../terminal/pty-session';

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
}
