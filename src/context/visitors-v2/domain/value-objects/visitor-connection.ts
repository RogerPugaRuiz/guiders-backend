import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

// Enum para los estados de conexión del visitante
export enum ConnectionStatus {
  OFFLINE = 'offline', // Visitante desconectado
  ONLINE = 'online', // Visitante conectado pero no chateando
  CHATTING = 'chatting', // Visitante activo en chat
}

// Objeto de valor para manejar el estado de conexión del visitante
export class VisitorConnectionVO extends PrimitiveValueObject<ConnectionStatus> {
  constructor(value: ConnectionStatus) {
    super(
      value,
      (v) => VisitorConnectionVO.validate(v),
      'Estado de conexión inválido',
    );
  }

  private static validate(value: ConnectionStatus): boolean {
    return Object.values(ConnectionStatus).includes(value);
  }

  // Verifica si el visitante está online (sin importar si está chateando)
  public isOnline(): boolean {
    return (
      this.value === ConnectionStatus.ONLINE ||
      this.value === ConnectionStatus.CHATTING
    );
  }

  // Verifica si el visitante está chateando activamente
  public isChatting(): boolean {
    return this.value === ConnectionStatus.CHATTING;
  }

  // Verifica si el visitante está desconectado
  public isOffline(): boolean {
    return this.value === ConnectionStatus.OFFLINE;
  }

  // Transición a online (desde offline)
  public goOnline(): VisitorConnectionVO {
    if (this.value !== ConnectionStatus.OFFLINE) {
      throw new Error('Solo se puede pasar a online desde offline');
    }
    return new VisitorConnectionVO(ConnectionStatus.ONLINE);
  }

  // Transición a chatting (desde online)
  public startChatting(): VisitorConnectionVO {
    if (this.value !== ConnectionStatus.ONLINE) {
      throw new Error('Solo se puede iniciar chat desde online');
    }
    return new VisitorConnectionVO(ConnectionStatus.CHATTING);
  }

  // Transición a online (desde chatting)
  public stopChatting(): VisitorConnectionVO {
    if (this.value !== ConnectionStatus.CHATTING) {
      throw new Error('Solo se puede parar chat desde chatting');
    }
    return new VisitorConnectionVO(ConnectionStatus.ONLINE);
  }

  // Transición a offline (desde cualquier estado)
  public goOffline(): VisitorConnectionVO {
    return new VisitorConnectionVO(ConnectionStatus.OFFLINE);
  }
}
