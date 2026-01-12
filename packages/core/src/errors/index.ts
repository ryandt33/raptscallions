// Error classes and types barrel export
export { AppError, ErrorCode } from "./base.error.js";
export type { ErrorCodeType, ErrorDetails } from "./base.error.js";
export {
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
} from "./common.error.js";
