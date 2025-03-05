import { Injectable } from '@nestjs/common';
import { Client } from 'src/shared/types/client-type';

@Injectable()
export class ClientsService {
  private readonly clients = new Set<Client>();

  addClient(clientId: string, userAgent: string) {
    this.clients.add({ id: clientId, userAgent });
  }

  removeClient(clientId: string) {
    if (!this.hasClient(clientId)) {
      return;
    }
    this.clients.delete(this.getClient(clientId)!);
  }

  hasClient(clientId: string): boolean {
    return Array.from(this.clients).some((client) => client.id === clientId);
  }

  getClient(clientId: string) {
    return Array.from(this.clients).find((client) => client.id === clientId);
  }

  getClients() {
    return this.clients;
  }
}
