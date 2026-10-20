import {createContext, useContext, useEffect, useState, type ReactNode} from "react";
import {DEFAULT_SETTINGS, normalizeSettings, readSettings, saveSettings, type AppSettings} from "./settings";

type SettingsState = {
  settings: AppSettings;
  update: (patch: Partial<AppSettings>) => void;
  reset: () => void;
};
const SettingsContext = createContext<SettingsState | null>(null);
export function SettingsProvider({children}: {children: ReactNode}) {
  const [settings, setSettings] = useState<AppSettings>(readSettings);
  useEffect(() => saveSettings(settings), [settings]);
  const update = (patch: Partial<AppSettings>) => setSettings(previous => normalizeSettings({...previous, ...patch}));
  const reset = () => setSettings({...DEFAULT_SETTINGS});
  return <SettingsContext.Provider value={{settings, update, reset}}>{children}</SettingsContext.Provider>;
}
export function useSettings(): SettingsState {
  const state = useContext(SettingsContext);
  if (!state) throw Error("useSettings must be used inside SettingsProvider");
  return state;
}
