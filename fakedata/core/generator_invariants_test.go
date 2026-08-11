package core_test

import (
	"regexp"
	"strconv"
	"strings"
	"testing"
	"time"
	"unicode"

	"matto.club/vetrina/fakedata/core"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func emailInvariant(email string) bool {
	atCount := strings.Count(email, "@")
	if atCount != 1 {
		return false
	}
	parts := strings.Split(email, "@")
	if len(parts) != 2 {
		return false
	}
	if parts[0] == "" || parts[1] == "" {
		return false
	}
	if !strings.Contains(parts[1], ".") {
		return false
	}

	return true
}

func ipv4Invariant(ip string) bool {
	parts := strings.Split(ip, ".")
	if len(parts) != 4 {
		return false
	}
	for _, part := range parts {
		val, err := strconv.Atoi(part)
		if err != nil {
			return false
		}
		if val < 0 || val > 255 {
			return false
		}
	}

	return true
}

func ipv6Invariant(ip string) bool {
	parts := strings.Split(ip, ":")
	if len(parts) != 8 {
		return false
	}
	for _, part := range parts {
		if len(part) == 0 || len(part) > 4 {
			return false
		}
		_, err := strconv.ParseUint(part, 16, 16)
		if err != nil {
			return false
		}
	}

	return true
}

func macInvariant(mac string) bool {
	matched, _ := regexp.MatchString(`^([0-9A-Fa-f]{1,2}:){5}[0-9A-Fa-f]{1,2}$`, mac)

	return matched
}

func uuidv4Invariant(uuid string) bool {
	matched, _ := regexp.MatchString(`^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`, uuid)

	return matched
}

func floatInvariant(s string) bool {
	_, err := strconv.ParseFloat(s, 64)

	return err == nil
}

func intInvariant(s string) bool {
	_, err := strconv.Atoi(s)

	return err == nil
}

func phoneE164Invariant(phone string) bool {
	if !strings.HasPrefix(phone, "+") {
		return false
	}
	_, err := strconv.ParseInt(phone[1:], 10, 64)

	return err == nil
}

func latitudeInvariant(lat string) bool {
	val, err := strconv.ParseFloat(lat, 64)
	if err != nil {
		return false
	}

	return val >= -90 && val <= 90
}

func longitudeInvariant(lon string) bool {
	val, err := strconv.ParseFloat(lon, 64)
	if err != nil {
		return false
	}

	return val >= -180 && val <= 180
}

func capitalizedInvariant(s string) bool {
	if len(s) == 0 {
		return false
	}
	runes := []rune(s)
	first := runes[0]

	return unicode.IsLetter(first)
}

func nonEmptyInvariant(s string) bool {
	return len(strings.TrimSpace(s)) > 0
}

func domainInvariant(domain string) bool {
	parts := strings.Split(domain, ".")
	if len(parts) < 2 {
		return false
	}
	for _, part := range parts {
		if len(part) == 0 {
			return false
		}
	}

	return true
}

func fullNameInvariant(fullName string) bool {
	parts := strings.Fields(fullName)
	if len(parts) < 2 {
		return false
	}

	return len(parts[0]) > 0 && len(parts[len(parts)-1]) > 0
}

func emailDomainInvariant(email string) bool {
	atCount := strings.Count(email, "@")
	if atCount != 1 {
		return false
	}
	parts := strings.Split(email, "@")
	if len(parts) != 2 {
		return false
	}
	matched, _ := regexp.MatchString(`^(test|example)\.[a-z]+$`, parts[1])

	return matched
}

func usernameInvariant(username string) bool {
	if len(username) < 4 || len(username) > 25 {
		return false
	}
	matched, _ := regexp.MatchString(`^\p{L}[\p{L}0-9._]*[0-9]+$`, username)

	return matched
}

func timeInvariant(s string) bool {
	_, err := time.Parse("15:04:05", s)

	return err == nil
}

func datetimeInvariant(s string) bool {
	_, err := time.Parse("2006-01-02 15:04:05", s)

	return err == nil
}

func timestampInvariant(s string) bool {
	_, err := time.Parse(time.RFC3339Nano, s)

	return err == nil
}

func epochInvariant(s string) bool {
	v, err := strconv.ParseInt(s, 10, 64)
	if err != nil {
		return false
	}

	return v >= 0 && v <= time.Now().Unix()
}

type invariantTest struct {
	name      string
	generator string
	invariant func(string) bool
}

func TestGeneratorInvariants(t *testing.T) {
	tests := []invariantTest{
		{name: "email", generator: "email", invariant: emailInvariant},
		{name: "ipv4", generator: "ipv4", invariant: ipv4Invariant},
		{name: "ipv6", generator: "ipv6", invariant: ipv6Invariant},
		{name: "mac", generator: "mac", invariant: macInvariant},
		{name: "uuidv4", generator: "uuidv4", invariant: uuidv4Invariant},
		{name: "float", generator: "float", invariant: floatInvariant},
		{name: "int", generator: "int", invariant: intInvariant},
		{name: "phone", generator: "phone", invariant: phoneE164Invariant},
		{name: "latitude", generator: "latitude", invariant: latitudeInvariant},
		{name: "longitude", generator: "longitude", invariant: longitudeInvariant},
		{name: "first_name", generator: "first_name", invariant: capitalizedInvariant},
		{name: "last_name", generator: "last_name", invariant: capitalizedInvariant},
		{name: "domain_name", generator: "domain_name", invariant: domainInvariant},
		{name: "full_name", generator: "full_name", invariant: fullNameInvariant},
		{name: "email_domain", generator: "email", invariant: emailDomainInvariant},
		{name: "city", generator: "city", invariant: nonEmptyInvariant},
		{name: "state", generator: "state", invariant: nonEmptyInvariant},
		{name: "country", generator: "country", invariant: nonEmptyInvariant},
		{name: "tld", generator: "tld", invariant: nonEmptyInvariant},
		{name: "username", generator: "username", invariant: usernameInvariant},
		{name: "time", generator: "time", invariant: timeInvariant},
		{name: "datetime", generator: "datetime", invariant: datetimeInvariant},
		{name: "timestamp", generator: "timestamp", invariant: timestampInvariant},
		{name: "epoch", generator: "epoch", invariant: epochInvariant},
		{name: "distinct uuidv4", generator: "distinct:50:uuidv4", invariant: uuidv4Invariant},
		{name: "distinct date", generator: "distinct:50:date:2020-01-01,2020-12-31", invariant: isDate},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cols, err := core.NewColumns(testReg, []string{tt.generator})
			require.NoError(t, err, "failed to create column for %s", tt.generator)

			for i := 0; i < 1000; i++ {
				var row []string
				row, err = cols.GenerateRow()
				require.NoError(t, err)

				assert.True(t, tt.invariant(row[0]),
					"%s invariant failed for: %s", tt.generator, row[0])
			}
		})
	}
}
