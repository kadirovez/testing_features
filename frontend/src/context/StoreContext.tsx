import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from "react";
import { initialRootState, rootReducer, type RootAction, type RootState } from "../store";

interface StoreValue {
  state: RootState;
  dispatch: Dispatch<RootAction>;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(rootReducer, initialRootState);
  return <StoreContext.Provider value={{ state, dispatch }}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const value = useContext(StoreContext);
  if (!value) throw new Error("useStore must be used inside StoreProvider");
  return value;
}
