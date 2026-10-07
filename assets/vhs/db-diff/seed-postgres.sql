CREATE TABLE bookmark (
    id     BIGSERIAL PRIMARY KEY,
    url    TEXT NOT NULL,
    title  TEXT NOT NULL,
    unread BOOLEAN NOT NULL DEFAULT true,
    note   TEXT
);

INSERT INTO bookmark (id, url, title, unread, note) VALUES
    (1, 'https://example.com',   'Example',   true,  NULL),
    (2, 'https://example.com/2', 'Example 2', false, 'a note'),
    (3, 'https://example.com/3', 'Example 3', true,  '');
