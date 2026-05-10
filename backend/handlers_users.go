package main

import (
	"net/http"
	"sort"
	"strings"
)

func (a *app) me(w http.ResponseWriter, r *http.Request, user User) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}
	writeJSON(w, http.StatusOK, user)
}

func (a *app) users(w http.ResponseWriter, r *http.Request, user User) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}
	a.store.mu.Lock()
	defer a.store.mu.Unlock()
	visibleUserIDs := a.visibleUserIDsLocked(user)
	users := make([]User, 0, len(visibleUserIDs))
	for _, item := range a.store.data.Users {
		if visibleUserIDs[item.ID] {
			users = append(users, item)
		}
	}
	writeJSON(w, http.StatusOK, users)
}

func (a *app) sharedWorkspace(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}
	token := strings.Trim(strings.TrimPrefix(r.URL.Path, "/api/shared/workspaces/"), "/")
	if token == "" {
		errorJSON(w, http.StatusNotFound, "Shared workspace not found")
		return
	}

	a.store.mu.Lock()
	defer a.store.mu.Unlock()
	project, ok := a.projectByShareTokenLocked(token)
	if !ok {
		errorJSON(w, http.StatusNotFound, "Shared workspace not found")
		return
	}

	tasks := make([]Task, 0)
	for _, task := range a.store.data.Tasks {
		if task.ProjectID == project.ID {
			tasks = append(tasks, task)
		}
	}
	sort.Slice(tasks, func(i, j int) bool {
		if tasks[i].Status == tasks[j].Status {
			return tasks[i].Position < tasks[j].Position
		}
		return tasks[i].Status < tasks[j].Status
	})

	users := make([]User, 0)
	for _, user := range a.store.data.Users {
		if isProjectMember(project, user.ID) {
			users = append(users, user)
		}
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"project": project,
		"tasks":   tasks,
		"users":   users,
	})
}

func (a *app) updateUserRoleByEmail(w http.ResponseWriter, r *http.Request, current User) {
	if r.Method != http.MethodPatch {
		methodNotAllowed(w)
		return
	}
	var input updateWorkspaceMemberRoleRequest
	if !decodeJSON(w, r, &input) {
		return
	}
	input.ProjectID = strings.TrimSpace(input.ProjectID)
	input.Email = strings.TrimSpace(input.Email)
	input.Role = strings.TrimSpace(input.Role)
	if input.ProjectID == "" || input.Email == "" || input.Role == "" {
		errorJSON(w, http.StatusBadRequest, "Workspace, email and role are required")
		return
	}
	if input.Role != "viewer" && input.Role != "editor" {
		errorJSON(w, http.StatusBadRequest, "Workspace owner can only assign viewer or editor role here")
		return
	}

	a.store.mu.Lock()
	defer a.store.mu.Unlock()
	projectIndex := -1
	for i, project := range a.store.data.Projects {
		if project.ID == input.ProjectID {
			projectIndex = i
			break
		}
	}
	if projectIndex < 0 || !isProjectMember(a.store.data.Projects[projectIndex], current.ID) {
		errorJSON(w, http.StatusNotFound, "Workspace not found")
		return
	}
	if a.store.data.Projects[projectIndex].OwnerID != current.ID {
		errorJSON(w, http.StatusForbidden, "Only workspace owner can update member roles")
		return
	}
	index := -1
	for i, user := range a.store.data.Users {
		if strings.EqualFold(user.Email, input.Email) {
			index = i
			break
		}
	}
	if index < 0 {
		errorJSON(w, http.StatusNotFound, "User with this email was not found")
		return
	}
	if a.store.data.Users[index].ID == current.ID {
		errorJSON(w, http.StatusBadRequest, "You cannot change your own role")
		return
	}
	if a.store.data.Projects[projectIndex].MemberRoles == nil {
		a.store.data.Projects[projectIndex].MemberRoles = StringMap{}
	}
	if !isProjectMember(a.store.data.Projects[projectIndex], a.store.data.Users[index].ID) {
		a.store.data.Projects[projectIndex].MemberIDs = append(
			a.store.data.Projects[projectIndex].MemberIDs,
			a.store.data.Users[index].ID,
		)
	}
	a.store.data.Projects[projectIndex].MemberRoles[a.store.data.Users[index].ID] = input.Role
	if err := a.store.save(); err != nil {
		errorJSON(w, http.StatusInternalServerError, "Unable to save workspace member")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"user": a.store.data.Users[index],
		"role": input.Role,
	})
}

func (a *app) userByID(w http.ResponseWriter, r *http.Request, current User) {
	parts := pathParts(r.URL.Path, "/api/users/")
	if len(parts) < 1 {
		errorJSON(w, http.StatusNotFound, "User not found")
		return
	}
	userID := parts[0]
	if current.ID != userID && current.Role != "admin" {
		errorJSON(w, http.StatusForbidden, "Forbidden")
		return
	}

	a.store.mu.Lock()
	defer a.store.mu.Unlock()
	index := a.userIndexLocked(userID)
	if index < 0 {
		errorJSON(w, http.StatusNotFound, "User not found")
		return
	}

	switch {
	case r.Method == http.MethodPatch && len(parts) == 2 && parts[1] == "profile":
		var input updateUserProfileRequest
		if !decodeJSON(w, r, &input) {
			return
		}
		if strings.TrimSpace(input.Name) != "" {
			a.store.data.Users[index].Name = strings.TrimSpace(input.Name)
		}
		if strings.TrimSpace(input.Email) != "" {
			a.store.data.Users[index].Email = strings.TrimSpace(input.Email)
		}
		a.store.data.Users[index].Bio = input.Bio
		a.saveAndWriteUser(w, index)
	case r.Method == http.MethodPatch && len(parts) == 2 && parts[1] == "settings":
		var input updateUserSettingsRequest
		if !decodeJSON(w, r, &input) {
			return
		}
		a.store.data.Users[index].Settings = input.Settings
		a.saveAndWriteUser(w, index)
	case r.Method == http.MethodPost && len(parts) == 2 && parts[1] == "avatar":
		var input uploadAvatarRequest
		if !decodeJSON(w, r, &input) {
			return
		}
		avatarURL := strings.TrimSpace(input.DataURL)
		if avatarURL == "" || !strings.HasPrefix(avatarURL, "data:image/") {
			errorJSON(w, http.StatusBadRequest, "Avatar must be an image file")
			return
		}
		if len(avatarURL) > 3*1024*1024 {
			errorJSON(w, http.StatusBadRequest, "Avatar image is too large")
			return
		}
		a.store.data.Users[index].AvatarURL = avatarURL
		if err := a.store.save(); err != nil {
			errorJSON(w, http.StatusInternalServerError, "Unable to save avatar")
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"avatarUrl": avatarURL})
	case r.Method == http.MethodPatch && len(parts) == 2 && parts[1] == "theme":
		var input updateThemeRequest
		if !decodeJSON(w, r, &input) {
			return
		}
		a.store.data.Users[index].Settings.Theme = input.Theme
		a.saveAndWriteUser(w, index)
	case r.Method == http.MethodPost && len(parts) == 2 && parts[1] == "password":
		var input changePasswordRequest
		if !decodeJSON(w, r, &input) {
			return
		}
		if a.store.data.Users[index].PasswordHash != hashPassword(input.CurrentPassword) {
			errorJSON(w, http.StatusBadRequest, "Current password is incorrect")
			return
		}
		if len(input.NewPassword) < 8 {
			errorJSON(w, http.StatusBadRequest, "Password must be at least 8 characters")
			return
		}
		a.store.data.Users[index].PasswordHash = hashPassword(input.NewPassword)
		if err := a.store.save(); err != nil {
			errorJSON(w, http.StatusInternalServerError, "Unable to save password")
			return
		}
		w.WriteHeader(http.StatusNoContent)
	case r.Method == http.MethodDelete && len(parts) == 1:
		a.deleteUserLocked(userID)
		if err := a.store.save(); err != nil {
			errorJSON(w, http.StatusInternalServerError, "Unable to delete user")
			return
		}
		w.WriteHeader(http.StatusNoContent)
	default:
		errorJSON(w, http.StatusNotFound, "Route not found")
	}
}
