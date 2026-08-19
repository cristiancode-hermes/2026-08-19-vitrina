import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Exhibition, Review, Ticket } from '../entities/entities';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Review, Ticket, Exhibition]), AuthModule],
  controllers: [ReviewsController],
  providers: [ReviewsService],
})
export class ReviewsModule {}
