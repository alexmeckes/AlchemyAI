import React, { useState, useEffect } from 'react';
import './App.css';

interface Material {
  name: string;
  quantity: number;
  unit: string;
}

interface ReactionStep {
  type: 'heat' | 'mix' | 'transform' | 'byproduct';
  description: string;
  temperature?: number;
  item?: string;
  quantity?: number;
}

interface PotionResult {
  name: string;
  rarity: number;
  effects: string[];
}

interface Recipe {
  hash: string;
  materials: Material[];
  incantation: string;
  steps: ReactionStep[];
  result: PotionResult;
  timestamp: string;
}

interface QuestObjective {
  type: 'effect' | 'rarity' | 'ingredient' | 'byproduct';
  description: string;
  target: string | number;
  completed: boolean;
}

interface DialogueMessage {
  id: string;
  speaker: 'player' | 'npc';
  content: string;
  timestamp: string;
}

interface Quest {
  id: string;
  title: string;
  description: string;
  requester: string;
  objectives: QuestObjective[];
  reward: string;
  status: 'unopened' | 'pending' | 'active' | 'completed';
  dialogue: DialogueMessage[];
  initialMessage: string;
}

const STARTER_REAGENTS = [
  { name: 'cobalt_echo', unit: 'ml' },
  { name: 'lunar_sap', unit: 'ml' },
  { name: 'snow_ash', unit: 'g' }
];

type SidebarTab = 'inventory' | 'workbench' | 'quest' | 'market';

function App() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [incantation, setIncantation] = useState('');
  const [output, setOutput] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [dialogueInput, setDialogueInput] = useState('');
  const [dialogueLoading, setDialogueLoading] = useState(false);
  const [openingMessage, setOpeningMessage] = useState<string>('');
  const [isOpeningMessage, setIsOpeningMessage] = useState(false);

  // Sidebar state
  const [activeTab, setActiveTab] = useState<SidebarTab>('workbench');
  const [inventory, setInventory] = useState<Material[]>([
    { name: 'cobalt_echo', quantity: 50, unit: 'ml' },
    { name: 'lunar_sap', quantity: 30, unit: 'ml' },
    { name: 'snow_ash', quantity: 25, unit: 'g' }
  ]);
  const [craftedPotions, setCraftedPotions] = useState<PotionResult[]>([]);

  // Load quests on component mount
  useEffect(() => {
    const loadQuests = async () => {
      try {
        const response = await fetch(`http://localhost:3001/api/quests`);
        if (response.ok) {
          const questData = await response.json();
          setQuests(questData);
        }
      } catch (error) {
        console.error('Failed to load quests:', error);
      }
    };

    loadQuests();
  }, []);

  const openMessage = async (questId: string) => {
    setIsOpeningMessage(true);
    setOpeningMessage('');

    try {
      const response = await fetch('http://localhost:3001/api/open-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ questId }),
      });

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'typing') {
                setOpeningMessage(data.content);
                if (data.complete) {
                  // Message is complete, refresh quests
                  setTimeout(async () => {
                    const questsResponse = await fetch('http://localhost:3001/api/quests');
                    if (questsResponse.ok) {
                      const questData = await questsResponse.json();
                      setQuests(questData);
                    }
                    setIsOpeningMessage(false);
                  }, 1000);
                }
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to open message:', error);
      setIsOpeningMessage(false);
    }
  };

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

  const sendDialogue = async (questId: string, message: string) => {
    if (!message.trim()) return;

    setDialogueLoading(true);
    try {
      const response = await fetch(`http://localhost:3001/api/dialogue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questId, message })
      });

      if (response.ok) {
        const result = await response.json();

        // Reload quests to get updated dialogue and status
        const questsResponse = await fetch(`http://localhost:3001/api/quests`);
        if (questsResponse.ok) {
          const questData = await questsResponse.json();
          setQuests(questData);
        }

        setDialogueInput('');
      }
    } catch (error) {
      console.error('Failed to send dialogue:', error);
    } finally {
      setDialogueLoading(false);
    }
  };

  const craft = async () => {
    if (materials.length === 0 || !incantation.trim()) {
      setOutput(['⚠️ Add materials and an incantation first!']);
      return;
    }

    setLoading(true);
    setOutput(['🔮 Initiating alchemical process...']);

    try {
      const response = await fetch(`http://localhost:3001/api/craft`, {
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
                const completedQuests = data.completedQuests || [];

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
                    const finalOutput = [
                      '',
                      '✨ Brewing complete!',
                      `📜 Recipe Hash: ${recipe.hash.slice(0, 8)}...`,
                      `🧪 Result: ${recipe.result.name}`,
                      `⭐ Rarity: ${recipe.result.rarity}`,
                      `🎯 Effects: ${recipe.result.effects.join(', ')}`
                    ];

                    // Add crafted potion to inventory
                    setCraftedPotions(prev => [...prev, recipe.result]);

                    // Add quest completion messages
                    if (completedQuests.length > 0) {
                      finalOutput.push('');
                      completedQuests.forEach((quest: Quest) => {
                        finalOutput.push(`🎉 Quest Complete: ${quest.title}`);
                        finalOutput.push(`💰 Reward: ${quest.reward}`);

                        // Update local quest state
                        setQuests(prev => prev.map(q =>
                          q.id === quest.id ? { ...q, status: 'completed' } : q
                        ));
                      });
                    }

                    setOutput(prev => [...prev, ...finalOutput]);
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

  const unopenedQuest = quests.find(q => q.status === 'unopened');
  const pendingQuest = quests.find(q => q.status === 'pending');
  const activeQuest = quests.find(q => q.status === 'active');
  const currentQuest = pendingQuest || activeQuest;

  return (
    <div className="app">
      <h1>⚗️ Alchemy 4D</h1>

      {/* Show unopened message first */}
      {unopenedQuest && (
        <div className="quest-panel">
          <h2>📩 New Message</h2>
          <div className="quest-card unopened">
            <h3>{unopenedQuest.title}</h3>
            <p>{unopenedQuest.description}</p>
            <button
              className="open-message-btn"
              onClick={() => openMessage(unopenedQuest.id)}
              disabled={isOpeningMessage}
            >
              {isOpeningMessage ? 'Opening...' : 'Open Message'}
            </button>
          </div>
        </div>
      )}

      {/* Message Opening Display */}
      {isOpeningMessage && (
        <div className="message-display">
          <div className="message-header">
            <h3>📜 Message from Master Aldric</h3>
          </div>
          <div className="message-content">
            <p>{openingMessage}<span className="typing-cursor">|</span></p>
          </div>
        </div>
      )}

      {/* Regular quest display */}
      {currentQuest && (
        <div className="quest-panel">
          <h2>
            {currentQuest.status === 'pending' ? '📨 New Message' : '🎯 Current Quest'}
          </h2>

          {currentQuest.status === 'pending' ? (
            <div className="dialogue-container">
              <div className="dialogue-messages">
                <div className="message npc-message">
                  <strong>Master Aldric:</strong>
                  <p>{currentQuest.initialMessage}</p>
                </div>

                {currentQuest.dialogue.map((msg) => (
                  <div key={msg.id} className={`message ${msg.speaker}-message`}>
                    <strong>{msg.speaker === 'player' ? 'You' : 'Master Aldric'}:</strong>
                    <p>{msg.content}</p>
                  </div>
                ))}
              </div>

              <div className="dialogue-input">
                <input
                  type="text"
                  value={dialogueInput}
                  onChange={(e) => setDialogueInput(e.target.value)}
                  placeholder="Type your response..."
                  disabled={dialogueLoading}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !dialogueLoading) {
                      sendDialogue(currentQuest.id, dialogueInput);
                    }
                  }}
                />
                <button
                  onClick={() => sendDialogue(currentQuest.id, dialogueInput)}
                  disabled={dialogueLoading || !dialogueInput.trim()}
                  className="send-btn"
                >
                  {dialogueLoading ? '...' : 'Send'}
                </button>
              </div>
            </div>
          ) : (
            <div className="quest-card">
              <h3>{currentQuest.title}</h3>
              <p className="quest-requester">— {currentQuest.requester}</p>
              <p className="quest-description">{currentQuest.description}</p>
              <div className="quest-objectives">
                {currentQuest.objectives.map((obj, index) => (
                  <div key={index} className={`objective ${obj.completed ? 'completed' : ''}`}>
                    {obj.completed ? '✅' : '⏳'} {obj.description}
                  </div>
                ))}
              </div>
              <p className="quest-reward">💰 Reward: {currentQuest.reward}</p>
            </div>
          )}
        </div>
      )}

      <div className="game-container">
        <div className="input-section">
          {/* Horizontal Tabs */}
          <div className="horizontal-tabs">
            <button
              className={`tab-btn ${activeTab === 'workbench' ? 'active' : ''}`}
              onClick={() => setActiveTab('workbench')}
            >
              ⚗️ Workbench
            </button>
            <button
              className={`tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}
              onClick={() => setActiveTab('inventory')}
            >
              📦 Inventory
            </button>
            <button
              className={`tab-btn ${activeTab === 'quest' ? 'active' : ''}`}
              onClick={() => setActiveTab('quest')}
            >
              🎯 Quests
            </button>
            <button
              className={`tab-btn ${activeTab === 'market' ? 'active' : ''}`}
              onClick={() => setActiveTab('market')}
            >
              🏪 Market
            </button>
          </div>

          {/* Tab Content */}
          <div className="tab-content">
            {activeTab === 'workbench' && (
              <div className="workbench-content">
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
            )}

            {activeTab === 'inventory' && (
              <div className="inventory-content">
                <h2>Inventory</h2>

                <div className="inventory-section">
                  <h3>Reagents</h3>
                  <div className="inventory-items">
                    {inventory.map((item, index) => (
                      <div key={index} className="inventory-item">
                        <span className="item-name">{item.name}</span>
                        <span className="item-quantity">{item.quantity} {item.unit}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {craftedPotions.length > 0 && (
                  <div className="inventory-section">
                    <h3>Crafted Potions</h3>
                    <div className="potion-collection">
                      {craftedPotions.map((potion, index) => (
                        <div key={index} className="potion-item">
                          <div className="potion-name">{potion.name}</div>
                          <div className="potion-rarity">★{potion.rarity}</div>
                          <div className="potion-effects">
                            {potion.effects.join(', ')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'quest' && (
              <div className="quest-content">
                <h2>Quests</h2>
                {quests.length === 0 ? (
                  <p className="empty">No quests available</p>
                ) : (
                  <div className="quest-list">
                    {quests.map(quest => (
                      <div key={quest.id} className={`quest-summary ${quest.status}`}>
                        <div className="quest-title">{quest.title}</div>
                        <div className="quest-status">{quest.status}</div>
                        <div className="quest-progress">
                          {quest.objectives.filter(obj => obj.completed).length}/{quest.objectives.length} objectives
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'market' && (
              <div className="market-content">
                <h2>Market</h2>
                <div className="market-items">
                  {STARTER_REAGENTS.map(reagent => (
                    <div key={reagent.name} className="market-item">
                      <span className="item-name">{reagent.name}</span>
                      <span className="item-price">10 gold / {reagent.unit}</span>
                      <button className="buy-btn" disabled>Buy</button>
                    </div>
                  ))}
                </div>
                <p className="market-note">💰 Coming soon: Buy reagents with gold earned from quests!</p>
              </div>
            )}
          </div>
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