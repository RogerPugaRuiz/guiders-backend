export const NOTIFICATION = Symbol('NOTIFICATION');
/**
 * @description This file contains the interface for the notification service.
 * It is used to send notifications to users in the system.
 * @interface INotification
 * @method notify
 * @param payload - The payload to be sent to the user.
 * @param recipientId - The id of the user to send the notification to.
 * @returns {Promise<void>} - A promise that resolves when the notification is sent.
 */
export interface INotification {
  notify(params: {
    payload: Record<string, unknown>;
    recipientId: string;
    type?: string;
  }): Promise<void>;
  notifyRole(params: {
    payload: Record<string, unknown>;
    role: string;
    type?: string;
  }): Promise<void>;
}
