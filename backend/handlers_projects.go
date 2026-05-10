package main

import (
	"net/http"
	"strings"
	"time"
)

func (a *app) projects(w http.ResponseWriter, r *http.Request, user User) {
	if r.Method != http.MethodGet && r.Method != http.MethodPost {
		methodNotAllowed(w)
		return
	}
	a.store.mu.Lock()
	defer a.store.mu.Unlock()
	if r.Method == http.MethodGet {
		projects := make([]Project, 0)
		for _, project := range a.store.data.Projects {
			if isProjectMember(project, user.ID) {
				projects = append(projects, project)
			}
		}
		writeJSON(w, http.StatusOK, projects)
		return
	}

	var input createProjectRequest
	if !decodeJSON(w, r, &input) {
		return
	}

	input.Name = strings.TrimSpace(input.Name)
	input.Description = strings.TrimSpace(input.Description)
	if input.Name == "" {
		errorJSON(w, http.StatusBadRequest, "Workspace name is required")
		return
	}
	if input.Description == "" {
		input.Description = "Workspace for planning and tracking tasks."
	}
	if input.Color == "" {
		input.Color = "#2563eb"
	}
	if input.Visibility == "" {
		input.Visibility = "team"
	}
	if input.Visibility != "private" && input.Visibility != "team" && input.Visibility != "public" {
		errorJSON(w, http.StatusBadRequest, "Invalid visibility")
		return
	}
	memberIDs := ensureMember(input.MemberIDs, user.ID)
	project := Project{
		ID:          randomID("prj"),
		Name:        input.Name,
		Description: input.Description,
		Color:       input.Color,
		Visibility:  input.Visibility,
		MemberIDs:   StringSlice(memberIDs),
		MemberRoles: StringMap{user.ID: "owner"},
		OwnerID:     user.ID,
		CreatedAt:   time.Now().Format(time.RFC3339Nano),
	}
	a.store.data.Projects = append(a.store.data.Projects, project)
	if err := a.store.save(); err != nil {
		errorJSON(w, http.StatusInternalServerError, "Unable to save workspace")
		return
	}
	writeJSON(w, http.StatusCreated, project)
}

func (a *app) projectByID(w http.ResponseWriter, r *http.Request, user User) {
	prefix := "/api/projects/"
	if strings.HasPrefix(r.URL.Path, "/api/workspaces/") {
		prefix = "/api/workspaces/"
	}
	parts := pathParts(r.URL.Path, prefix)
	if len(parts) == 0 {
		a.projects(w, r, user)
		return
	}
	id := parts[0]
	a.store.mu.Lock()
	defer a.store.mu.Unlock()
	index := -1
	for i, project := range a.store.data.Projects {
		if project.ID == id {
			index = i
			break
		}
	}
	if index < 0 {
		errorJSON(w, http.StatusNotFound, "Project not found")
		return
	}
	if !isProjectMember(a.store.data.Projects[index], user.ID) {
		errorJSON(w, http.StatusNotFound, "Project not found")
		return
	}
	if r.Method == http.MethodGet {
		writeJSON(w, http.StatusOK, a.store.data.Projects[index])
		return
	}
	if r.Method == http.MethodPost && len(parts) == 2 && parts[1] == "share" {
		if projectRole(a.store.data.Projects[index], user.ID) != "owner" {
			errorJSON(w, http.StatusForbidden, "Only workspace owner can share this workspace")
			return
		}
		if a.store.data.Projects[index].ShareToken == "" {
			a.store.data.Projects[index].ShareToken = randomID("shr")
			if err := a.store.save(); err != nil {
				errorJSON(w, http.StatusInternalServerError, "Unable to create share link")
				return
			}
		}
		writeJSON(w, http.StatusOK, map[string]string{"token": a.store.data.Projects[index].ShareToken})
		return
	}
	if r.Method == http.MethodDelete && len(parts) == 3 && parts[1] == "members" {
		if projectRole(a.store.data.Projects[index], user.ID) != "owner" {
			errorJSON(w, http.StatusForbidden, "Only workspace owner can remove members")
			return
		}
		memberID := parts[2]
		if memberID == "" || memberID == a.store.data.Projects[index].OwnerID {
			errorJSON(w, http.StatusBadRequest, "Workspace owner cannot be removed")
			return
		}
		a.removeProjectMemberLocked(index, memberID)
		if err := a.store.save(); err != nil {
			errorJSON(w, http.StatusInternalServerError, "Unable to remove workspace member")
			return
		}
		w.WriteHeader(http.StatusNoContent)
		return
	}
	if r.Method == http.MethodPatch && len(parts) == 1 {
		if projectRole(a.store.data.Projects[index], user.ID) != "owner" {
			errorJSON(w, http.StatusForbidden, "Only workspace owner can update workspace settings")
			return
		}
		var input updateProjectRequest
		if !decodeJSON(w, r, &input) {
			return
		}
		a.store.data.Projects[index].Visibility = input.Visibility
		if err := a.store.save(); err != nil {
			errorJSON(w, http.StatusInternalServerError, "Unable to save project")
			return
		}
		writeJSON(w, http.StatusOK, a.store.data.Projects[index])
		return
	}
	methodNotAllowed(w)
}
