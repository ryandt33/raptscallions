// Schemas barrel export
export {
  userBaseSchema,
  createUserSchema,
  updateUserSchema,
} from "./user.schema.js";
export type { User, CreateUser, UpdateUser } from "./user.schema.js";

export {
  groupBaseSchema,
  createGroupSchema,
  updateGroupSchema,
} from "./group.schema.js";
export type { Group, CreateGroup, UpdateGroup } from "./group.schema.js";

export { registerSchema, loginSchema } from "./auth.schema.js";
export type { RegisterInput, LoginInput } from "./auth.schema.js";

export {
  googleUserProfileSchema,
  microsoftUserProfileSchema,
  oauthCallbackQuerySchema,
} from "./oauth.schema.js";
export type {
  GoogleUserProfile,
  MicrosoftUserProfile,
  OAuthCallbackQuery,
} from "./oauth.schema.js";

export {
  messageMetaSchema,
  extractionSchema,
  parseMessageMeta,
  safeParseMessageMeta,
} from "./message-meta.schema.js";
export type { MessageMeta, Extraction } from "./message-meta.schema.js";

export {
  storageLimitValuesSchema,
  roleStorageLimitsSchema,
  groupStorageSettingsSchema,
  fileUploadMetadataSchema,
  setUserStorageLimitSchema,
} from "./storage.schema.js";
export type {
  StorageLimitValues,
  RoleStorageLimits,
  GroupStorageSettings,
  FileUploadMetadata,
  SetUserStorageLimit,
} from "./storage.schema.js";
