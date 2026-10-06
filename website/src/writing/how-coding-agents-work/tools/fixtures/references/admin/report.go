package admin

import (
	"log"

	"example.com/taskb/users"
)

// BuildReport counts the users mentioned in a batch of ids.
func BuildReport(store *users.Store, ids []string) (int, error) {
	found := 0
	for _, id := range ids {
		user, err := store.GetUserByID(id)
		if err != nil {
			continue
		}
		if user != nil {
			found++
		}
	}
	log.Printf("report covered %d users", found)
	return found, nil
}
