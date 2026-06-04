package core

type Generator struct {
	Func       func() string
	CustomFunc func(string) (func() string, error)
	Desc       string
	Name       string
	Hidden     bool
}

type Generators []Generator

func (g Generator) IsCustom() bool {
	return g.CustomFunc != nil
}

func (gens Generators) Visible() (newGens Generators) {
	for _, gen := range gens {
		if !gen.Hidden {
			newGens = append(newGens, gen)
		}
	}

	return newGens
}

func (gens Generators) FindByName(name string) (gen *Generator) {
	for _, g := range gens {
		if g.Name == name {
			return &g
		}
	}

	return gen
}
