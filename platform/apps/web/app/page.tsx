import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const cookieHeader = (await cookies()).toString();
  const apiBaseUrl =
    process.env.API_INTERNAL_URL ??
    (process.env.NEXT_PUBLIC_API_URL?.startsWith("http")
      ? process.env.NEXT_PUBLIC_API_URL
      : "http://localhost:4000/api");

  let authenticated = false;
  try {
    const response = await fetch(`${apiBaseUrl.replace(/\/$/, "")}/auth/session`, {
      cache: "no-store",
      headers: cookieHeader ? { cookie: cookieHeader } : undefined
    });
    if (response.ok) {
      const session = (await response.json()) as { user?: unknown };
      authenticated = Boolean(session.user);
    }
  } catch {
    // Login remains available when API is temporarily unreachable.
  }

  if (authenticated) redirect("/dashboard");
  redirect("/login");
}
