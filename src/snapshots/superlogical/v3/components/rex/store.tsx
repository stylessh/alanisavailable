"use client";

import { createContext, useContext, useReducer } from "react";
import { type Action, initialState, reducer, type State } from "./model";

// One Rex, many clients: the Mac window and the iPhone app read and drive
// the same tabs, panes and terminals, as they would over Rex's server.

type Store = { state: State; dispatch: (a: Action) => void };
const RexContext = createContext<Store | null>(null);

export function RexProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  return <RexContext.Provider value={{ state, dispatch }}>{children}</RexContext.Provider>;
}

export const useRex = () => {
  const store = useContext(RexContext);
  if (!store) throw new Error("useRex needs a RexProvider");
  return store;
};
