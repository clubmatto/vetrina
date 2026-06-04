package main

import (
	"encoding/csv"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"sort"
	"strings"
)

const (
	namesDataDir      = "data/names"
	namesBaseURL      = "https://raw.githubusercontent.com/sigpwned/popular-names-by-country-dataset/master/"
	forenameMinFields = 12
	forenameLocalIdx  = 10
	forenameRomanIdx  = 11
	surnameMinFields  = 6
	surnameLocalIdx   = 4
	surnameRomanIdx   = 5
)

type personName struct {
	name        string
	countryCode string
}

func importNames() {
	log.Println("Fetching sigpwned names data...")

	forenamesResp, err := http.Get(namesBaseURL + "common-forenames-by-country.csv")
	if err != nil {
		log.Fatal(err)
	}
	defer forenamesResp.Body.Close()

	surnamesResp, err := http.Get(namesBaseURL + "common-surnames-by-country.csv")
	if err != nil {
		log.Fatal(err)
	}
	defer surnamesResp.Body.Close()

	forenames, forenameIndex := parseForenames(forenamesResp.Body)
	surnames, surnameIndex := parseSurnames(surnamesResp.Body)

	log.Printf("Parsed %d forenames from %d countries\n", len(forenames), len(forenameIndex))
	log.Printf("Parsed %d surnames from %d countries\n", len(surnames), len(surnameIndex))

	if err = os.RemoveAll(namesDataDir); err != nil {
		log.Fatal(err)
	}

	if err = os.MkdirAll(namesDataDir, dirPerm); err != nil {
		log.Fatal(err)
	}

	writeForenamesGo(forenames, forenameIndex)
	writeSurnamesGo(surnames, surnameIndex)

	log.Println("Names data import complete!")
}

type nameIndex struct {
	CountryCode string
	NameStart   int
	NameCount   int
}

func buildNamesFromRecords(
	records [][]string, minFields, localizedIdx, romanizedIdx int,
) ([]personName, map[string]nameIndex) {
	var names []personName

	indexMap := make(map[string]nameIndex)

	currentCountry := ""
	currentStart := 0
	currentCount := 0

	for i, record := range records {
		if i == 0 {
			continue
		}

		if len(record) < minFields {
			continue
		}

		countryCode := strings.TrimSpace(record[0])
		localizedName := strings.TrimSpace(record[localizedIdx])
		romanizedName := strings.TrimSpace(record[romanizedIdx])

		name := romanizedName
		if name == "" {
			name = localizedName
		}

		if name == "" || countryCode == "" {
			continue
		}

		if countryCode != currentCountry {
			if currentCountry != "" {
				indexMap[currentCountry] = nameIndex{
					CountryCode: currentCountry,
					NameStart:   currentStart,
					NameCount:   currentCount,
				}
			}

			currentCountry = countryCode
			currentStart = len(names)
			currentCount = 0
		}

		names = append(names, personName{name: name, countryCode: countryCode})
		currentCount++
	}

	if currentCountry != "" {
		indexMap[currentCountry] = nameIndex{
			CountryCode: currentCountry,
			NameStart:   currentStart,
			NameCount:   currentCount,
		}
	}

	return names, indexMap
}

func sortedIndexFromMap(indexMap map[string]nameIndex) []nameIndex {
	var index []nameIndex

	countryCodes := make([]string, 0, len(indexMap))
	for code := range indexMap {
		countryCodes = append(countryCodes, code)
	}

	sort.Strings(countryCodes)

	for _, code := range countryCodes {
		index = append(index, indexMap[code])
	}

	return index
}

func parseNames(body io.ReadCloser, minFields int, localizedIdx, romanizedIdx int) ([]personName, []nameIndex) {
	reader := csv.NewReader(body)
	reader.FieldsPerRecord = -1
	reader.TrimLeadingSpace = true

	records, err := reader.ReadAll()
	if err != nil {
		log.Fatal(err)
	}

	names, indexMap := buildNamesFromRecords(records, minFields, localizedIdx, romanizedIdx)

	index := sortedIndexFromMap(indexMap)

	return names, index
}

func parseForenames(body io.ReadCloser) ([]personName, []nameIndex) {
	return parseNames(body, forenameMinFields, forenameLocalIdx, forenameRomanIdx)
}

func parseSurnames(body io.ReadCloser) ([]personName, []nameIndex) {
	return parseNames(body, surnameMinFields, surnameLocalIdx, surnameRomanIdx)
}

func writeNamesGo(
	filename string,
	sliceName string,
	indexName string,
	slice []personName,
	index []nameIndex,
) {
	var sliceData strings.Builder
	for _, n := range slice {
		sliceData.WriteString(fmt.Sprintf("\t{%q, %q},\n", n.name, n.countryCode))
	}

	var idxData strings.Builder
	for _, idx := range index {
		idxData.WriteString(fmt.Sprintf("\t{%q, %d, %d},\n", idx.CountryCode, idx.NameStart, idx.NameCount))
	}

	writeGenerated(namesDataDir, filename, GeneratedFile{
		Tool: "tools/import/names.go",
		Blocks: []string{
			fmt.Sprintf(namesSliceVar, sliceName) + sliceData.String() + "}",
			fmt.Sprintf(namesIndexVar, indexName) + idxData.String() + "}",
		},
	})
}

const namesSliceVar = `var %s = []struct{Name string; CountryCode string}{
`

const namesIndexVar = `var %s = []struct{CountryCode string; NameStart int; NameCount int}{
`

func writeForenamesGo(forenames []personName, index []nameIndex) {
	writeNamesGo("forenames.go", "Forenames", "ForenameIndex", forenames, index)
}

func writeSurnamesGo(surnames []personName, index []nameIndex) {
	writeNamesGo("surnames.go", "Surnames", "SurnameIndex", surnames, index)
}
