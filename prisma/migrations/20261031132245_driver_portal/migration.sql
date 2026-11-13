-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "completedAt" DATETIME;
ALTER TABLE "Booking" ADD COLUMN "startedAt" DATETIME;

-- AlterTable
ALTER TABLE "Driver" ADD COLUMN "pinHash" TEXT;

-- CreateTable
CREATE TABLE "DriverSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tokenHash" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DriverSession_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "DriverSession_tokenHash_key" ON "DriverSession"("tokenHash");

-- CreateIndex
CREATE INDEX "DriverSession_driverId_idx" ON "DriverSession"("driverId");
