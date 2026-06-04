package core_test

import (
	"testing"

	"matto.club/vetrina/fakedata/core"
)

func BenchmarkSimpleRow(b *testing.B) {
	columns, err := core.NewColumns(testReg, []string{"int", "float", "first_name", "last_name", "enum"})
	if err != nil {
		b.Fatal(err)
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		columns.GenerateRow()
	}
}

func BenchmarkGenerators(b *testing.B) {
	gens := testReg.NewGenerators()
	for i := 0; i < len(gens); i++ {
		g := gens[i]

		if !g.IsCustom() && !g.Hidden {
			b.Run(g.Name, func(b *testing.B) {
				for j := 0; j < b.N; j++ {
					g.Func()
				}
			})
		}
	}
}

func BenchmarkDate(b *testing.B) {
	gens := testReg.NewGenerators()
	date := gens.FindByName("date")
	if date == nil {
		b.Fatal("date generator not found")
	}

	b.Run("default", func(b *testing.B) {
		dateFunc, err := date.CustomFunc("")
		if err != nil {
			b.Fatalf("cannot create date: %s", err)
		}
		b.ResetTimer()
		for i := 0; i < b.N; i++ {
			dateFunc()
		}
	})

	b.Run("custom_range", func(b *testing.B) {
		dateFunc, err := date.CustomFunc("2020-01-01,2024-12-31")
		if err != nil {
			b.Fatalf("cannot create date: %s", err)
		}
		b.ResetTimer()
		for i := 0; i < b.N; i++ {
			dateFunc()
		}
	})
}

func BenchmarkEnum(b *testing.B) {
	gens := testReg.NewGenerators()
	enum := gens.FindByName("enum")
	if enum == nil {
		b.Fatal("enum generator not found")
	}

	enumFunc, err := enum.CustomFunc("")
	if err != nil {
		b.Fatalf("cannot create enum: %s", err)
	}
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		enumFunc()
	}
}

func BenchmarkInt(b *testing.B) {
	gens := testReg.NewGenerators()
	integer := gens.FindByName("int")
	if integer == nil {
		b.Fatal("int generator not found")
	}

	testCases := []struct {
		name    string
		options string
	}{
		{"small_range", "0,1000"},
		{"large_range", "10000000,9999999999"},
		{"single_value", "42,42"},
		{"negative", "-100,-1"},
		{"full_range", "-999999999,999999999"},
	}

	for _, tc := range testCases {
		b.Run(tc.name, func(b *testing.B) {
			integerFunc, err := integer.CustomFunc(tc.options)
			if err != nil {
				b.Fatalf("cannot create int with %s: %s", tc.options, err)
			}
			b.ResetTimer()
			for i := 0; i < b.N; i++ {
				integerFunc()
			}
		})
	}
}

func BenchmarkPhoneLocal(b *testing.B) {
	gens := testReg.NewGenerators()
	phoneLocal := gens.FindByName("phone_number")

	digits := []string{"8", "9", "10", "11", "12"}

	for _, digit := range digits {
		b.Run("phone_number:"+digit, func(b *testing.B) {
			phoneLocalFunc, err := phoneLocal.CustomFunc(digit)
			if err != nil {
				b.Fatalf("cannot create phone_number: %s", err)
			}
			b.ResetTimer()
			for i := 0; i < b.N; i++ {
				phoneLocalFunc()
			}
		})
	}
}

func BenchmarkPhoneCountry(b *testing.B) {
	gens := testReg.NewGenerators()

	countryCodes := []string{"us", "gb", "de", "fr", "jp"}

	for _, code := range countryCodes {
		b.Run("phone_"+code, func(b *testing.B) {
			phoneCountry := gens.FindByName("phone_" + code)
			if phoneCountry == nil {
				b.Fatalf("phone_%s generator not found", code)
			}
			b.ResetTimer()
			for i := 0; i < b.N; i++ {
				phoneCountry.Func()
			}
		})
	}
}

func BenchmarkFile(b *testing.B) {
	gens := testReg.NewGenerators()
	file := gens.FindByName("file")
	if file == nil {
		b.Fatal("file generator not found")
	}

	fileFunc, err := file.CustomFunc("../testutil/fixtures/file.txt")
	if err != nil {
		b.Fatalf("cannot open fixture: %s", err)
	}
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		fileFunc()
	}
}
