package core

import (
	"matto.club/vetrina/fakedata/output"
	"github.com/google/uuid"
)

func uuidv1() string {
	u1, err := uuid.NewUUID()
	if err != nil {
		output.Eprintf("failed to generate uuidv1: %v\n", err)

		return ""
	}

	return u1.String()
}

func uuidv4() string {
	return uuid.New().String()
}

func uuidv6() string {
	u6, err := uuid.NewV6()
	if err != nil {
		output.Eprintf("failed to generate uuidv6: %v\n", err)

		return ""
	}

	return u6.String()
}

func uuidv7() string {
	u7, err := uuid.NewV7()
	if err != nil {
		output.Eprintf("failed to generate uuidv7: %v\n", err)

		return ""
	}

	return u7.String()
}

func registerIDs(r *Registry) {
	r.Register(Generator{Name: "uuid", Desc: "UUID v4", Func: uuidv4})
	r.Register(Generator{Name: "uuidv1", Desc: "uuidv1", Func: uuidv1})
	r.Register(Generator{Name: "uuidv4", Desc: "uuidv4", Func: uuidv4})
	r.Register(Generator{Name: "uuidv6", Desc: "uuidv6", Func: uuidv6})
	r.Register(Generator{Name: "uuidv7", Desc: "uuidv7", Func: uuidv7})
}
