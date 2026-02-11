'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FavoriteButtonProps {
    userId: string;
    customerId: string;
    initialIsFavorite: boolean;
}

export function FavoriteButton({ userId, customerId, initialIsFavorite }: FavoriteButtonProps) {
    const [isFavorite, setIsFavorite] = useState(initialIsFavorite);
    const [loading, setLoading] = useState(false);

    const toggleFavorite = async () => {
        setLoading(true);
        const action = isFavorite ? 'remove' : 'add';

        try {
            const response = await fetch('/api/favorites', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, customerId, action }),
            });

            if (response.ok) {
                setIsFavorite(!isFavorite);
            }
        } catch (error) {
            console.error('Failed to toggle favorite:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={toggleFavorite}
            disabled={loading}
            className={cn(
                "p-2 rounded-full transition-colors",
                isFavorite ? "text-yellow-500 hover:bg-yellow-50" : "text-gray-400 hover:bg-gray-100",
                loading && "opacity-50 cursor-not-allowed"
            )}
            title={isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
            <Star className={cn("w-5 h-5", isFavorite && "fill-current")} />
        </button>
    );
}
