export interface TrackingVisitorPrimitives {
  id: string;
  name: string | null;
  connectionDuration: number;
  ultimateConnectionDate: Date | null;
  isConnected: boolean;
  currentUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastVisitedUrl: string | null;
  lastVisitedAt: Date | null;
  pageViews: number;
  sessionDurationSeconds: number;
}
