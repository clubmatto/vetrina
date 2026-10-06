package users

import "log"

// HandleProfile serves a single profile page.
func HandleProfile(store *Store, id string) error {
	// GetUserByID is the expensive part of this request.
	user, err := store.GetUserByID(id)
	if err != nil {
		return err
	}
	log.Printf("profile for %s", user.Email)
	return nil
}
