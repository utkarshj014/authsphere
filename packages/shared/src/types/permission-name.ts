import { PERMISSIONS } from "../constants/permissions.js";

export type PermissionName = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
