import { Body, Controller, Delete, Get, Inject, Param, Post, Query } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import type { ApiSessionUser } from "../auth/auth.types";
import { DictionaryService, type QuickSavePayload } from "./dictionary.service";

@Controller("dictionary")
export class DictionaryController {
  constructor(
    @Inject(DictionaryService) private readonly dictionaryService: DictionaryService
  ) {}

  @Get()
  getDictionary(
    @CurrentUser() user: ApiSessionUser,
    @Query("q") query?: string,
    @Query("mine") mine?: string
  ) {
    return this.dictionaryService.getDictionary(user, query, mine === "true");
  }

  @Post("quick-save")
  quickSave(
    @CurrentUser() user: ApiSessionUser,
    @Body() payload: QuickSavePayload
  ) {
    return this.dictionaryService.quickSave(user, payload);
  }

  @Post(":termId/save")
  saveTerm(@CurrentUser() user: ApiSessionUser, @Param("termId") termId: string) {
    return this.dictionaryService.saveTerm(user, termId);
  }

  @Delete(":termId/save")
  removeTerm(@CurrentUser() user: ApiSessionUser, @Param("termId") termId: string) {
    return this.dictionaryService.removeTerm(user, termId);
  }
}
