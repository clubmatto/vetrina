# FakeData

CLI tool to generate fake data rows for testing and development.

## Install

```bash
go install matto.club/vetrina/fakedata@latest
```

Or via Homebrew:

```bash
brew install clubmatto/tap/fakedata
```

## Quick Start

```bash
fakedata email country --seed 1
fakedata -n 5 "login:email" "first_name" "last_name"
fakedata --stream email
```

## Generators

40+ built-in generators: email, country, name, city, address, phone, uuid, int, date, file, sentence, and more. Each generator supports optional constraints:

```bash
fakedata int:10,20                     # integer between 10 and 20
fakedata enum:red,green,blue           # pick from a list
fakedata file:./data.txt               # read line by line from a file
```

## Shell Completion

```bash
fakedata -C bash > /etc/bash_completion.d/fakedata
fakedata -C zsh  > /usr/local/share/zsh/site-functions/_fakedata
fakedata -C fish > ~/.config/fish/completions/fakedata.fish
```

## License

MIT
