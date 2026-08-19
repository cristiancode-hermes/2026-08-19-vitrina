import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

export type UserRole = 'visitor' | 'admin';
export type ExhibitionType = 'permanent' | 'temporary';
export type TicketStatus = 'pending' | 'confirmed' | 'used' | 'cancelled' | 'expired';
export type TariffType = 'general' | 'reduced' | 'child' | 'member';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 80, unique: true })
  username: string;

  @Column({ type: 'varchar', length: 160, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'varchar', length: 200 })
  passwordHash: string;

  @Column({ type: 'varchar', length: 20, default: 'visitor' })
  role: UserRole;

  /** Puntos socio derivados de tickets confirmed|used × 10 */
  @Column({ type: 'int', default: 0 })
  points: number;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @OneToMany(() => Ticket, (t) => t.user)
  tickets?: Ticket[];
}

@Entity('exhibitions')
export class Exhibition {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  summary: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 20 })
  type: ExhibitionType;

  /** ISO date YYYY-MM-DD or null for permanent open-ended */
  @Column({ type: 'varchar', length: 10, nullable: true })
  startsOn: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  endsOn: string | null;

  @Column({ type: 'varchar', length: 120 })
  coverHue: string;

  @Column({ type: 'varchar', length: 80, default: 'Sala Principal' })
  hall: string;

  /** Precio base general en céntimos */
  @Column({ type: 'int' })
  basePriceCents: number;

  @Column({ type: 'boolean', default: true })
  published: boolean;

  @Column({ type: 'boolean', default: false })
  featured: boolean;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @OneToMany(() => Artwork, (a) => a.exhibition)
  artworks?: Artwork[];

  @OneToMany(() => ExhibitionSlot, (s) => s.exhibition)
  slots?: ExhibitionSlot[];
}

@Entity('artworks')
export class Artwork {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  exhibitionId: number;

  @ManyToOne(() => Exhibition, (e) => e.artworks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'exhibitionId' })
  exhibition?: Exhibition;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'varchar', length: 160 })
  artist: string;

  @Column({ type: 'varchar', length: 40, nullable: true })
  yearLabel: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  technique: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  room: string | null;

  @Column({ type: 'text' })
  curatorialNote: string;

  @Column({ type: 'varchar', length: 120 })
  coverHue: string;

  @Column({ type: 'simple-json', nullable: true })
  tags: string[] | null;
}

@Entity('exhibition_slots')
@Unique(['exhibitionId', 'date', 'startTime'])
export class ExhibitionSlot {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  exhibitionId: number;

  @ManyToOne(() => Exhibition, (e) => e.slots, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'exhibitionId' })
  exhibition?: Exhibition;

  /** YYYY-MM-DD Europe/Madrid calendar day */
  @Column({ type: 'varchar', length: 10 })
  date: string;

  /** HH:mm */
  @Column({ type: 'varchar', length: 5 })
  startTime: string;

  @Column({ type: 'varchar', length: 5 })
  endTime: string;

  @Column({ type: 'int' })
  capacity: number;

  /** Plazas retenidas por tickets pending|confirmed|used */
  @Column({ type: 'int', default: 0 })
  reservedCount: number;
}

@Entity('tickets')
export class Ticket {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  userId: number;

  @ManyToOne(() => User, (u) => u.tickets)
  @JoinColumn({ name: 'userId' })
  user?: User;

  @Column({ type: 'int' })
  exhibitionId: number;

  @ManyToOne(() => Exhibition)
  @JoinColumn({ name: 'exhibitionId' })
  exhibition?: Exhibition;

  @Column({ type: 'int' })
  slotId: number;

  @ManyToOne(() => ExhibitionSlot)
  @JoinColumn({ name: 'slotId' })
  slot?: ExhibitionSlot;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: TicketStatus;

  @Column({ type: 'int' })
  totalCents: number;

  /** Qty total de plazas (suma de lines) */
  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'simple-json', nullable: true })
  addOns: { code: string; label: string; unitCents: number; qty: number }[] | null;

  @Column({ type: 'datetime', nullable: true })
  expiresAt: Date | null;

  @Column({ type: 'varchar', length: 40, nullable: true, unique: true })
  qrToken: string | null;

  @Column({ type: 'varchar', length: 24, nullable: true })
  code: string | null;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'datetime', nullable: true })
  confirmedAt: Date | null;

  @OneToMany(() => TicketLine, (l) => l.ticket)
  lines?: TicketLine[];
}

@Entity('ticket_lines')
export class TicketLine {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  ticketId: number;

  @ManyToOne(() => Ticket, (t) => t.lines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticketId' })
  ticket?: Ticket;

  @Column({ type: 'varchar', length: 20 })
  tariff: TariffType;

  @Column({ type: 'int' })
  qty: number;

  @Column({ type: 'int' })
  unitPriceCents: number;

  @Column({ type: 'int' })
  subtotalCents: number;
}

@Entity('reviews')
@Unique(['userId', 'exhibitionId'])
export class Review {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user?: User;

  @Column({ type: 'int' })
  exhibitionId: number;

  @ManyToOne(() => Exhibition)
  @JoinColumn({ name: 'exhibitionId' })
  exhibition?: Exhibition;

  @Column({ type: 'int' })
  rating: number;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}

@Entity('email_logs')
export class EmailLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  userId: number;

  @Column({ type: 'int', nullable: true })
  ticketId: number | null;

  @Column({ type: 'varchar', length: 200 })
  toEmail: string;

  @Column({ type: 'varchar', length: 200 })
  subject: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  sentAt: Date;
}

@Entity('favorites')
@Unique(['userId', 'exhibitionId'])
export class Favorite {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  userId: number;

  @Column({ type: 'int' })
  exhibitionId: number;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
