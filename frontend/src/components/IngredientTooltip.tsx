import React, { useState, useEffect } from 'react';
import { SpectralCard } from './SpectralCard';

interface IngredientTooltipProps {
    ingredientId: string;
    children: React.ReactNode;
    className?: string;
}

export const IngredientTooltip: React.FC<IngredientTooltipProps> = ({
    ingredientId,
    children,
    className
}) => {
    const [ingredient, setIngredient] = useState<any>(null);
    const [showTooltip, setShowTooltip] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });

    const handleMouseEnter = async (event: React.MouseEvent) => {
        try {
            const response = await fetch(`http://localhost:3001/api/ingredients/${ingredientId}`);
            if (response.ok) {
                const ingredientData = await response.json();
                setIngredient(ingredientData);
                setPosition({ x: event.clientX + 10, y: event.clientY - 10 });
                setShowTooltip(true);
            }
        } catch (error) {
            console.error('Failed to fetch ingredient data:', error);
        }
    };

    const handleMouseLeave = () => {
        setShowTooltip(false);
        setIngredient(null);
    };

    const handleMouseMove = (event: React.MouseEvent) => {
        if (showTooltip) {
            setPosition({ x: event.clientX + 10, y: event.clientY - 10 });
        }
    };

    return (
        <>
            <span
                className={className}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onMouseMove={handleMouseMove}
                style={{ cursor: 'help' }}
            >
                {children}
            </span>
            {ingredient && (
                <SpectralCard
                    ingredient={ingredient}
                    position={position}
                    visible={showTooltip}
                />
            )}
        </>
    );
}; 