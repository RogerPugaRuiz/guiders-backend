import { Injectable } from '@nestjs/common';

@Injectable()
export class UserConnectionService {
  private users: Record<string, string[]> = {};

  constructor() {
    console.log('UserConnectionService created');
  }

  public add(id: string, socketId: string): void {
    if (!this.users[id]) {
      this.users[id] = [];
    }
    this.users[id].push(socketId);
  }
}
