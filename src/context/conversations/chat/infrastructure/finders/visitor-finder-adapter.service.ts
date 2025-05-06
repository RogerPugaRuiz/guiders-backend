import { Injectable } from '@nestjs/common';
import { IVisitorFinder } from '../../application/read/visitor-finder';
import { QueryBus } from '@nestjs/cqrs';

@Injectable()
export class VisitorFinderAdapterService implements IVisitorFinder {
  constructor(private readonly queryBus: QueryBus) {}
  async findById(id: string): Promise<{ id: string; name: string | null }> {
    return Promise.resolve({
      id,
      name: null,
    });
  }
}
