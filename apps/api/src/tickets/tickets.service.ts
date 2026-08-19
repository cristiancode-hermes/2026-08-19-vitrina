import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import {
  EmailLog,
  Exhibition,
  ExhibitionSlot,
  Ticket,
  TicketLine,
  TicketStatus,
  TariffType,
  User,
} from '../entities/entities';
import { Mutex } from '../common/mutex';
import {
  ADDON_CATALOG,
  CANCEL_HOURS_BEFORE,
  HOLD_MINUTES,
  MAX_QTY,
  POINTS_PER_TICKET,
  TARIFF_LABELS,
  unitPrice,
} from '../common/tariffs';
import { randomBytes } from 'crypto';

export const TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  pending: ['confirmed', 'cancelled', 'expired'],
  confirmed: ['used', 'cancelled'],
  used: [],
  cancelled: [],
  expired: [],
};

@Injectable()
export class TicketsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('TicketSweeper');
  private readonly mutex = new Mutex();
  private sweeper: ReturnType<typeof setInterval> | null = null;

  constructor(
    @InjectRepository(Ticket) private readonly tickets: Repository<Ticket>,
    @InjectRepository(TicketLine) private readonly lines: Repository<TicketLine>,
    @InjectRepository(ExhibitionSlot) private readonly slots: Repository<ExhibitionSlot>,
    @InjectRepository(Exhibition) private readonly exhibitions: Repository<Exhibition>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(EmailLog) private readonly emails: Repository<EmailLog>,
    private readonly dataSource: DataSource,
  ) {}

  onModuleInit() {
    this.sweeper = setInterval(() => {
      void this.expireStale().then((n) => {
        if (n > 0) this.logger.log(`${n} ticket(s) pending vencido(s) liberados`);
      });
    }, 30_000);
    this.sweeper.unref?.();
  }

  onModuleDestroy() {
    if (this.sweeper) clearInterval(this.sweeper);
  }

  /** Cancela pending vencidos y libera cupo. */
  async expireStale(): Promise<number> {
    const now = new Date();
    const pendings = await this.tickets.find({ where: { status: 'pending' } });
    let n = 0;
    for (const t of pendings) {
      if (t.expiresAt && new Date(t.expiresAt) < now) {
        await this.releaseTicket(t, 'expired');
        n += 1;
      }
    }
    return n;
  }

  private async releaseTicket(t: Ticket, status: 'expired' | 'cancelled') {
    const slot = await this.slots.findOne({ where: { id: t.slotId } });
    if (slot) {
      slot.reservedCount = Math.max(0, slot.reservedCount - t.quantity);
      await this.slots.save(slot);
    }
    t.status = status;
    t.expiresAt = null;
    await this.tickets.save(t);
  }

  async create(
    userId: number,
    dto: {
      slotId: number;
      lines: { tariff: TariffType; qty: number }[];
      addOns?: { code: string; qty: number }[];
    },
  ) {
    if (!dto.lines?.length) throw new BadRequestException('Añade al menos una tarifa');
    const qty = dto.lines.reduce((a, l) => a + (l.qty || 0), 0);
    if (qty < 1 || qty > MAX_QTY) {
      throw new BadRequestException(`Cantidad entre 1 y ${MAX_QTY}`);
    }
    for (const l of dto.lines) {
      if (!['general', 'reduced', 'child', 'member'].includes(l.tariff)) {
        throw new BadRequestException(`Tarifa inválida: ${l.tariff}`);
      }
      if (!l.qty || l.qty < 1) throw new BadRequestException('Qty inválida');
    }

    return this.mutex.run(async () => {
      await this.expireStale();

      const supportsLock = this.dataSource.options.type !== 'better-sqlite3';
      const qb = this.slots.createQueryBuilder('s').where('s.id = :id', { id: dto.slotId });
      const slot = supportsLock
        ? await qb.setLock('pessimistic_write').getOne()
        : await qb.getOne();
      if (!slot) throw new NotFoundException('Franja no encontrada');

      // Un usuario no puede tener un segundo hold ni otra entrada confirmada
      // para la misma exposición + día + franja (slot).
      const duplicate = await this.tickets.findOne({
        where: [
          { userId, slotId: slot.id, status: 'pending' },
          { userId, slotId: slot.id, status: 'confirmed' },
        ],
        order: { createdAt: 'DESC' },
      });
      if (duplicate) {
        const kind =
          duplicate.status === 'pending'
            ? 'ya tienes una reserva temporal activa'
            : 'ya tienes una entrada confirmada';
        throw new ConflictException(
          `No puedes volver a reservar esta franja: ${kind} (entrada #${duplicate.id}).`,
        );
      }

      const free = slot.capacity - slot.reservedCount;
      if (free < qty) {
        throw new ConflictException('No hay cupo suficiente en esta franja');
      }

      const exhibition = await this.exhibitions.findOne({
        where: { id: slot.exhibitionId, published: true },
      });
      if (!exhibition) throw new NotFoundException('Exposición no disponible');

      const lineRows: { tariff: TariffType; qty: number; unitPriceCents: number; subtotalCents: number }[] =
        [];
      let total = 0;
      for (const l of dto.lines) {
        const unit = unitPrice(exhibition.basePriceCents, l.tariff);
        const sub = unit * l.qty;
        lineRows.push({ tariff: l.tariff, qty: l.qty, unitPriceCents: unit, subtotalCents: sub });
        total += sub;
      }

      const addOns: { code: string; label: string; unitCents: number; qty: number }[] = [];
      for (const a of dto.addOns || []) {
        const cat = ADDON_CATALOG[a.code];
        if (!cat || !a.qty || a.qty < 1) continue;
        addOns.push({ code: a.code, label: cat.label, unitCents: cat.unitCents, qty: a.qty });
        total += cat.unitCents * a.qty;
      }

      slot.reservedCount += qty;
      await this.slots.save(slot);

      const expiresAt = new Date(Date.now() + HOLD_MINUTES * 60 * 1000);
      const ticket = (await this.tickets.save({
        userId,
        exhibitionId: exhibition.id,
        slotId: slot.id,
        status: 'pending',
        totalCents: total,
        quantity: qty,
        addOns: addOns.length ? addOns : null,
        expiresAt,
        qrToken: null,
        code: null,
        confirmedAt: null,
      } as any)) as Ticket;

      for (const lr of lineRows) {
        await this.lines.save({
          ticketId: ticket.id,
          tariff: lr.tariff,
          qty: lr.qty,
          unitPriceCents: lr.unitPriceCents,
          subtotalCents: lr.subtotalCents,
        } as any);
      }

      return this.detail(userId, ticket.id);
    });
  }

  async listMine(userId: number) {
    await this.expireStale();
    const rows = await this.tickets.find({
      where: { userId },
      relations: { exhibition: true, slot: true, lines: true },
      order: { createdAt: 'DESC' },
    });
    return rows.map((t) => this.listView(t));
  }

  async detail(userId: number, id: number) {
    await this.expireStale();
    const t = await this.tickets.findOne({
      where: { id },
      relations: { exhibition: true, slot: true, lines: true, user: true },
    });
    if (!t) throw new NotFoundException('Entrada no encontrada');
    if (t.userId !== userId) throw new ForbiddenException('No es tu entrada');
    return this.detailView(t);
  }

  async confirm(userId: number, id: number) {
    return this.mutex.run(async () => {
      const t = await this.tickets.findOne({
        where: { id },
        relations: { exhibition: true, slot: true, lines: true, user: true },
      });
      if (!t) throw new NotFoundException('Entrada no encontrada');
      if (t.userId !== userId) throw new ForbiddenException('No es tu entrada');

      if (t.status === 'pending' && t.expiresAt && new Date(t.expiresAt) < new Date()) {
        await this.releaseTicket(t, 'expired');
        throw new ConflictException('La reserva expiró — elige otra franja');
      }

      const allowed = TRANSITIONS[t.status] ?? [];
      if (!allowed.includes('confirmed')) {
        throw new ConflictException(`No se puede confirmar desde ${t.status}`);
      }

      t.status = 'confirmed';
      t.expiresAt = null;
      t.confirmedAt = new Date();
      t.code = await this.generateCode();
      t.qrToken = randomBytes(16).toString('hex');
      await this.tickets.save(t);

      const user = await this.users.findOne({ where: { id: userId } });
      if (user) {
        user.points = (user.points || 0) + t.quantity * POINTS_PER_TICKET;
        await this.users.save(user);
      }

      if (user) {
        await this.emails.save({
          userId,
          ticketId: t.id,
          toEmail: user.email,
          subject: `Vitrina — Entrada confirmada ${t.code}`,
          body: `Hola ${user.name},\n\nTu entrada para "${t.exhibition?.title}" está confirmada.\nCódigo: ${t.code}\nFranja: ${t.slot?.date} ${t.slot?.startTime}-${t.slot?.endTime}\nQR: ${t.qrToken}\n\nMuseo Vitrina`,
        } as any);
      }

      return this.detail(userId, t.id);
    });
  }

  async cancel(userId: number, id: number) {
    return this.mutex.run(async () => {
      const t = await this.tickets.findOne({
        where: { id },
        relations: { exhibition: true, slot: true, lines: true },
      });
      if (!t) throw new NotFoundException('Entrada no encontrada');
      if (t.userId !== userId) throw new ForbiddenException('No es tu entrada');

      const allowed = TRANSITIONS[t.status] ?? [];
      if (!allowed.includes('cancelled')) {
        throw new ConflictException(`No se puede cancelar desde ${t.status}`);
      }

      if (t.status === 'confirmed' && t.slot) {
        const start = parseMadridLocal(t.slot.date, t.slot.startTime);
        const hours = (start.getTime() - Date.now()) / 3_600_000;
        if (hours < CANCEL_HOURS_BEFORE) {
          throw new BadRequestException(
            `Cancelación solo hasta ${CANCEL_HOURS_BEFORE}h antes de la franja`,
          );
        }
      }

      const wasConfirmed = t.status === 'confirmed';
      const qty = t.quantity;
      await this.releaseTicket(t, 'cancelled');

      if (wasConfirmed) {
        const user = await this.users.findOne({ where: { id: userId } });
        if (user) {
          user.points = Math.max(0, (user.points || 0) - qty * POINTS_PER_TICKET);
          await this.users.save(user);
        }
      }

      return this.detail(userId, id);
    });
  }

  async markUsed(adminUserId: number, id: number) {
    const admin = await this.users.findOne({ where: { id: adminUserId } });
    if (!admin || admin.role !== 'admin') throw new ForbiddenException();
    const t = await this.tickets.findOne({ where: { id } });
    if (!t) throw new NotFoundException();
    if (t.status !== 'confirmed') throw new ConflictException('Solo entradas confirmadas');
    t.status = 'used';
    await this.tickets.save(t);
    return { id: t.id, status: t.status };
  }

  listView(t: Ticket) {
    const linesSum = (t.lines || []).reduce((a, l) => a + l.subtotalCents, 0);
    const addOnSum = (t.addOns || []).reduce((a, x) => a + x.unitCents * x.qty, 0);
    return {
      id: t.id,
      status: t.status,
      totalCents: t.totalCents,
      linesTotalCents: linesSum + addOnSum,
      quantity: t.quantity,
      code: t.code,
      expiresAt: t.expiresAt ? new Date(t.expiresAt).toISOString() : null,
      createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : null,
      exhibition: t.exhibition
        ? { id: t.exhibition.id, title: t.exhibition.title, coverHue: t.exhibition.coverHue }
        : null,
      slot: t.slot
        ? {
            id: t.slot.id,
            date: t.slot.date,
            startTime: t.slot.startTime,
            endTime: t.slot.endTime,
          }
        : null,
    };
  }

  detailView(t: Ticket) {
    const base = this.listView(t);
    return {
      ...base,
      qrToken: t.qrToken,
      confirmedAt: t.confirmedAt ? new Date(t.confirmedAt).toISOString() : null,
      addOns: t.addOns || [],
      lines: (t.lines || []).map((l) => ({
        id: l.id,
        tariff: l.tariff,
        label: TARIFF_LABELS[l.tariff],
        qty: l.qty,
        unitPriceCents: l.unitPriceCents,
        subtotalCents: l.subtotalCents,
      })),
      qrSvg: t.qrToken ? buildQrPlaceholderSvg(t.qrToken, t.code || '') : null,
    };
  }

  private async generateCode(): Promise<string> {
    for (let i = 0; i < 8; i++) {
      const code = 'VT-' + randomBytes(3).toString('hex').toUpperCase();
      const exists = await this.tickets.findOne({ where: { code } });
      if (!exists) return code;
    }
    return 'VT-' + Date.now().toString(36).toUpperCase();
  }

  /** Test helper: recompute points from confirmed|used tickets */
  async recomputePoints(userId: number): Promise<number> {
    const rows = await this.tickets.find({
      where: { userId, status: In(['confirmed', 'used']) },
    });
    const pts = rows.reduce((a, t) => a + t.quantity * POINTS_PER_TICKET, 0);
    const user = await this.users.findOne({ where: { id: userId } });
    if (user) {
      user.points = pts;
      await this.users.save(user);
    }
    return pts;
  }
}

function parseMadridLocal(date: string, time: string): Date {
  // Interpret as Europe/Madrid wall clock roughly via offset (CEST +02 / CET +01).
  // For cancel window we use a stable approach: Date with explicit offset +02:00 (summer)
  // and accept 1h skew near DST edges — good enough for demo.
  return new Date(`${date}T${time}:00+02:00`);
}

/** Deterministic SVG "QR" placeholder (not a real QR encoder — printable stub). */
export function buildQrPlaceholderSvg(token: string, code: string): string {
  const cells = 21;
  const size = 168;
  const cell = size / cells;
  let rects = '';
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      const h = hashByte(token, x, y);
      const border = x < 3 || y < 3 || x >= cells - 3 || y >= cells - 3;
      const finder =
        (x < 7 && y < 7) || (x >= cells - 7 && y < 7) || (x < 7 && y >= cells - 7);
      const on = finder ? finderOn(x, y, cells) : h % 2 === 0 || border;
      if (on) {
        rects += `<rect x="${(x * cell).toFixed(2)}" y="${(y * cell).toFixed(2)}" width="${cell.toFixed(2)}" height="${cell.toFixed(2)}" fill="#1A1F1C"/>`;
      }
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size + 28}" width="${size}" height="${size + 28}" role="img" aria-label="QR ${code}"><rect width="100%" height="100%" fill="#fff"/>${rects}<text x="${size / 2}" y="${size + 18}" text-anchor="middle" font-family="monospace" font-size="12" fill="#1A1F1C">${code}</text></svg>`;
}

function hashByte(token: string, x: number, y: number): number {
  let h = 0;
  const s = `${token}:${x},${y}`;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function finderOn(x: number, y: number, cells: number): boolean {
  const regions = [
    [0, 0],
    [cells - 7, 0],
    [0, cells - 7],
  ];
  for (const [ox, oy] of regions) {
    const lx = x - ox;
    const ly = y - oy;
    if (lx >= 0 && lx < 7 && ly >= 0 && ly < 7) {
      if (lx === 0 || ly === 0 || lx === 6 || ly === 6) return true;
      if (lx >= 2 && lx <= 4 && ly >= 2 && ly <= 4) return true;
      return false;
    }
  }
  return false;
}
