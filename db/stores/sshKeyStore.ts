export interface EncryptedField {
  iv: string;
  content: string;
  tag: string;
}

export interface SshKey {
  _id: string;
  name: string;
  scope: "server" | "shared";
  serverId?: string;

  privateKey: EncryptedField;
  publicKey?: string;
  passphrase?: EncryptedField;

  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSshKeyInput {
  name: string;
  scope: "server" | "shared";
  serverId?: string;

  privateKey: EncryptedField;
  publicKey?: string;
  passphrase?: EncryptedField;
}

export type UpdateSshKeyInput = Partial<CreateSshKeyInput>;

export abstract class SshKeyStore {
  abstract find(): Promise<SshKey[]>;

  abstract findShared(): Promise<SshKey[]>;

  abstract findById(id: string): Promise<SshKey | null>;

  abstract findSharedById(id: string): Promise<SshKey | null>;

  abstract create(data: CreateSshKeyInput): Promise<SshKey>;

  abstract findByIdAndUpdate(
    id: string,
    update: UpdateSshKeyInput,
  ): Promise<SshKey | null>;

  abstract deleteById(id: string): Promise<SshKey | null>;
}