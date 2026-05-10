package main

import "testing"

func TestProjectRoleResolvesOwnerAndMemberRoles(t *testing.T) {
	project := Project{
		OwnerID:     "usr_owner",
		MemberIDs:   StringSlice{"usr_owner", "usr_editor", "usr_viewer"},
		MemberRoles: StringMap{"usr_owner": "owner", "usr_editor": "editor", "usr_viewer": "viewer"},
	}

	tests := []struct {
		name   string
		userID string
		want   string
	}{
		{name: "owner", userID: "usr_owner", want: "owner"},
		{name: "editor", userID: "usr_editor", want: "editor"},
		{name: "viewer", userID: "usr_viewer", want: "viewer"},
		{name: "non member", userID: "usr_other", want: ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := projectRole(project, tt.userID); got != tt.want {
				t.Fatalf("projectRole() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestEnsureMemberKeepsUniqueMembersAndAddsCurrentUser(t *testing.T) {
	got := ensureMember([]string{" usr_1 ", "usr_2", "usr_1", ""}, "usr_3")
	want := []string{"usr_1", "usr_2", "usr_3"}

	if len(got) != len(want) {
		t.Fatalf("ensureMember() length = %d, want %d: %#v", len(got), len(want), got)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("ensureMember()[%d] = %q, want %q", i, got[i], want[i])
		}
	}
}
