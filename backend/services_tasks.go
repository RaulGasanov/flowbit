package main

import (
	"math"
	"net/http"
	"sort"
	"time"
)

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
