package main

import (
	"net/http"
	"sort"
	"strings"
	"time"
)

func (a *app) notifications(w http.ResponseWriter, r *http.Request, user User) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}
	userID := r.URL.Query().Get("userId")
	if userID == "" {
		userID = user.ID
	}
	if userID != user.ID {
		errorJSON(w, http.StatusForbidden, "Forbidden")
		return
	}
	a.store.mu.Lock()
	defer a.store.mu.Unlock()
	items := make([]Notification, 0)
	for _, notification := range a.store.data.Notifications {
		if notification.UserID == userID {
			items = append(items, notification)
		}
	}
	sort.Slice(items, func(i, j int) bool { return items[i].CreatedAt > items[j].CreatedAt })
	writeJSON(w, http.StatusOK, items)
}

func (a *app) notificationByID(w http.ResponseWriter, r *http.Request, user User) {
	if r.Method != http.MethodPatch || !strings.HasSuffix(r.URL.Path, "/read") {
		methodNotAllowed(w)
		return
	}
	id := strings.TrimSuffix(strings.TrimPrefix(r.URL.Path, "/api/notifications/"), "/read")
	a.store.mu.Lock()
	defer a.store.mu.Unlock()
	for i := range a.store.data.Notifications {
		if a.store.data.Notifications[i].UserID != user.ID {
			continue
		}
		if a.store.data.Notifications[i].ID == id && a.store.data.Notifications[i].ReadAt == "" {
			a.store.data.Notifications[i].ReadAt = time.Now().UTC().Format(time.RFC3339Nano)
		}
	}
	if err := a.store.save(); err != nil {
		errorJSON(w, http.StatusInternalServerError, "Unable to save notification")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (a *app) markAllNotificationsRead(w http.ResponseWriter, r *http.Request, user User) {
	if r.Method != http.MethodPatch {
		methodNotAllowed(w)
		return
	}
	var input markAllNotificationsReadRequest
	if !decodeJSON(w, r, &input) {
		return
	}
	if input.UserID == "" {
		input.UserID = user.ID
	}
	if input.UserID != user.ID {
		errorJSON(w, http.StatusForbidden, "Forbidden")
		return
	}
	a.store.mu.Lock()
	defer a.store.mu.Unlock()
	now := time.Now().UTC().Format(time.RFC3339Nano)
	for i := range a.store.data.Notifications {
		if a.store.data.Notifications[i].UserID == input.UserID && a.store.data.Notifications[i].ReadAt == "" {
			a.store.data.Notifications[i].ReadAt = now
		}
	}
	if err := a.store.save(); err != nil {
		errorJSON(w, http.StatusInternalServerError, "Unable to save notifications")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
