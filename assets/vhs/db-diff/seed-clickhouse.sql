CREATE TABLE orders (
    id          Int64,
    customer    String,
    email       String,
    status      String,
    total_cents Int32,
    placed_at   DateTime
) ENGINE = MergeTree ORDER BY id;

INSERT INTO orders
SELECT number + 1,
       concat('customer-', toString(number + 1)),
       concat('customer', toString(number + 1), '@example.com'),
       'paid',
       toInt32(((number + 1) * 37) % 100000),
       toDateTime('2026-06-01 00:00:00') - toIntervalDay(number % 365)
FROM numbers(100000);

CREATE TABLE line_items (
    id         Int64,
    sku        String,
    quantity   Int32,
    unit_cents Int32
) ENGINE = MergeTree ORDER BY id;

INSERT INTO line_items
SELECT number + 1,
       concat('SKU-', leftPad(toString(((number + 1) * 7919) % 5000), 4, '0')),
       toInt32(1 + ((number + 1) % 9)),
       toInt32(100 + ((number + 1) * 13) % 9900)
FROM numbers(100000);
