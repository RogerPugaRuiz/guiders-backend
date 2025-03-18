import { Injectable } from '@nestjs/common';
import { ConnectionRepository } from '../domain/connection.repository';
import { ConnectionUser } from '../domain/connection-user';
import { Criteria, Filter, Operator } from 'src/context/shared/domain/criteria';
import { err, ok, Result } from 'src/context/shared/domain/result';
import { ConnectionUserNotFound } from '../domain/errors/connection-user-not-found';

@Injectable()
export class InMemoryConnectionService implements ConnectionRepository {
  private userSocketsMap: Map<string, string> = new Map(); // userId -> socketId
  private socketUserMap: Map<string, string> = new Map(); // socketId -> userId
  private userRolesMap: Map<string, string> = new Map(); // userId -> role

  async save(user: ConnectionUser): Promise<void> {
    const { userId, role } = user.toPrimitives();
    if (user.socketId.isPresent()) {
      const socketId = user.socketId.get();
      this.socketUserMap.set(socketId.value, userId);
      this.userSocketsMap.set(userId, socketId.value);
    } else {
      // Asegurarse de eliminar cualquier socket anterior si el usuario está desconectado.
      this.userSocketsMap.delete(userId);
    }
    this.userRolesMap.set(userId, role);
    return Promise.resolve();
  }

  async remove(user: ConnectionUser): Promise<void> {
    const { userId } = user.toPrimitives();
    const socketId = this.userSocketsMap.get(userId);
    if (socketId) {
      this.userSocketsMap.delete(userId);
      this.socketUserMap.delete(socketId);
    }
    this.userRolesMap.delete(userId);
    return Promise.resolve();
  }

  async find(criteria: Criteria<ConnectionUser>): Promise<ConnectionUser[]> {
    const { filters } = criteria;
    const users: ConnectionUser[] = [];

    // Iterar sobre todos los usuarios registrados (según roles)
    this.userRolesMap.forEach((role, userId) => {
      const socketId = this.userSocketsMap.get(userId);
      const user = ConnectionUser.fromPrimitives({
        userId,
        socketId, // Puede ser undefined, lo que generará Optional.empty()
        role,
      });
      if (this.matchesCriteria(user, filters)) {
        users.push(user);
      }
    });

    return Promise.resolve(users);
  }

  async findOne(
    criteria: Criteria<ConnectionUser>,
  ): Promise<Result<ConnectionUser, ConnectionUserNotFound>> {
    const { filters } = criteria;

    // Iterar sobre todos los usuarios registrados
    for (const [userId, role] of this.userRolesMap.entries()) {
      const socketId = this.userSocketsMap.get(userId);
      const user = ConnectionUser.fromPrimitives({
        userId,
        socketId,
        role,
      });
      if (this.matchesCriteria(user, filters)) {
        return Promise.resolve(ok(user));
      }
    }

    return Promise.resolve(err(new ConnectionUserNotFound()));
  }

  private matchesCriteria(
    user: ConnectionUser,
    filters: Filter<ConnectionUser>[],
  ): boolean {
    return filters.every((filter) => {
      const { field, operator, value } = filter;
      switch (field) {
        case 'userId':
          return this.applyOperator(user.userId.value, operator, value);
        case 'socketId':
          if (user.socketId.isPresent()) {
            return this.applyOperator(
              user.socketId.get().value,
              operator,
              value,
            );
          }
          return false;
        case 'role':
          return this.applyOperator(user.role.value, operator, value);
        default:
          return false;
      }
    });
  }

  private applyOperator(
    fieldValue: any,
    operator: Operator,
    value: any,
  ): boolean {
    switch (operator) {
      case Operator.EQUALS:
        return fieldValue === value;
      case Operator.NOT_EQUALS:
        return fieldValue !== value;
      case Operator.IN:
        return Array.isArray(value) && value.includes(fieldValue);
      case Operator.NOT_IN:
        return Array.isArray(value) && !value.includes(fieldValue);
      default:
        return false;
    }
  }
}
