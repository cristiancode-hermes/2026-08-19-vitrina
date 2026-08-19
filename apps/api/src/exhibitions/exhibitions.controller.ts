import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ExhibitionsService } from './exhibitions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard, CurrentUser } from '../auth/current-user';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

class UpsertExhibitionDto {
  @IsString() @MinLength(2) title: string;
  @IsOptional() @IsString() summary?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsIn(['permanent', 'temporary']) type?: 'permanent' | 'temporary';
  @IsOptional() @IsString() startsOn?: string | null;
  @IsOptional() @IsString() endsOn?: string | null;
  @IsOptional() @IsString() coverHue?: string;
  @IsOptional() @IsString() hall?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) basePriceCents?: number;
  @IsOptional() @IsBoolean() published?: boolean;
  @IsOptional() @IsBoolean() featured?: boolean;
}

class CreateSlotDto {
  @Type(() => Number) @IsInt() exhibitionId: number;
  @IsString() date: string;
  @IsString() startTime: string;
  @IsString() endTime: string;
  @Type(() => Number) @IsInt() @Min(1) capacity: number;
}

@ApiTags('exhibitions')
@Controller()
export class ExhibitionsController {
  constructor(private readonly service: ExhibitionsService) {}

  @Get('exhibitions')
  list(
    @Query('type') type?: string,
    @Query('search') search?: string,
    @Query('featured') featured?: string,
    @Query('withSlotsToday') withSlotsToday?: string,
    @Query('maxPriceCents') maxPriceCents?: string,
  ) {
    return this.service.list({ type, search, featured, withSlotsToday, maxPriceCents });
  }

  @Get('exhibitions/:id')
  detail(@Param('id', ParseIntPipe) id: number, @Query('date') date?: string) {
    return this.service.detail(id, date);
  }

  @Get('artworks/:id')
  artwork(@Param('id', ParseIntPipe) id: number) {
    return this.service.artworkDetail(id);
  }

  @Get('exhibitions/:id/slots')
  slots(@Param('id', ParseIntPipe) id: number, @Query('date') date?: string) {
    return this.service.slotsForDay(id, date || undefined as any);
  }

  @Post('favorites/:exhibitionId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  toggleFav(
    @CurrentUser() user: { userId: number },
    @Param('exhibitionId', ParseIntPipe) exhibitionId: number,
  ) {
    return this.service.toggleFavorite(user.userId, exhibitionId);
  }

  @Get('favorites')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  favorites(@CurrentUser() user: { userId: number }) {
    return this.service.listFavorites(user.userId);
  }

  @Get('admin/exhibitions')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AdminGuard)
  adminList() {
    return this.service.adminList();
  }

  @Post('admin/exhibitions')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AdminGuard)
  adminCreate(@Body() dto: UpsertExhibitionDto) {
    return this.service.adminUpsertExhibition(dto);
  }

  @Put('admin/exhibitions/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AdminGuard)
  adminUpdate(@Param('id', ParseIntPipe) id: number, @Body() dto: UpsertExhibitionDto) {
    return this.service.adminUpsertExhibition(dto, id);
  }

  @Post('admin/slots')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AdminGuard)
  adminSlot(@Body() dto: CreateSlotDto) {
    return this.service.adminCreateSlot(dto);
  }
}
