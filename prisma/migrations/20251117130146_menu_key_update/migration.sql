/*
  Warnings:

  - A unique constraint covering the columns `[user_id,menu_id,submenu_id]` on the table `user_permissions` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "user_permissions_user_id_menu_id_submenu_id_key" ON "user_permissions"("user_id", "menu_id", "submenu_id");
