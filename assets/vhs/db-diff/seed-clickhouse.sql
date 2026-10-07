CREATE TABLE bookmark (
    id     Int64,
    url    String,
    title  String,
    unread Bool,
    note   Nullable(String)
) ENGINE = MergeTree ORDER BY id;

INSERT INTO bookmark (id, url, title, unread, note) VALUES
    (1, 'https://example.com',   'Example',   true,  NULL),
    (2, 'https://example.com/2', 'Example 2', false, 'a note'),
    (3, 'https://example.com/3', 'Example 3', true,  '');
