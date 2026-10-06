variable "db_host" {
  description = "Primary database hostname"
  type        = string
  default     = "db.internal"
}

variable "db_host_old" {
  description = "Previous database hostname, kept for the migration window"
  type        = string
  default     = "legacy-db.internal"
}

resource "example_service" "api" {
  name = "api"

  env = {
    DB_HOST     = var.db_host
    DB_PORT     = "5432"
    DB_HOST_OLD = var.db_host_old
  }
}
