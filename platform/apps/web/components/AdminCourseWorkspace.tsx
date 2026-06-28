"use client";

import { useState } from "react";
import { AdminCoursePanel } from "./AdminCoursePanel";
import { AdminLessonEditor } from "./AdminLessonEditor";

export function AdminCourseWorkspace() {
  const [selectedSlug, setSelectedSlug] = useState<string | null>("a1-001");
  const [refreshToken, setRefreshToken] = useState(0);

  return (
    <>
      <AdminLessonEditor selectedSlug={selectedSlug} />
      <AdminCoursePanel
        onChanged={() => setRefreshToken((value) => value + 1)}
        onSelectLesson={setSelectedSlug}
        refreshToken={refreshToken}
        selectedSlug={selectedSlug}
      />
    </>
  );
}
