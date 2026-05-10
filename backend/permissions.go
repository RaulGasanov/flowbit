package main

func (a *app) userProjectIDsLocked(user User) map[string]bool {
	projectIDs := map[string]bool{}
	for _, project := range a.store.data.Projects {
		if isProjectMember(project, user.ID) {
			projectIDs[project.ID] = true
		}
	}
	return projectIDs
}

func (a *app) visibleUserIDsLocked(user User) map[string]bool {
	userIDs := map[string]bool{user.ID: true}
	for _, project := range a.store.data.Projects {
		if !isProjectMember(project, user.ID) {
			continue
		}
		for _, memberID := range project.MemberIDs {
			userIDs[memberID] = true
		}
	}
	return userIDs
}

func (a *app) canAccessProjectLocked(projectID string, user User) bool {
	for _, project := range a.store.data.Projects {
		if project.ID == projectID {
			return isProjectMember(project, user.ID)
		}
	}
	return false
}

func (a *app) isProjectMemberLocked(projectID, userID string) bool {
	for _, project := range a.store.data.Projects {
		if project.ID == projectID {
			return isProjectMember(project, userID)
		}
	}
	return false
}

func (a *app) canEditProjectLocked(projectID, userID string) bool {
	for _, project := range a.store.data.Projects {
		if project.ID == projectID {
			role := projectRole(project, userID)
			return role == "owner" || role == "editor"
		}
	}
	return false
}

func (a *app) canManageProjectLocked(projectID, userID string) bool {
	for _, project := range a.store.data.Projects {
		if project.ID == projectID {
			return projectRole(project, userID) == "owner"
		}
	}
	return false
}

func (a *app) projectByShareTokenLocked(token string) (Project, bool) {
	for _, project := range a.store.data.Projects {
		if project.ShareToken == token {
			return project, true
		}
	}
	return Project{}, false
}

func (a *app) findUserLocked(id string) (User, bool) {
	for _, user := range a.store.data.Users {
		if user.ID == id {
			return user, true
		}
	}
	return User{}, false
}

func (a *app) userIndexLocked(id string) int {
	for i, user := range a.store.data.Users {
		if user.ID == id {
			return i
		}
	}
	return -1
}

func (a *app) taskIndexLocked(id string) int {
	for i, task := range a.store.data.Tasks {
		if task.ID == id {
			return i
		}
	}
	return -1
}

func (a *app) removeProjectMemberLocked(projectIndex int, userID string) {
	project := &a.store.data.Projects[projectIndex]
	memberIDs := project.MemberIDs[:0]
	for _, memberID := range project.MemberIDs {
		if memberID != userID {
			memberIDs = append(memberIDs, memberID)
		}
	}
	project.MemberIDs = memberIDs
	if project.MemberRoles != nil {
		delete(project.MemberRoles, userID)
	}
	for i := range a.store.data.Tasks {
		if a.store.data.Tasks[i].ProjectID == project.ID && a.store.data.Tasks[i].AssigneeID == userID {
			a.store.data.Tasks[i].AssigneeID = ""
		}
	}
}

func isProjectMember(project Project, userID string) bool {
	for _, memberID := range project.MemberIDs {
		if memberID == userID {
			return true
		}
	}
	return false
}

func projectRole(project Project, userID string) string {
	if project.OwnerID == userID {
		return "owner"
	}
	if !isProjectMember(project, userID) {
		return ""
	}
	if role := project.MemberRoles[userID]; role == "owner" || role == "editor" || role == "viewer" {
		return role
	}
	return "editor"
}

func normalizeProjectRoles(project *Project, users []User) {
	if project.MemberRoles == nil {
		project.MemberRoles = StringMap{}
	}
	for _, memberID := range project.MemberIDs {
		if memberID == "" {
			continue
		}
		if memberID == project.OwnerID {
			project.MemberRoles[memberID] = "owner"
			continue
		}
		if role := project.MemberRoles[memberID]; role == "editor" || role == "viewer" {
			continue
		}
		project.MemberRoles[memberID] = defaultWorkspaceRole(memberID, users)
	}
}

func defaultWorkspaceRole(userID string, users []User) string {
	for _, user := range users {
		if user.ID != userID {
			continue
		}
		if user.Role == "viewer" {
			return "viewer"
		}
		return "editor"
	}
	return "editor"
}
