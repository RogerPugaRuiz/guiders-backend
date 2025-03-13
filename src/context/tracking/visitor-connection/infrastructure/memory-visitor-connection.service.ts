import { Injectable } from '@nestjs/common';
import { VisitorConnectionRepository } from '../domain/visitor-connection.repository';
import { VisitorConnection } from '../domain/visitor-connection';

const visitorConnections: Record<string, VisitorConnection> = {};

@Injectable()
export class MemoryVisitorConnectionService
  implements VisitorConnectionRepository
{
  save(visitorConnection: VisitorConnection): Promise<void> {
    const { id } = visitorConnection.toPrimitives();
    visitorConnections[id] = visitorConnection;
    return Promise.resolve();
  }

  find(id: string): Promise<VisitorConnection | null> {
    const visitorConnection = visitorConnections[id];
    return Promise.resolve(visitorConnection ?? null);
  }
  delete(id: string): Promise<void> {
    delete visitorConnections[id];
    return Promise.resolve();
  }
  list(): Promise<VisitorConnection[]> {
    return Promise.resolve(Object.values(visitorConnections));
  }
}
