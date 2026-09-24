import { ensureFreshTokens } from "../api/client";
import { tokenStorage } from "../api/tokenStorage";
import { config } from "../config";
import { WSEventType, type ClientEvent, type ServerEvent } from "./events";
import { dispatchEvent } from "./registry";

const MAX_BACKOFF_MS = 15_000;
// Matches WS_UNAUTHORIZED in backend/app/seed/errors/realtime.py.
const UNAUTHORIZED_CLOSE_CODES = new Set([4401]);

class RealtimeSocket {
  private ws: WebSocket | null = null;
  private pingTimer: number | undefined;
  private retryTimer: number | undefined;
  private attempt = 0;
  private active = false;
  private lang = "ru";

  connect(lang: string): void {
    if (config.useMocks) return;
    this.lang = lang;
    this.active = true;
    this.open();
  }

  disconnect(): void {
    this.active = false;
    window.clearTimeout(this.retryTimer);
    window.clearInterval(this.pingTimer);
    this.ws?.close(1000);
    this.ws = null;
  }

  send(event: ClientEvent): void {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(event));
  }

  private open(): void {
    const token = tokenStorage.get()?.accessToken;
    if (!token) return;
    const url = `${config.wsUrl}?token=${encodeURIComponent(token)}&lang=${this.lang}`;
    const ws = new WebSocket(url);
    this.ws = ws;

    ws.onopen = () => {
      this.attempt = 0;
      this.pingTimer = window.setInterval(
        () => this.send({ type: WSEventType.PING, payload: {} }),
        config.wsPingIntervalMs,
      );
    };
    ws.onmessage = (message: MessageEvent<string>) => {
      try {
        dispatchEvent(JSON.parse(message.data) as ServerEvent);
      } catch (error) {
        if (!(error instanceof SyntaxError)) throw error;
      }
    };
    ws.onclose = (event) => {
      window.clearInterval(this.pingTimer);
      if (this.active) void this.scheduleReconnect(UNAUTHORIZED_CLOSE_CODES.has(event.code));
    };
  }

  private async scheduleReconnect(needsRefresh: boolean): Promise<void> {
    if (needsRefresh && !(await ensureFreshTokens())) return;
    const delay = Math.min(1000 * 2 ** this.attempt, MAX_BACKOFF_MS);
    this.attempt += 1;
    this.retryTimer = window.setTimeout(() => this.open(), delay);
  }
}

export const realtime = new RealtimeSocket();
