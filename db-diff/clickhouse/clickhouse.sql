CREATE TABLE bookmark
(
    id         UInt64,
    url        String NOT NULL,
    title      String NOT NULL,
    unread     Bool DEFAULT true NOT NULL,
    created_at DateTime DEFAULT now() NOT NULL
) ENGINE = MergeTree()
ORDER BY id;

INSERT INTO bookmark (id, url, title) VALUES (1, 'https://www.example.com', 'Example');
INSERT INTO bookmark (id, url, title) VALUES (2, 'https://www.example.com/2', 'Example 2');
