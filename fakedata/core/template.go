package core

import (
	"bufio"
	"fmt"
	"strings"
	"text/template"

	"matto.club/vetrina/fakedata/output"
	"golang.org/x/text/cases"
	"golang.org/x/text/language"
)

func (r *Registry) getFunctions() template.FuncMap {
	funcMap := template.FuncMap{
		"Loop": func(minmax ...int) []int {
			var n int

			if len(minmax) == 1 {
				n = minmax[0]
			} else {
				minInt := minmax[0]
				maxInt := minmax[1]
				if minInt == maxInt {
					n = minInt
				} else {
					n = r.rng.IntN(maxInt-minInt) + minInt
				}
			}

			times := make([]int, n)
			for i := 0; i < n; i++ {
				times[i] = i
			}

			return times
		},
		"Odd":  func(i int) bool { return i%2 != 0 },
		"Even": func(i int) bool { return i%2 == 0 },
	}

	c := cases.Title(language.English)

	for _, gen := range r.generators {
		if !gen.IsCustom() {
			s := strings.ReplaceAll(gen.Name, ".", " ")
			s = strings.ReplaceAll(s, "_", " ")
			name := strings.ReplaceAll(c.String(s), " ", "")
			funcMap[name] = gen.Func
		}
	}

	r.registerTemplateFuncs(funcMap)

	return funcMap
}

func (r *Registry) registerTemplateFuncs(funcMap template.FuncMap) {
	funcMap["Int"] = func(ranges ...int) (string, error) {
		options := make([]string, len(ranges))
		for i, rn := range ranges {
			options[i] = fmt.Sprintf("%v", rn)
		}
		f, err := integer(r, strings.Join(options, ","))
		if err != nil {
			return "", err
		}

		return f(), nil
	}

	funcMap["Enum"] = func(options ...string) (string, error) {
		f, err := enum(r, strings.Join(options, ","))
		if err != nil {
			return "", err
		}

		return f(), nil
	}

	funcMap["File"] = func(path string) (string, error) {
		f, err := file(r, path)
		if err != nil {
			return "", err
		}

		return f(), nil
	}

	funcMap["Date"] = func(dates ...string) (string, error) {
		f, err := date(r, strings.Join(dates, ","))
		if err != nil {
			return "", err
		}

		return f(), nil
	}
}

func (r *Registry) ExecuteTemplate(tmpl string, n int, streamMode bool) (err error) {
	fOut := bufio.NewWriter(output.DataWriter())
	defer func() {
		if flushErr := fOut.Flush(); flushErr != nil && err == nil {
			err = flushErr
		}
	}()

	t, err := template.New("template").Funcs(r.getFunctions()).Parse(tmpl)
	if err != nil {
		return err
	}

	if streamMode {
		for {
			err = t.Execute(fOut, nil)
			if err != nil {
				return err
			}
		}
	}

	for i := 1; i <= n; i++ {
		err = t.Execute(fOut, nil)
		if err != nil {
			return err
		}
	}

	return err
}
