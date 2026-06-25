import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";

export function DesignProvider({ children }: { children: ReactNode }) {
  return <MemoryRouter>{children}</MemoryRouter>;
}
