package main

import (
	"encoding/json"
	"net/http"
)

func decodeJSON(w http.ResponseWriter, r *http.Request, target any) bool {
	if err := json.NewDecoder(r.Body).Decode(target); err != nil {
		errorJSON(w, http.StatusBadRequest, "Invalid JSON")
		return false
	}
	return true
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(sanitizePayload(payload))
}

func errorJSON(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}

func methodNotAllowed(w http.ResponseWriter) {
	errorJSON(w, http.StatusMethodNotAllowed, "Method not allowed")
}

func sanitizePayload(payload any) any {
	switch value := payload.(type) {
	case User:
		value.PasswordHash = ""
		return value
	case []User:
		users := make([]User, len(value))
		copy(users, value)
		for i := range users {
			users[i].PasswordHash = ""
		}
		return users
	case map[string]any:
		copyMap := make(map[string]any, len(value))
		for key, item := range value {
			copyMap[key] = sanitizePayload(item)
		}
		return copyMap
	default:
		return payload
	}
}
