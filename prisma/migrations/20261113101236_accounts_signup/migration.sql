-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "email" TEXT,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "CustomerSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tokenHash" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CustomerSession_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
    CONSTRAINT "Booking_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Booking_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Booking_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Booking" ("airportDirection", "airportId", "cancelReason", "cancelledBy", "categoryId", "code", "completedAt", "createdAt", "customerEmail", "customerMobile", "customerName", "driverId", "dropAddress", "dropLocation", "estimatedFare", "fareBreakdown", "finalFare", "gstAmount", "id", "idempotencyKey", "packageId", "passengers", "paymentMethod", "paymentRef", "paymentStatus", "pickupAddress", "pickupAt", "pickupLocation", "returnAt", "routeId", "specialRequests", "startedAt", "status", "tripDays", "tripType", "updatedAt", "vehicleId", "zoneId") SELECT "airportDirection", "airportId", "cancelReason", "cancelledBy", "categoryId", "code", "completedAt", "createdAt", "customerEmail", "customerMobile", "customerName", "driverId", "dropAddress", "dropLocation", "estimatedFare", "fareBreakdown", "finalFare", "gstAmount", "id", "idempotencyKey", "packageId", "passengers", "paymentMethod", "paymentRef", "paymentStatus", "pickupAddress", "pickupAt", "pickupLocation", "returnAt", "routeId", "specialRequests", "startedAt", "status", "tripDays", "tripType", "updatedAt", "vehicleId", "zoneId" FROM "Booking";
DROP TABLE "Booking";
ALTER TABLE "new_Booking" RENAME TO "Booking";
CREATE UNIQUE INDEX "Booking_code_key" ON "Booking"("code");
CREATE UNIQUE INDEX "Booking_idempotencyKey_key" ON "Booking"("idempotencyKey");
CREATE INDEX "Booking_status_idx" ON "Booking"("status");
CREATE INDEX "Booking_pickupAt_idx" ON "Booking"("pickupAt");
CREATE INDEX "Booking_customerMobile_idx" ON "Booking"("customerMobile");
CREATE INDEX "Booking_customerId_idx" ON "Booking"("customerId");
CREATE TABLE "new_Driver" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "licenceNumber" TEXT NOT NULL,
    "licenceExpiry" DATETIME NOT NULL,
    "policeVerification" TEXT NOT NULL DEFAULT 'PENDING',
    "pinHash" TEXT,
    "approved" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Driver" ("active", "createdAt", "id", "licenceExpiry", "licenceNumber", "name", "phone", "pinHash", "policeVerification", "updatedAt") SELECT "active", "createdAt", "id", "licenceExpiry", "licenceNumber", "name", "phone", "pinHash", "policeVerification", "updatedAt" FROM "Driver";
DROP TABLE "Driver";
ALTER TABLE "new_Driver" RENAME TO "Driver";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Customer_mobile_key" ON "Customer"("mobile");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_email_key" ON "Customer"("email");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerSession_tokenHash_key" ON "CustomerSession"("tokenHash");

-- CreateIndex
CREATE INDEX "CustomerSession_customerId_idx" ON "CustomerSession"("customerId");
