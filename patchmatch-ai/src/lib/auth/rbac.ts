import type { OrgMemberRole, PlatformRole } from "@/generated/prisma/enums";

/** Platform (admin command center) permissions. Org-level access is decided by membership. */
export const PERMISSIONS = [
  "admin:view",
  "buyers:view",
  "sellers:view",
  "sellers:verify",
  "rfq:review",
  "matching:manage",
  "opportunity:manage",
  "pricing:manage",
  "payments:view",
  "payments:manage",
  "refunds:decide",
  "disputes:decide",
  "quotes:view",
  "messages:moderate",
  "fraud:review",
  "analytics:view",
  "marketing:manage",
  "notifications:manage",
  "audit:view",
  "roles:manage",
  "settings:manage",
  "ai:admin",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ALL = [...PERMISSIONS];

export const ROLE_PERMISSIONS: Record<PlatformRole, Permission[]> = {
  NONE: [],
  SUPER_ADMIN: ALL,
  ADMIN: ALL.filter((p) => p !== "roles:manage"),
  REVIEWER: ["admin:view", "buyers:view", "sellers:view", "sellers:verify", "rfq:review", "matching:manage", "opportunity:manage", "quotes:view", "messages:moderate", "fraud:review", "ai:admin"],
  FINANCE: ["admin:view", "sellers:view", "payments:view", "payments:manage", "refunds:decide", "disputes:decide", "analytics:view", "pricing:manage", "audit:view"],
  SUPPORT: ["admin:view", "buyers:view", "sellers:view", "quotes:view", "messages:moderate", "notifications:manage"],
};

export function can(role: PlatformRole | null | undefined, permission: Permission, extra: string[] = []): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role].includes(permission) || (role !== "NONE" && extra.includes(permission));
}

export function isStaff(role: PlatformRole | null | undefined): boolean {
  return !!role && role !== "NONE";
}

/** Org-level actions. */
export type OrgAction = "org:read" | "org:write" | "org:billing" | "org:team" | "rfq:purchase" | "quote:write";

const ORG_ACTIONS: Record<OrgMemberRole, OrgAction[]> = {
  OWNER: ["org:read", "org:write", "org:billing", "org:team", "rfq:purchase", "quote:write"],
  ADMIN: ["org:read", "org:write", "org:billing", "org:team", "rfq:purchase", "quote:write"],
  MEMBER: ["org:read", "quote:write"],
};

export function orgCan(role: OrgMemberRole | null | undefined, action: OrgAction): boolean {
  return !!role && ORG_ACTIONS[role].includes(action);
}
