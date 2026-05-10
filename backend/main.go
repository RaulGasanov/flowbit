package main

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"database/sql/driver"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"math"
	"net/http"
	"os"
	"sort"
	"strings"
	"sync"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type UserSettings struct {
	Theme         string `json:"theme"`
	AccentColor   string `json:"accentColor"`
	Notifications struct {
		Comments          bool `json:"comments"`
		TaskUpdates       bool `json:"taskUpdates"`
		DeadlineReminders bool `json:"deadlineReminders"`
		EmailChannel      bool `json:"emailChannel"`
		InAppChannel      bool `json:"inAppChannel"`
	} `json:"notifications"`
}

func (s UserSettings) Value() (driver.Value, error) {
	return json.Marshal(s)
}

func (s *UserSettings) Scan(value any) error {
	bytes, ok := value.([]byte)
	if !ok {
		text, ok := value.(string)
		if !ok {
			return fmt.Errorf("scan user settings: unsupported value %T", value)
		}
		bytes = []byte(text)
	}
	return json.Unmarshal(bytes, s)
}

type StringSlice []string

func (s StringSlice) Value() (driver.Value, error) {
	if s == nil {
		return "[]", nil
	}
	return json.Marshal(s)
}

func (s *StringSlice) Scan(value any) error {
	bytes, ok := value.([]byte)
	if !ok {
		text, ok := value.(string)
		if !ok {
			return fmt.Errorf("scan string slice: unsupported value %T", value)
		}
		bytes = []byte(text)
	}
	return json.Unmarshal(bytes, s)
}

type StringMap map[string]string

func (m StringMap) Value() (driver.Value, error) {
	if m == nil {
		return "{}", nil
	}
	return json.Marshal(m)
}

func (m *StringMap) Scan(value any) error {
	bytes, ok := value.([]byte)
	if !ok {
		text, ok := value.(string)
		if !ok {
			return fmt.Errorf("scan string map: unsupported value %T", value)
		}
		bytes = []byte(text)
	}
	return json.Unmarshal(bytes, m)
}

type User struct {
	ID           string       `json:"id" gorm:"primaryKey;type:text"`
	Name         string       `json:"name" gorm:"not null"`
	Email        string       `json:"email" gorm:"not null"`
	AvatarURL    string       `json:"avatarUrl,omitempty" gorm:"not null;default:''"`
	Role         string       `json:"role" gorm:"not null"`
	Bio          string       `json:"bio" gorm:"not null;default:''"`
	Workspace    string       `json:"workspace" gorm:"not null"`
	Settings     UserSettings `json:"settings" gorm:"type:jsonb;not null"`
	PasswordHash string       `json:"passwordHash,omitempty" gorm:"not null"`
}

type Project struct {
	ID          string      `json:"id" gorm:"primaryKey;type:text"`
	Name        string      `json:"name" gorm:"not null"`
	Description string      `json:"description" gorm:"not null"`
	Color       string      `json:"color" gorm:"not null"`
	Visibility  string      `json:"visibility" gorm:"not null"`
	MemberIDs   StringSlice `json:"memberIds" gorm:"column:member_ids;type:jsonb;not null"`
	MemberRoles StringMap   `json:"memberRoles" gorm:"column:member_roles;type:jsonb;not null;default:'{}'"`
	OwnerID     string      `json:"ownerId,omitempty" gorm:"column:owner_id;type:text;not null;default:''"`
	ShareToken  string      `json:"shareToken,omitempty" gorm:"column:share_token;type:text;not null;default:''"`
	CreatedAt   string      `json:"createdAt" gorm:"not null"`
}

type Task struct {
	ID          string `json:"id" gorm:"primaryKey;type:text"`
	ProjectID   string `json:"projectId" gorm:"not null"`
	Title       string `json:"title" gorm:"not null"`
	Description string `json:"description" gorm:"not null"`
	Status      string `json:"status" gorm:"not null"`
	Priority    string `json:"priority" gorm:"not null"`
	Deadline    string `json:"deadline,omitempty" gorm:"not null;default:''"`
	Position    int    `json:"position" gorm:"not null"`
	AssigneeID  string `json:"assigneeId,omitempty" gorm:"not null;default:''"`
	CreatedAt   string `json:"createdAt" gorm:"not null"`
	UpdatedAt   string `json:"updatedAt" gorm:"not null"`
}

type TaskComment struct {
	ID        string `json:"id" gorm:"primaryKey;type:text"`
	TaskID    string `json:"taskId" gorm:"not null"`
	AuthorID  string `json:"authorId" gorm:"not null"`
	Body      string `json:"body" gorm:"not null"`
	CreatedAt string `json:"createdAt" gorm:"not null"`
}

type Notification struct {
	ID        string `json:"id" gorm:"primaryKey;type:text"`
	UserID    string `json:"userId" gorm:"not null"`
	Type      string `json:"type" gorm:"not null"`
	Title     string `json:"title" gorm:"not null"`
	Message   string `json:"message" gorm:"not null"`
	CreatedAt string `json:"createdAt" gorm:"not null"`
	ReadAt    string `json:"readAt,omitempty" gorm:"not null;default:''"`
}

type storeData struct {
	Users         []User         `json:"users"`
	Projects      []Project      `json:"projects"`
	Tasks         []Task         `json:"tasks"`
	Comments      []TaskComment  `json:"comments"`
	Notifications []Notification `json:"notifications"`
}

type appStore struct {
	mu       sync.Mutex
	db       *gorm.DB
	data     storeData
	sessions map[string]string
}

type app struct {
	store *appStore
}

func main() {
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		log.Fatal("DATABASE_URL is required, for example: postgres://localhost:5432/flowbit?sslmode=disable")
	}

	store, err := newStore(databaseURL)
	if err != nil {
		log.Fatal(err)
	}
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	server := &http.Server{
		Addr:              ":" + port,
		Handler:           cors((&app{store: store}).routes()),
		ReadHeaderTimeout: 5 * time.Second,
	}

	log.Printf("Flowbit API listening on http://localhost:%s", port)
	log.Fatal(server.ListenAndServe())
}

func newStore(databaseURL string) (*appStore, error) {
	db, err := gorm.Open(postgres.Open(databaseURL), &gorm.Config{})
	if err != nil {
		return nil, err
	}
	sqlDB, err := db.DB()
	if err != nil {
		return nil, err
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := sqlDB.PingContext(ctx); err != nil {
		return nil, fmt.Errorf("connect postgres: %w", err)
	}

	store := &appStore{db: db, sessions: map[string]string{}}
	if err := store.migrate(); err != nil {
		return nil, err
	}
	if err := store.load(); err != nil {
		return nil, err
	}
	return store, nil
}

func (s *appStore) migrate() error {
	for _, model := range []any{&User{}, &Project{}, &Task{}, &TaskComment{}, &Notification{}} {
		if !s.db.Migrator().HasTable(model) {
			if err := s.db.Migrator().CreateTable(model); err != nil {
				return err
			}
		}
	}
	if s.db.Migrator().HasTable(&Project{}) && !s.db.Migrator().HasColumn(&Project{}, "ShareToken") {
		if err := s.db.Migrator().AddColumn(&Project{}, "ShareToken"); err != nil {
			return err
		}
	}
	if s.db.Migrator().HasTable(&Project{}) && !s.db.Migrator().HasColumn(&Project{}, "OwnerID") {
		if err := s.db.Migrator().AddColumn(&Project{}, "OwnerID"); err != nil {
			return err
		}
	}
	if s.db.Migrator().HasTable(&Project{}) && !s.db.Migrator().HasColumn(&Project{}, "MemberRoles") {
		if err := s.db.Migrator().AddColumn(&Project{}, "MemberRoles"); err != nil {
			return err
		}
	}
	return nil
}

func (s *appStore) load() error {
	users, err := s.loadUsers()
	if err != nil {
		return err
	}
	projects, err := s.loadProjects()
	if err != nil {
		return err
	}
	for i := range projects {
		if projects[i].OwnerID == "" && len(projects[i].MemberIDs) > 0 {
			projects[i].OwnerID = projects[i].MemberIDs[0]
		}
		normalizeProjectRoles(&projects[i], users)
	}
	tasks, err := s.loadTasks()
	if err != nil {
		return err
	}
	comments, err := s.loadComments()
	if err != nil {
		return err
	}
	notifications, err := s.loadNotifications()
	if err != nil {
		return err
	}
	s.data = storeData{
		Users:         users,
		Projects:      projects,
		Tasks:         tasks,
		Comments:      comments,
		Notifications: notifications,
	}
	return nil
}

func (s *appStore) save() error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		deleteSession := tx.Session(&gorm.Session{AllowGlobalUpdate: true})
		for _, model := range []any{&Notification{}, &TaskComment{}, &Task{}, &Project{}, &User{}} {
			if err := deleteSession.Delete(model).Error; err != nil {
				return err
			}
		}
		if len(s.data.Users) > 0 {
			if err := tx.Create(&s.data.Users).Error; err != nil {
				return err
			}
		}
		if len(s.data.Projects) > 0 {
			if err := tx.Create(&s.data.Projects).Error; err != nil {
				return err
			}
		}
		if len(s.data.Tasks) > 0 {
			if err := tx.Create(&s.data.Tasks).Error; err != nil {
				return err
			}
		}
		if len(s.data.Comments) > 0 {
			if err := tx.Create(&s.data.Comments).Error; err != nil {
				return err
			}
		}
		if len(s.data.Notifications) > 0 {
			if err := tx.Create(&s.data.Notifications).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func (s *appStore) loadUsers() ([]User, error) {
	users := make([]User, 0)
	if err := s.db.Order("id").Find(&users).Error; err != nil {
		return nil, err
	}
	return users, nil
}

func (s *appStore) loadProjects() ([]Project, error) {
	projects := make([]Project, 0)
	if err := s.db.Order("created_at").Find(&projects).Error; err != nil {
		return nil, err
	}
	return projects, nil
}

func (s *appStore) loadTasks() ([]Task, error) {
	tasks := make([]Task, 0)
	if err := s.db.Order("created_at").Find(&tasks).Error; err != nil {
		return nil, err
	}
	return tasks, nil
}

func (s *appStore) loadComments() ([]TaskComment, error) {
	comments := make([]TaskComment, 0)
	if err := s.db.Order("created_at").Find(&comments).Error; err != nil {
		return nil, err
	}
	return comments, nil
}

func (s *appStore) loadNotifications() ([]Notification, error) {
	notifications := make([]Notification, 0)
	if err := s.db.Order("created_at desc").Find(&notifications).Error; err != nil {
		return nil, err
	}
	return notifications, nil
}

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

func cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "http://localhost:3000")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (a *app) requireAuth(next func(http.ResponseWriter, *http.Request, User)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		token := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
		a.store.mu.Lock()
		userID := a.store.sessions[token]
		user, ok := a.findUserLocked(userID)
		a.store.mu.Unlock()
		if token == "" || !ok {
			errorJSON(w, http.StatusUnauthorized, "Unauthorized")
			return
		}
		next(w, r, user)
	}
}

func (a *app) login(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		methodNotAllowed(w)
		return
	}
	var input struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
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
	var input struct {
		Name     string `json:"name"`
		Email    string `json:"email"`
		Password string `json:"password"`
		Role     string `json:"role"`
	}
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
	var input struct {
		ProjectID string `json:"projectId"`
		Email     string `json:"email"`
		Role      string `json:"role"`
	}
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
		var input struct {
			Name  string `json:"name"`
			Email string `json:"email"`
			Bio   string `json:"bio"`
		}
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
		var input struct {
			Settings UserSettings `json:"settings"`
		}
		if !decodeJSON(w, r, &input) {
			return
		}
		a.store.data.Users[index].Settings = input.Settings
		a.saveAndWriteUser(w, index)
	case r.Method == http.MethodPost && len(parts) == 2 && parts[1] == "avatar":
		var input struct {
			FileName string `json:"fileName"`
			DataURL  string `json:"dataUrl"`
		}
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
		var input struct {
			Theme string `json:"theme"`
		}
		if !decodeJSON(w, r, &input) {
			return
		}
		a.store.data.Users[index].Settings.Theme = input.Theme
		a.saveAndWriteUser(w, index)
	case r.Method == http.MethodPost && len(parts) == 2 && parts[1] == "password":
		var input struct {
			CurrentPassword string `json:"currentPassword"`
			NewPassword     string `json:"newPassword"`
		}
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

	var input struct {
		Name        string   `json:"name"`
		Description string   `json:"description"`
		Color       string   `json:"color"`
		Visibility  string   `json:"visibility"`
		MemberIDs   []string `json:"memberIds"`
	}
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
		var input struct {
			Visibility string `json:"visibility"`
		}
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
		var input struct {
			Title       *string `json:"title"`
			Description *string `json:"description"`
			Status      *string `json:"status"`
			Priority    *string `json:"priority"`
			Deadline    *string `json:"deadline"`
			AssigneeID  *string `json:"assigneeId"`
		}
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
		var input struct {
			Status string `json:"status"`
			Index  int    `json:"index"`
		}
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
		var input struct {
			AuthorID string `json:"authorId"`
			Body     string `json:"body"`
		}
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
	var input struct {
		UserID string `json:"userId"`
	}
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

func (a *app) saveAndWriteUser(w http.ResponseWriter, index int) {
	if err := a.store.save(); err != nil {
		errorJSON(w, http.StatusInternalServerError, "Unable to save user")
		return
	}
	writeJSON(w, http.StatusOK, a.store.data.Users[index])
}

func (a *app) reorderTaskLocked(taskID, status string, targetIndex int) []Task {
	sourceIndex := a.taskIndexLocked(taskID)
	if sourceIndex < 0 {
		return nil
	}
	source := a.store.data.Tasks[sourceIndex]
	source.Status = status
	source.UpdatedAt = time.Now().UTC().Format(time.RFC3339Nano)

	projectTasks := make([]Task, 0)
	others := make([]Task, 0)
	for _, task := range a.store.data.Tasks {
		if task.ProjectID == source.ProjectID {
			if task.ID != taskID {
				projectTasks = append(projectTasks, task)
			}
		} else {
			others = append(others, task)
		}
	}

	target := make([]Task, 0)
	rest := make([]Task, 0)
	for _, task := range projectTasks {
		if task.Status == status {
			target = append(target, task)
		} else {
			rest = append(rest, task)
		}
	}
	sort.Slice(target, func(i, j int) bool { return target[i].Position < target[j].Position })
	targetIndex = int(math.Max(0, math.Min(float64(targetIndex), float64(len(target)))))
	target = append(target, Task{})
	copy(target[targetIndex+1:], target[targetIndex:])
	target[targetIndex] = source

	rebuilt := append(rest, target...)
	normalizePositions(rebuilt)
	a.store.data.Tasks = append(others, rebuilt...)
	return rebuilt
}

func normalizePositions(tasks []Task) {
	for _, status := range []string{"todo", "in_progress", "done"} {
		column := make([]int, 0)
		for i, task := range tasks {
			if task.Status == status {
				column = append(column, i)
			}
		}
		sort.Slice(column, func(i, j int) bool { return tasks[column[i]].Position < tasks[column[j]].Position })
		for position, taskIndex := range column {
			tasks[taskIndex].Position = position
		}
	}
}

func (a *app) nextPositionLocked(projectID, status string) int {
	maxPosition := -1
	for _, task := range a.store.data.Tasks {
		if task.ProjectID == projectID && task.Status == status && task.Position > maxPosition {
			maxPosition = task.Position
		}
	}
	return maxPosition + 1
}

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

func (a *app) deleteUserLocked(userID string) {
	users := a.store.data.Users[:0]
	for _, user := range a.store.data.Users {
		if user.ID != userID {
			users = append(users, user)
		}
	}
	a.store.data.Users = users
	for i := range a.store.data.Tasks {
		if a.store.data.Tasks[i].AssigneeID == userID {
			a.store.data.Tasks[i].AssigneeID = ""
		}
	}
	for i := range a.store.data.Projects {
		if a.store.data.Projects[i].OwnerID == userID {
			continue
		}
		a.removeProjectMemberLocked(i, userID)
	}
	comments := a.store.data.Comments[:0]
	for _, comment := range a.store.data.Comments {
		if comment.AuthorID != userID {
			comments = append(comments, comment)
		}
	}
	a.store.data.Comments = comments
}

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
