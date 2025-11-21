import { ICommand, ICommandHandler, CommandHandler } from '@nestjs/cqrs';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NotFoundException } from '@nestjs/common';
import {
  VisitorSavedSearch,
  VisitorSavedSearchDocument,
} from '../../infrastructure/persistence/entity/visitor-saved-search.entity';

export class DeleteSavedSearchCommand implements ICommand {
  constructor(
    public readonly tenantId: string,
    public readonly userId: string,
    public readonly searchId: string,
  ) {}
}

@CommandHandler(DeleteSavedSearchCommand)
export class DeleteSavedSearchCommandHandler
  implements ICommandHandler<DeleteSavedSearchCommand, void>
{
  constructor(
    @InjectModel(VisitorSavedSearch.name)
    private readonly savedSearchModel: Model<VisitorSavedSearchDocument>,
  ) {}

  async execute(command: DeleteSavedSearchCommand): Promise<void> {
    const result = await this.savedSearchModel.deleteOne({
      id: command.searchId,
      tenantId: command.tenantId,
      userId: command.userId,
    });

    if (result.deletedCount === 0) {
      throw new NotFoundException(
        `Búsqueda guardada con id ${command.searchId} no encontrada`,
      );
    }
  }
}
