package main

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"sync"

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
