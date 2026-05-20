package main

import (
	"net/http"
	"strings"
)

func cors(next http.Handler) http.Handler {
	allowedOrigins := map[string]bool{
		"http://localhost:3000":     true,
		"http://81.26.190.209:3000": true,
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")

		if allowedOrigins[origin] {
			w.Header().Set("Access-Control-Allow-Origin", origin)
		}

		w.Header().Set("Vary", "Origin")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func (a *app) requireAuth(next func(http.ResponseWriter, *http.Request, User)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		token := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
		a.store.mu.Lock()
		userID := a.store.sessions[token]
		user, ok := a.findUserLocked(userID)
		a.store.mu.Unlock()
		if token == "" || !ok {
			errorJSON(w, http.StatusUnauthorized, "Unauthorized")
			return
		}
		next(w, r, user)
	}
}
