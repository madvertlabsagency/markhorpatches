import type { Role } from "@/generated/prisma/enums";

export type Permission =
  | "dashboard:view"
  | "orders:read" | "orders:write" | "orders:fulfil"
  | "customers:read"
  | "mockups:read" | "mockups:write"
  | "proofs:write"
  | "catalog:write" | "pricing:write"
  | "reviews:write" | "gallery:write" | "content:write"
  | "coupons:write"
  | "integrations:read"
  | "settings:write"
  | "users:write";

const ALL: Permission[] = [
  "dashboard:view", "orders:read", "orders:write", "orders:fulfil", "customers:read", "mockups:read", "mockups:write", "proofs:write",
  "catalog:write", "pricing:write", "reviews:write", "gallery:write", "content:write", "coupons:write", "integrations:read", "settings:write", "users:write",
];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  CUSTOMER: [],
  SUPER_ADMIN: ALL,
  ADMIN: ALL.filter((p) => p !== "users:write"),
  DESIGNER: ["dashboard:view", "orders:read", "mockups:read", "mockups:write", "proofs:write", "gallery:write"],
  SUPPORT: ["dashboard:view", "orders:read", "orders:write", "customers:read", "mockups:read", "mockups:write", "reviews:write", "content:write"],
  FULFILLMENT: ["dashboard:view", "orders:read", "orders:fulfil"],
};

export function can(role: Role | undefined | null, permission: Permission): boolean {
  return !!role && ROLE_PERMISSIONS[role].includes(permission);
}

export function isStaff(role: Role | undefined | null): boolean {
  return !!role && role !== "CUSTOMER";
}
