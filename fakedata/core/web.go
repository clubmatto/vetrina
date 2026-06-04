package core

import (
	"fmt"
	"strings"

	worlddata "matto.club/vetrina/fakedata/data/world"
)

var tldList = extractField(worlddata.Countries, func(c worlddata.Country) string { return c.TLD })

var urlSchemes = []string{"http", "https"}
var urlDomains = []string{"example", "test", "demo", "sample", "dev"}
var urlPathParts = []string{"page", "api", "user", "data", "file"}
var httpMethods = []string{"DELETE", "GET", "HEAD", "OPTION", "PATCH", "POST", "PUT"}

var companyNames = []string{
	"Acme", "Global", "Tech", "Data", "Cloud", "Smart", "Next", "Prime", "Elite", "Apex",
	"Vertex", "Nova", "Cipher", "Pixel", "Quantum", "Neo", "Fusion", "Spark", "Pulse", "Core",
	"Mega", "Hyper", "Ultra", "Turbo", "Max", "Omega", "Delta", "Alpha", "Sigma", "Titan",
	"Innovative", "Strategic", "Dynamic", "Advanced", "Premium", "Professional", "Industrial",
	"Commercial", "National", "International",
}

var companySuffixes = []string{
	"Inc", "LLC", "Corp", "Co", "Group", "Systems", "Solutions", "Technologies", "Services",
	"Partners", "Enterprises", "Holdings", "Industries", "International", "Global", "Labs",
	"Studios", "Works", "Associates", "Ventures",
}

const (
	maxIPv4Octet       = 255
	maxIPv4FirstLast   = 253
	minIPv4Octet       = 1
	maxURLPathLength   = 5
	urlPathPartChoices = 5
)

func domain(r *Registry) string {
	hosts := r.withList([]string{"test", "example"})
	tlds := r.withList(tldList)

	return hosts() + "." + tlds()
}

func registerWeb(r *Registry) {
	registerWebContent(r)
	registerWebNetwork(r)
}

func registerWebContent(r *Registry) {
	r.Register(Generator{
		Name: "company",
		Desc: "company name",
		Func: func() string {
			name := companyNames[r.rng.IntN(len(companyNames))]
			suffix := companySuffixes[r.rng.IntN(len(companySuffixes))]

			return name + " " + suffix
		},
	})
	r.Register(Generator{
		Name: "domain_name",
		Desc: "full domain name",
		Func: func() string { return domain(r) },
	})
	r.Register(Generator{
		Name: "http_method",
		Desc: `DELETE|GET|HEAD|OPTION|PATCH|POST|PUT`,
		Func: r.withList(httpMethods),
	})
	r.Register(Generator{
		Name: "tld",
		Desc: "valid TLD name",
		Func: r.withList(tldList),
	})
	r.Register(Generator{
		Name: "url",
		Desc: "URL",
		Func: func() string {
			scheme := urlSchemes[r.rng.IntN(len(urlSchemes))]
			dom := urlDomains[r.rng.IntN(len(urlDomains))]
			tld := "com"
			pathLen := r.rng.IntN(maxURLPathLength) + 1
			var pathParts []string
			for i := 0; i < pathLen; i++ {
				pathParts = append(pathParts, urlPathParts[r.rng.IntN(urlPathPartChoices)])
			}

			return fmt.Sprintf("%s://%s.%s/%s", scheme, dom, tld, strings.Join(pathParts, "/"))
		},
	})
}

func registerWebNetwork(r *Registry) {
	r.Register(Generator{
		Name: "ipv4",
		Desc: "ipv4",
		Func: func() string {
			a := minIPv4Octet + r.rng.IntN(maxIPv4FirstLast)
			b := r.rng.IntN(maxIPv4Octet + 1)
			c := r.rng.IntN(maxIPv4Octet + 1)
			d := minIPv4Octet + r.rng.IntN(maxIPv4FirstLast)

			return fmt.Sprintf("%d.%d.%d.%d", a, b, c, d)
		},
	})
	r.Register(Generator{
		Name: "ipv6",
		Desc: "ipv6",
		Func: func() string {
			a := r.rng.IntN(maxIPv4Octet + 1)
			b := r.rng.IntN(maxIPv4Octet + 1)
			c := r.rng.IntN(maxIPv4Octet + 1)
			d := r.rng.IntN(maxIPv4Octet + 1)
			e := r.rng.IntN(maxIPv4Octet + 1)
			f := r.rng.IntN(maxIPv4Octet + 1)

			return fmt.Sprintf("2001:cafe:%x:%x:%x:%x:%x:%x", a, b, c, d, e, f)
		},
	})
	r.Register(Generator{
		Name: "mac",
		Desc: "mac address",
		Func: func() string {
			a := r.rng.IntN(maxIPv4Octet)
			b := r.rng.IntN(maxIPv4Octet)
			c := r.rng.IntN(maxIPv4Octet)
			d := r.rng.IntN(maxIPv4Octet)
			e := r.rng.IntN(maxIPv4Octet)
			f := r.rng.IntN(maxIPv4Octet)

			return fmt.Sprintf("%X:%X:%X:%X:%X:%X", a, b, c, d, e, f)
		},
	})
}
