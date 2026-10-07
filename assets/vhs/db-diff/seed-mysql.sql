CREATE TABLE bookmark (
    id     BIGINT AUTO_INCREMENT PRIMARY KEY,
    url    VARCHAR(255) NOT NULL,
    title  VARCHAR(255) NOT NULL,
    unread TINYINT(1) NOT NULL DEFAULT 1,
    note   TEXT
);

INSERT INTO bookmark (id, url, title, unread, note) VALUES
    (1, 'https://example.com',   'Example',   true,  NULL),
    (2, 'https://example.com/2', 'Example 2', false, 'a note'),
    (3, 'https://example.com/3', 'Example 3', true,  '');
