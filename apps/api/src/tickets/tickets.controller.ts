import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard, CurrentUser } from '../auth/current-user';
import { TicketsService } from './tickets.service';
import type { TariffType } from '../entities/entities';

class LineDto {
  @IsIn(['general', 'reduced', 'child', 'member'])
  tariff: TariffType;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  qty: number;
}

class AddonDto {
  @IsString()
  code: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  qty: number;
}

class CreateTicketDto {
  @Type(() => Number)
  @IsInt()
  slotId: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => LineDto)
  lines: LineDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddonDto)
  addOns?: AddonDto[];
}

@ApiTags('tickets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tickets')
export class TicketsController {
  constructor(private readonly tickets: TicketsService) {}

  @Get()
  list(@CurrentUser() user: { userId: number }) {
    return this.tickets.listMine(user.userId);
  }

  @Get(':id')
  one(@CurrentUser() user: { userId: number }, @Param('id', ParseIntPipe) id: number) {
    return this.tickets.detail(user.userId, id);
  }

  @Post()
  create(@CurrentUser() user: { userId: number }, @Body() dto: CreateTicketDto) {
    return this.tickets.create(user.userId, dto);
  }

  @Post(':id/confirm')
  confirm(@CurrentUser() user: { userId: number }, @Param('id', ParseIntPipe) id: number) {
    return this.tickets.confirm(user.userId, id);
  }

  @Post(':id/cancel')
  cancel(@CurrentUser() user: { userId: number }, @Param('id', ParseIntPipe) id: number) {
    return this.tickets.cancel(user.userId, id);
  }

  @Post(':id/use')
  @UseGuards(AdminGuard)
  use(@CurrentUser() user: { userId: number }, @Param('id', ParseIntPipe) id: number) {
    return this.tickets.markUsed(user.userId, id);
  }
}
