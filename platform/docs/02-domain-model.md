# Initial Domain Model

## Core Users

- `User`: account, email, role, status.
- `Profile`: display name, avatar, locale, timezone.
- `Enrollment`: user access to course/level.
- `ActivityEvent`: audit/event stream for analytics and abuse detection.

## Course Content

- `Course`: product container.
- `CourseLevel`: A1, A2, B1, B2, C1.
- `Module`: grouped lessons inside a level.
- `Lesson`: learning unit.
- `LessonBlock`: text, media, example, dictionary term, task embed.
- `Task`: interactive exercise.
- `TaskOption`: choices for objective tasks.

## Learning Progress

- `LessonProgress`: per-user lesson state.
- `TaskAttempt`: answer, correctness, points, feedback.
- `HomeworkSubmission`: long-form work requiring review.
- `HomeworkReview`: teacher/admin review and score.

## Gamification

- `Achievement`: reusable achievement definition.
- `UserAchievement`: earned achievement.
- `Certificate`: generated course/level completion certificate.
- `LeaderboardEntry`: periodized ranking snapshot.

## Dictionary

- `DictionaryTerm`: global word/phrase.
- `LessonDictionaryTerm`: relation to lesson/block.
- `UserDictionaryTerm`: saved personal word.

## AI Assistant

- `AssistantSession`: bounded chat/task context.
- `AssistantMessage`: request/response logs.
- `AssistantQuotaLedger`: token/cost accounting.

## Admin and Metrics

- `AdminNote`: internal notes on users/submissions.
- `MetricSnapshot`: daily product/sales/site rollups.
- `AbuseSignal`: generated suspicious activity marker.
