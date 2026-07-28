import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import type { ApiSessionUser } from "../auth/auth.types";
import {
  NotesService,
  type CreateNotePayload,
  type ReorderNotesPayload,
  type UpdateNotePayload
} from "./notes.service";

@Controller("notes")
export class NotesController {
  constructor(@Inject(NotesService) private readonly notesService: NotesService) {}

  @Get()
  list(@CurrentUser() user: ApiSessionUser, @Query("q") query?: string) {
    return this.notesService.list(user, query);
  }

  @Post()
  create(@CurrentUser() user: ApiSessionUser, @Body() payload: CreateNotePayload) {
    return this.notesService.create(user, payload);
  }

  @Patch("reorder")
  reorder(@CurrentUser() user: ApiSessionUser, @Body() payload: ReorderNotesPayload) {
    return this.notesService.reorder(user, payload);
  }

  @Patch(":noteId")
  update(
    @CurrentUser() user: ApiSessionUser,
    @Param("noteId") noteId: string,
    @Body() payload: UpdateNotePayload
  ) {
    return this.notesService.update(user, noteId, payload);
  }

  @Delete(":noteId")
  remove(@CurrentUser() user: ApiSessionUser, @Param("noteId") noteId: string) {
    return this.notesService.remove(user, noteId);
  }
}
