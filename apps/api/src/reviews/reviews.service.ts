import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Exhibition, Review, Ticket } from '../entities/entities';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review) private readonly reviews: Repository<Review>,
    @InjectRepository(Ticket) private readonly tickets: Repository<Ticket>,
    @InjectRepository(Exhibition) private readonly exhibitions: Repository<Exhibition>,
  ) {}

  async listForExhibition(exhibitionId: number) {
    const rows = await this.reviews.find({
      where: { exhibitionId },
      relations: { user: true },
      order: { createdAt: 'DESC' },
    });
    return rows.map((r) => ({
      id: r.id,
      rating: r.rating,
      body: r.body,
      createdAt: r.createdAt,
      user: r.user ? { id: r.user.id, name: r.user.name } : null,
    }));
  }

  async create(userId: number, exhibitionId: number, rating: number, body: string) {
    if (rating < 1 || rating > 5) throw new BadRequestException('Rating 1-5');
    if (!body?.trim()) throw new BadRequestException('Escribe un comentario');
    const ex = await this.exhibitions.findOne({ where: { id: exhibitionId } });
    if (!ex) throw new NotFoundException();

    const used = await this.tickets.findOne({
      where: { userId, exhibitionId, status: 'used' },
    });
    if (!used) {
      throw new ForbiddenException('Solo puedes reseñar tras una visita (entrada usada)');
    }

    const existing = await this.reviews.findOne({ where: { userId, exhibitionId } });
    if (existing) {
      existing.rating = rating;
      existing.body = body.trim();
      return this.reviews.save(existing);
    }
    return this.reviews.save({ userId, exhibitionId, rating, body: body.trim() } as any);
  }
}
