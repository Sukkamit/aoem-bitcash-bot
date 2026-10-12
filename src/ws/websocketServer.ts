import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { botEngine } from '../services/botEngine';
import { otpService } from '../services/otpService';

class WsManager {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();

  public init(server: HttpServer): WebSocketServer {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket) => {
      this.clients.add(ws);

      ws.send(
        JSON.stringify({
          event: 'connected',
          message: 'Connected to AOEM BitCash Bot Realtime Engine',
          timestamp: new Date().toISOString(),
        })
      );

      ws.on('close', () => this.clients.delete(ws));
      ws.on('error', () => this.clients.delete(ws));
    });

    // Listen to bot engine events and broadcast
    botEngine.on('order_created', (order) => this.broadcast('order_created', order));
    botEngine.on('order_updated', (order) => this.broadcast('order_updated', order));
    botEngine.on('order_completed', (order) => this.broadcast('order_completed', order));
    botEngine.on('order_failed', (order) => this.broadcast('order_failed', order));
    otpService.on('otp_received', (data) => this.broadcast('otp_received', data));

    return this.wss;
  }

  public broadcast(event: string, data: any): void {
    const payload = JSON.stringify({
      event,
      data,
      timestamp: new Date().toISOString(),
    });

    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(payload);
        } catch {
          this.clients.delete(client);
        }
      }
    }
  }
}

export const wsManager = new WsManager();
