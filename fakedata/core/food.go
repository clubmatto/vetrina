package core

import (
	"matto.club/vetrina/fakedata/data"
)

func registerFood(r *Registry) {
	r.Register(Generator{Name: "fruit", Desc: "fruit", Func: r.withList(data.Fruits)})
	r.Register(Generator{Name: "spice", Desc: "spice or herb", Func: r.withList(data.Spice)})
	r.Register(Generator{Name: "tea", Desc: "tea variety", Func: r.withList(data.Tea)})
	r.Register(Generator{Name: "vegetable", Desc: "vegetable", Func: r.withList(data.Vegetables)})
}
