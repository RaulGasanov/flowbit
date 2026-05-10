package main

import (
	"context"
	"fmt"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

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
