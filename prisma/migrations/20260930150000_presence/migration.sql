-- Presence realtime: heartbeat tiap tab yang terbuka
ALTER TABLE "User" ADD COLUMN "onlineAt" TIMESTAMP(3);
