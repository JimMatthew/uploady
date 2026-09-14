import {
  ActionStore,
  Action,
  CreateActionData,
  UpdateActionData,
} from "../actionStore";

import ActionModel from "../../../models/Action";

const toAction = (action: any): Action => ({
  _id: String(action._id),
  name: action.name,
  description: action.description ?? "",
  serverId: String(action.serverId),
  command: action.command,
  mode: action.mode,
  createdAt: action.createdAt,
  updatedAt: action.updatedAt,
});

export class MongoActionStore extends ActionStore {
  async getAll(): Promise<Action[]> {
    const actions = await ActionModel.find().lean();

    return actions.map(toAction);
  }

  async getById(id: string): Promise<Action | null> {
    const action = await ActionModel.findById(id).lean();

    return action ? toAction(action) : null;
  }

  async create(action: CreateActionData): Promise<Action> {
    const created = await ActionModel.create(action);

    return toAction(created.toObject());
  }

  async update(id: string, updates: UpdateActionData): Promise<Action | null> {
    const action = await ActionModel.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    }).lean();

    return action ? toAction(action) : null;
  }

  async delete(id: string): Promise<Action | null> {
    const action = await ActionModel.findByIdAndDelete(id).lean();

    return action ? toAction(action) : null;
  }
}
