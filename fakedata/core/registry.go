package core

import (
	"fmt"
	"math/rand/v2"
	"sort"
	"strings"
	"sync"
	"time"
)

const pcgSeedShift = 32

type SafeRand struct {
	mu sync.Mutex
	r  *rand.Rand
}

func NewSafeRand(seed int64) *SafeRand {
	return &SafeRand{
		r: rand.New(rand.NewPCG(uint64(seed), uint64(seed>>pcgSeedShift))),
	}
}

func (s *SafeRand) Seed(seed int64) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.r = rand.New(rand.NewPCG(uint64(seed), uint64(seed>>pcgSeedShift)))
}

func (s *SafeRand) IntN(n int) int {
	s.mu.Lock()
	defer s.mu.Unlock()

	return s.r.IntN(n)
}

func (s *SafeRand) Int64() int64 {
	s.mu.Lock()
	defer s.mu.Unlock()

	return s.r.Int64()
}

func (s *SafeRand) Int64N(n int64) int64 {
	s.mu.Lock()
	defer s.mu.Unlock()

	return s.r.Int64N(n)
}

func (s *SafeRand) Float64() float64 {
	s.mu.Lock()
	defer s.mu.Unlock()

	return s.r.Float64()
}

func (s *SafeRand) NormFloat64() float64 {
	s.mu.Lock()
	defer s.mu.Unlock()

	return s.r.NormFloat64()
}

type Registry struct {
	generators map[string]Generator
	rng        *SafeRand
}

func NewRegistry() *Registry {
	r := &Registry{
		generators: make(map[string]Generator),
		rng:        NewSafeRand(time.Now().UnixNano()),
	}
	registerPeople(r)
	registerAnimals(r)
	registerText(r)
	registerWeb(r)
	registerIDs(r)
	registerGeo(r)
	registerTime(r)
	registerTypes(r)
	registerJSON(r)
	registerCulture(r)
	registerFood(r)

	return r
}

func (r *Registry) Register(g Generator) {
	r.generators[g.Name] = g
}

func (r *Registry) IsGenerator(key string) bool {
	_, ok := r.generators[key]

	return ok
}

func (r *Registry) ExtractFunc(key, options string) (fn func() string, err error) {
	gen, ok := r.generators[key]
	if !ok {
		return nil, fmt.Errorf("unknown generator: %s", key)
	}

	if gen.IsCustom() {
		return gen.CustomFunc(options)
	}

	return gen.Func, nil
}

func (r *Registry) NewGenerators() (gens Generators) {
	for _, gen := range r.generators {
		gens = append(gens, gen)
	}

	sort.Slice(gens, func(i, j int) bool { return strings.Compare(gens[i].Name, gens[j].Name) < 0 })

	return gens
}

func (r *Registry) Seed(s int64) {
	r.rng.Seed(s)
}

func (r *Registry) withList(list []string) func() string {
	return func() string {
		return list[r.rng.IntN(len(list))]
	}
}
