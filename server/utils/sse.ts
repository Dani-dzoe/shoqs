import { Response } from 'express';
import { QueueEvent } from '../models/Department.js';
import { db } from '../db/index.js';

class SseManager {
  private static instance: SseManager;
  private clients: Set<Response> = new Set();

  private constructor() {}

  public static getInstance(): SseManager {
    if (!SseManager.instance) {
      SseManager.instance = new SseManager();
    }
    return SseManager.instance;
  }

  public addClient(res: Response): void {
    this.clients.add(res);
  }

  public removeClient(res: Response): void {
    this.clients.delete(res);
  }

  public getClientCount(): number {
    return this.clients.size;
  }

  public broadcastEvent(
    type: QueueEvent['type'],
    ticketCode: string,
    departmentId: string,
    message: string,
    details?: any
  ): QueueEvent {
    const event: QueueEvent = {
      id: 'evt-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString(),
      type,
      ticketCode,
      departmentId,
      message,
      details
    };

    db.addEvent(event);

    const payload = `data: ${JSON.stringify(event)}\n\n`;
    this.clients.forEach(client => {
      try {
        client.write(payload);
      } catch {
        this.clients.delete(client);
      }
    });

    return event;
  }
}

export const sseManager = SseManager.getInstance();
