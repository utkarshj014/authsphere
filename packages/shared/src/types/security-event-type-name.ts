import { SECURITY_EVENT_TYPES } from "../constants/index.js";

export type SecurityEventTypeName =
  (typeof SECURITY_EVENT_TYPES)[keyof typeof SECURITY_EVENT_TYPES];
