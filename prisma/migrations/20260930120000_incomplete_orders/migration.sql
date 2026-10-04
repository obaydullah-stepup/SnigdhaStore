-- CreateEnum
CREATE TYPE "IncompleteOrderStatus" AS ENUM ('OPEN', 'CONVERTED', 'DISMISSED');

-- CreateTable
CREATE TABLE "IncompleteOrder" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "userId" TEXT,
    "status" "IncompleteOrderStatus" NOT NULL DEFAULT 'OPEN',
    "stage" TEXT NOT NULL DEFAULT 'CONTACT',
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "customerEmail" TEXT,
    "addressLine" TEXT,
    "deliveryZone" TEXT,
    "items" JSONB NOT NULL,
    "itemCount" INTEGER NOT NULL DEFAULT 0,
    "subtotal" INTEGER NOT NULL,
    "discount" INTEGER NOT NULL DEFAULT 0,
    "couponCode" TEXT,
    "deliveryFee" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL,
    "internalNote" TEXT,
    "convertedOrderId" TEXT,
    "convertedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncompleteOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IncompleteOrder_cartId_key" ON "IncompleteOrder"("cartId");

-- CreateIndex
CREATE UNIQUE INDEX "IncompleteOrder_convertedOrderId_key" ON "IncompleteOrder"("convertedOrderId");

-- CreateIndex
CREATE INDEX "IncompleteOrder_status_createdAt_idx" ON "IncompleteOrder"("status", "createdAt");

-- CreateIndex
CREATE INDEX "IncompleteOrder_status_updatedAt_idx" ON "IncompleteOrder"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "IncompleteOrder_customerPhone_idx" ON "IncompleteOrder"("customerPhone");

-- CreateIndex
CREATE INDEX "IncompleteOrder_userId_idx" ON "IncompleteOrder"("userId");

-- AddForeignKey
ALTER TABLE "IncompleteOrder" ADD CONSTRAINT "IncompleteOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncompleteOrder" ADD CONSTRAINT "IncompleteOrder_convertedOrderId_fkey" FOREIGN KEY ("convertedOrderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
