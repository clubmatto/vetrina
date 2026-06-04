package core

import (
	"matto.club/vetrina/fakedata/data"
)

func registerText(r *Registry) {
	r.Register(Generator{Name: "adjective", Desc: "adjective", Func: r.withList(data.Adjectives)})
	r.Register(Generator{Name: "color", Desc: "one word color", Func: r.withList(data.Colors)})
	r.Register(Generator{Name: "emoji", Desc: "emoji", Func: r.withList(data.Emoji)})
	r.Register(Generator{Name: "fabric", Desc: "fabric type", Func: r.withList(data.Fabrics)})
	r.Register(Generator{Name: "metal", Desc: "metal element", Func: r.withList(data.Metals)})
	r.Register(Generator{Name: "noun", Desc: "noun", Func: r.withList(data.Nouns)})
	r.Register(Generator{Name: "packaging", Desc: "packaging material", Func: r.withList(data.Packaging)})
	r.Register(Generator{Name: "planet", Desc: "planet name", Func: r.withList(data.Planets)})
	r.Register(Generator{Name: "scent", Desc: "scent or fragrance", Func: r.withList(data.Scents)})
	r.Register(Generator{Name: "sentence", Desc: "sentence", Func: r.withList(data.Sentences)})
	r.Register(Generator{Name: "weather", Desc: "weather condition", Func: r.withList(data.WeatherConditions)})
	r.Register(Generator{Name: "word", Desc: "common English word", Func: r.withList(data.Words)})
}
