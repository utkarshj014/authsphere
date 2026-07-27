import { ROLES } from "../constants/roles.js";

export type RoleName = (typeof ROLES)[keyof typeof ROLES];
