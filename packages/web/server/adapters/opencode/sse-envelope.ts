export const MESSAGE_STREAM_GLOBAL_WS_PATH = '/api/global/event/ws';

export const MESSAGE_STREAM_DIRECTORY_WS_PATH = '/api/event/ws';

export const MESSAGE_STREAM_WS_HEARTBEAT_INTERVAL_MS = 15 * 1000;

export const MESSAGE_STREAM_WS_MAX_BUFFERED_BYTES = 16 * 1024 * 1024;

export const MESSAGE_STREAM_WS_BACKPRESSURE_WARN_BYTES = 12 * 1024 * 1024;

export interface SseEventEnvelope<T = unknown> {
  eventId: string | null;
  directory: string | null;
  payload: T;
}

export interface SseEventPayload {
  type?: string;
  properties?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface MessageStreamWsFrame<T = unknown> {
  type: string;
  payload: T;
}

export interface MessageStreamWsEvent<
  T = unknown,
> extends MessageStreamWsFrame<T> {
  type: 'event';
  eventId?: string;
  directory?: string;
}

export interface MessageStreamWsBackpressureFrame {
  type: 'backpressure';
  bufferedBytes: number;
  maxBytes: number;
}

export type MessageStreamWsPayload<T = unknown> =
  MessageStreamWsEvent<T> | MessageStreamWsBackpressureFrame;

export interface MessageStreamWsSocket {
  readyState: number;
  bufferedAmount?: number;
  send(data: string): void;
  close(code?: number, reason?: string): void;
  _ocBackpressureWarned?: boolean;
}

export function parseSseEventEnvelope<T = SseEventPayload>(
  block: string,
): SseEventEnvelope<T> | null {
  if (!block) {
    return null;
  }

  const lines = block.split('\n');

  const eventId =
    lines
      .find((line) => line.startsWith('id:'))
      ?.slice(3)
      .trim() || null;

  const dataLines = lines
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).replace(/^\s/, ''));

  if (dataLines.length === 0) {
    return null;
  }

  const payloadText = dataLines.join('\n').trim();

  if (!payloadText) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(payloadText);

    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'payload' in parsed &&
      typeof parsed.payload === 'object' &&
      parsed.payload !== null
    ) {
      const envelope = parsed as {
        payload: T;
        directory?: unknown;
      };

      return {
        eventId,
        directory:
          typeof envelope.directory === 'string' &&
          envelope.directory.length > 0
            ? envelope.directory
            : null,
        payload: envelope.payload,
      };
    }

    let directory: string | null = null;

    if (typeof parsed === 'object' && parsed !== null) {
      const value = parsed as Record<string, unknown>;

      if (typeof value.directory === 'string' && value.directory.length > 0) {
        directory = value.directory;
      } else if (
        typeof value.properties === 'object' &&
        value.properties !== null
      ) {
        const properties = value.properties as Record<string, unknown>;

        if (
          typeof properties.directory === 'string' &&
          properties.directory.length > 0
        ) {
          directory = properties.directory;
        } else if (
          typeof properties.info === 'object' &&
          properties.info !== null
        ) {
          const info = properties.info as Record<string, unknown>;

          if (typeof info.directory === 'string' && info.directory.length > 0) {
            directory = info.directory;
          }
        }
      }
    }

    return {
      eventId,
      directory,
      payload: parsed as T,
    };
  } catch {
    return null;
  }
}

export function sendMessageStreamWsFrame<T>(
  socket: MessageStreamWsSocket,
  payload: T,
): boolean {
  if (!socket || socket.readyState !== 1) {
    return false;
  }

  const buffered =
    typeof socket.bufferedAmount === 'number' ? socket.bufferedAmount : 0;

  if (buffered > MESSAGE_STREAM_WS_MAX_BUFFERED_BYTES) {
    try {
      socket.close(1013, 'Message stream client is too slow');
    } catch {
      // Ignore close errors.
    }

    return false;
  }

  try {
    socket.send(JSON.stringify(payload));

    const bufferedAfter =
      typeof socket.bufferedAmount === 'number' ? socket.bufferedAmount : 0;

    if (bufferedAfter > MESSAGE_STREAM_WS_MAX_BUFFERED_BYTES) {
      try {
        socket.close(1013, 'Message stream client is too slow');
      } catch {
        // Ignore close errors.
      }

      return false;
    }

    if (bufferedAfter > MESSAGE_STREAM_WS_BACKPRESSURE_WARN_BYTES) {
      if (!socket._ocBackpressureWarned) {
        socket._ocBackpressureWarned = true;

        try {
          socket.send(
            JSON.stringify({
              type: 'backpressure',
              bufferedBytes: bufferedAfter,
              maxBytes: MESSAGE_STREAM_WS_MAX_BUFFERED_BYTES,
            } satisfies MessageStreamWsBackpressureFrame),
          );
        } catch {
          // Best-effort warning.
        }
      }
    } else if (socket._ocBackpressureWarned) {
      socket._ocBackpressureWarned = false;
    }

    return true;
  } catch {
    return false;
  }
}

export function sendMessageStreamWsEvent<T>(
  socket: MessageStreamWsSocket,
  payload: T,
  options: {
    directory?: string;
    eventId?: string;
  } = {},
): boolean {
  const frame: MessageStreamWsEvent<T> = {
    type: 'event',
    payload,
    ...(typeof options.eventId === 'string' && options.eventId.length > 0
      ? { eventId: options.eventId }
      : {}),
    ...(typeof options.directory === 'string' && options.directory.length > 0
      ? { directory: options.directory }
      : {}),
  };

  return sendMessageStreamWsFrame(socket, frame);
}
