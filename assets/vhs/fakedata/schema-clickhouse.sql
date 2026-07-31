DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS events;

CREATE TABLE users (
  id Int32,
  name String,
  email String,
  age Int32,
  created_at DateTime
) ENGINE = MergeTree()
ORDER BY id;

CREATE TABLE orders (
  id Int32,
  user_id Int32,
  product String,
  amount Float64,
  quantity Int32,
  status Enum8('pending' = 0, 'completed' = 1, 'cancelled' = 2),
  ordered_at DateTime
) ENGINE = MergeTree()
ORDER BY id;

CREATE TABLE events (
  id Int32,
  event String,
  user_id Int32,
  amount Float64,
  status Enum8('pending' = 0, 'completed' = 1, 'failed' = 2),
  timestamp DateTime
) ENGINE = MergeTree()
ORDER BY id;
