import { createServer } from 'node:http';

const PORT = Number(process.env.MOCK_PORT ?? 4000);
const OCCUPANCY = Number(process.env.MOCK_OCCUPANCY ?? 0.45);
const FLIP_INTERVAL_MS = Number(
  process.env.MOCK_FLIP_INTERVAL_MS ?? 5000
);
const FLIPS_PER_TICK = Number(process.env.MOCK_FLIPS_PER_TICK ?? 2);

const GROUP_SIZES = {
  G: 42,
  1: 114,
  2: 144,
  3: 90,
};

const seats = new Map();
for (const [group, count] of Object.entries(GROUP_SIZES)) {
  for (let number = 1; number <= count; number += 1) {
    const id = `${group}-${number}`;
    seats.set(id, {
      id,
      occupied: Math.random() < OCCUPANCY,
    });
  }
}
const seatIds = [...seats.keys()];

function snapshot() {
  const data = {};
  for (const [id, seat] of seats) {
    data[id] = {
      occupied: seat.occupied,
      studentId: seat.occupied ? `demo-${id}` : null,
    };
  }
  return { event: 'all-seats', data };
}

function flipRandomSeat() {
  const id = seatIds[Math.floor(Math.random() * seatIds.length)];
  const seat = seats.get(id);
  seat.occupied = !seat.occupied;
  return { id, occupied: seat.occupied };
}

function json(response, status, body) {
  response.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
  });
  response.end(JSON.stringify(body));
}

const server = createServer((request, response) => {
  const url = new URL(
    request.url ?? '/',
    `http://${request.headers.host ?? `localhost:${PORT}`}`
  );

  if (request.method === 'OPTIONS') {
    response.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    response.end();
    return;
  }

  if (url.pathname === '/health') {
    const occupied = [...seats.values()].filter(
      (seat) => seat.occupied
    ).length;
    json(response, 200, {
      ok: true,
      total: seats.size,
      occupied,
      available: seats.size - occupied,
    });
    return;
  }

  if (url.pathname === '/toggle') {
    const id = url.searchParams.get('seat');
    if (!id || !seats.has(id)) {
      json(response, 400, { error: 'Unknown or missing seat id' });
      return;
    }
    const seat = seats.get(id);
    const requested = url.searchParams.get('occupied');
    seat.occupied =
      requested === null ? !seat.occupied : requested === 'true';
    json(response, 200, { seat: id, occupied: seat.occupied });
    return;
  }

  if (url.pathname === '/reset') {
    for (const seat of seats.values()) {
      seat.occupied = Math.random() < OCCUPANCY;
    }
    json(response, 200, { ok: true });
    return;
  }

  json(response, 200, snapshot());
});

const interval = setInterval(() => {
  const changes = [];
  for (let index = 0; index < FLIPS_PER_TICK; index += 1) {
    changes.push(flipRandomSeat());
  }
  console.log(
    `[mock] ${changes
      .map((change) => `${change.id}:${change.occupied ? 'occupied' : 'free'}`)
      .join(', ')}`
  );
}, FLIP_INTERVAL_MS);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Mock seat API listening on http://localhost:${PORT}`);
  console.log(
    `Seats: ${seats.size} · initial occupancy: ${Math.round(
      OCCUPANCY * 100
    )}% · flipping ${FLIPS_PER_TICK} seat(s) every ${FLIP_INTERVAL_MS}ms`
  );
  console.log(
    `Seat API: http://localhost:${PORT}/erp/library_seating/api.php?action=get-seats`
  );
});

function shutdown() {
  clearInterval(interval);
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
