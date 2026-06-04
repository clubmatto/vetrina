package main

import "log"

func main() {
	log.Println("Importing dariusk/corpora data...")
	importCorpora()

	log.Println("Importing dr5hn world data...")
	importWorld()

	log.Println("Importing sigpwned names data...")
	importNames()

	log.Println("All imports complete!")
}
