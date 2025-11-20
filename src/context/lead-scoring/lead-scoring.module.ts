import { Module } from '@nestjs/common';
import { LEAD_SCORING_SERVICE } from './domain/lead-scoring.service';
import { LeadScoringServiceImpl } from './application/services/lead-scoring.service.impl';

// Module for lead scoring calculation

@Module({
  providers: [
    {
      provide: LEAD_SCORING_SERVICE,
      useClass: LeadScoringServiceImpl,
    },
  ],
  exports: [LEAD_SCORING_SERVICE],
})
export class LeadScoringModule {}
