import { ROLES } from "../constants/index.js";

export type RoleName = (typeof ROLES)[keyof typeof ROLES];
