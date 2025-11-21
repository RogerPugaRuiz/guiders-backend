import { ICommand, ICommandHandler, CommandHandler } from '@nestjs/cqrs';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  VisitorSavedSearch,
  VisitorSavedSearchDocument,
} from '../../infrastructure/persistence/entity/visitor-saved-search.entity';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';

export class CreateSavedSearchCommand implements ICommand {
  constructor(
    public readonly tenantId: string,
    public readonly userId: string,
    public readonly query: string,
    public readonly name?: string,
  ) {}
}

@CommandHandler(CreateSavedSearchCommand)
export class CreateSavedSearchCommandHandler
  implements ICommandHandler<CreateSavedSearchCommand, string>
{
  constructor(
    @InjectModel(VisitorSavedSearch.name)
    private readonly savedSearchModel: Model<VisitorSavedSearchDocument>,
  ) {}

  async execute(command: CreateSavedSearchCommand): Promise<string> {
    const id = Uuid.random().value;

    await this.savedSearchModel.create({
      id,
      tenantId: command.tenantId,
      userId: command.userId,
      query: command.query,
      name: command.name,
      createdAt: new Date(),
    });

    return id;
  }
}
