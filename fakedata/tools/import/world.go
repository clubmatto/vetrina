package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"sort"
	"strings"
)

const (
	worldDataDir       = "data/world"
	worldBaseURL       = "https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/master/json/"
	coordParts         = 2
	coordDecimalMaxLen = 5
)

type Timezone struct {
	ZoneName      string `json:"zoneName"`
	GmtOffset     int    `json:"gmtOffset"`
	GmtOffsetName string `json:"gmtOffsetName"`
	Abbreviation  string `json:"abbreviation"`
	TzName        string `json:"tzName"`
}

type State struct {
	ID          int    `json:"id"`
	Name        string `json:"name"`
	ISO2        string `json:"iso2"`
	Iso31662    string `json:"iso3166_2"`
	CountryCode string `json:"country_code"`
	CountryName string `json:"country_name"`
	Type        string `json:"type"`
	Latitude    string `json:"latitude"`
	Longitude   string `json:"longitude"`
	Timezone    string `json:"timezone"`
	Cities      []City `json:"cities"`
}

type City struct {
	ID          int    `json:"id"`
	Name        string `json:"name"`
	Latitude    string `json:"latitude"`
	Longitude   string `json:"longitude"`
	CountryCode string `json:"country_code"`
	StateCode   string `json:"state_code"`
}

type Country struct {
	ID             int        `json:"id"`
	Name           string     `json:"name"`
	ISO3           string     `json:"iso3"`
	ISO2           string     `json:"iso2"`
	NumericCode    string     `json:"numeric_code"`
	PhoneCode      string     `json:"phonecode"`
	Capital        string     `json:"capital"`
	Currency       string     `json:"currency"`
	CurrencyName   string     `json:"currency_name"`
	CurrencySymbol string     `json:"currency_symbol"`
	TLD            string     `json:"tld"`
	Native         string     `json:"native"`
	Region         string     `json:"region"`
	Subregion      string     `json:"subregion"`
	Nationality    string     `json:"nationality"`
	Timezones      []Timezone `json:"timezones"`
	Emoji          string     `json:"emoji"`
	EmojiU         string     `json:"emojiU"`
	Latitude       string     `json:"latitude"`
	Longitude      string     `json:"longitude"`
	States         []State    `json:"states"`
}

type CountryIndex struct {
	Code       string
	CountryIdx int
	StateStart int
	StateCount int
	CityStart  int
	CityCount  int
}

func importWorld() {
	log.Println("Fetching dr5hn countries-states-cities data...")

	resp, err := http.Get(worldBaseURL + "countries%2Bstates%2Bcities.json")
	if err != nil {
		log.Fatal(err)
	}

	defer resp.Body.Close()

	var countries []Country
	if err = json.NewDecoder(resp.Body).Decode(&countries); err != nil {
		log.Fatal(err)
	}

	log.Printf("Parsed %d countries\n", len(countries))

	if err = os.RemoveAll(worldDataDir); err != nil {
		log.Fatal(err)
	}

	if err = os.MkdirAll(worldDataDir, dirPerm); err != nil {
		log.Fatal(err)
	}

	countriesData, statesData, citiesData, countryIndex, stateIndex, timezones := processData(countries)

	writeCountriesGo(countriesData, countryIndex)
	writeStatesGo(statesData, stateIndex)
	writeCitiesGo(citiesData, timezones)

	log.Println("World data import complete!")
}

func sortedStringsFromSet(set map[string]bool) []string {
	result := make([]string, 0, len(set))
	for s := range set {
		result = append(result, s)
	}
	sort.Strings(result)

	return result
}

func processData(countries []Country) (
	[]Country, []State, []City, []CountryIndex, map[string]int, []string,
) {
	var allStates []State
	var allCities []City

	countryIndex := make([]CountryIndex, 0, len(countries))
	stateIndex := make(map[string]int)
	uniqueTimezones := make(map[string]bool)

	for ci, country := range countries {
		idx := CountryIndex{
			Code:       country.ISO2,
			CountryIdx: ci,
			StateStart: len(allStates),
			StateCount: len(country.States),
			CityStart:  len(allCities),
		}

		for _, state := range country.States {
			allStates = append(allStates, State{
				ID:          state.ID,
				Name:        state.Name,
				ISO2:        state.ISO2,
				Iso31662:    state.Iso31662,
				CountryCode: country.ISO2,
				CountryName: country.Name,
				Type:        state.Type,
				Latitude:    truncateCoord(state.Latitude),
				Longitude:   truncateCoord(state.Longitude),
				Timezone:    state.Timezone,
			})
			stateIndex[state.ISO2+"_"+country.ISO2] = len(allStates) - 1
			uniqueTimezones[state.Timezone] = true

			for _, city := range state.Cities {
				allCities = append(allCities, City{
					ID:          city.ID,
					Name:        city.Name,
					Latitude:    truncateCoord(city.Latitude),
					Longitude:   truncateCoord(city.Longitude),
					CountryCode: country.ISO2,
					StateCode:   state.ISO2,
				})
			}

			idx.CityCount += len(state.Cities)
		}

		countryIndex = append(countryIndex, idx)
	}

	sort.Slice(countryIndex, func(i, j int) bool {
		return countryIndex[i].Code < countryIndex[j].Code
	})

	return countries, allStates, allCities, countryIndex, stateIndex, sortedStringsFromSet(uniqueTimezones)
}

func truncateCoord(coord string) string {
	if len(coord) == 0 {
		return coord
	}

	parts := strings.Split(coord, ".")
	if len(parts) != coordParts {
		return coord
	}

	if len(parts[1]) <= coordDecimalMaxLen {
		return coord
	}

	return parts[0] + "." + parts[1][:coordDecimalMaxLen]
}

func writeCountriesGo(countries []Country, index []CountryIndex) {
	var data strings.Builder
	for _, c := range countries {
		tld := strings.TrimPrefix(c.TLD, ".")
		data.WriteString(fmt.Sprintf(
			"\t{%q, %q, %q, %q, %q, %q, %q, %q, %q, %q, %q, %q, %q, %q},\n",
			c.Name, c.ISO2, c.ISO3, c.Capital, c.Currency, c.CurrencyName,
			c.PhoneCode, c.Region, c.Subregion, c.Nationality, tld, c.Emoji,
			c.Latitude, c.Longitude))
	}

	var idxData strings.Builder
	for _, idx := range index {
		idxData.WriteString(fmt.Sprintf(
			"\t{Code: %q, CountryIdx: %d, StateStart: %d, StateCount: %d, CityStart: %d, CityCount: %d},\n",
			idx.Code, idx.CountryIdx, idx.StateStart, idx.StateCount, idx.CityStart, idx.CityCount))
	}

	writeGenerated(worldDataDir, "countries.go", GeneratedFile{
		Tool: "tools/import/world.go",
		Blocks: []string{
			countriesType,
			"var Countries = []Country{\n" + data.String() + "}",
			countryIndexType,
			"var CountryIndexTable = []CountryIndex{\n" + idxData.String() + "}",
		},
	})
}

const countriesType = `type Country struct {
	Name, Code, Code3, Capital, Currency, CurrencyName,
	PhoneCode, Region, Subregion, Nationality, TLD, Emoji,
	Latitude, Longitude string
}`

const countryIndexType = `type CountryIndex struct {
	Code        string
	CountryIdx  int
	StateStart  int
	StateCount  int
	CityStart   int
	CityCount   int
}`

func writeStatesGo(states []State, index map[string]int) {
	var data strings.Builder
	for _, s := range states {
		data.WriteString(fmt.Sprintf("\t{%q, %q, %q, %q, %q, %q, %q},\n",
			s.Name, s.ISO2, s.CountryCode, s.Type, s.Latitude, s.Longitude, s.Timezone))
	}

	var idxData strings.Builder
	keys := make([]string, 0, len(index))
	for k := range index {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	for _, k := range keys {
		idxData.WriteString(fmt.Sprintf("\t%q: %d,\n", k, index[k]))
	}

	writeGenerated(worldDataDir, "states.go", GeneratedFile{
		Tool: "tools/import/world.go",
		Blocks: []string{
			stateType,
			"var States = []State{\n" + data.String() + "}",
			"var StateIndex = map[string]int{\n" + idxData.String() + "}",
		},
	})
}

const stateType = "type State struct{ Name, Code, CountryCode, Type, Latitude, Longitude, Timezone string }"

func writeCitiesGo(cities []City, timezones []string) {
	var data strings.Builder
	for _, c := range cities {
		data.WriteString(fmt.Sprintf("\t{%q, %q, %q, %q, %q},\n",
			c.Name, c.CountryCode, c.StateCode, c.Latitude, c.Longitude))
	}

	var tzData strings.Builder
	for _, tz := range timezones {
		tzData.WriteString(fmt.Sprintf("\t%q,\n", tz))
	}

	writeGenerated(worldDataDir, "cities.go", GeneratedFile{
		Tool: "tools/import/world.go",
		Blocks: []string{
			cityType,
			"var Cities = []City{\n" + data.String() + "}",
			"var Timezones = []string{\n" + tzData.String() + "}",
		},
	})
}

const cityType = "type City struct{ Name, CountryCode, StateCode, Latitude, Longitude string }"
