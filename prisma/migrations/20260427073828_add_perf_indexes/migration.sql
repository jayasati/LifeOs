-- CreateIndex
CREATE INDEX "PomodoroSession_userId_type_startedAt_idx" ON "PomodoroSession"("userId", "type", "startedAt");

-- CreateIndex
CREATE INDEX "Task_userId_status_dueDate_idx" ON "Task"("userId", "status", "dueDate");

-- CreateIndex
CREATE INDEX "Task_userId_completedAt_idx" ON "Task"("userId", "completedAt");
