import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  EmailLog,
  Exhibition,
  ExhibitionSlot,
  Ticket,
  TicketLine,
  User,
} from '../entities/entities';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Ticket,
      TicketLine,
      ExhibitionSlot,
      Exhibition,
      User,
      EmailLog,
    ]),
    AuthModule,
  ],
  controllers: [TicketsController],
  providers: [TicketsService],
  exports: [TicketsService],
})
export class TicketsModule {}
