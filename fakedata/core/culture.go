package core

import (
	"matto.club/vetrina/fakedata/data"
)

func registerCulture(r *Registry) {
	r.Register(Generator{Name: "art_movement", Desc: "art movement or ism", Func: r.withList(data.ArtMovements)})
	r.Register(Generator{Name: "greek_god", Desc: "Greek god or goddess", Func: r.withList(data.GreekGods)})
	r.Register(Generator{Name: "industry", Desc: "industry", Func: r.withList(data.Industries)})
	r.Register(Generator{Name: "instrument", Desc: "musical instrument", Func: r.withList(data.Instruments)})
	r.Register(Generator{Name: "job_title", Desc: "job title", Func: r.withList(data.Occupations)})
	r.Register(Generator{Name: "monster", Desc: "monster or mythic creature", Func: r.withList(data.Monsters)})
	r.Register(Generator{Name: "music_genre", Desc: "music genre", Func: r.withList(data.MusicGenres)})
	r.Register(Generator{Name: "programming_language", Desc: "programming language",
		Func: r.withList(data.ProgrammingLanguages)})
	r.Register(Generator{Name: "roman_deity", Desc: "Roman god or goddess", Func: r.withList(data.RomanDeities)})
	r.Register(Generator{Name: "sport", Desc: "sport name", Func: r.withList(data.Sports)})
}
