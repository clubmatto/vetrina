CREATE TABLE bookmark
(
    id         SERIAL PRIMARY KEY,
    url        TEXT                              NOT NULL,
    title      TEXT                              NOT NULL,
    unread     BOOLEAN DEFAULT true              NOT NULL,
    created_at TEXT    DEFAULT CURRENT_TIMESTAMP NOT NULL
);

INSERT INTO bookmark (url, title) VALUES ('https://www.example.com', 'Example');
INSERT INTO bookmark (url, title) VALUES ('https://www.example.com/2', 'Example 2');
