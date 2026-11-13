/*
  Warnings:

  - You are about to drop the column `categoryId` on the `CorporateOrder` table. All the data in the column will be lost.
  - You are about to drop the column `dropAddress` on the `CorporateOrder` table. All the data in the column will be lost.
  - You are about to drop the column `dutyDetails` on the `CorporateOrder` table. All the data in the column will be lost.
  - You are about to drop the column `passengerMobile` on the `CorporateOrder` table. All the data in the column will be lost.
  - You are about to drop the column `passengerName` on the `CorporateOrder` table. All the data in the column will be lost.
  - You are about to drop the column `pickupAddress` on the `CorporateOrder` table. All the data in the column will be lost.
  - You are about to drop the column `vehiclesCount` on the `CorporateOrder` table. All the data in the column will be lost.
  - You are about to drop the column `companyId` on the `Customer` table. All the data in the column will be lost.
  - Added the required column `tripSummary` to the `CorporateOrder` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tripType` to the `CorporateOrder` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "employeeCode" TEXT NOT NULL DEFAULT '',
    "mobile" TEXT NOT NULL,
    "email" TEXT NOT NULL DEFAULT '',
    "gender" TEXT NOT NULL DEFAULT '',
    "department" TEXT NOT NULL DEFAULT '',
    "homeAddress" TEXT NOT NULL,
    "homeArea" TEXT NOT NULL DEFAULT '',
    "homeLandmark" TEXT NOT NULL DEFAULT '',
    "homeMapLink" TEXT NOT NULL DEFAULT '',
    "passwordHash" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Employee_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CompanyRoute" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fromPlace" TEXT NOT NULL,
    "toPlace" TEXT NOT NULL,
    "distanceKm" INTEGER,
    "notes" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CompanyRoute_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PortalSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "OrderCar" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "categoryId" TEXT NOT NULL,
    "driverId" TEXT,
    "vehicleId" TEXT,
    CONSTRAINT "OrderCar_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "CorporateOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrderCar_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "CarCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "OrderCar_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "OrderCar_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OrderCarPassenger" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderCarId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "pickupOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "OrderCarPassenger_orderCarId_fkey" FOREIGN KEY ("orderCarId") REFERENCES "OrderCar" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrderCarPassenger_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "orderCarId" TEXT,
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
    CONSTRAINT "Booking_orderCarId_fkey" FOREIGN KEY ("orderCarId") REFERENCES "OrderCar" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Booking_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Booking_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Booking_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Booking" ("airportDirection", "airportId", "cancelReason", "cancelledBy", "categoryId", "code", "companyId", "completedAt", "corporateOrderId", "createdAt", "customerEmail", "customerId", "customerMobile", "customerName", "driverId", "dropAddress", "dropLocation", "estimatedFare", "fareBreakdown", "finalFare", "gstAmount", "id", "idempotencyKey", "packageId", "passengers", "paymentMethod", "paymentRef", "paymentStatus", "pickupAddress", "pickupAt", "pickupLocation", "returnAt", "routeId", "specialRequests", "startedAt", "status", "tripDays", "tripType", "updatedAt", "vehicleId", "zoneId") SELECT "airportDirection", "airportId", "cancelReason", "cancelledBy", "categoryId", "code", "companyId", "completedAt", "corporateOrderId", "createdAt", "customerEmail", "customerId", "customerMobile", "customerName", "driverId", "dropAddress", "dropLocation", "estimatedFare", "fareBreakdown", "finalFare", "gstAmount", "id", "idempotencyKey", "packageId", "passengers", "paymentMethod", "paymentRef", "paymentStatus", "pickupAddress", "pickupAt", "pickupLocation", "returnAt", "routeId", "specialRequests", "startedAt", "status", "tripDays", "tripType", "updatedAt", "vehicleId", "zoneId" FROM "Booking";
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
CREATE INDEX "Booking_orderCarId_idx" ON "Booking"("orderCarId");
CREATE TABLE "new_Company" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "contactName" TEXT NOT NULL DEFAULT '',
    "contactPhone" TEXT NOT NULL DEFAULT '',
    "contactEmail" TEXT NOT NULL DEFAULT '',
    "gstNumber" TEXT NOT NULL DEFAULT '',
    "billingAddress" TEXT NOT NULL DEFAULT '',
    "officeAddress" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "loginId" TEXT,
    "passwordHash" TEXT,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "managerId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Company_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "AdminUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Company" ("active", "billingAddress", "contactEmail", "contactName", "contactPhone", "createdAt", "gstNumber", "id", "managerId", "name", "notes", "updatedAt") SELECT "active", "billingAddress", "contactEmail", "contactName", "contactPhone", "createdAt", "gstNumber", "id", "managerId", "name", "notes", "updatedAt" FROM "Company";
DROP TABLE "Company";
ALTER TABLE "new_Company" RENAME TO "Company";
CREATE UNIQUE INDEX "Company_loginId_key" ON "Company"("loginId");
CREATE TABLE "new_CorporateOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "orderType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "reportingTime" TEXT NOT NULL,
    "skipSundays" BOOLEAN NOT NULL DEFAULT false,
    "tripType" TEXT NOT NULL,
    "tripSummary" TEXT NOT NULL,
    "airportId" TEXT,
    "airportDirection" TEXT,
    "packageId" TEXT,
    "routeId" TEXT,
    "roundTrip" BOOLEAN NOT NULL DEFAULT false,
    "companyRouteId" TEXT,
    "destination" TEXT NOT NULL DEFAULT '',
    "requirements" TEXT NOT NULL DEFAULT '',
    "rate" INTEGER,
    "rateUnit" TEXT NOT NULL DEFAULT 'PER_DAY',
    "managerId" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CorporateOrder_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CorporateOrder_companyRouteId_fkey" FOREIGN KEY ("companyRouteId") REFERENCES "CompanyRoute" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CorporateOrder_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "AdminUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_CorporateOrder" ("code", "companyId", "createdAt", "createdBy", "endDate", "id", "managerId", "orderType", "rate", "rateUnit", "reportingTime", "requirements", "startDate", "status", "updatedAt") SELECT "code", "companyId", "createdAt", "createdBy", "endDate", "id", "managerId", "orderType", "rate", "rateUnit", "reportingTime", "requirements", "startDate", "status", "updatedAt" FROM "CorporateOrder";
DROP TABLE "CorporateOrder";
ALTER TABLE "new_CorporateOrder" RENAME TO "CorporateOrder";
CREATE UNIQUE INDEX "CorporateOrder_code_key" ON "CorporateOrder"("code");
CREATE INDEX "CorporateOrder_companyId_idx" ON "CorporateOrder"("companyId");
CREATE INDEX "CorporateOrder_managerId_idx" ON "CorporateOrder"("managerId");
CREATE INDEX "CorporateOrder_status_idx" ON "CorporateOrder"("status");
CREATE TABLE "new_Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "email" TEXT,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Customer" ("createdAt", "email", "id", "mobile", "name", "passwordHash") SELECT "createdAt", "email", "id", "mobile", "name", "passwordHash" FROM "Customer";
DROP TABLE "Customer";
ALTER TABLE "new_Customer" RENAME TO "Customer";
CREATE UNIQUE INDEX "Customer_mobile_key" ON "Customer"("mobile");
CREATE UNIQUE INDEX "Customer_email_key" ON "Customer"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Employee_mobile_key" ON "Employee"("mobile");

-- CreateIndex
CREATE INDEX "Employee_companyId_idx" ON "Employee"("companyId");

-- CreateIndex
CREATE INDEX "CompanyRoute_companyId_idx" ON "CompanyRoute"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "PortalSession_tokenHash_key" ON "PortalSession"("tokenHash");

-- CreateIndex
CREATE INDEX "PortalSession_kind_subjectId_idx" ON "PortalSession"("kind", "subjectId");

-- CreateIndex
CREATE INDEX "OrderCar_orderId_idx" ON "OrderCar"("orderId");

-- CreateIndex
CREATE INDEX "OrderCarPassenger_employeeId_idx" ON "OrderCarPassenger"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderCarPassenger_orderCarId_employeeId_key" ON "OrderCarPassenger"("orderCarId", "employeeId");
