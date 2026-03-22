-- Make stripePriceId nullable so missing price info is stored as NULL rather than empty string
ALTER TABLE "Subscription" ALTER COLUMN "stripePriceId" DROP NOT NULL;
