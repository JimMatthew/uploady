export type ActionMode = "capture" | "terminal";

export interface Action {
  _id: string;
  name: string;
  description: string;
  serverId: string;
  command: string;
  mode: ActionMode;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateActionData {
  name: string;
  description?: string;
  serverId: string;
  command: string;
  mode?: ActionMode;
}

export type UpdateActionData = Partial<
  Omit<Action, "_id" | "createdAt" | "updatedAt">
>;

export abstract class ActionStore {
  abstract getAll(): Promise<Action[]>;

  abstract getById(id: string): Promise<Action | null>;

  abstract create(action: CreateActionData): Promise<Action>;

  abstract update(
    id: string,
    updates: UpdateActionData,
  ): Promise<Action | null>;

  abstract delete(id: string): Promise<Action | null>;
}