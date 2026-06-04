package core

import (
	"fmt"
	"strconv"
	"strings"

	worlddata "matto.club/vetrina/fakedata/data/world"
)

var countryList = extractField(worlddata.Countries, func(c worlddata.Country) string { return c.Name })
var countryCodeList = extractField(worlddata.Countries, func(c worlddata.Country) string { return c.Code })
var countryCode3List = extractField(worlddata.Countries, func(c worlddata.Country) string { return c.Code3 })
var capitalList = extractField(worlddata.Countries, func(c worlddata.Country) string { return c.Capital })
var currencyList = extractField(worlddata.Countries, func(c worlddata.Country) string { return c.Currency })
var currencyNameList = extractField(worlddata.Countries, func(c worlddata.Country) string { return c.CurrencyName })
var regionList = extractField(worlddata.Countries, func(c worlddata.Country) string { return c.Region })
var subregionList = extractField(worlddata.Countries, func(c worlddata.Country) string { return c.Subregion })
var nationalityList = extractField(worlddata.Countries, func(c worlddata.Country) string { return c.Nationality })
var countryEmojiList = extractField(worlddata.Countries, func(c worlddata.Country) string { return c.Emoji })

var stateList = extractStateField(worlddata.States, func(s worlddata.State) string { return s.Name })
var stateCodeList = extractStateField(worlddata.States, func(s worlddata.State) string { return s.Code })

var cityList = extractCityField(worlddata.Cities, func(c worlddata.City) string { return c.Name })
var cityLatList = extractCityField(worlddata.Cities, func(c worlddata.City) string { return c.Latitude })
var cityLonList = extractCityField(worlddata.Cities, func(c worlddata.City) string { return c.Longitude })
var tzList = worlddata.Timezones

var phoneCodeList = extractField(worlddata.Countries, func(c worlddata.Country) string { return c.PhoneCode })

const (
	minStreetNumber = 100
	maxStreetNumber = 9999
)

var streetNames = []string{
	"Main", "Oak", "Maple", "Cedar", "Pine", "Elm", "Washington", "Lake", "Hill", "Park",
	"Forest", "River", "Spring", "Valley", "Sunset", "Highland", "Cherry", "Birch", "Walnut", "Spruce",
}

var streetTypes = []string{
	"St", "Ave", "Blvd", "Dr", "Ln", "Rd", "Way", "Ct", "Pl", "Cir",
}

const (
	maxPhoneNumberLength = 15
	phoneNumberMaxIndex  = 14
	minPhoneDigits       = 8
	mediumPhoneDigits9   = 9
	mediumPhoneDigits10  = 10
	mediumPhoneDigits11  = 11
	maxPhoneDigits       = 12
)

func phoneGenerator(r *Registry, phoneCodeFunc func() string) func() string {
	localPhoneF, err := localPhone(r, "8")
	if err != nil {
		panic(err)
	}

	return func() string {
		number := "+" + phoneCodeFunc() + localPhoneF()
		if len(number) > maxPhoneNumberLength {
			number = number[0:phoneNumberMaxIndex]
		}

		return number
	}
}

func localPhone(r *Registry, options string) (func() string, error) {
	if len(options) == 0 {
		return integer(r, "10000000,99999999")
	}

	numDigits, err := strconv.Atoi(options)
	if err != nil {
		return nil, err
	}

	switch numDigits {
	case minPhoneDigits:
		return integer(r, "10000000,99999999")
	case mediumPhoneDigits9:
		return integer(r, "100000000,999999999")
	case mediumPhoneDigits10:
		return integer(r, "1000000000,9999999999")
	case mediumPhoneDigits11:
		return integer(r, "10000000000,99999999999")
	case maxPhoneDigits:
		return integer(r, "100000000000,999999999999")
	default:
		return nil, fmt.Errorf("digits must be >=%d and <=%d", minPhoneDigits, maxPhoneDigits)
	}
}

func countryPhoneFunc(countryCode string) func() string {
	country := worlddata.Countries[0]

	for _, c := range worlddata.Countries {
		if c.Code == countryCode {
			country = c

			break
		}
	}

	return func() string { return country.PhoneCode }
}

func extractField(list []worlddata.Country, field func(c worlddata.Country) string) []string {
	values := make([]string, len(list))
	for i, c := range list {
		values[i] = field(c)
	}

	return values
}

func extractStateField(list []worlddata.State, field func(s worlddata.State) string) []string {
	values := make([]string, len(list))
	for i, s := range list {
		values[i] = field(s)
	}

	return values
}

func extractCityField(list []worlddata.City, field func(c worlddata.City) string) []string {
	values := make([]string, len(list))
	for i, c := range list {
		values[i] = field(c)
	}

	return values
}

func registerGeo(r *Registry) {
	phoneCodeFn := r.withList(phoneCodeList)
	registerGeoGenerators(r, phoneCodeFn)
	registerCountryVariants(r)
}

func registerGeoGenerators(r *Registry, phoneCodeFn func() string) {
	r.Register(Generator{
		Name: "address",
		Desc: "street address",
		Func: func() string {
			num := r.rng.IntN(maxStreetNumber-minStreetNumber+1) + minStreetNumber
			street := streetNames[r.rng.IntN(len(streetNames))]
			suffix := streetTypes[r.rng.IntN(len(streetTypes))]

			return fmt.Sprintf("%d %s %s", num, street, suffix)
		},
	})
	r.Register(Generator{Name: "capital", Desc: "Capital city", Func: r.withList(capitalList)})
	r.Register(Generator{Name: "city", Desc: "City name", Func: r.withList(cityList)})
	r.Register(Generator{Name: "country", Desc: "Full country name", Func: r.withList(countryList)})
	r.Register(Generator{Name: "country_code", Desc: "2-digit country code", Func: r.withList(countryCodeList)})
	r.Register(Generator{Name: "country_code3", Desc: "3-digit country code", Func: r.withList(countryCode3List)})
	r.Register(Generator{Name: "country_emoji", Desc: "Country emoji flag", Func: r.withList(countryEmojiList)})
	r.Register(Generator{Name: "currency", Desc: "Currency code", Func: r.withList(currencyList)})
	r.Register(Generator{Name: "currency_name", Desc: "Currency name", Func: r.withList(currencyNameList)})
	r.Register(Generator{Name: "latitude", Desc: "Latitude", Func: r.withList(cityLatList)})
	r.Register(Generator{Name: "longitude", Desc: "Longitude", Func: r.withList(cityLonList)})
	r.Register(Generator{Name: "nationality", Desc: "Nationality", Func: r.withList(nationalityList)})
	r.Register(Generator{
		Name: "phone",
		Desc: "Phone number according to E.164",
		Func: phoneGenerator(r, phoneCodeFn),
	})
	r.Register(Generator{Name: "phone_country_code", Desc: "Calling country code", Func: phoneCodeFn})
	r.Register(Generator{
		Name:       "phone_number",
		Desc:       "phone number without calling country code. It accepts an integer N number of digits. Min: 8, Max: 12",
		CustomFunc: func(options string) (func() string, error) { return localPhone(r, options) },
	})
	r.Register(Generator{Name: "region", Desc: "Region (e.g., Asia, Europe)", Func: r.withList(regionList)})
	r.Register(Generator{Name: "state", Desc: "State or province name", Func: r.withList(stateList)})
	r.Register(Generator{Name: "state_code", Desc: "State or province code", Func: r.withList(stateCodeList)})
	r.Register(Generator{Name: "subregion", Desc: "Subregion", Func: r.withList(subregionList)})
	r.Register(Generator{Name: "timezone", Desc: "Timezone (Area/City)", Func: r.withList(tzList)})
}

func registerCountryVariants(r *Registry) {
	for _, code := range countryCodeList {
		r.Register(Generator{
			Name:   "phone_" + strings.ToLower(code),
			Desc:   code + " phone number",
			Func:   phoneGenerator(r, countryPhoneFunc(code)),
			Hidden: true,
		})
	}

	for _, idx := range worlddata.CountryIndexTable {
		countryCode := idx.Code
		cities := worlddata.Cities[idx.CityStart : idx.CityStart+idx.CityCount]
		states := worlddata.States[idx.StateStart : idx.StateStart+idx.StateCount]

		cityNames := make([]string, len(cities))
		for i, c := range cities {
			cityNames[i] = c.Name
		}

		stateNames := make([]string, len(states))
		for i, s := range states {
			stateNames[i] = s.Name
		}

		r.Register(Generator{
			Name:   "city_" + strings.ToLower(countryCode),
			Desc:   worlddata.Countries[idx.CountryIdx].Name + " city",
			Func:   r.withList(cityNames),
			Hidden: true,
		})
		r.Register(Generator{
			Name:   "state_" + strings.ToLower(countryCode),
			Desc:   worlddata.Countries[idx.CountryIdx].Name + " state",
			Func:   r.withList(stateNames),
			Hidden: true,
		})
	}
}
