/*
  Warnings:

  - You are about to drop the `menus` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `permissions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `role_menu_permissions` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "menus" DROP CONSTRAINT "menus_parent_id_fkey";

-- DropForeignKey
ALTER TABLE "role_menu_permissions" DROP CONSTRAINT "role_menu_permissions_menu_id_fkey";

-- DropForeignKey
ALTER TABLE "role_menu_permissions" DROP CONSTRAINT "role_menu_permissions_permission_id_fkey";

-- DropForeignKey
ALTER TABLE "role_menu_permissions" DROP CONSTRAINT "role_menu_permissions_role_id_fkey";

-- DropTable
DROP TABLE "menus";

-- DropTable
DROP TABLE "permissions";

-- DropTable
DROP TABLE "role_menu_permissions";
