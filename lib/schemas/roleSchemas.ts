import { z } from 'zod';

export const RoleNameSchema = z.string()
  .trim()
  .min(2, { message: "Role name must be at least 2 characters long." })
  .max(50, { message: "Role name must not exceed 50 characters." });

export const ScreenPermissionSchema = z.object({
  screenId: z.string().uuid(),
  canView: z.boolean(),
  canEdit: z.boolean(),
  canDelete: z.boolean(),
});

export const CreateRoleSchema = z.object({
  name: RoleNameSchema,
  isMaster: z.boolean(),
  screenPermissions: z.array(ScreenPermissionSchema),
});

export const UpdateRoleSchema = z.object({
  id: z.string().uuid({ message: "Invalid role ID." }),
  name: RoleNameSchema,
  isMaster: z.boolean(),
  screenPermissions: z.array(ScreenPermissionSchema),
}); 