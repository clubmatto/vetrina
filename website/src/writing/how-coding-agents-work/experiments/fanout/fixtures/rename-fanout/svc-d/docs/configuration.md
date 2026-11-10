# Configuration

The API reads its database connection from the environment.

| Key | Meaning |
| --- | --- |
| `DB_HOST` | Primary database hostname |
| `DB_PORT` | Primary database port |
| `DB_HOST_OLD` | Previous hostname, used during the migration window |

Set `DB_HOST` to the writer endpoint in production. The reader endpoint is not
configurable yet. During a rollback, point the service back at `DB_HOST_OLD`.
