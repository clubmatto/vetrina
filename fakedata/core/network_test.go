package core_test

import (
	"regexp"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestIPv4(t *testing.T) {
	gens := testReg.NewGenerators()

	g := gens.FindByName("ipv4")
	require.NotNil(t, g, "ipv4 generator not found")

	ipv4Regex := regexp.MustCompile(
		`^([1-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-4])` +
			`\.([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])` +
			`\.([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])` +
			`\.([1-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-4])$`)

	for i := 0; i < 100; i++ {
		result := g.Func()
		require.True(t, ipv4Regex.MatchString(result), "ipv4: %q doesn't match expected format", result)
	}
}

func TestIPv6(t *testing.T) {
	gens := testReg.NewGenerators()

	g := gens.FindByName("ipv6")
	require.NotNil(t, g, "ipv6 generator not found")

	ipv6Regex := regexp.MustCompile(
		`^2001:cafe:[0-9a-f]{1,4}:[0-9a-f]{1,4}:[0-9a-f]{1,4}:` +
			`[0-9a-f]{1,4}:[0-9a-f]{1,4}:[0-9a-f]{1,4}$`)

	for i := 0; i < 100; i++ {
		result := g.Func()
		require.True(t, ipv6Regex.MatchString(result), "ipv6: %q doesn't match expected format", result)
	}
}

func TestMAC(t *testing.T) {
	gens := testReg.NewGenerators()

	g := gens.FindByName("mac")
	require.NotNil(t, g, "mac generator not found")

	macRegex := regexp.MustCompile(`^([0-9A-F]{1,2}:){5}[0-9A-F]{1,2}$`)

	for i := 0; i < 100; i++ {
		result := g.Func()
		require.True(t, macRegex.MatchString(result), "mac: %q doesn't match expected format", result)
	}
}

func TestUUIDv6(t *testing.T) {
	gens := testReg.NewGenerators()

	g := gens.FindByName("uuidv6")
	require.NotNil(t, g, "uuidv6 generator not found")

	uuidRegex := regexp.MustCompile(`^[0-9a-f]{8}-[0-9a-f]{4}-6[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$`)

	for i := 0; i < 100; i++ {
		result := g.Func()
		require.True(t, uuidRegex.MatchString(result), "uuidv6: %q doesn't match expected format", result)
	}
}

func TestUUIDv7(t *testing.T) {
	gens := testReg.NewGenerators()

	g := gens.FindByName("uuidv7")
	require.NotNil(t, g, "uuidv7 generator not found")

	uuidRegex := regexp.MustCompile(`^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$`)

	for i := 0; i < 100; i++ {
		result := g.Func()
		require.True(t, uuidRegex.MatchString(result), "uuidv7: %q doesn't match expected format", result)
	}
}

func TestLatitude(t *testing.T) {
	gens := testReg.NewGenerators()

	g := gens.FindByName("latitude")
	require.NotNil(t, g, "latitude generator not found")

	latRegex := regexp.MustCompile(`^-?([0-9]|[1-8][0-9]|90)\.[0-9]{5,6}$`)

	for i := 0; i < 100; i++ {
		result := g.Func()
		require.True(t, latRegex.MatchString(result), "latitude: %q doesn't match expected format", result)
	}
}

func TestLongitude(t *testing.T) {
	gens := testReg.NewGenerators()

	g := gens.FindByName("longitude")
	require.NotNil(t, g, "longitude generator not found")

	lonRegex := regexp.MustCompile(`^-?([0-9]|[1-9][0-9]|1[0-7][0-9]|180)\.[0-9]{5,6}$`)

	for i := 0; i < 100; i++ {
		result := g.Func()
		require.True(t, lonRegex.MatchString(result), "longitude: %q doesn't match expected format", result)
	}
}
