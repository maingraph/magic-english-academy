"use client";

import { useState } from "react";
import { AdminCoursePanel } from "./AdminCoursePanel";
import { AdminLessonEditor } from "./AdminLessonEditor";

export function AdminCourseWorkspace() {
  const [selectedSlug, setSelectedSlug] = useState<string | null>("a1-001");

  return (
    <>
      <AdminLessonEditor selectedSlug={selectedSlug} />
      <AdminCoursePanel onSelectLesson={setSelectedSlug} selectedSlug={selectedSlug} />
    </>
  );
}
