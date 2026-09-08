package main

import "fmt"

func greet(name string) string {
	if name == "" {
		name = "world"
	}
	return fmt.Sprintf("Hello, %s!", name)
}

func main() {
	for _, n := range []string{"Ada", ""} {
		fmt.Println(greet(n))
	}
}
