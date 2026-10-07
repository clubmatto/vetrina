CREATE TABLE orders (
    id          BIGINT PRIMARY KEY,
    customer    TEXT NOT NULL,
    email       TEXT NOT NULL,
    status      TEXT NOT NULL,
    total_cents INTEGER NOT NULL,
    placed_at   TIMESTAMP NOT NULL
);

INSERT INTO orders (id, customer, email, status, total_cents, placed_at)
SELECT g,
       'customer-' || g,
       'customer' || g || '@example.com',
       'paid',
       (g * 37) % 100000,
       TIMESTAMP '2026-06-01 00:00:00' - (g % 365) * interval '1 day'
FROM generate_series(1, 100000) AS g;

CREATE TABLE line_items (
    id         BIGINT PRIMARY KEY,
    sku        TEXT NOT NULL,
    quantity   INTEGER NOT NULL,
    unit_cents INTEGER NOT NULL
);

INSERT INTO line_items (id, sku, quantity, unit_cents)
SELECT g, 'SKU-' || lpad(((g * 7919) % 5000)::text, 4, '0'), 1 + (g % 9), 100 + (g * 13) % 9900
FROM generate_series(1, 100000) AS g;
