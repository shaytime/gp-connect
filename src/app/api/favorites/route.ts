import { NextResponse } from 'next/server';
import { prismaApp } from '@/lib/db';

export async function POST(request: Request) {
    try {
        const { userId, customerId, action } = await request.json();

        if (!userId || !customerId) {
            return NextResponse.json({ error: 'Missing userId or customerId' }, { status: 400 });
        }

        const preference = await prismaApp.userPreference.findUnique({
            where: { userId },
        });

        let favorites = preference?.favorites || [];

        if (action === 'add') {
            if (!favorites.includes(customerId)) {
                favorites.push(customerId);
            }
        } else if (action === 'remove') {
            favorites = favorites.filter((id: string) => id !== customerId);
        }

        const updatedPreference = await prismaApp.userPreference.upsert({
            where: { userId },
            update: { favorites },
            create: { userId, favorites },
        });

        return NextResponse.json(updatedPreference);
    } catch (error) {
        console.error('Error updating favorites:', error);
        return NextResponse.json({ error: 'Failed to update favorites' }, { status: 500 });
    }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    try {
        const preference = await prismaApp.userPreference.findUnique({
            where: { userId },
        });
        return NextResponse.json(preference || { userId, favorites: [] });
    } catch (error) {
        console.error('Error fetching favorites:', error);
        return NextResponse.json({ error: 'Failed to fetch favorites' }, { status: 500 });
    }
}
