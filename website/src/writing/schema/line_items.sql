-- Anonymized fact table (order lines) used by the "Tuning a Slow Postgres Query
-- With Fake Data" blog post. Same shape as the schema shown in the post so the
-- experiment is reproducible from here.

CREATE TABLE IF NOT EXISTS line_items (
    id         UUID PRIMARY KEY,
    order_id   UUID             NOT NULL,
    product_id UUID             NOT NULL,
    date       DATE             NOT NULL,
    quantity   INTEGER          NOT NULL,
    total      DOUBLE PRECISION NOT NULL
);
