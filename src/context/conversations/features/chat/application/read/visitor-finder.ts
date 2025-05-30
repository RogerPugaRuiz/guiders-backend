export const VISITOR_FINDER = Symbol('VISITOR_FINDER');
export interface IVisitorFinder {
  findById(id: string): Promise<{
    id: string;
    name: string | null;
  }>;
}
