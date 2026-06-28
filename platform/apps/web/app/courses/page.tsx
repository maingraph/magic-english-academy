import { AppShell } from "../../components/AppShell";
import { AuthGate } from "../../components/AuthGate";
import { CourseRoadmap } from "../../components/CourseRoadmap";
import { getCourseInventory } from "../../lib/courses";

export default async function CoursesPage() {
  const inventory = await getCourseInventory();

  return (
    <AppShell>
      <main className="page-main">
        <div className="container">
          <AuthGate>
            <CourseRoadmap levels={inventory.levels} />
          </AuthGate>
        </div>
      </main>
    </AppShell>
  );
}
