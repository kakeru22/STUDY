import { seedState } from "../../data/seed";
import type { PersistedState } from "../../types/app";
import { getValue, setValue } from "./indexedDbClient";

const STATE_KEY = "app-state";

export async function loadPersistedState(): Promise<PersistedState> {
  const stored = await getValue<PersistedState>(STATE_KEY);
  if (!stored) {
    return seedState;
  }

  return {
    ...seedState,
    ...stored,
    settings: {
      ...seedState.settings,
      ...stored.settings
    },
    sync: {
      ...seedState.sync,
      ...stored.sync
    }
  };
}

export async function savePersistedState(state: PersistedState): Promise<void> {
  await setValue(STATE_KEY, state);
}
