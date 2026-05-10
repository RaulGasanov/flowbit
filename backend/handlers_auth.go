package main

import (
	"net/http"
	"strings"
)

func (a *app) login(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		methodNotAllowed(w)
		return
	}
	var input loginRequest
	if !decodeJSON(w, r, &input) {
		return
	}

	a.store.mu.Lock()
	defer a.store.mu.Unlock()
	for _, user := range a.store.data.Users {
		if strings.EqualFold(user.Email, strings.TrimSpace(input.Email)) && user.PasswordHash == hashPassword(input.Password) {
			token := randomID("tok")
			a.store.sessions[token] = user.ID
			writeJSON(w, http.StatusOK, map[string]any{"token": token, "user": user})
			return
		}
	}
	errorJSON(w, http.StatusUnauthorized, "Invalid email or password")
}

func (a *app) register(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		methodNotAllowed(w)
		return
	}
	var input registerRequest
	if !decodeJSON(w, r, &input) {
		return
	}
	input.Name = strings.TrimSpace(input.Name)
	input.Email = strings.TrimSpace(input.Email)
	input.Role = strings.TrimSpace(input.Role)
	if input.Name == "" || input.Email == "" || len(input.Password) < 8 {
		errorJSON(w, http.StatusBadRequest, "Name, valid email and 8+ character password are required")
		return
	}
	if input.Role == "" {
		input.Role = "editor"
	}
	if !isValidUserRole(input.Role) {
		errorJSON(w, http.StatusBadRequest, "Invalid role")
		return
	}

	a.store.mu.Lock()
	defer a.store.mu.Unlock()
	for _, user := range a.store.data.Users {
		if strings.EqualFold(user.Email, input.Email) {
			errorJSON(w, http.StatusConflict, "Email is already registered")
			return
		}
	}
	user := User{
		ID:           randomID("usr"),
		Name:         input.Name,
		Email:        input.Email,
		Role:         input.Role,
		Bio:          "",
		Workspace:    input.Name + "'s workspace",
		AvatarURL:    "",
		Settings:     defaultSettings("light", "sky"),
		PasswordHash: hashPassword(input.Password),
	}
	a.store.data.Users = append(a.store.data.Users, user)
	if err := a.store.save(); err != nil {
		errorJSON(w, http.StatusInternalServerError, "Unable to save account")
		return
	}
	token := randomID("tok")
	a.store.sessions[token] = user.ID
	writeJSON(w, http.StatusCreated, map[string]any{"token": token, "user": user})
}
