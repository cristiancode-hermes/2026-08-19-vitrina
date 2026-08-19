import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import {
  Artwork,
  Exhibition,
  ExhibitionSlot,
  Review,
  Ticket,
  TicketLine,
  User,
} from '../entities/entities';
import { madridDate } from '../common/madrid-date';
import { POINTS_PER_TICKET, unitPrice } from '../common/tariffs';
import { randomBytes } from 'crypto';

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger('Seed');

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Exhibition) private readonly exhibitions: Repository<Exhibition>,
    @InjectRepository(Artwork) private readonly artworks: Repository<Artwork>,
    @InjectRepository(ExhibitionSlot) private readonly slots: Repository<ExhibitionSlot>,
    @InjectRepository(Ticket) private readonly tickets: Repository<Ticket>,
    @InjectRepository(TicketLine) private readonly lines: Repository<TicketLine>,
    @InjectRepository(Review) private readonly reviews: Repository<Review>,
  ) {}

  async onModuleInit() {
    if (process.env.SEED_DB === 'false') return;
    const count = await this.users.count();
    if (count > 0) {
      this.logger.log('DB already seeded — skip');
      return;
    }
    await this.seed();
  }

  async seed() {
    this.logger.log('Seeding Vitrina…');
    const hash = await bcrypt.hash('demo1234', 10);

    const visitor = (await this.users.save({
      username: 'demo',
      email: 'demo@vitrina.dev',
      name: 'Elena Visitante',
      passwordHash: hash,
      role: 'visitor',
      points: 0,
    } as any)) as User;

    const admin = (await this.users.save({
      username: 'admin',
      email: 'admin@vitrina.dev',
      name: 'Marcos Curator',
      passwordHash: hash,
      role: 'admin',
      points: 0,
    } as any)) as User;

    const exhibitionDefs = [
      {
        title: 'Luz de la Colección Permanente',
        summary: 'Obras maestras del museo en diálogo permanente con la luz mediterránea.',
        description:
          'Un recorrido por la colección permanente de Vitrina: pintura, escultura y objetos de ciencia que dialogan con la arquitectura del edificio. Ideal para una primera visita.',
        type: 'permanent' as const,
        startsOn: null,
        endsOn: null,
        coverHue: '160 28% 32%',
        hall: 'Ala Norte',
        basePriceCents: 1400,
        featured: true,
      },
      {
        title: 'Bronces del Mediterráneo',
        summary: 'Escultura antigua y pátinas que cuentan siglos de comercio y culto.',
        description:
          'Exposición temporal que reúne bronces griegos, púnicos e ibéricos. Cada pieza se presenta con su contexto arqueológico y un mapa de rutas comerciales.',
        type: 'temporary' as const,
        startsOn: addDays(-10),
        endsOn: addDays(50),
        coverHue: '28 45% 38%',
        hall: 'Sala Temporal 1',
        basePriceCents: 1600,
        featured: true,
      },
      {
        title: 'Laboratorio de Colores',
        summary: 'Ciencia de los pigmentos: del óxido de hierro al azul ultramar.',
        description:
          'Una muestra interactiva sobre química del color. Experimentos seguros, microscopios y una galería de muestras históricas de pigmentos.',
        type: 'temporary' as const,
        startsOn: addDays(-5),
        endsOn: addDays(40),
        coverHue: '200 40% 36%',
        hall: 'Sala Ciencia',
        basePriceCents: 1200,
        featured: true,
      },
      {
        title: 'Archivo Sonoro del Siglo XX',
        summary: 'Grabaciones, partituras y objetos de la radio pública.',
        description:
          'Documentos sonoros restaurados, cascos de escucha y una línea de tiempo de la radiodifusión española. Entrada a precio reducido los miércoles.',
        type: 'temporary' as const,
        startsOn: addDays(0),
        endsOn: addDays(60),
        coverHue: '340 30% 34%',
        hall: 'Sala Multimedia',
        basePriceCents: 1000,
        featured: false,
      },
    ];

    const exhibitions: Exhibition[] = [];
    for (const def of exhibitionDefs) {
      const e = (await this.exhibitions.save({
        ...def,
        published: true,
      } as any)) as Exhibition;
      exhibitions.push(e);
    }

    const artworkSeeds = [
      [0, 'Patio con naranjos', 'Ana Beltrán', '1924', 'Óleo sobre lienzo', 'Sala 3'],
      [0, 'Esfera armilar', 'Taller anónimo', 'c. 1780', 'Latón y madera', 'Sala 1'],
      [0, 'Retrato de una lectora', 'Luis Morán', '1891', 'Óleo', 'Sala 2'],
      [1, 'Kore de bronce', 'Desconocido', 's. V a.C.', 'Bronce', 'Vitrina A'],
      [1, 'Ánfora púnica', 'Taller de Cádiz', 's. III a.C.', 'Cerámica', 'Vitrina B'],
      [1, 'Fíbula ibérica', 'Taller del Sureste', 's. IV a.C.', 'Bronce', 'Vitrina C'],
      [2, 'Cobalto de Sajonia', 'Colección química', '1832', 'Muestra mineral', 'Banco 1'],
      [2, 'Receta de temple al huevo', 'Manuscrito', 's. XV', 'Pergamino', 'Banco 2'],
      [2, 'Carta de ultramar', 'Importador veneciano', '1488', 'Papel', 'Banco 3'],
      [3, 'Micrófono de cinta', 'Radio Nacional', '1956', 'Metal y tela', 'Cabina'],
      [3, 'Partitura radiada', 'Orquesta de cámara', '1962', 'Papel impreso', 'Archivo'],
      [3, 'Receptor de válvulas', 'Fábrica nacional', '1948', 'Madera y vidrio', 'Sala'],
    ] as const;

    for (const [ei, title, artist, year, tech, room] of artworkSeeds) {
      await this.artworks.save({
        exhibitionId: exhibitions[ei].id,
        title,
        artist,
        yearLabel: year,
        technique: tech,
        room,
        curatorialNote: `${title} forma parte del discurso curatorial de «${exhibitions[ei].title}».`,
        coverHue: exhibitions[ei].coverHue,
        tags: [tech.split(' ')[0].toLowerCase(), room.toLowerCase()],
      } as any);
    }

    // slots: today + 7 days, morning/afternoon per exhibition
    const slotTimes = [
      ['10:00', '11:30'],
      ['12:00', '13:30'],
      ['16:00', '17:30'],
      ['18:00', '19:30'],
    ];
    const allSlots: ExhibitionSlot[] = [];
    for (let d = 0; d < 8; d++) {
      const date = addDays(d);
      for (const ex of exhibitions) {
        for (const [start, end] of slotTimes) {
          const capacity = ex.type === 'permanent' ? 40 : 28;
          const s = (await this.slots.save({
            exhibitionId: ex.id,
            date,
            startTime: start,
            endTime: end,
            capacity,
            reservedCount: 0,
          } as any)) as ExhibitionSlot;
          allSlots.push(s);
        }
      }
    }

    // Helper to create ticket with lines and update reservedCount
    const makeTicket = async (opts: {
      userId: number;
      slot: ExhibitionSlot;
      exhibition: Exhibition;
      status: Ticket['status'];
      lines: { tariff: 'general' | 'reduced' | 'child' | 'member'; qty: number }[];
      addOns?: { code: string; label: string; unitCents: number; qty: number }[];
      expiresAt?: Date | null;
      daysAgo?: number;
    }) => {
      const qty = opts.lines.reduce((a, l) => a + l.qty, 0);
      let total = 0;
      const lineData = opts.lines.map((l) => {
        const unit = unitPrice(opts.exhibition.basePriceCents, l.tariff);
        const sub = unit * l.qty;
        total += sub;
        return { ...l, unitPriceCents: unit, subtotalCents: sub };
      });
      for (const a of opts.addOns || []) total += a.unitCents * a.qty;

      if (['pending', 'confirmed', 'used'].includes(opts.status)) {
        opts.slot.reservedCount += qty;
        await this.slots.save(opts.slot);
      }

      const createdAt = new Date();
      if (opts.daysAgo) createdAt.setDate(createdAt.getDate() - opts.daysAgo);

      const ticket = (await this.tickets.save({
        userId: opts.userId,
        exhibitionId: opts.exhibition.id,
        slotId: opts.slot.id,
        status: opts.status,
        totalCents: total,
        quantity: qty,
        addOns: opts.addOns || null,
        expiresAt: opts.expiresAt ?? null,
        qrToken: opts.status === 'confirmed' || opts.status === 'used' ? randomBytes(16).toString('hex') : null,
        code: opts.status === 'confirmed' || opts.status === 'used' ? 'VT-SEED' + randomBytes(2).toString('hex').toUpperCase() : null,
        confirmedAt: opts.status === 'confirmed' || opts.status === 'used' ? createdAt : null,
        createdAt,
      } as any)) as Ticket;

      for (const ld of lineData) {
        await this.lines.save({
          ticketId: ticket.id,
          tariff: ld.tariff,
          qty: ld.qty,
          unitPriceCents: ld.unitPriceCents,
          subtotalCents: ld.subtotalCents,
        } as any);
      }
      return ticket;
    };

    const todaySlots = allSlots.filter((s) => s.date === madridDate());
    const s0 = todaySlots.find((s) => s.exhibitionId === exhibitions[0].id && s.startTime === '10:00')!;
    const s1 = todaySlots.find((s) => s.exhibitionId === exhibitions[1].id && s.startTime === '12:00')!;
    const s2 = todaySlots.find((s) => s.exhibitionId === exhibitions[2].id && s.startTime === '16:00')!;
    const s3 = todaySlots.find((s) => s.exhibitionId === exhibitions[0].id && s.startTime === '18:00')!;
    const futureSlot = allSlots.find(
      (s) => s.date === addDays(3) && s.exhibitionId === exhibitions[1].id && s.startTime === '10:00',
    )!;

    // confirmed
    await makeTicket({
      userId: visitor.id,
      slot: s0,
      exhibition: exhibitions[0],
      status: 'confirmed',
      lines: [{ tariff: 'general', qty: 2 }],
      addOns: [{ code: 'audioguide', label: 'Audioguía', unitCents: 350, qty: 2 }],
      daysAgo: 2,
    });
    // used (for reviews)
    await makeTicket({
      userId: visitor.id,
      slot: s1,
      exhibition: exhibitions[1],
      status: 'used',
      lines: [{ tariff: 'reduced', qty: 1 }, { tariff: 'child', qty: 1 }],
      daysAgo: 5,
    });
    // pending live
    await makeTicket({
      userId: visitor.id,
      slot: futureSlot,
      exhibition: exhibitions[1],
      status: 'pending',
      lines: [{ tariff: 'general', qty: 1 }],
      expiresAt: new Date(Date.now() + 12 * 60 * 1000),
    });
    // pending expired (will be cleaned by sweeper; reserved still counted until expire)
    const expiredSlot = todaySlots.find(
      (s) => s.exhibitionId === exhibitions[3].id && s.startTime === '12:00',
    )!;
    await makeTicket({
      userId: visitor.id,
      slot: expiredSlot,
      exhibition: exhibitions[3],
      status: 'pending',
      lines: [{ tariff: 'general', qty: 1 }],
      expiresAt: new Date(Date.now() - 60_000),
    });
    // cancelled
    await makeTicket({
      userId: visitor.id,
      slot: s3,
      exhibition: exhibitions[0],
      status: 'cancelled',
      lines: [{ tariff: 'member', qty: 1 }],
      daysAgo: 1,
    });
    // another confirmed on lab
    await makeTicket({
      userId: visitor.id,
      slot: s2,
      exhibition: exhibitions[2],
      status: 'confirmed',
      lines: [{ tariff: 'general', qty: 1 }],
      daysAgo: 0,
    });

    // points derived
    const scored = await this.tickets.find({
      where: { userId: visitor.id },
    });
    const pts = scored
      .filter((t) => t.status === 'confirmed' || t.status === 'used')
      .reduce((a, t) => a + t.quantity * POINTS_PER_TICKET, 0);
    visitor.points = pts;
    await this.users.save(visitor);

    // reviews (requires used ticket)
    await this.reviews.save({
      userId: visitor.id,
      exhibitionId: exhibitions[1].id,
      rating: 5,
      body: 'Los bronces están impecablemente iluminados. La cartela de la kore es un acierto.',
    } as any);
    await this.reviews.save({
      userId: admin.id,
      exhibitionId: exhibitions[0].id,
      rating: 4,
      body: 'Colección permanente bien cuidada; el patio merece una visita lenta.',
    } as any);
    // admin used ticket for second review path — skip, add two more synthetic used for admin
    const adminSlot = todaySlots.find(
      (s) => s.exhibitionId === exhibitions[2].id && s.startTime === '10:00',
    )!;
    await makeTicket({
      userId: admin.id,
      slot: adminSlot,
      exhibition: exhibitions[2],
      status: 'used',
      lines: [{ tariff: 'member', qty: 1 }],
      daysAgo: 4,
    });
    await this.reviews.save({
      userId: admin.id,
      exhibitionId: exhibitions[2].id,
      rating: 5,
      body: 'El laboratorio de colores engancha a familias enteras.',
    } as any);
    await this.reviews.save({
      userId: visitor.id,
      exhibitionId: exhibitions[0].id,
      rating: 4,
      body: 'Volveré con la audioguía; el texto de sala es denso y bueno.',
    } as any);

    // recompute admin points too
    const adminTickets = await this.tickets.find({ where: { userId: admin.id } });
    admin.points = adminTickets
      .filter((t) => t.status === 'confirmed' || t.status === 'used')
      .reduce((a, t) => a + t.quantity * POINTS_PER_TICKET, 0);
    await this.users.save(admin);

    this.logger.log(
      `Seed OK — visitor points=${visitor.points}, exhibitions=${exhibitions.length}, slots=${allSlots.length}`,
    );
  }
}

function addDays(n: number): string {
  const d = new Date();
  // work in Madrid calendar
  const base = madridDate(d);
  const [y, m, day] = base.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, day));
  dt.setUTCDate(dt.getUTCDate() + n);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}
