package main

import "net/http"

func (a *app) routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/auth/login", a.login)
	mux.HandleFunc("/api/auth/register", a.register)
	mux.HandleFunc("/api/shared/workspaces/", a.sharedWorkspace)
	mux.HandleFunc("/api/users/me", a.requireAuth(a.me))
	mux.HandleFunc("/api/users/role", a.requireAuth(a.updateUserRoleByEmail))
	mux.HandleFunc("/api/users/", a.requireAuth(a.userByID))
	mux.HandleFunc("/api/users", a.requireAuth(a.users))
	mux.HandleFunc("/api/projects/", a.requireAuth(a.projectByID))
	mux.HandleFunc("/api/projects", a.requireAuth(a.projects))
	mux.HandleFunc("/api/workspaces/", a.requireAuth(a.projectByID))
	mux.HandleFunc("/api/workspaces", a.requireAuth(a.projects))
	mux.HandleFunc("/api/tasks/", a.requireAuth(a.taskByID))
	mux.HandleFunc("/api/tasks", a.requireAuth(a.tasks))
	mux.HandleFunc("/api/notifications/read-all", a.requireAuth(a.markAllNotificationsRead))
	mux.HandleFunc("/api/notifications/", a.requireAuth(a.notificationByID))
	mux.HandleFunc("/api/notifications", a.requireAuth(a.notifications))
	return mux
}
