export interface TrackingVisitorPrimitives {
  id: string;
  name: string | null;
  connectionDuration: number;
  isConnected: boolean;
  currentUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}
