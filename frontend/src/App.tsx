import { useState } from 'react';
import './App.css';

interface Material {
  name: string;
  quantity: number;
  unit: string;
}

const STARTER_REAGENTS = [
  { name: 'cobalt_echo', unit: 'ml' },
  { name: 'lunar_sap', unit: 'ml' },
  { name: 'snow_ash', unit: 'g' }
];

function App() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [incantation, setIncantation] = useState('');
  const [output, setOutput] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addMaterial = (reagent: typeof STARTER_REAGENTS[0]) => {
    setMaterials([...materials, { ...reagent, quantity: 10 }]);
  };

  const updateQuantity = (index: number, quantity: number) => {
    const updated = [...materials];
    updated[index].quantity = quantity;
    setMaterials(updated);
  };

  const removeMaterial = (index: number) => {
    setMaterials(materials.filter((_, i) => i !== index));
  };

  const craft = async () => {
    if (materials.length === 0 || !incantation.trim()) {
      setOutput(['⚠️ Add materials and an incantation first!']);
      return;
    }

    setLoading(true);
    setOutput(['🔮 Initiating alchemical process...']);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/craft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ materials, incantation })
      });

      if (!response.ok) throw new Error('Craft failed');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No response body');

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');

        // Keep the last incomplete line in buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'chunk') {
                // Just show progress while streaming (don't display raw JSON chunks)
                setOutput(prev => {
                  const lastLine = prev[prev.length - 1];
                  if (lastLine && lastLine.startsWith('🔮')) {
                    const newOutput = [...prev];
                    newOutput[newOutput.length - 1] = '🔮 Alchemical process in progress' + '.'.repeat((Date.now() / 500) % 4);
                    return newOutput;
                  }
                  return prev;
                });
              } else if (data.type === 'complete') {
                const recipe = data.recipe;

                // Show steps progressively
                const showStepsProgressively = () => {
                  const stepEmojis = {
                    'heat': '🔥',
                    'mix': '🌀',
                    'transform': '✨',
                    'byproduct': '💨'
                  };

                  recipe.steps.forEach((step: any, index: number) => {
                    setTimeout(() => {
                      const emoji = stepEmojis[step.type as keyof typeof stepEmojis] || '⚗️';
                      let stepText = `${emoji} Step ${index + 1}: ${step.description}`;

                      // Add temperature info for heat steps
                      if (step.type === 'heat' && step.temperature) {
                        stepText += ` (${step.temperature}°C)`;
                      }

                      // Add byproduct info
                      if (step.type === 'byproduct' && step.item && step.quantity) {
                        stepText += ` → ${step.quantity}x ${step.item}`;
                      }

                      setOutput(prev => [...prev, stepText]);
                    }, index * 1500); // 1.5 second delay between steps
                  });

                  // Show final result after all steps
                  setTimeout(() => {
                    setOutput(prev => [
                      ...prev,
                      '',
                      '✨ Brewing complete!',
                      `📜 Recipe Hash: ${recipe.hash.slice(0, 8)}...`,
                      `🧪 Result: ${recipe.result.name}`,
                      `⭐ Rarity: ${recipe.result.rarity}`,
                      `🎯 Effects: ${recipe.result.effects.join(', ')}`
                    ]);
                  }, recipe.steps.length * 1500 + 500);
                };

                showStepsProgressively();
              }
            } catch (e) {
              // Ignore parse errors for incomplete JSON
              console.log('Parse error:', e, 'Line:', line);
            }
          }
        }
      }
    } catch (error) {
      console.error('Craft error:', error);
      setOutput(prev => [...prev, '❌ Brewing failed!', `Error: ${error instanceof Error ? error.message : String(error)}`]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <h1>⚗️ Alchemy 4D</h1>

      <div className="game-container">
        <div className="input-section">
          <h2>Reagents</h2>
          <div className="reagent-picker">
            {STARTER_REAGENTS.map(reagent => (
              <button
                key={reagent.name}
                onClick={() => addMaterial(reagent)}
                className="reagent-btn"
              >
                + {reagent.name}
              </button>
            ))}
          </div>

          <div className="bench">
            <h3>Workbench</h3>
            {materials.length === 0 ? (
              <p className="empty">No materials added</p>
            ) : (
              materials.map((material, index) => (
                <div key={index} className="material">
                  <input
                    type="number"
                    value={material.quantity}
                    onChange={(e) => updateQuantity(index, parseInt(e.target.value) || 0)}
                    className="quantity-input"
                  />
                  <span>{material.unit} {material.name}</span>
                  <button onClick={() => removeMaterial(index)} className="remove-btn">×</button>
                </div>
              ))
            )}
          </div>

          <div className="incantation">
            <h3>Incantation</h3>
            <textarea
              value={incantation}
              onChange={(e) => setIncantation(e.target.value)}
              placeholder="distil slowly to 180°C, quench in snow-ash, bind patiently..."
              rows={3}
            />
          </div>

          <button
            onClick={craft}
            disabled={loading || materials.length === 0 || !incantation}
            className="craft-btn"
          >
            {loading ? 'Brewing...' : '🔥 Craft'}
          </button>
        </div>

        <div className="output-section">
          <h2>Cauldron Output</h2>
          <div className="output">
            {output.map((line, index) => (
              <div key={index} className="output-line">{line}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;