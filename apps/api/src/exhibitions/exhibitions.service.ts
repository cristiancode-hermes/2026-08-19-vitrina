import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Artwork, Exhibition, ExhibitionSlot, Favorite } from '../entities/entities';
import { TARIFF_LABELS, TARIFF_MULT, unitPrice } from '../common/tariffs';
import { madridDate } from '../common/madrid-date';

export { madridDate };

@Injectable()
export class ExhibitionsService {
  constructor(
    @InjectRepository(Exhibition) private readonly exhibitions: Repository<Exhibition>,
    @InjectRepository(Artwork) private readonly artworks: Repository<Artwork>,
    @InjectRepository(ExhibitionSlot) private readonly slots: Repository<ExhibitionSlot>,
    @InjectRepository(Favorite) private readonly favorites: Repository<Favorite>,
  ) {}

  async list(q: {
    type?: string;
    search?: string;
    featured?: string;
    withSlotsToday?: string;
    maxPriceCents?: string;
  }) {
    let items = await this.exhibitions.find({
      where: { published: true },
      order: { featured: 'DESC', id: 'ASC' },
    });
    if (q.type === 'permanent' || q.type === 'temporary') {
      items = items.filter((e) => e.type === q.type);
    }
    if (q.featured === '1' || q.featured === 'true') {
      items = items.filter((e) => e.featured);
    }
    if (q.search?.trim()) {
      const s = q.search.trim().toLowerCase();
      items = items.filter(
        (e) =>
          e.title.toLowerCase().includes(s) ||
          e.summary.toLowerCase().includes(s) ||
          e.hall.toLowerCase().includes(s),
      );
    }
    if (q.maxPriceCents) {
      const max = Number(q.maxPriceCents);
      if (!Number.isNaN(max)) items = items.filter((e) => e.basePriceCents <= max);
    }

    const today = madridDate();
    const views = await Promise.all(
      items.map(async (e) => {
        const freeToday = await this.freeSeatsForDay(e.id, today);
        return this.listView(e, freeToday);
      }),
    );

    if (q.withSlotsToday === '1' || q.withSlotsToday === 'true') {
      return views.filter((v) => v.freeSeatsToday > 0);
    }
    return views;
  }

  async detail(id: number, date?: string) {
    const e = await this.exhibitions.findOne({ where: { id, published: true } });
    if (!e) throw new NotFoundException('Exposición no encontrada');
    const day = date || madridDate();
    const artworks = await this.artworks.find({
      where: { exhibitionId: id },
      order: { id: 'ASC' },
    });
    const slots = await this.slotsForDay(id, day);
    const tariffs = (Object.keys(TARIFF_MULT) as Array<keyof typeof TARIFF_MULT>).map((t) => ({
      tariff: t,
      label: TARIFF_LABELS[t],
      unitPriceCents: unitPrice(e.basePriceCents, t),
    }));
    return {
      ...this.listView(e, await this.freeSeatsForDay(id, day)),
      description: e.description,
      artworks: artworks.map((a) => this.artworkView(a)),
      slots,
      tariffs,
      selectedDate: day,
    };
  }

  async artworkDetail(id: number) {
    const a = await this.artworks.findOne({
      where: { id },
      relations: { exhibition: true },
    });
    if (!a) throw new NotFoundException('Obra no encontrada');
    return {
      ...this.artworkView(a),
      exhibition: a.exhibition
        ? {
            id: a.exhibition.id,
            title: a.exhibition.title,
            type: a.exhibition.type,
            hall: a.exhibition.hall,
          }
        : null,
    };
  }

  async slotsForDay(exhibitionId: number, date: string) {
    const rows = await this.slots.find({
      where: { exhibitionId, date },
      order: { startTime: 'ASC' },
    });
    return rows.map((s) => this.slotView(s));
  }

  async freeSeatsForDay(exhibitionId: number, date: string): Promise<number> {
    const rows = await this.slots.find({ where: { exhibitionId, date } });
    return rows.reduce((acc, s) => acc + Math.max(0, s.capacity - s.reservedCount), 0);
  }

  slotView(s: ExhibitionSlot) {
    const free = Math.max(0, s.capacity - s.reservedCount);
    const ratio = s.capacity > 0 ? free / s.capacity : 0;
    let availability: 'free' | 'low' | 'full' = 'free';
    if (free <= 0) availability = 'full';
    else if (ratio <= 0.2) availability = 'low';
    return {
      id: s.id,
      exhibitionId: s.exhibitionId,
      date: s.date,
      startTime: s.startTime,
      endTime: s.endTime,
      capacity: s.capacity,
      reservedCount: s.reservedCount,
      freeSeats: free,
      availability,
    };
  }

  listView(e: Exhibition, freeSeatsToday: number) {
    return {
      id: e.id,
      title: e.title,
      summary: e.summary,
      type: e.type,
      startsOn: e.startsOn,
      endsOn: e.endsOn,
      coverHue: e.coverHue,
      hall: e.hall,
      basePriceCents: e.basePriceCents,
      featured: e.featured,
      freeSeatsToday,
    };
  }

  artworkView(a: Artwork) {
    return {
      id: a.id,
      exhibitionId: a.exhibitionId,
      title: a.title,
      artist: a.artist,
      yearLabel: a.yearLabel,
      technique: a.technique,
      room: a.room,
      curatorialNote: a.curatorialNote,
      coverHue: a.coverHue,
      tags: a.tags ?? [],
    };
  }

  async adminList() {
    const items = await this.exhibitions.find({ order: { id: 'ASC' } });
    return items.map((e) => ({
      id: e.id,
      title: e.title,
      type: e.type,
      published: e.published,
      featured: e.featured,
      basePriceCents: e.basePriceCents,
      startsOn: e.startsOn,
      endsOn: e.endsOn,
      hall: e.hall,
    }));
  }

  async adminUpsertExhibition(
    dto: {
      title: string;
      summary?: string;
      description?: string;
      type?: 'permanent' | 'temporary';
      startsOn?: string | null;
      endsOn?: string | null;
      coverHue?: string;
      hall?: string;
      basePriceCents?: number;
      published?: boolean;
      featured?: boolean;
    },
    id?: number,
  ) {
    if (id) {
      const e = await this.exhibitions.findOne({ where: { id } });
      if (!e) throw new NotFoundException();
      Object.assign(e, {
        title: dto.title ?? e.title,
        summary: dto.summary ?? e.summary,
        description: dto.description ?? e.description,
        type: dto.type ?? e.type,
        startsOn: dto.startsOn !== undefined ? dto.startsOn : e.startsOn,
        endsOn: dto.endsOn !== undefined ? dto.endsOn : e.endsOn,
        coverHue: dto.coverHue ?? e.coverHue,
        hall: dto.hall ?? e.hall,
        basePriceCents: dto.basePriceCents ?? e.basePriceCents,
        published: dto.published ?? e.published,
        featured: dto.featured ?? e.featured,
      });
      return this.exhibitions.save(e);
    }
    return this.exhibitions.save({
      title: dto.title,
      summary: dto.summary || '',
      description: dto.description || '',
      type: dto.type || 'temporary',
      startsOn: dto.startsOn ?? null,
      endsOn: dto.endsOn ?? null,
      coverHue: dto.coverHue || '160 30% 40%',
      hall: dto.hall || 'Sala A',
      basePriceCents: dto.basePriceCents ?? 1200,
      published: dto.published ?? true,
      featured: dto.featured ?? false,
    } as any);
  }

  async adminCreateSlot(dto: {
    exhibitionId: number;
    date: string;
    startTime: string;
    endTime: string;
    capacity: number;
  }) {
    const e = await this.exhibitions.findOne({ where: { id: dto.exhibitionId } });
    if (!e) throw new NotFoundException('Exposición no encontrada');
    if (!dto.capacity || dto.capacity < 1) throw new BadRequestException('Capacidad inválida');
    return this.slots.save({
      exhibitionId: dto.exhibitionId,
      date: dto.date,
      startTime: dto.startTime,
      endTime: dto.endTime,
      capacity: dto.capacity,
      reservedCount: 0,
    } as any);
  }

  async toggleFavorite(userId: number, exhibitionId: number) {
    const e = await this.exhibitions.findOne({ where: { id: exhibitionId, published: true } });
    if (!e) throw new NotFoundException();
    const existing = await this.favorites.findOne({ where: { userId, exhibitionId } });
    if (existing) {
      await this.favorites.remove(existing);
      return { favorited: false };
    }
    await this.favorites.save({ userId, exhibitionId } as any);
    return { favorited: true };
  }

  async listFavorites(userId: number) {
    const favs = await this.favorites.find({ where: { userId } });
    if (!favs.length) return [];
    const ids = favs.map((f) => f.exhibitionId);
    const items = await this.exhibitions.findBy({ id: In(ids) });
    const today = madridDate();
    return Promise.all(
      items.map(async (e) => this.listView(e, await this.freeSeatsForDay(e.id, today))),
    );
  }
}
