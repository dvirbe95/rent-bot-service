-- CreateTable
CREATE TABLE "users" (
    "phone_number" TEXT NOT NULL,
    "current_step" TEXT NOT NULL DEFAULT 'START',
    "role" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("phone_number")
);

-- CreateTable
CREATE TABLE "apartments" (
    "id" TEXT NOT NULL,
    "landlord_id" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "rooms" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "images" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "apartments_pkey" PRIMARY KEY ("id")
);
