"use server";

import { prismaApp } from "@/lib/db";
import { auth } from "@/auth";
import { unstable_noStore as noStore } from "next/cache";

const RESERVATION_TIMEOUT_MINUTES = 10;

export async function reserveSN(itemNumber: string, serialNumber: string, guestId?: string) {
    noStore();
    const session = await auth();
    const userId = session?.user?.email || (session?.user as any)?.id || guestId || "anonymous";
    const userName = session?.user?.name || (userId !== "anonymous" && userId !== guestId ? userId : "Guest User");

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + RESERVATION_TIMEOUT_MINUTES);

    try {
        // 1. Check if ANY active reservation exists for this SN
        const existing = await prismaApp.serialReservation.findUnique({
            where: {
                itemNumber_serialNumber: {
                    itemNumber,
                    serialNumber
                }
            }
        });

        if (existing) {
            const isExpired = new Date() > new Date(existing.expiresAt);
            const isMine = existing.reservedBy === userId;

            if (!isExpired && !isMine) {
                console.warn(`[Reserve] SN ${serialNumber} is already held by ${existing.userName || existing.reservedBy}`);
                return {
                    success: false,
                    error: "Already reserved",
                    reservedBy: existing.userName || "another user"
                };
            }
        }

        // 2. Safe to upsert (either it's mine, it's expired, or it's new)
        await prismaApp.serialReservation.upsert({
            where: {
                itemNumber_serialNumber: {
                    itemNumber,
                    serialNumber
                }
            },
            update: {
                reservedBy: userId,
                userName,
                expiresAt
            },
            create: {
                itemNumber,
                serialNumber,
                reservedBy: userId,
                userName,
                expiresAt
            }
        });
        return { success: true };
    } catch (error) {
        console.error("Failed to reserve SN:", error);
        return { success: false, error: "Database error" };
    }
}

export async function releaseSN(itemNumber: string, serialNumber: string, guestId?: string) {
    noStore();
    const session = await auth();
    const userId = session?.user?.email || (session?.user as any)?.id || guestId || "anonymous";

    try {
        // Only allow releasing if it's reserved by the current user
        await prismaApp.serialReservation.deleteMany({
            where: {
                itemNumber,
                serialNumber,
                reservedBy: userId
            }
        });
        return { success: true };
    } catch (error) {
        console.error("Failed to release SN:", error);
        return { success: false };
    }
}

export async function releaseAllMyReservations(guestId?: string) {
    noStore();
    const session = await auth();
    const userId = session?.user?.email || (session?.user as any)?.id || guestId || "anonymous";

    try {
        await prismaApp.serialReservation.deleteMany({
            where: {
                reservedBy: userId
            }
        });
        return { success: true };
    } catch (error) {
        console.error("Failed to release all reservations:", error);
        return { success: false };
    }
}

export async function cleanupExpiredReservations() {
    try {
        await prismaApp.serialReservation.deleteMany({
            where: {
                expiresAt: {
                    lt: new Date()
                }
            }
        });
    } catch (error) {
        console.error("Failed cleanup:", error);
    }
}
