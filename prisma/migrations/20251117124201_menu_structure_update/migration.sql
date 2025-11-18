/*
  Warnings:

  - You are about to drop the column `menu_item_id` on the `user_permissions` table. All the data in the column will be lost.
  - You are about to drop the `menu_items` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "menu_items" DROP CONSTRAINT "menu_items_parent_id_fkey";

-- DropForeignKey
ALTER TABLE "user_permissions" DROP CONSTRAINT "user_permissions_menu_item_id_fkey";

-- DropIndex
DROP INDEX "user_permissions_user_id_menu_item_id_key";

-- AlterTable
ALTER TABLE "user_permissions" DROP COLUMN "menu_item_id",
ADD COLUMN     "menu_id" INTEGER,
ADD COLUMN     "submenu_id" INTEGER;

-- DropTable
DROP TABLE "menu_items";

-- CreateTable
CREATE TABLE "menus" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "path" VARCHAR(255),
    "icon" VARCHAR(100),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submenus" (
    "id" SERIAL NOT NULL,
    "menu_id" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "path" VARCHAR(255) NOT NULL,
    "icon" VARCHAR(100),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "submenus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "menus_slug_key" ON "menus"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "submenus_menu_id_slug_key" ON "submenus"("menu_id", "slug");

-- AddForeignKey
ALTER TABLE "submenus" ADD CONSTRAINT "submenus_menu_id_fkey" FOREIGN KEY ("menu_id") REFERENCES "menus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_menu_id_fkey" FOREIGN KEY ("menu_id") REFERENCES "menus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_submenu_id_fkey" FOREIGN KEY ("submenu_id") REFERENCES "submenus"("id") ON DELETE CASCADE ON UPDATE CASCADE;
