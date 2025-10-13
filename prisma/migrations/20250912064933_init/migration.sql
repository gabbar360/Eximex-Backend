-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING', 'INVITED', 'DELETED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'ADMINISTRATOR', 'ADMIN', 'STAFF');

-- CreateEnum
CREATE TYPE "PartyRole" AS ENUM ('Customer', 'Lead', 'Freight_Forwarder', 'Vendor', 'Agent', 'CHA', 'Transporter', 'Supplier');

-- CreateEnum
CREATE TYPE "PackingUnit" AS ENUM ('sqm', 'kg', 'pcs', 'ltr');

-- CreateEnum
CREATE TYPE "Unit" AS ENUM ('sqm', 'sqft', 'kg', 'gram', 'mt', 'pcs', 'ltr');

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('tiles', 'bagasse', 'fabric', 'generic');

-- CreateEnum
CREATE TYPE "WeightUnit" AS ENUM ('kg', 'lbs');

-- CreateEnum
CREATE TYPE "WeightType" AS ENUM ('per_box', 'per_piece', 'per_carton');

-- CreateEnum
CREATE TYPE "AreaUnit" AS ENUM ('sqmt', 'sqft');

-- CreateEnum
CREATE TYPE "AreaType" AS ENUM ('per_box', 'per_piece');

-- CreateEnum
CREATE TYPE "PiStatus" AS ENUM ('draft', 'pending', 'cancelled', 'confirmed');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'partial', 'paid', 'overdue');

-- CreateEnum
CREATE TYPE "PackagingStepType" AS ENUM ('PACKING', 'WRAPPING', 'LABELING', 'PALLETIZING', 'CONTAINERIZING', 'QUALITY_CHECK', 'DOCUMENTATION');

-- CreateEnum
CREATE TYPE "VgmStatus" AS ENUM ('PENDING', 'VERIFIED', 'SUBMITTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "VgmMethod" AS ENUM ('METHOD_1', 'METHOD_2');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "mobile_num" TEXT,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'ADMIN',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "last_login" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "company_id" INTEGER,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyDetails" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "logo" TEXT,
    "address" TEXT,
    "phone_no" TEXT,
    "email" TEXT,
    "gst_number" TEXT,
    "iec_number" TEXT,
    "currencies" TEXT[],
    "default_currency" TEXT NOT NULL,
    "allowed_units" TEXT[],
    "bank_name" TEXT,
    "bank_address" TEXT,
    "account_number" TEXT,
    "ifsc_code" TEXT,
    "swift_code" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "plan_id" TEXT NOT NULL DEFAULT 'trial',
    "trial_ends_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "CompanyDetails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartyList" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "created_by" INTEGER NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "password" TEXT,
    "role" "PartyRole" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" INTEGER,
    "address" TEXT,
    "city" TEXT,
    "company_name" TEXT NOT NULL,
    "contact_person" TEXT,
    "country" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "gst_number" TEXT,
    "notes" TEXT,
    "party_type" TEXT NOT NULL,
    "pincode" TEXT,
    "state" TEXT,
    "tags" TEXT,
    "status" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PartyList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "company_id" INTEGER NOT NULL,
    "created_by" INTEGER NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION,
    "currency" TEXT DEFAULT 'USD',
    "category_id" INTEGER,
    "sub_category_id" INTEGER,
    "weight_unit" "WeightUnit" NOT NULL DEFAULT 'kg',
    "weight_type" "WeightType" NOT NULL DEFAULT 'per_piece',
    "weight" DOUBLE PRECISION,
    "area_unit" "AreaUnit" NOT NULL DEFAULT 'sqmt',
    "area_type" "AreaType" NOT NULL DEFAULT 'per_piece',
    "cover_area" DOUBLE PRECISION,
    "piece_per_box" INTEGER,
    "total_boxes" INTEGER,
    "gross_weight_per_box" DOUBLE PRECISION,
    "gross_weight_unit" TEXT DEFAULT 'kg',
    "packaging_material_weight" DOUBLE PRECISION,
    "packaging_material_weight_unit" TEXT DEFAULT 'g',
    "unit_weight" DOUBLE PRECISION,
    "unit_weight_unit" TEXT DEFAULT 'kg',
    "weight_unit_type" TEXT,
    "total_pieces" INTEGER,
    "total_gross_weight" DOUBLE PRECISION,
    "total_gross_weight_unit" TEXT DEFAULT 'kg',
    "volume_length" DOUBLE PRECISION,
    "volume_width" DOUBLE PRECISION,
    "volume_height" DOUBLE PRECISION,
    "volume_per_box" DOUBLE PRECISION,
    "total_volume" DOUBLE PRECISION,
    "packaging_hierarchy_data" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemCategory" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "created_by" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "hsn_code" TEXT,
    "use_parent_hsn_code" BOOLEAN NOT NULL DEFAULT false,
    "primary_unit" "Unit",
    "secondary_unit" "Unit",
    "parent_id" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packaging_units" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "abbreviation" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "packaging_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packaging_hierarchy" (
    "id" SERIAL NOT NULL,
    "category_id" INTEGER NOT NULL,
    "level" INTEGER NOT NULL,
    "parent_unit_id" INTEGER NOT NULL,
    "child_unit_id" INTEGER NOT NULL,
    "conversion_quantity" DOUBLE PRECISION NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "packaging_hierarchy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" INTEGER,
    "entity_name" TEXT,
    "description" TEXT,
    "metadata" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pi_invoice" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "pi_number" TEXT NOT NULL,
    "invoice_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "PiStatus" NOT NULL DEFAULT 'pending',
    "party_id" INTEGER,
    "party_name" TEXT NOT NULL,
    "contact_person" TEXT,
    "address" TEXT,
    "country" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "payment_term" TEXT NOT NULL,
    "delivery_term" TEXT NOT NULL,
    "container_type" TEXT,
    "capacity_basis" TEXT,
    "number_of_containers" INTEGER DEFAULT 1,
    "max_permissible_weight" DOUBLE PRECISION,
    "max_shipment_weight" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "charges" JSONB,
    "pre_carriage_by" TEXT,
    "place_of_receipt" TEXT,
    "country_of_origin" TEXT,
    "country_of_destination" TEXT,
    "port_of_loading" TEXT,
    "port_of_discharge" TEXT,
    "final_destination" TEXT,
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "charges_total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "advance_amount" DOUBLE PRECISION,
    "total_weight" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_volume" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_boxes" INTEGER NOT NULL DEFAULT 0,
    "total_pallets" INTEGER NOT NULL DEFAULT 0,
    "required_containers" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" INTEGER,
    "updated_by" INTEGER,

    CONSTRAINT "pi_invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pi_products" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "pi_invoice_id" INTEGER NOT NULL,
    "product_id" INTEGER,
    "product_name" TEXT NOT NULL,
    "hs_code" TEXT,
    "product_description" TEXT,
    "category_id" INTEGER,
    "subcategory_id" INTEGER,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "quantity_by_weight" DOUBLE PRECISION,
    "total_weight" DOUBLE PRECISION,
    "converted_quantity" DOUBLE PRECISION,
    "calculated_boxes" INTEGER,
    "calculated_pallets" INTEGER,
    "total_cbm" DOUBLE PRECISION,
    "packing_breakdown" JSONB,
    "line_number" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pi_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pi_daily_counters" (
    "date" TIMESTAMP(3) NOT NULL,
    "last_incremental_number" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "pi_daily_counters_pkey" PRIMARY KEY ("date")
);

-- CreateTable
CREATE TABLE "pi_invoice_history" (
    "id" SERIAL NOT NULL,
    "pi_invoice_id" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "changeData" JSONB,
    "description" TEXT,
    "ip_address" TEXT,
    "device_info" TEXT,
    "status_before" TEXT,
    "status_after" TEXT,
    "changed_fields" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" INTEGER,

    CONSTRAINT "pi_invoice_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "pi_invoice_id" INTEGER NOT NULL,
    "order_number" TEXT NOT NULL,
    "pi_number" TEXT NOT NULL,
    "order_status" "OrderStatus" NOT NULL DEFAULT 'pending',
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "total_amount" DOUBLE PRECISION NOT NULL,
    "payment_amount" DECIMAL(10,2),
    "product_qty" INTEGER NOT NULL,
    "delivery_terms" TEXT NOT NULL,
    "booking_number" TEXT,
    "booking_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" INTEGER,
    "updated_by" INTEGER,
    "way_bill_number" TEXT,
    "truck_number" TEXT,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_packaging_steps" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER,
    "pi_invoice_id" INTEGER,
    "order_id" INTEGER,
    "category_id" INTEGER,
    "step_number" INTEGER NOT NULL,
    "step_type" "PackagingStepType" NOT NULL DEFAULT 'PACKING',
    "description" TEXT NOT NULL,
    "packaging_unit_id" INTEGER,
    "quantity" DOUBLE PRECISION,
    "material" TEXT,
    "weight" DOUBLE PRECISION,
    "weight_unit" TEXT DEFAULT 'kg',
    "dimensions" JSONB,
    "container_number" TEXT,
    "seal_type" TEXT,
    "seal_number" TEXT,
    "notes" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" INTEGER NOT NULL,
    "updated_by" INTEGER,

    CONSTRAINT "product_packaging_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vgm_documents" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "pi_invoice_id" INTEGER NOT NULL,
    "product_packaging_step_id" INTEGER,
    "verified_gross_mass" DOUBLE PRECISION NOT NULL,
    "method" "VgmMethod" NOT NULL DEFAULT 'METHOD_1',
    "status" "VgmStatus" NOT NULL DEFAULT 'PENDING',
    "cargo_weight" DOUBLE PRECISION,
    "packaging_weight" DOUBLE PRECISION,
    "container_tare_weight" DOUBLE PRECISION,
    "verified_by" TEXT NOT NULL,
    "verifier_position" TEXT,
    "verification_date" TIMESTAMP(3) NOT NULL,
    "weighing_location" TEXT,
    "container_type" TEXT DEFAULT 'NORMAL',
    "hazardous_un_no" TEXT,
    "imdg_class" TEXT,
    "remarks" TEXT,
    "attachments" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" INTEGER NOT NULL,
    "updated_by" INTEGER,

    CONSTRAINT "vgm_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_mobile_num_key" ON "User"("mobile_num");

-- CreateIndex
CREATE UNIQUE INDEX "PartyList_email_key" ON "PartyList"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PartyList_user_id_key" ON "PartyList"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_sku_key" ON "product"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "ItemCategory_hsn_code_key" ON "ItemCategory"("hsn_code");

-- CreateIndex
CREATE UNIQUE INDEX "packaging_units_name_key" ON "packaging_units"("name");

-- CreateIndex
CREATE UNIQUE INDEX "packaging_units_abbreviation_key" ON "packaging_units"("abbreviation");

-- CreateIndex
CREATE UNIQUE INDEX "packaging_hierarchy_category_id_level_key" ON "packaging_hierarchy"("category_id", "level");

-- CreateIndex
CREATE UNIQUE INDEX "pi_invoice_pi_number_key" ON "pi_invoice"("pi_number");

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_number_key" ON "orders"("order_number");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "CompanyDetails"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartyList" ADD CONSTRAINT "PartyList_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "CompanyDetails"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartyList" ADD CONSTRAINT "PartyList_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartyList" ADD CONSTRAINT "PartyList_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "ItemCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_sub_category_id_fkey" FOREIGN KEY ("sub_category_id") REFERENCES "ItemCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "CompanyDetails"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemCategory" ADD CONSTRAINT "ItemCategory_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "CompanyDetails"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemCategory" ADD CONSTRAINT "ItemCategory_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemCategory" ADD CONSTRAINT "ItemCategory_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "ItemCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packaging_hierarchy" ADD CONSTRAINT "packaging_hierarchy_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "ItemCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packaging_hierarchy" ADD CONSTRAINT "packaging_hierarchy_parent_unit_id_fkey" FOREIGN KEY ("parent_unit_id") REFERENCES "packaging_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packaging_hierarchy" ADD CONSTRAINT "packaging_hierarchy_child_unit_id_fkey" FOREIGN KEY ("child_unit_id") REFERENCES "packaging_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "CompanyDetails"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pi_invoice" ADD CONSTRAINT "pi_invoice_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "CompanyDetails"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pi_invoice" ADD CONSTRAINT "pi_invoice_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "PartyList"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pi_invoice" ADD CONSTRAINT "pi_invoice_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pi_invoice" ADD CONSTRAINT "pi_invoice_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pi_products" ADD CONSTRAINT "pi_products_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "CompanyDetails"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pi_products" ADD CONSTRAINT "pi_products_pi_invoice_id_fkey" FOREIGN KEY ("pi_invoice_id") REFERENCES "pi_invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pi_products" ADD CONSTRAINT "pi_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pi_products" ADD CONSTRAINT "pi_products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "ItemCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pi_products" ADD CONSTRAINT "pi_products_subcategory_id_fkey" FOREIGN KEY ("subcategory_id") REFERENCES "ItemCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pi_invoice_history" ADD CONSTRAINT "pi_invoice_history_pi_invoice_id_fkey" FOREIGN KEY ("pi_invoice_id") REFERENCES "pi_invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pi_invoice_history" ADD CONSTRAINT "pi_invoice_history_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "CompanyDetails"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_pi_invoice_id_fkey" FOREIGN KEY ("pi_invoice_id") REFERENCES "pi_invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_packaging_steps" ADD CONSTRAINT "product_packaging_steps_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_packaging_steps" ADD CONSTRAINT "product_packaging_steps_pi_invoice_id_fkey" FOREIGN KEY ("pi_invoice_id") REFERENCES "pi_invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_packaging_steps" ADD CONSTRAINT "product_packaging_steps_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_packaging_steps" ADD CONSTRAINT "product_packaging_steps_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "ItemCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_packaging_steps" ADD CONSTRAINT "product_packaging_steps_packaging_unit_id_fkey" FOREIGN KEY ("packaging_unit_id") REFERENCES "packaging_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_packaging_steps" ADD CONSTRAINT "product_packaging_steps_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_packaging_steps" ADD CONSTRAINT "product_packaging_steps_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vgm_documents" ADD CONSTRAINT "vgm_documents_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "CompanyDetails"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vgm_documents" ADD CONSTRAINT "vgm_documents_pi_invoice_id_fkey" FOREIGN KEY ("pi_invoice_id") REFERENCES "pi_invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vgm_documents" ADD CONSTRAINT "vgm_documents_product_packaging_step_id_fkey" FOREIGN KEY ("product_packaging_step_id") REFERENCES "product_packaging_steps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vgm_documents" ADD CONSTRAINT "vgm_documents_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vgm_documents" ADD CONSTRAINT "vgm_documents_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
