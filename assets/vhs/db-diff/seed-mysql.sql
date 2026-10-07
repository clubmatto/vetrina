CREATE TABLE digits (d INT);
INSERT INTO digits VALUES (0),(1),(2),(3),(4),(5),(6),(7),(8),(9);

CREATE TABLE orders (
    id          BIGINT PRIMARY KEY,
    customer    VARCHAR(255) NOT NULL,
    email       VARCHAR(255) NOT NULL,
    status      VARCHAR(32) NOT NULL,
    total_cents INT NOT NULL,
    placed_at   DATETIME NOT NULL
);

INSERT INTO orders (id, customer, email, status, total_cents, placed_at)
SELECT n + 1,
       CONCAT('customer-', n + 1),
       CONCAT('customer', n + 1, '@example.com'),
       'paid',
       ((n + 1) * 37) % 100000,
       TIMESTAMP('2026-06-01 00:00:00') - INTERVAL (n % 365) DAY
FROM (
    SELECT a.d + b.d * 10 + c.d * 100 + e.d * 1000 + f.d * 10000 AS n
    FROM digits a, digits b, digits c, digits e, digits f
) nums;

CREATE TABLE line_items (
    id         BIGINT PRIMARY KEY,
    sku        VARCHAR(32) NOT NULL,
    quantity   INT NOT NULL,
    unit_cents INT NOT NULL
);

INSERT INTO line_items (id, sku, quantity, unit_cents)
SELECT n + 1, CONCAT('SKU-', LPAD(((n + 1) * 7919) % 5000, 4, '0')), 1 + ((n + 1) % 9), 100 + ((n + 1) * 13) % 9900
FROM (
    SELECT a.d + b.d * 10 + c.d * 100 + e.d * 1000 + f.d * 10000 AS n
    FROM digits a, digits b, digits c, digits e, digits f
) nums;
