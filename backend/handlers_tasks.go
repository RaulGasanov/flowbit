package main

import (
	"net/http"
	"sort"
	"strings"
	"time"
)

func (a *app) tasks(w http.ResponseWriter, r *http.Request, user User) {
	a.store.mu.Lock()
	defer a.store.mu.Unlock()
	if r.Method == http.MethodGet {
		projectID := r.URL.Query().Get("projectId")
		status := r.URL.Query().Get("status")
		query := strings.ToLower(r.URL.Query().Get("q"))
		availableProjects := a.userProjectIDsLocked(user)
		tasks := make([]Task, 0, len(a.store.data.Tasks))
		for _, task := range a.store.data.Tasks {
			if !availableProjects[task.ProjectID] {
				continue
			}
			if projectID != "" && task.ProjectID != projectID {
				continue
			}
			if status != "" && task.Status != status {
				continue
			}
			if query != "" && !strings.Contains(strings.ToLower(task.Title+" "+task.Description), query) {
				continue
			}
			tasks = append(tasks, task)
		}
		writeJSON(w, http.StatusOK, tasks)
		return
	}
	if r.Method == http.MethodPost {
		var input Task
		if !decodeJSON(w, r, &input) {
			return
		}
		if !a.canAccessProjectLocked(input.ProjectID, user) {
			errorJSON(w, http.StatusNotFound, "Workspace not found")
			return
		}
		if !a.canEditProjectLocked(input.ProjectID, user.ID) {
			errorJSON(w, http.StatusForbidden, "You do not have permission to create tasks in this workspace")
			return
		}
		if input.AssigneeID != "" && !a.isProjectMemberLocked(input.ProjectID, input.AssigneeID) {
			errorJSON(w, http.StatusBadRequest, "Assignee is not a workspace member")
			return
		}
		status := input.Status
		if status == "" {
			status = "todo"
		}
		now := time.Now().UTC().Format(time.RFC3339Nano)
		task := Task{
			ID:          randomID("tsk"),
			ProjectID:   input.ProjectID,
			Title:       strings.TrimSpace(input.Title),
			Description: input.Description,
			Status:      status,
			Priority:    input.Priority,
			Deadline:    input.Deadline,
			Position:    a.nextPositionLocked(input.ProjectID, status),
			AssigneeID:  input.AssigneeID,
			CreatedAt:   now,
			UpdatedAt:   now,
		}
		if task.Title == "" {
			errorJSON(w, http.StatusBadRequest, "Task title is required")
			return
		}
		a.store.data.Tasks = append(a.store.data.Tasks, task)
		if err := a.store.save(); err != nil {
			errorJSON(w, http.StatusInternalServerError, "Unable to create task")
			return
		}
		writeJSON(w, http.StatusCreated, task)
		return
	}
	methodNotAllowed(w)
}

func (a *app) taskByID(w http.ResponseWriter, r *http.Request, user User) {
	parts := pathParts(r.URL.Path, "/api/tasks/")
	if len(parts) < 1 {
		errorJSON(w, http.StatusNotFound, "Task not found")
		return
	}
	taskID := parts[0]

	a.store.mu.Lock()
	defer a.store.mu.Unlock()
	index := a.taskIndexLocked(taskID)
	if index < 0 {
		errorJSON(w, http.StatusNotFound, "Task not found")
		return
	}
	if !a.canAccessProjectLocked(a.store.data.Tasks[index].ProjectID, user) {
		errorJSON(w, http.StatusNotFound, "Task not found")
		return
	}

	switch {
	case r.Method == http.MethodGet && len(parts) == 1:
		writeJSON(w, http.StatusOK, a.store.data.Tasks[index])
	case r.Method == http.MethodPatch && len(parts) == 1:
		if !a.canEditProjectLocked(a.store.data.Tasks[index].ProjectID, user.ID) {
			errorJSON(w, http.StatusForbidden, "You do not have permission to edit tasks in this workspace")
			return
		}
		var input updateTaskRequest
		if !decodeJSON(w, r, &input) {
			return
		}
		task := a.store.data.Tasks[index]
		if input.Title != nil {
			title := strings.TrimSpace(*input.Title)
			if title == "" {
				errorJSON(w, http.StatusBadRequest, "Task title is required")
				return
			}
			task.Title = title
		}
		if input.Description != nil {
			task.Description = strings.TrimSpace(*input.Description)
		}
		if input.Status != nil && *input.Status != "" {
			task.Status = *input.Status
		}
		if input.Priority != nil && *input.Priority != "" {
			task.Priority = *input.Priority
		}
		if input.Deadline != nil {
			task.Deadline = strings.TrimSpace(*input.Deadline)
		}
		if input.AssigneeID != nil {
			assigneeID := strings.TrimSpace(*input.AssigneeID)
			if assigneeID != "" && !a.isProjectMemberLocked(task.ProjectID, assigneeID) {
				errorJSON(w, http.StatusBadRequest, "Assignee is not a workspace member")
				return
			}
			task.AssigneeID = assigneeID
		}
		task.UpdatedAt = time.Now().UTC().Format(time.RFC3339Nano)
		a.store.data.Tasks[index] = task
		if task.AssigneeID != "" {
			a.pushNotificationLocked(task.AssigneeID, "task_updated", task)
		}
		if err := a.store.save(); err != nil {
			errorJSON(w, http.StatusInternalServerError, "Unable to update task")
			return
		}
		writeJSON(w, http.StatusOK, task)
	case r.Method == http.MethodDelete && len(parts) == 1:
		if !a.canManageProjectLocked(a.store.data.Tasks[index].ProjectID, user.ID) {
			errorJSON(w, http.StatusForbidden, "Only workspace owner can delete tasks")
			return
		}
		a.store.data.Tasks = append(a.store.data.Tasks[:index], a.store.data.Tasks[index+1:]...)
		filtered := a.store.data.Comments[:0]
		for _, comment := range a.store.data.Comments {
			if comment.TaskID != taskID {
				filtered = append(filtered, comment)
			}
		}
		a.store.data.Comments = filtered
		if err := a.store.save(); err != nil {
			errorJSON(w, http.StatusInternalServerError, "Unable to delete task")
			return
		}
		w.WriteHeader(http.StatusNoContent)
	case r.Method == http.MethodPost && len(parts) == 2 && parts[1] == "reorder":
		if !a.canEditProjectLocked(a.store.data.Tasks[index].ProjectID, user.ID) {
			errorJSON(w, http.StatusForbidden, "You do not have permission to reorder tasks in this workspace")
			return
		}
		var input reorderTaskRequest
		if !decodeJSON(w, r, &input) {
			return
		}
		tasks := a.reorderTaskLocked(taskID, input.Status, input.Index)
		if err := a.store.save(); err != nil {
			errorJSON(w, http.StatusInternalServerError, "Unable to reorder task")
			return
		}
		writeJSON(w, http.StatusOK, tasks)
	case r.Method == http.MethodGet && len(parts) == 2 && parts[1] == "comments":
		comments := make([]TaskComment, 0)
		for _, comment := range a.store.data.Comments {
			if comment.TaskID == taskID {
				comments = append(comments, comment)
			}
		}
		sort.Slice(comments, func(i, j int) bool { return comments[i].CreatedAt > comments[j].CreatedAt })
		writeJSON(w, http.StatusOK, comments)
	case r.Method == http.MethodPost && len(parts) == 2 && parts[1] == "comments":
		if !a.canEditProjectLocked(a.store.data.Tasks[index].ProjectID, user.ID) {
			errorJSON(w, http.StatusForbidden, "You do not have permission to comment in this workspace")
			return
		}
		var input createCommentRequest
		if !decodeJSON(w, r, &input) {
			return
		}
		comment := TaskComment{
			ID:        randomID("cmt"),
			TaskID:    taskID,
			AuthorID:  input.AuthorID,
			Body:      strings.TrimSpace(input.Body),
			CreatedAt: time.Now().UTC().Format(time.RFC3339Nano),
		}
		a.store.data.Comments = append(a.store.data.Comments, comment)
		task := a.store.data.Tasks[index]
		if task.AssigneeID != "" && task.AssigneeID != input.AuthorID {
			a.pushNotificationLocked(task.AssigneeID, "new_comment", task)
		}
		if err := a.store.save(); err != nil {
			errorJSON(w, http.StatusInternalServerError, "Unable to save comment")
			return
		}
		writeJSON(w, http.StatusCreated, comment)
	default:
		errorJSON(w, http.StatusNotFound, "Route not found")
	}
}
