package main

import (
	"log"
	"net/http"
	"os"
	"time"
)

func main() {
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		log.Fatal("DATABASE_URL is required, for example: postgres://localhost:5432/flowbit?sslmode=disable")
	}

	store, err := newStore(databaseURL)
	if err != nil {
		log.Fatal(err)
	}
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	server := &http.Server{
		Addr:              ":" + port,
		Handler:           cors((&app{store: store}).routes()),
		ReadHeaderTimeout: 5 * time.Second,
	}

	log.Printf("Flowbit API listening on http://localhost:%s", port)
	log.Fatal(server.ListenAndServe())
}
