import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Artwork, Exhibition, ExhibitionSlot, Favorite } from '../entities/entities';
import { ExhibitionsService } from './exhibitions.service';
import { ExhibitionsController } from './exhibitions.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Exhibition, Artwork, ExhibitionSlot, Favorite]),
    AuthModule,
  ],
  controllers: [ExhibitionsController],
  providers: [ExhibitionsService],
  exports: [ExhibitionsService],
})
export class ExhibitionsModule {}
