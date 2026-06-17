package core_test

import (
	"testing"

	"matto.club/vetrina/fakedata/core"
)

func TestTemplateFunctionsUseCamelCase(t *testing.T) {
	reg := core.NewRegistry()

	tmpl := "{{FirstName}} {{LastName}} lives in {{Country}}"
	err := reg.ExecuteTemplate(tmpl, 1, false)

	if err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}
}

func TestTemplateFunctionsUseCamelCaseMultiWord(t *testing.T) {
	reg := core.NewRegistry()

	tmpl := "{{DomainName}} {{ProgrammingLanguage}}"
	err := reg.ExecuteTemplate(tmpl, 1, false)

	if err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}
}
