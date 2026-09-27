import { Request, Response } from 'express';
import { db } from '../db/index.js';
import { sseManager } from '../utils/sse.js';

export class SystemController {
  /**
   * POST /api/simulation/reset
   * Reset tickets database to initial demo state.
   */
  public static async resetSimulation(_req: Request, res: Response): Promise<any> {
    db.seedInitialTickets();
    sseManager.broadcastEvent(
      'STATUS_CHANGED',
      'ALL',
      'all',
      'Queue database reset to demonstration state'
    );
    return res.json({ success: true, message: 'Queue reset to initial demonstration state' });
  }

  /**
   * GET /api/events/stream
   * Server-Sent Events (SSE) stream for real-time SignalR style updates across all clients.
   */
  public static handleSseStream(req: Request, res: Response): void {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    res.write(
      `data: ${JSON.stringify({ type: 'CONNECTED', message: 'Connected to St. Jude REST Event Bus' })}\n\n`
    );

    sseManager.addClient(res);

    req.on('close', () => {
      sseManager.removeClient(res);
    });
  }
}
