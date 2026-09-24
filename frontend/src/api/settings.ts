import { http } from "./client";
import type { SettingsRead, SettingsUpdate } from "./types";

export const settingsApi = {
  get: () => http.get<SettingsRead>("/settings"),
  update: (data: SettingsUpdate) => http.patch<SettingsRead>("/settings", data),
  setTheme: (theme: Record<string, unknown>) => http.put<SettingsRead>("/settings/theme", { theme }),
};
