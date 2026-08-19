import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsString, Max, Min, MinLength } from 'class-validator';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user';

class CreateReviewDto {
  @Type(() => Number) @IsInt() @Min(1) @Max(5) rating: number;
  @IsString() @MinLength(3) body: string;
}

@ApiTags('reviews')
@Controller()
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get('exhibitions/:id/reviews')
  list(@Param('id', ParseIntPipe) id: number) {
    return this.reviews.listForExhibition(id);
  }

  @Post('exhibitions/:id/reviews')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  create(
    @CurrentUser() user: { userId: number },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviews.create(user.userId, id, dto.rating, dto.body);
  }
}
