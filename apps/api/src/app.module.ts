import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { ExhibitionsModule } from './exhibitions/exhibitions.module';
import { TicketsModule } from './tickets/tickets.module';
import { ReviewsModule } from './reviews/reviews.module';
import { StatsModule } from './stats/stats.module';
import { SeedModule } from './seed/seed.module';
import {
  Artwork,
  EmailLog,
  Exhibition,
  ExhibitionSlot,
  Favorite,
  Review,
  Ticket,
  TicketLine,
  User,
} from './entities/entities';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const dbType = config.get<string>('DATABASE_TYPE', 'better-sqlite3');
        if (dbType === 'postgres') {
          return {
            type: 'postgres' as const,
            url: config.get<string>('DATABASE_URL'),
            entities: [
              User,
              Exhibition,
              Artwork,
              ExhibitionSlot,
              Ticket,
              TicketLine,
              Review,
              EmailLog,
              Favorite,
            ],
            synchronize: config.get('TYPEORM_SYNC', 'true') === 'true',
            ssl: config.get('DATABASE_SSL', 'true') === 'true' ? { rejectUnauthorized: false } : false,
          };
        }
        return {
          type: 'better-sqlite3' as const,
          database: config.get<string>('DATABASE_PATH', 'data/vitrina.db'),
          entities: [
            User,
            Exhibition,
            Artwork,
            ExhibitionSlot,
            Ticket,
            TicketLine,
            Review,
            EmailLog,
            Favorite,
          ],
          synchronize: true,
        };
      },
    }),
    AuthModule,
    ExhibitionsModule,
    TicketsModule,
    ReviewsModule,
    StatsModule,
    SeedModule,
  ],
})
export class AppModule {}
