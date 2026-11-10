# Example API

A small service used as a fixture. Configuration lives in `.env` and
`docker-compose.yml`.

The API connects to `DB_HOST` on startup and logs a warning when `DB_HOST_OLD`
is still set.
