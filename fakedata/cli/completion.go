package cli

import (
	"bytes"
	"fmt"

	"matto.club/vetrina/fakedata/core"
	"github.com/spf13/pflag"
)

const bashTemplate = `
_fakedata()
{
    local cur prev opts
    COMPREPLY=()
    cur="${COMP_WORDS[COMP_CWORD]}"
    prev="${COMP_WORDS[COMP_CWORD-1]}"
    opts="%s"

    if [[ ${cur} == * ]] ; then
        COMPREPLY=( $(compgen -W "${opts}" -- ${cur}) )
        return 0
    fi
}
complete -F _fakedata fakedata`

const zshTemplate = `
_fakedata () {
    local -a commands
    IFS=$'\n'
    commands=(%s)
    _describe 'arguments' commands
}
compdef _fakedata fakedata`

const fishTemplate = "complete -c fakedata -a '%s'"

func getTemplate(shell string) (string, error) {
	switch shell {
	case "bash":
		return bashTemplate, nil
	case "zsh":
		return zshTemplate, nil
	case "fish":
		return fishTemplate, nil
	default:
		return "", fmt.Errorf("shell %s not supported. See https://matto.club/vetrina/fakedata#completion", shell)
	}
}

func getCompletionFunc(reg *core.Registry, shell string) (string, error) {
	t, err := getTemplate(shell)
	if err != nil {
		return "", err
	}

	gens := &bytes.Buffer{}
	allCliArgs := &bytes.Buffer{}

	for _, gen := range reg.NewGenerators() {
		_, err = fmt.Fprint(gens, gen.Name+" ")
		if err != nil {
			return "", err
		}
	}

	pflag.VisitAll(func(f *pflag.Flag) {
		_, _ = fmt.Fprintf(allCliArgs, "--%s ", f.Name)
	})

	cmdList := gens.String() + " " + allCliArgs.String()

	return fmt.Sprintf(t, cmdList), nil
}
