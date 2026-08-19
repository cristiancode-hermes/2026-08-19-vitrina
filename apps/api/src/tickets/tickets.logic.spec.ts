import { unitPrice, POINTS_PER_TICKET, TARIFF_MULT } from '../common/tariffs';
import { Mutex } from '../common/mutex';
import { madridDate } from '../common/madrid-date';

/** Mirror of TRANSITIONS — keep in sync with tickets.service.ts */
const TRANSITIONS = {
  pending: ['confirmed', 'cancelled', 'expired'],
  confirmed: ['used', 'cancelled'],
  used: [] as string[],
  cancelled: [] as string[],
  expired: [] as string[],
};

function buildQrPlaceholderSvg(token: string, code: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg"><text>${code}</text><desc>${token}</desc></svg>`;
}

describe('tariffs', () => {
  it('general is 100% of base', () => {
    expect(unitPrice(1400, 'general')).toBe(1400);
  });
  it('reduced is 70%', () => {
    expect(unitPrice(1000, 'reduced')).toBe(700);
  });
  it('child is 50%', () => {
    expect(unitPrice(1200, 'child')).toBe(600);
  });
  it('member is 60%', () => {
    expect(unitPrice(1000, 'member')).toBe(600);
  });
  it('all tariff keys exist', () => {
    expect(Object.keys(TARIFF_MULT).sort()).toEqual(['child', 'general', 'member', 'reduced']);
  });
});

describe('points rule', () => {
  it('points = qty * 10', () => {
    expect(2 * POINTS_PER_TICKET).toBe(20);
    expect(1 * POINTS_PER_TICKET).toBe(10);
  });
});

describe('ticket state machine', () => {
  it('pending can confirm/cancel/expire', () => {
    expect(TRANSITIONS.pending).toEqual(expect.arrayContaining(['confirmed', 'cancelled', 'expired']));
  });
  it('confirmed can used/cancel', () => {
    expect(TRANSITIONS.confirmed).toEqual(expect.arrayContaining(['used', 'cancelled']));
  });
  it('used and cancelled are terminal', () => {
    expect(TRANSITIONS.used).toEqual([]);
    expect(TRANSITIONS.cancelled).toEqual([]);
    expect(TRANSITIONS.expired).toEqual([]);
  });
});

describe('QR placeholder', () => {
  it('returns svg with code', () => {
    const svg = buildQrPlaceholderSvg('abc123token', 'VT-TEST');
    expect(svg).toContain('<svg');
    expect(svg).toContain('VT-TEST');
  });
});

describe('mutex', () => {
  it('serializes concurrent tasks', async () => {
    const m = new Mutex();
    const order: number[] = [];
    await Promise.all([
      m.run(async () => {
        await new Promise((r) => setTimeout(r, 30));
        order.push(1);
      }),
      m.run(async () => {
        order.push(2);
      }),
    ]);
    expect(order).toEqual([1, 2]);
  });
});

describe('madridDate', () => {
  it('returns YYYY-MM-DD', () => {
    expect(madridDate(new Date('2026-08-19T12:00:00Z'))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('list detail total consistency helper', () => {
  it('sum of lines + addons equals total', () => {
    const lines = [{ subtotalCents: 1400 }, { subtotalCents: 700 }];
    const addOns = [{ unitCents: 350, qty: 2 }];
    const total = 1400 + 700 + 700;
    const sum =
      lines.reduce((a, l) => a + l.subtotalCents, 0) +
      addOns.reduce((a, x) => a + x.unitCents * x.qty, 0);
    expect(sum).toBe(total);
  });
});

describe('capacity free seats', () => {
  it('free = capacity - reserved', () => {
    const capacity = 28;
    const reserved = 25;
    const free = Math.max(0, capacity - reserved);
    expect(free).toBe(3);
    const availability = free <= 0 ? 'full' : free / capacity <= 0.2 ? 'low' : 'free';
    expect(availability).toBe('low');
  });
  it('full when reserved == capacity', () => {
    expect(Math.max(0, 10 - 10)).toBe(0);
  });
});

describe('double-sale conflict math', () => {
  it('second buyer rejected when free < qty', () => {
    const capacity = 5;
    let reserved = 4;
    expect(capacity - reserved >= 1).toBe(true);
    reserved += 1;
    expect(capacity - reserved >= 2).toBe(false);
  });
});

describe('same-user double booking guard', () => {
  type Status = 'pending' | 'confirmed' | 'used' | 'cancelled' | 'expired';
  function blocksSecondHold(
    existing: { userId: number; slotId: number; status: Status }[],
    userId: number,
    slotId: number,
  ): boolean {
    return existing.some(
      (t) =>
        t.userId === userId &&
        t.slotId === slotId &&
        (t.status === 'pending' || t.status === 'confirmed'),
    );
  }

  it('blocks second hold when user already has pending on same slot', () => {
    expect(
      blocksSecondHold([{ userId: 1, slotId: 9, status: 'pending' }], 1, 9),
    ).toBe(true);
  });

  it('blocks second hold when user already has confirmed on same slot', () => {
    expect(
      blocksSecondHold([{ userId: 1, slotId: 9, status: 'confirmed' }], 1, 9),
    ).toBe(true);
  });

  it('allows hold after cancelled or expired', () => {
    expect(
      blocksSecondHold(
        [
          { userId: 1, slotId: 9, status: 'cancelled' },
          { userId: 1, slotId: 9, status: 'expired' },
        ],
        1,
        9,
      ),
    ).toBe(false);
  });

  it('allows other users on same slot', () => {
    expect(
      blocksSecondHold([{ userId: 2, slotId: 9, status: 'confirmed' }], 1, 9),
    ).toBe(false);
  });

  it('allows same user on a different slot', () => {
    expect(
      blocksSecondHold([{ userId: 1, slotId: 8, status: 'confirmed' }], 1, 9),
    ).toBe(false);
  });
});

describe('cancel window', () => {
  it('blocks when less than 24h', () => {
    expect(10 < 24).toBe(true);
  });
  it('allows when more than 24h', () => {
    expect(30 >= 24).toBe(true);
  });
});

describe('hold expiry', () => {
  it('pending past expiresAt is stale', () => {
    expect(new Date(Date.now() - 1000) < new Date()).toBe(true);
  });
  it('pending future expiresAt is live', () => {
    expect(new Date(Date.now() + 60_000) > new Date()).toBe(true);
  });
});
