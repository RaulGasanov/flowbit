package main

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type registerRequest struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
	Role     string `json:"role"`
}

type createProjectRequest struct {
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Color       string   `json:"color"`
	Visibility  string   `json:"visibility"`
	MemberIDs   []string `json:"memberIds"`
}

type updateProjectRequest struct {
	Visibility string `json:"visibility"`
}

type updateWorkspaceMemberRoleRequest struct {
	ProjectID string `json:"projectId"`
	Email     string `json:"email"`
	Role      string `json:"role"`
}

type updateUserProfileRequest struct {
	Name  string `json:"name"`
	Email string `json:"email"`
	Bio   string `json:"bio"`
}

type updateUserSettingsRequest struct {
	Settings UserSettings `json:"settings"`
}

type uploadAvatarRequest struct {
	FileName string `json:"fileName"`
	DataURL  string `json:"dataUrl"`
}

type updateThemeRequest struct {
	Theme string `json:"theme"`
}

type changePasswordRequest struct {
	CurrentPassword string `json:"currentPassword"`
	NewPassword     string `json:"newPassword"`
}

type updateTaskRequest struct {
	Title       *string `json:"title"`
	Description *string `json:"description"`
	Status      *string `json:"status"`
	Priority    *string `json:"priority"`
	Deadline    *string `json:"deadline"`
	AssigneeID  *string `json:"assigneeId"`
}

type reorderTaskRequest struct {
	Status string `json:"status"`
	Index  int    `json:"index"`
}

type createCommentRequest struct {
	AuthorID string `json:"authorId"`
	Body     string `json:"body"`
}

type markAllNotificationsReadRequest struct {
	UserID string `json:"userId"`
}
