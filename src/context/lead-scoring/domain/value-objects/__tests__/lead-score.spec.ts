import { LeadScore, LeadScoringInput } from '../lead-score';

describe('LeadScore', () => {
  describe('calculate', () => {
    it('should create a cold lead for minimal activity', () => {
      const input: LeadScoringInput = {
        totalSessions: 1,
        totalPagesVisited: 2,
        totalTimeConnectedMs: 60000, // 1 minuto
        totalChats: 0,
        lifecycle: 'ANON',
      };

      const leadScore = LeadScore.calculate(input);
      const primitives = leadScore.toPrimitives();

      // Score = (1*10) + (2*2) + (1*1) = 15 < 20 = cold
      expect(primitives.tier).toBe('cold');
      expect(primitives.score).toBe(15);
      expect(primitives.signals.isRecurrentVisitor).toBe(false);
      expect(primitives.signals.hasHighEngagement).toBe(false);
      expect(primitives.signals.hasInvestedTime).toBe(false);
    });

    it('should create a warm lead for moderate activity', () => {
      const input: LeadScoringInput = {
        totalSessions: 2,
        totalPagesVisited: 4,
        totalTimeConnectedMs: 120000, // 2 minutos
        totalChats: 0,
        lifecycle: 'ANON',
      };

      const leadScore = LeadScore.calculate(input);
      const primitives = leadScore.toPrimitives();

      // Score = (2*10) + (4*2) + (2*1) = 30, no signals = warm (score >= 20)
      expect(primitives.tier).toBe('warm');
      expect(primitives.score).toBeGreaterThanOrEqual(20);
      expect(primitives.score).toBeLessThan(50);
    });

    it('should create a hot lead for high activity', () => {
      const input: LeadScoringInput = {
        totalSessions: 5,
        totalPagesVisited: 15,
        totalTimeConnectedMs: 600000, // 10 minutos
        totalChats: 2,
        lifecycle: 'LEAD',
      };

      const leadScore = LeadScore.calculate(input);
      const primitives = leadScore.toPrimitives();

      // Score = (5*10) + (15*2) + (10*1) = 90 >= 50 = hot
      expect(primitives.tier).toBe('hot');
      expect(primitives.score).toBeGreaterThanOrEqual(50);
      expect(primitives.signals.isRecurrentVisitor).toBe(true);
      expect(primitives.signals.hasHighEngagement).toBe(true);
      expect(primitives.signals.hasInvestedTime).toBe(true);
    });

    it('should cap score at 100', () => {
      const input: LeadScoringInput = {
        totalSessions: 20,
        totalPagesVisited: 100,
        totalTimeConnectedMs: 3600000, // 60 minutos
        totalChats: 10,
        lifecycle: 'CUSTOMER',
      };

      const leadScore = LeadScore.calculate(input);
      const primitives = leadScore.toPrimitives();

      expect(primitives.score).toBe(100);
    });

    it('should detect needsHelp signal correctly', () => {
      // Engaged visitor with multiple sessions but no chats
      const input: LeadScoringInput = {
        totalSessions: 5,
        totalPagesVisited: 12,
        totalTimeConnectedMs: 600000, // 10 minutos
        totalChats: 0,
        lifecycle: 'ENGAGED', // Must be ENGAGED for needsHelp
      };

      const leadScore = LeadScore.calculate(input);
      const primitives = leadScore.toPrimitives();

      expect(primitives.signals.needsHelp).toBe(true);
      expect(primitives.signals.hasHighEngagement).toBe(true);
      expect(primitives.signals.isRecurrentVisitor).toBe(true);
    });

    it('should not set needsHelp if visitor has chats', () => {
      const input: LeadScoringInput = {
        totalSessions: 5,
        totalPagesVisited: 12,
        totalTimeConnectedMs: 600000,
        totalChats: 1,
        lifecycle: 'ENGAGED',
      };

      const leadScore = LeadScore.calculate(input);
      const primitives = leadScore.toPrimitives();

      expect(primitives.signals.needsHelp).toBe(false);
    });

    it('should not set needsHelp if lifecycle is not ENGAGED', () => {
      const input: LeadScoringInput = {
        totalSessions: 5,
        totalPagesVisited: 12,
        totalTimeConnectedMs: 600000,
        totalChats: 0,
        lifecycle: 'ANON',
      };

      const leadScore = LeadScore.calculate(input);
      const primitives = leadScore.toPrimitives();

      expect(primitives.signals.needsHelp).toBe(false);
    });
  });

  describe('signals', () => {
    it('should set isRecurrentVisitor for 3+ sessions', () => {
      const input: LeadScoringInput = {
        totalSessions: 3,
        totalPagesVisited: 5,
        totalTimeConnectedMs: 120000,
        totalChats: 0,
        lifecycle: 'ANON',
      };

      const leadScore = LeadScore.calculate(input);
      expect(leadScore.toPrimitives().signals.isRecurrentVisitor).toBe(true);
    });

    it('should not set isRecurrentVisitor for less than 3 sessions', () => {
      const input: LeadScoringInput = {
        totalSessions: 2,
        totalPagesVisited: 5,
        totalTimeConnectedMs: 120000,
        totalChats: 0,
        lifecycle: 'ANON',
      };

      const leadScore = LeadScore.calculate(input);
      expect(leadScore.toPrimitives().signals.isRecurrentVisitor).toBe(false);
    });

    it('should set hasHighEngagement for 10+ pages', () => {
      const input: LeadScoringInput = {
        totalSessions: 1,
        totalPagesVisited: 10,
        totalTimeConnectedMs: 60000,
        totalChats: 0,
        lifecycle: 'ANON',
      };

      const leadScore = LeadScore.calculate(input);
      expect(leadScore.toPrimitives().signals.hasHighEngagement).toBe(true);
    });

    it('should set hasInvestedTime for 5+ minutes', () => {
      const input: LeadScoringInput = {
        totalSessions: 1,
        totalPagesVisited: 3,
        totalTimeConnectedMs: 300000, // 5 minutos
        totalChats: 0,
        lifecycle: 'ANON',
      };

      const leadScore = LeadScore.calculate(input);
      expect(leadScore.toPrimitives().signals.hasInvestedTime).toBe(true);
    });
  });

  describe('tier calculation with signals', () => {
    it('should be hot with 2+ active signals even with low score', () => {
      const input: LeadScoringInput = {
        totalSessions: 3, // isRecurrentVisitor = true
        totalPagesVisited: 10, // hasHighEngagement = true
        totalTimeConnectedMs: 60000, // 1 min, no hasInvestedTime
        totalChats: 0,
        lifecycle: 'ANON',
      };

      const leadScore = LeadScore.calculate(input);
      const primitives = leadScore.toPrimitives();

      // Score = 30+20+1 = 51, but 2 signals also makes it hot
      expect(primitives.tier).toBe('hot');
      expect(leadScore.getActiveSignalsCount()).toBe(2);
    });

    it('should be warm with 1 active signal', () => {
      const input: LeadScoringInput = {
        totalSessions: 1,
        totalPagesVisited: 3,
        totalTimeConnectedMs: 300000, // hasInvestedTime = true
        totalChats: 0,
        lifecycle: 'ANON',
      };

      const leadScore = LeadScore.calculate(input);
      const primitives = leadScore.toPrimitives();

      // Score = 10+6+5 = 21, 1 signal = warm
      expect(primitives.tier).toBe('warm');
      expect(leadScore.getActiveSignalsCount()).toBe(1);
    });
  });

  describe('getters', () => {
    it('should return correct values from getters', () => {
      const input: LeadScoringInput = {
        totalSessions: 4,
        totalPagesVisited: 12,
        totalTimeConnectedMs: 420000, // 7 minutos
        totalChats: 1,
        lifecycle: 'LEAD',
      };

      const leadScore = LeadScore.calculate(input);

      expect(leadScore.getScore()).toBeGreaterThan(0);
      expect(leadScore.getTier()).toBeDefined();
      expect(leadScore.getSignals()).toBeDefined();
      expect(leadScore.isHighIntent()).toBeDefined();
    });

    it('should correctly identify hot lead with isHighIntent()', () => {
      const hotInput: LeadScoringInput = {
        totalSessions: 6,
        totalPagesVisited: 20,
        totalTimeConnectedMs: 900000,
        totalChats: 3,
        lifecycle: 'CUSTOMER',
      };

      const coldInput: LeadScoringInput = {
        totalSessions: 1,
        totalPagesVisited: 2,
        totalTimeConnectedMs: 30000,
        totalChats: 0,
        lifecycle: 'ANON',
      };

      expect(LeadScore.calculate(hotInput).isHighIntent()).toBe(true);
      expect(LeadScore.calculate(coldInput).isHighIntent()).toBe(false);
    });
  });

  describe('score formula validation', () => {
    it('should apply correct weights: sessions=10, pages=2, time=1', () => {
      const input: LeadScoringInput = {
        totalSessions: 2, // 20 points
        totalPagesVisited: 5, // 10 points
        totalTimeConnectedMs: 180000, // 3 min = 3 points
        totalChats: 0,
        lifecycle: 'ANON',
      };

      const leadScore = LeadScore.calculate(input);
      // Expected: 20 + 10 + 3 = 33
      expect(leadScore.getScore()).toBe(33);
    });
  });
});
