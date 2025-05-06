export const USER_FINDER = Symbol('USER_FINDER');

export interface IUserFinder {
  findById(id: string): Promise<string>;
}
