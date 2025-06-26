import { Injectable } from '@nestjs/common';
import { ConnectionRepository } from '../domain/connection.repository';
import { ConnectionUser } from '../domain/connection-user';
import {
  Criteria,
  Filter,
  FilterGroup,
  Operator,
} from 'src/context/shared/domain/criteria';
import { err, ok, Result } from 'src/context/shared/domain/result';
import { ConnectionUserNotFound } from '../domain/errors/connection-user-not-found';

@Injectable()
export class InMemoryConnectionService implements ConnectionRepository {
  findById(
    id: string,
  ): Promise<Result<ConnectionUser, ConnectionUserNotFound>> {
    throw new Error('Method not implemented.');
  }
  private userSocketsMap: Map<string, string> = new Map(); // userId -> socketId
  private socketUserMap: Map<string, string> = new Map(); // socketId -> userId
  private userRolesMap: Map<string, string[]> = new Map(); // userId -> roles
  private userCompanyMap: Map<string, string> = new Map(); // userId -> companyId

  async save(user: ConnectionUser): Promise<void> {
    const { userId, roles, companyId } = user.toPrimitives();
    if (user.socketId.isPresent()) {
      const socketId = user.socketId.get();
      this.socketUserMap.set(socketId.value, userId);
      this.userSocketsMap.set(userId, socketId.value);
    } else {
      // Asegurarse de eliminar cualquier socket anterior si el usuario está desconectado.
      this.userSocketsMap.delete(userId);
    }
    this.userRolesMap.set(userId, roles);
    this.userCompanyMap.set(
      userId,
      companyId || '550e8400-e29b-41d4-a716-446655440000',
    );
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
    this.userCompanyMap.delete(userId);
    return Promise.resolve();
  }

  async find(criteria: Criteria<ConnectionUser>): Promise<ConnectionUser[]> {
    const { filters } = criteria;
    const users: ConnectionUser[] = [];
    // Iterar sobre todos los usuarios registrados (según roles)
    this.userRolesMap.forEach((roles, userId) => {
      const socketId = this.userSocketsMap.get(userId);
      const companyId =
        this.userCompanyMap.get(userId) ||
        '550e8400-e29b-41d4-a716-446655440000';
      const user = ConnectionUser.fromPrimitives({
        userId,
        socketId, // Puede ser undefined, lo que generará Optional.empty()
        roles,
        companyId,
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
    for (const [userId, roles] of this.userRolesMap.entries()) {
      const socketId = this.userSocketsMap.get(userId);
      const companyId =
        this.userCompanyMap.get(userId) ||
        '550e8400-e29b-41d4-a716-446655440000';
      const user = ConnectionUser.fromPrimitives({
        userId,
        socketId,
        roles,
        companyId,
      });
      if (this.matchesCriteria(user, filters)) {
        return Promise.resolve(ok(user));
      }
    }

    return Promise.resolve(err(new ConnectionUserNotFound()));
  }

  private matchesCriteria(
    user: ConnectionUser,
    filters: (Filter<ConnectionUser> | FilterGroup<ConnectionUser>)[],
  ): boolean {
    return filters.every((filter) => {
      if (filter instanceof FilterGroup) {
        return filter.filters.every((subFilter) =>
          this.matchesCriteria(user, [subFilter]),
        );
      }
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
        case 'roles':
          return this.applyRoleOperator(user.roles, operator, value);
        case 'companyId':
          return this.applyOperator(user.companyId.value, operator, value);
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

  /**
   * Aplica operadores específicos para el campo de roles
   * Maneja la lógica de verificación de roles en arrays
   */
  private applyRoleOperator(
    userRoles: import('../domain/value-objects/connection-role').ConnectionRole[],
    operator: Operator,
    value: any,
  ): boolean {
    const rolesAsStrings = userRoles.map((role) => role.value);

    switch (operator) {
      case Operator.IN:
        // Verifica si alguno de los roles del usuario está en la lista de valores
        if (Array.isArray(value)) {
          return value.some((v: string) => rolesAsStrings.includes(v));
        }
        return rolesAsStrings.includes(value as string);
      case Operator.NOT_IN:
        // Verifica que ninguno de los roles del usuario esté en la lista de valores
        if (Array.isArray(value)) {
          return !value.some((v: string) => rolesAsStrings.includes(v));
        }
        return !rolesAsStrings.includes(value as string);
      case Operator.EQUALS:
        // Para roles, verificamos si contiene exactamente el rol especificado
        return rolesAsStrings.includes(value as string);
      default:
        return false;
    }
  }
}
