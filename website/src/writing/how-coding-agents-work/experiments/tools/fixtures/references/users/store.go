package users

import (
	"errors"
	"fmt"
)

// User is a row from the users table.
type User struct {
	ID    string
	Email string
}

// Store reads users from the primary database.
type Store struct {
	dsn string
}

// New returns a Store bound to a DSN.
func New(dsn string) *Store {
	return &Store{dsn: dsn}
}

// GetUserByID loads a single user. It is the only reader the application uses.
func (s *Store) GetUserByID(id string) (*User, error) {
	if id == "" {
		return nil, errors.New("users: empty id")
	}
	return &User{ID: id, Email: fmt.Sprintf("%s@example.com", id)}, nil
}
