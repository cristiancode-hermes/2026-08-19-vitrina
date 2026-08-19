import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Exhibition, ExhibitionSlot, Ticket } from '../entities/entities';
import { madridDate } from '../exhibitions/exhibitions.service';

@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(Ticket) private readonly tickets: Repository<Ticket>,
    @InjectRepository(ExhibitionSlot) private readonly slots: Repository<ExhibitionSlot>,
    @InjectRepository(Exhibition) private readonly exhibitions: Repository<Exhibition>,
  ) {}

  async dashboard() {
    const allTickets = await this.tickets.find({ relations: { slot: true, exhibition: true } });
    const confirmed = allTickets.filter((t) =>
      ['confirmed', 'used'].includes(t.status),
    );
    const revenueCents = confirmed.reduce((a, t) => a + t.totalCents, 0);
    const visitors = confirmed.reduce((a, t) => a + t.quantity, 0);
    const pending = allTickets.filter((t) => t.status === 'pending').length;

    const byDay = new Map<string, { date: string; tickets: number; revenueCents: number; visitors: number }>();
    for (const t of confirmed) {
      const day = t.slot?.date || (t.confirmedAt ? madridDate(new Date(t.confirmedAt)) : 'unknown');
      const row = byDay.get(day) || { date: day, tickets: 0, revenueCents: 0, visitors: 0 };
      row.tickets += 1;
      row.revenueCents += t.totalCents;
      row.visitors += t.quantity;
      byDay.set(day, row);
    }
    const revenueSeries = [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date));

    const slots = await this.slots.find({ relations: { exhibition: true } });
    const today = madridDate();
    const occupancyToday = slots
      .filter((s) => s.date === today)
      .map((s) => ({
        slotId: s.id,
        exhibitionTitle: s.exhibition?.title || `#${s.exhibitionId}`,
        startTime: s.startTime,
        capacity: s.capacity,
        reservedCount: s.reservedCount,
        occupancyPct: s.capacity ? Math.round((s.reservedCount / s.capacity) * 100) : 0,
      }))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    const byExhibition = new Map<number, { id: number; title: string; visitors: number; revenueCents: number }>();
    for (const t of confirmed) {
      const id = t.exhibitionId;
      const row = byExhibition.get(id) || {
        id,
        title: t.exhibition?.title || `#${id}`,
        visitors: 0,
        revenueCents: 0,
      };
      row.visitors += t.quantity;
      row.revenueCents += t.totalCents;
      byExhibition.set(id, row);
    }

    return {
      kpis: {
        revenueCents,
        visitors,
        confirmedTickets: confirmed.length,
        pendingHolds: pending,
        exhibitions: await this.exhibitions.count({ where: { published: true } }),
      },
      revenueSeries,
      occupancyToday,
      byExhibition: [...byExhibition.values()].sort((a, b) => b.revenueCents - a.revenueCents),
    };
  }
}
