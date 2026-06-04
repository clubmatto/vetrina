package core

import (
	"strconv"
	"strings"

	namedata "matto.club/vetrina/fakedata/data/names"
)

var firstNameList = func() []string {
	names := make([]string, len(namedata.Forenames))

	for i, f := range namedata.Forenames {
		names[i] = f.Name
	}

	return names
}()

var lastNameList = func() []string {
	names := make([]string, len(namedata.Surnames))

	for i, s := range namedata.Surnames {
		names[i] = s.Name
	}

	return names
}()

var letterList = []rune("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz")

var usernamePatterns = []func(string, string) string{
	func(first, last string) string { return sanitizeUsername(first) + "." + sanitizeUsername(last) },
	func(first, last string) string { return sanitizeUsername(first) + sanitizeUsername(last) },
	func(first, last string) string {
		return string([]rune(sanitizeUsername(first))[0]) + sanitizeUsername(last)
	},
	func(first, last string) string { return sanitizeUsername(first) + "_" + sanitizeUsername(last) },
}

const (
	maxUsernameBaseLength = 21
	minUsernameSuffix     = 1000
	maxUsernameSuffix     = 9999
	minPolygonPoints      = 3
	maxPolygonPoints      = 5
	polygonCoordDivisor   = 1000
)

func sanitizeUsername(s string) string {
	s = strings.ToLower(s)
	var result strings.Builder
	for _, r := range s {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			result.WriteRune(r)
		}
	}

	return result.String()
}

func registerPeople(r *Registry) {
	firstNameFn := r.withList(firstNameList)
	lastNameFn := r.withList(lastNameList)

	registerPersonBasic(r, firstNameFn, lastNameFn)
	registerPersonDerived(r, firstNameFn, lastNameFn)
	registerCountryNames(r)
}

func registerPersonBasic(r *Registry, firstNameFn, lastNameFn func() string) {
	r.Register(Generator{
		Name: "char",
		Desc: "single random letter",
		Func: func() string {
			v := string(letterList[r.rng.IntN(len(letterList))])

			return v
		},
	})
	r.Register(Generator{
		Name: "email",
		Desc: "email",
		Func: func() string {
			return strings.ToLower(firstNameFn()) + "@" + domain(r)
		},
	})
	r.Register(Generator{Name: "first_name", Desc: "capitalized first name", Func: firstNameFn})
	r.Register(Generator{
		Name: "full_name",
		Desc: `first_name + " " + last_name`,
		Func: func() string {
			return firstNameFn() + " " + lastNameFn()
		},
	})
	r.Register(Generator{
		Name: "hex",
		Desc: "hexadecimal string",
		Func: func() string {
			return strconv.FormatInt(r.rng.Int64(), 16)
		},
	})
	r.Register(Generator{
		Name: "hex_color",
		Desc: "6 character hex color like a1b2c3",
		Func: func() string {
			return strconv.FormatInt(r.rng.Int64()&0xFFFFFF, 16)
		},
	})
}

func registerPersonDerived(r *Registry, firstNameFn, lastNameFn func() string) {
	r.Register(Generator{Name: "last_name", Desc: "capitalized last name", Func: lastNameFn})
	r.Register(Generator{
		Name: "polygon",
		Desc: "PostgreSQL POLYGON type in normalized 0-1 coordinates",
		Func: func() string {
			numPoints := minPolygonPoints + r.rng.IntN(maxPolygonPoints-minPolygonPoints+1)
			var points []string
			for i := 0; i < numPoints; i++ {
				x := float64(r.rng.IntN(polygonCoordDivisor)) / polygonCoordDivisor
				y := float64(r.rng.IntN(polygonCoordDivisor)) / polygonCoordDivisor
				points = append(points, strconv.FormatFloat(x, 'f', 3, 64)+","+strconv.FormatFloat(y, 'f', 3, 64))
			}

			return "(" + strings.Join(points, ",") + ")"
		},
	})
	r.Register(Generator{Name: "slug", Desc: "lowercase-alphanumeric-with-dashes", Func: func() string {
		username := sanitizeUsername(firstNameFn()) + "-" + sanitizeUsername(lastNameFn())
		suffix := strconv.Itoa(r.rng.IntN(maxUsernameSuffix-minUsernameSuffix+1) + minUsernameSuffix)

		return username + "-" + suffix
	}})
	r.Register(Generator{Name: "sql_verb", Desc: "SQL verb like INSERT, UPDATE, DELETE", Func: r.withList([]string{
		"INSERT", "UPDATE", "DELETE", "CREATE", "ALTER", "DROP", "SELECT", "GRANT", "REVOKE",
	})})
	r.Register(Generator{
		Name: "username",
		Desc: "username",
		Func: func() string {
			base := usernamePatterns[r.rng.IntN(len(usernamePatterns))](firstNameFn(), lastNameFn())
			if len(base) > maxUsernameBaseLength {
				base = base[:maxUsernameBaseLength]
			}
			suffix := strconv.Itoa(r.rng.IntN(maxUsernameSuffix-minUsernameSuffix+1) + minUsernameSuffix)

			return base + suffix
		},
	})
}

func registerCountryNames(r *Registry) {
	for _, idx := range namedata.ForenameIndex {
		names := make([]string, idx.NameCount)
		for i := 0; i < idx.NameCount; i++ {
			names[i] = namedata.Forenames[idx.NameStart+i].Name
		}

		r.Register(Generator{
			Name:   "first_name_" + strings.ToLower(idx.CountryCode),
			Desc:   idx.CountryCode + " first name",
			Func:   r.withList(names),
			Hidden: true,
		})
	}

	for _, idx := range namedata.SurnameIndex {
		names := make([]string, idx.NameCount)
		for i := 0; i < idx.NameCount; i++ {
			names[i] = namedata.Surnames[idx.NameStart+i].Name
		}

		r.Register(Generator{
			Name:   "last_name_" + strings.ToLower(idx.CountryCode),
			Desc:   idx.CountryCode + " last name",
			Func:   r.withList(names),
			Hidden: true,
		})
	}
}
