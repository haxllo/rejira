import * as React from "react";

export function getStrictContext<T>(name: string) {
  const Context = React.createContext<T | null>(null);

  function Provider({
    children,
    value,
  }: React.PropsWithChildren<{ value: T }>) {
    return <Context.Provider value={value}>{children}</Context.Provider>;
  }

  function useContext() {
    const ctx = React.useContext(Context);
    if (ctx === null) {
      throw new Error(
        `useContext for "${name}" must be used within a Provider.`,
      );
    }
    return ctx;
  }

  return [Provider, useContext] as const;
}
