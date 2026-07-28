const apiBaseUrl = process.env.SMOKE_API_URL ?? "http://localhost:4000/api";
const email = `ci-smoke-${Date.now()}@magic.local`;
let cookie = "";

async function request(path, options = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...(cookie ? { cookie } : {}),
      ...options.headers
    }
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  return { response, body };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const health = await request("/health");
assert(health.response.ok && health.body.ok, "Health check failed");

const adminLogin = await request("/auth/login", {
  method: "POST",
  body: JSON.stringify({
    email: "admin@magic.local",
    password: "MagicAdmin123!"
  })
});
assert(adminLogin.response.status === 201, "Admin login failed");
cookie = adminLogin.response.headers.get("set-cookie")?.split(";")[0] ?? "";
assert(cookie.startsWith("magic_session="), "Admin session cookie missing");

const account = await request("/admin/users", {
  method: "POST",
  body: JSON.stringify({
    email,
    displayName: "CI Smoke Student"
  })
});
assert(account.response.status === 201, "Admin account creation failed");
assert(
  typeof account.body.temporaryPassword === "string",
  "Temporary password missing"
);

cookie = "";
const studentLogin = await request("/auth/login", {
  method: "POST",
  body: JSON.stringify({
    email,
    password: account.body.temporaryPassword
  })
});
assert(studentLogin.response.status === 201, "Student login failed");
cookie = studentLogin.response.headers.get("set-cookie")?.split(";")[0] ?? "";
assert(cookie.startsWith("magic_session="), "Student session cookie missing");

const session = await request("/auth/session");
assert(session.body.user?.email === email, "Session user mismatch");

const forbidden = await request("/admin/overview");
assert(forbidden.response.status === 403, "Student accessed admin endpoint");

const lesson = await request("/courses/lessons/a1-001");
assert(lesson.response.ok && lesson.body.blocks.length > 0, "Lesson unavailable");

const answer = await request("/learning/lessons/a1-001/answer", {
  method: "POST",
  body: JSON.stringify({ blockOrder: 3, answer: "is" })
});
assert(answer.response.ok && answer.body.correct === true, "Task scoring failed");

const dictionary = await request("/dictionary/quick-save", {
  method: "POST",
  body: JSON.stringify({
    term: "smoke test",
    translation: "проверка",
    lessonSlug: "a1-001"
  })
});
assert(dictionary.response.ok && dictionary.body.saved, "Dictionary save failed");

const complete = await request("/progress/lessons/a1-001/complete", {
  method: "POST"
});
assert(complete.body.status === "COMPLETED", "Lesson completion failed");

const achievements = await request("/gamification/achievements");
assert(
  achievements.body.achievements.some(
    (achievement) => achievement.code === "FIRST_LESSON" && achievement.earned
  ),
  "First lesson achievement missing"
);

console.log("API smoke passed.");
