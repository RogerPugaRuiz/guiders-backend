export interface TrackingVisitorPrimitives {
  id: string;
  name: string | null;
  ultimateConnectionDate: Date | null;
  isConnected: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastVisitedUrl: string | null;
  lastVisitedAt: Date | null;
  pageViews: number;
  sessionDurationSeconds: number;
}
