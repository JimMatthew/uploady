import { ReactNode } from "react";

export interface WorkspaceTab {
  id: number;
  label: string;
  content: ReactNode;
}