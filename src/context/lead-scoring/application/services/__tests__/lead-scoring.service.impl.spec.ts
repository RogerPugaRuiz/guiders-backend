import { LeadScoringServiceImpl } from '../lead-scoring.service.impl';
import { LeadScoringInput } from '../../../domain/value-objects/lead-score';

describe('LeadScoringServiceImpl', () => {
  let service: LeadScoringServiceImpl;

  beforeEach(() => {
    service = new LeadScoringServiceImpl();
  });

  describe('calculateScore', () => {
    it('should calculate score for a cold lead', () => {
      const input: LeadScoringInput = {
        totalSessions: 1,
        totalPagesVisited: 2,
        totalTimeConnectedMs: 60000, // 1 min
        totalChats: 0,
        lifecycle: 'ANON',
      };

      const leadScore = service.calculateScore(input);
      const primitives = leadScore.toPrimitives();

      // Score = (1*10) + (2*2) + (1*1) = 15 < 20 = cold
      expect(primitives.tier).toBe('cold');
      expect(primitives.score).toBe(15);
    });

    it('should calculate score for a warm lead', () => {
      const input: LeadScoringInput = {
        totalSessions: 2,
        totalPagesVisited: 4,
        totalTimeConnectedMs: 120000, // 2 min
        totalChats: 0,
        lifecycle: 'LEAD',
      };

      const leadScore = service.calculateScore(input);
      const primitives = leadScore.toPrimitives();

      // Score = (2*10) + (4*2) + (2*1) = 30 >= 20 but < 50 = warm
      expect(primitives.tier).toBe('warm');
      expect(primitives.score).toBe(30);
    });

    it('should calculate score for a hot lead', () => {
      const input: LeadScoringInput = {
        totalSessions: 5,
        totalPagesVisited: 15,
        totalTimeConnectedMs: 600000, // 10 min
        totalChats: 2,
        lifecycle: 'CUSTOMER',
      };

      const leadScore = service.calculateScore(input);
      const primitives = leadScore.toPrimitives();

      // Score = (5*10) + (15*2) + (10*1) = 90 >= 50 = hot
      expect(primitives.tier).toBe('hot');
      expect(primitives.score).toBe(90);
    });

    it('should return LeadScore with all signals', () => {
      const input: LeadScoringInput = {
        totalSessions: 5,
        totalPagesVisited: 15,
        totalTimeConnectedMs: 600000, // 10 min
        totalChats: 0,
        lifecycle: 'ENGAGED',
      };

      const leadScore = service.calculateScore(input);
      const primitives = leadScore.toPrimitives();

      expect(primitives.signals).toBeDefined();
      expect(primitives.signals.isRecurrentVisitor).toBe(true);
      expect(primitives.signals.hasHighEngagement).toBe(true);
      expect(primitives.signals.hasInvestedTime).toBe(true);
      expect(primitives.signals.needsHelp).toBe(true);
    });

    it('should handle edge case with zero values', () => {
      const input: LeadScoringInput = {
        totalSessions: 0,
        totalPagesVisited: 0,
        totalTimeConnectedMs: 0,
        totalChats: 0,
        lifecycle: 'ANON',
      };

      const leadScore = service.calculateScore(input);
      const primitives = leadScore.toPrimitives();

      expect(primitives.score).toBe(0);
      expect(primitives.tier).toBe('cold');
    });

    it('should handle very high values and cap at 100', () => {
      const input: LeadScoringInput = {
        totalSessions: 100,
        totalPagesVisited: 500,
        totalTimeConnectedMs: 7200000, // 2 horas
        totalChats: 50,
        lifecycle: 'CUSTOMER',
      };

      const leadScore = service.calculateScore(input);
      const primitives = leadScore.toPrimitives();

      expect(primitives.score).toBe(100);
      expect(primitives.tier).toBe('hot');
    });
  });

  describe('score formula validation', () => {
    it('should apply correct weights: sessions=10, pages=2, time=1', () => {
      // Score = min(100, (sessions * 10) + (pages * 2) + (timeMin * 1))
      const input: LeadScoringInput = {
        totalSessions: 2, // 20 points
        totalPagesVisited: 5, // 10 points
        totalTimeConnectedMs: 180000, // 3 min = 3 points
        totalChats: 0,
        lifecycle: 'ANON',
      };

      const leadScore = service.calculateScore(input);
      // Expected: 20 + 10 + 3 = 33
      expect(leadScore.getScore()).toBe(33);
    });
  });
});
