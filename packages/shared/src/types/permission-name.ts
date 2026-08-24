import { PERMISSIONS } from "../constants/index.js";

export type PermissionName = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
