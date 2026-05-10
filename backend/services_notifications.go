package main

import (
	"fmt"
	"time"
)

func (a *app) pushNotificationLocked(userID, notificationType string, task Task) Notification {
	title := "Task updated"
	message := fmt.Sprintf("%s was recently updated.", task.Title)
	if notificationType == "new_comment" {
		title = "New comment"
		message = fmt.Sprintf("%s has a new comment.", task.Title)
	}
	notification := Notification{
		ID:        randomID("ntf"),
		UserID:    userID,
		Type:      notificationType,
		Title:     title,
		Message:   message,
		CreatedAt: time.Now().UTC().Format(time.RFC3339Nano),
	}
	a.store.data.Notifications = append([]Notification{notification}, a.store.data.Notifications...)
	return notification
}
