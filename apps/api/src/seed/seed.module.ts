import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Artwork,
  Exhibition,
  ExhibitionSlot,
  Review,
  Ticket,
  TicketLine,
  User,
} from '../entities/entities';
import { SeedService } from './seed.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Exhibition,
      Artwork,
      ExhibitionSlot,
      Ticket,
      TicketLine,
      Review,
    ]),
  ],
  providers: [SeedService],
})
export class SeedModule {}
