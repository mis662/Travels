-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "contactName" TEXT NOT NULL DEFAULT '',
    "contactPhone" TEXT NOT NULL DEFAULT '',
    "contactEmail" TEXT NOT NULL DEFAULT '',
    "gstNumber" TEXT NOT NULL DEFAULT '',
    "billingAddress" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "managerId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Company_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "AdminUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CorporateOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "orderType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "reportingTime" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "vehiclesCount" INTEGER NOT NULL DEFAULT 1,
    "dutyDetails" TEXT NOT NULL DEFAULT '',
    "pickupAddress" TEXT NOT NULL,
    "dropAddress" TEXT NOT NULL DEFAULT '',
    "passengerName" TEXT NOT NULL DEFAULT '',
    "passengerMobile" TEXT NOT NULL DEFAULT '',
    "requirements" TEXT NOT NULL DEFAULT '',
    "rate" INTEGER,
    "rateUnit" TEXT NOT NULL DEFAULT 'PER_DAY',
    "managerId" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CorporateOrder_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CorporateOrder_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "CarCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CorporateOrder_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "AdminUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AdminUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'SUPER_ADMIN',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_AdminUser" ("createdAt", "email", "id", "name", "passwordHash") SELECT "createdAt", "email", "id", "name", "passwordHash" FROM "AdminUser";
DROP TABLE "AdminUser";
ALTER TABLE "new_AdminUser" RENAME TO "AdminUser";
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");
CREATE TABLE "new_Booking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "tripType" TEXT NOT NULL,
    "airportDirection" TEXT,
    "categoryId" TEXT NOT NULL,
    "routeId" TEXT,
    "airportId" TEXT,
    "zoneId" TEXT,
    "packageId" TEXT,
    "pickupAt" DATETIME NOT NULL,
    "returnAt" DATETIME,
    "tripDays" INTEGER NOT NULL DEFAULT 1,
    "pickupLocation" TEXT NOT NULL,
    "dropLocation" TEXT NOT NULL,
    "pickupAddress" TEXT NOT NULL,
    "dropAddress" TEXT NOT NULL DEFAULT '',
    "passengers" INTEGER NOT NULL,
    "companyId" TEXT,
    "corporateOrderId" TEXT,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerMobile" TEXT NOT NULL,
    "customerEmail" TEXT,
    "specialRequests" TEXT,
    "estimatedFare" INTEGER NOT NULL,
    "gstAmount" INTEGER NOT NULL,
    "fareBreakdown" TEXT NOT NULL,
    "finalFare" INTEGER,
    "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID',
    "paymentMethod" TEXT NOT NULL DEFAULT 'PAY_LATER',
    "paymentRef" TEXT,
    "driverId" TEXT,
    "vehicleId" TEXT,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "cancelReason" TEXT,
    "cancelledBy" TEXT,
    "idempotencyKey" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Booking_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "CarCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Booking_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Booking_airportId_fkey" FOREIGN KEY ("airportId") REFERENCES "Airport" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Booking_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "AirportZone" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Booking_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "LocalPackage" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Booking_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Booking_corporateOrderId_fkey" FOREIGN KEY ("corporateOrderId") REFERENCES "CorporateOrder" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Booking_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Booking_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Booking_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Booking" ("airportDirection", "airportId", "cancelReason", "cancelledBy", "categoryId", "code", "completedAt", "createdAt", "customerEmail", "customerId", "customerMobile", "customerName", "driverId", "dropAddress", "dropLocation", "estimatedFare", "fareBreakdown", "finalFare", "gstAmount", "id", "idempotencyKey", "packageId", "passengers", "paymentMethod", "paymentRef", "paymentStatus", "pickupAddress", "pickupAt", "pickupLocation", "returnAt", "routeId", "specialRequests", "startedAt", "status", "tripDays", "tripType", "updatedAt", "vehicleId", "zoneId") SELECT "airportDirection", "airportId", "cancelReason", "cancelledBy", "categoryId", "code", "completedAt", "createdAt", "customerEmail", "customerId", "customerMobile", "customerName", "driverId", "dropAddress", "dropLocation", "estimatedFare", "fareBreakdown", "finalFare", "gstAmount", "id", "idempotencyKey", "packageId", "passengers", "paymentMethod", "paymentRef", "paymentStatus", "pickupAddress", "pickupAt", "pickupLocation", "returnAt", "routeId", "specialRequests", "startedAt", "status", "tripDays", "tripType", "updatedAt", "vehicleId", "zoneId" FROM "Booking";
DROP TABLE "Booking";
ALTER TABLE "new_Booking" RENAME TO "Booking";
CREATE UNIQUE INDEX "Booking_code_key" ON "Booking"("code");
CREATE UNIQUE INDEX "Booking_idempotencyKey_key" ON "Booking"("idempotencyKey");
CREATE INDEX "Booking_status_idx" ON "Booking"("status");
CREATE INDEX "Booking_pickupAt_idx" ON "Booking"("pickupAt");
CREATE INDEX "Booking_customerMobile_idx" ON "Booking"("customerMobile");
CREATE INDEX "Booking_customerId_idx" ON "Booking"("customerId");
CREATE INDEX "Booking_companyId_idx" ON "Booking"("companyId");
CREATE INDEX "Booking_corporateOrderId_idx" ON "Booking"("corporateOrderId");
CREATE TABLE "new_Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "email" TEXT,
    "passwordHash" TEXT NOT NULL,
    "companyId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Customer_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Customer" ("createdAt", "email", "id", "mobile", "name", "passwordHash") SELECT "createdAt", "email", "id", "mobile", "name", "passwordHash" FROM "Customer";
DROP TABLE "Customer";
ALTER TABLE "new_Customer" RENAME TO "Customer";
CREATE UNIQUE INDEX "Customer_mobile_key" ON "Customer"("mobile");
CREATE UNIQUE INDEX "Customer_email_key" ON "Customer"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "CorporateOrder_code_key" ON "CorporateOrder"("code");

-- CreateIndex
CREATE INDEX "CorporateOrder_companyId_idx" ON "CorporateOrder"("companyId");

-- CreateIndex
CREATE INDEX "CorporateOrder_managerId_idx" ON "CorporateOrder"("managerId");

-- CreateIndex
CREATE INDEX "CorporateOrder_status_idx" ON "CorporateOrder"("status");
