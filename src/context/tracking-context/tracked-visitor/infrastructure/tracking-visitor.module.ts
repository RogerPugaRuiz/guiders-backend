import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrackingVisitorEntity } from './tracking-visitor.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TrackingVisitorEntity])],
})
export class TrackingVisitorModule {}
