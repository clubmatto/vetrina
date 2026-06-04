package core

import (
	"matto.club/vetrina/fakedata/data"
)

func registerAnimals(r *Registry) {
	r.Register(Generator{Name: "animal", Desc: "animal breed", Func: r.withList(data.Animals)})
	r.Register(Generator{Name: "cat", Desc: "cat breed", Func: r.withList(data.Cats)})
	r.Register(Generator{Name: "dinosaur", Desc: "Dinosaur name", Func: r.withList(data.Dinosaurs)})
	r.Register(Generator{Name: "dog", Desc: "dog breed", Func: r.withList(data.Dogs)})
	r.Register(Generator{Name: "fish", Desc: "fish species", Func: r.withList(data.Fish)})
	r.Register(Generator{Name: "flower", Desc: "flower name", Func: r.withList(data.Flowers)})
	r.Register(Generator{Name: "plant", Desc: "plant name", Func: r.withList(data.Plants)})
}
