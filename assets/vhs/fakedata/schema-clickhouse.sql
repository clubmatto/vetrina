CREATE TABLE IF NOT EXISTS events (
  id Int32,
  event String,
  user_id Int32,
  amount Float64,
  status Enum8('pending' = 0, 'completed' = 1, 'failed' = 2),
  timestamp DateTime
) ENGINE = MergeTree()
ORDER BY id;
