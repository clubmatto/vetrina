CREATE TABLE bookmark
(
    id         INT AUTO_INCREMENT PRIMARY KEY,
    url        TEXT                              NOT NULL,
    title      TEXT                              NOT NULL,
    unread     BOOLEAN DEFAULT TRUE              NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
);

INSERT INTO bookmark (url, title) VALUES ('https://www.example.com', 'Example');
INSERT INTO bookmark (url, title) VALUES ('https://www.example.com/2', 'Example 2');