package billing

import "log"

// Stats holds per-tenant counters. Note that this type has its own
// GetUserByID, which has nothing to do with the users package.
type Stats struct {
	tenant string
}

// GetUserByID returns a billing identifier for a user, not a user record.
func (s *Stats) GetUserByID(id string) string {
	return s.tenant + ":" + id
}

// Charge bills a single user.
func Charge(stats *Stats, id string) {
	key := stats.GetUserByID(id)
	log.Printf("charging %s", key)
}
