package main

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"strings"
	"time"
)

func pathParts(path, prefix string) []string {
	trimmed := strings.Trim(strings.TrimPrefix(path, prefix), "/")
	if trimmed == "" {
		return nil
	}
	return strings.Split(trimmed, "/")
}

func ensureMember(memberIDs []string, userID string) []string {
	seen := map[string]bool{}
	result := make([]string, 0, len(memberIDs)+1)
	for _, memberID := range memberIDs {
		memberID = strings.TrimSpace(memberID)
		if memberID == "" || seen[memberID] {
			continue
		}
		seen[memberID] = true
		result = append(result, memberID)
	}
	if !seen[userID] {
		result = append(result, userID)
	}
	return result
}

func randomID(prefix string) string {
	bytes := make([]byte, 8)
	if _, err := rand.Read(bytes); err != nil {
		return fmt.Sprintf("%s_%d", prefix, time.Now().UnixNano())
	}
	return fmt.Sprintf("%s_%s", prefix, hex.EncodeToString(bytes))
}

func isValidUserRole(role string) bool {
	return role == "admin" || role == "editor" || role == "viewer" || role == "guest"
}

func hashPassword(password string) string {
	sum := sha256.Sum256([]byte("flowbit:" + password))
	return hex.EncodeToString(sum[:])
}

func defaultSettings(theme, accent string) UserSettings {
	settings := UserSettings{Theme: theme, AccentColor: accent}
	settings.Notifications.Comments = true
	settings.Notifications.TaskUpdates = true
	settings.Notifications.DeadlineReminders = true
	settings.Notifications.EmailChannel = true
	settings.Notifications.InAppChannel = true
	return settings
}
