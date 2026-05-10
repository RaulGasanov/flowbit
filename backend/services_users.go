package main

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
