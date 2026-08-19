import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Exhibition, ExhibitionSlot, Ticket } from '../entities/entities';
import { StatsService } from './stats.service';
import { StatsController } from './stats.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Ticket, ExhibitionSlot, Exhibition]), AuthModule],
  controllers: [StatsController],
  providers: [StatsService],
})
export class StatsModule {}
