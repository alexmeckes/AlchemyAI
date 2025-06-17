import React from 'react';

interface IngredientAttributes {
    luminescence: number;
    cooling: number;
    volatility: number;
    viscosity: number;
    heat_capacity: number;
    toxicity: number;
}

interface Ingredient {
    id: string;
    name: string;
    description: string;
    attributes: IngredientAttributes;
    tags: string[];
    rarity: number;
    color: string;
}

interface SpectralCardProps {
    ingredient: Ingredient;
    position: { x: number; y: number };
    visible: boolean;
}

const AttributeBar: React.FC<{
    icon: string;
    name: string;
    value: number;
    color: string;
}> = ({ icon, name, value, color }) => {
    const blocks = Array.from({ length: 5 }, (_, i) => (
        <div
            key={i}
            className={`attribute-block ${i < value ? 'filled' : 'empty'}`}
            style={{ backgroundColor: i < value ? color : 'rgba(255,255,255,0.1)' }}
        />
    ));

    return (
        <div className="attribute-row">
            <div className="attribute-label">
                <span className="attribute-icon">{icon}</span>
                <span className="attribute-name">{name}</span>
            </div>
            <div className="attribute-bars">
                {blocks}
                <span className="attribute-value">({value})</span>
            </div>
        </div>
    );
};

export const SpectralCard: React.FC<SpectralCardProps> = ({
    ingredient,
    position,
    visible
}) => {
    if (!visible) return null;

    const rarityStars = '★'.repeat(ingredient.rarity);
    const tagText = ingredient.tags.join(' • ');

    return (
        <div
            className="spectral-card"
            style={{
                left: position.x,
                top: position.y,
                borderColor: ingredient.color
            }}
        >
            <div className="spectral-header">
                <div className="ingredient-name" style={{ color: ingredient.color }}>
                    {ingredient.name}
                </div>
                <div className="ingredient-rarity" style={{ color: ingredient.color }}>
                    {rarityStars}
                </div>
            </div>

            <div className="ingredient-description">
                {ingredient.description}
            </div>

            <div className="ingredient-tags">
                {tagText}
            </div>

            <div className="attributes-section">
                <AttributeBar
                    icon="🌕"
                    name="Luminescence"
                    value={ingredient.attributes.luminescence}
                    color="#fbbf24"
                />
                <AttributeBar
                    icon="❄️"
                    name="Cooling"
                    value={ingredient.attributes.cooling}
                    color="#60a5fa"
                />
                <AttributeBar
                    icon="⚡"
                    name="Volatility"
                    value={ingredient.attributes.volatility}
                    color="#f87171"
                />
                <AttributeBar
                    icon="🌊"
                    name="Viscosity"
                    value={ingredient.attributes.viscosity}
                    color="#34d399"
                />
                <AttributeBar
                    icon="🔥"
                    name="Heat Capacity"
                    value={ingredient.attributes.heat_capacity}
                    color="#fb7185"
                />
                <AttributeBar
                    icon="☠️"
                    name="Toxicity"
                    value={ingredient.attributes.toxicity}
                    color="#a78bfa"
                />
            </div>
        </div>
    );
}; 