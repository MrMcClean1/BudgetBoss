-- GDPR compliance: audit trail for account deletions
CREATE TABLE "AccountDeletionLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "hadActiveSubscription" BOOLEAN NOT NULL DEFAULT false,
    "stripeSubscriptionId" TEXT,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountDeletionLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AccountDeletionLog_userId_idx" ON "AccountDeletionLog"("userId");
CREATE INDEX "AccountDeletionLog_deletedAt_idx" ON "AccountDeletionLog"("deletedAt");
