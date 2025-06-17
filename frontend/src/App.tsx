import React, { useState, useEffect } from 'react';
import './App.css';
import { IncantationEditor } from './components/IncantationEditor';

interface Material {
  name: string;
  quantity: number;
  unit: string;
  description?: string;
}

interface ReactionStep {
  type: 'heat' | 'mix' | 'transform' | 'byproduct';
  description: string;
  temperature?: number;
  item?: string;
  quantity?: number;
  itemDescription?: string;
}

interface PotionResult {
  name: string;
  rarity: number;
  effects: string[];
  description?: string;
  imageUrl?: string;
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
  {
    name: 'cobalt_echo',
    unit: 'ml',
    description: 'A shimmering azure liquid that resonates with faint musical tones when disturbed, containing traces of crystallized starlight.'
  },
  {
    name: 'lunar_sap',
    unit: 'ml',
    description: 'Silvery, viscous fluid that glows softly in darkness, harvested from moonlit trees during the new moon.'
  },
  {
    name: 'snow_ash',
    unit: 'g',
    description: 'Fine, pearl-white powder that feels cold to the touch and sparkles with tiny ice crystals that never melt.'
  }
];

interface GatheringLocation {
  id: string;
  name: string;
  description: string;
  reagents: {
    name: string;
    unit: string;
    description: string;
    baseAmount: number;
    rarity: 'common' | 'uncommon' | 'rare';
  }[];
  cooldown: number; // minutes
  lastGathered?: number; // timestamp
}

const GATHERING_LOCATIONS: GatheringLocation[] = [
  {
    id: 'crystal_caves',
    name: 'Crystal Caves',
    description: 'Deep underground caverns where magical crystals grow in eternal darkness, resonating with ancient power.',
    reagents: [
      {
        name: 'cobalt_echo',
        unit: 'ml',
        description: 'A shimmering azure liquid that resonates with faint musical tones when disturbed, containing traces of crystallized starlight.',
        baseAmount: 15,
        rarity: 'common'
      },
      {
        name: 'crystal_dust',
        unit: 'g',
        description: 'Glittering powder that sparkles with inner light, ground from the walls of ancient crystal formations.',
        baseAmount: 8,
        rarity: 'uncommon'
      }
    ],
    cooldown: 30
  },
  {
    id: 'moonlit_grove',
    name: 'Moonlit Grove',
    description: 'A sacred forest clearing where silver trees weep luminous sap under the eternal moonlight.',
    reagents: [
      {
        name: 'lunar_sap',
        unit: 'ml',
        description: 'Silvery, viscous fluid that glows softly in darkness, harvested from moonlit trees during the new moon.',
        baseAmount: 12,
        rarity: 'common'
      },
      {
        name: 'moon_petal',
        unit: 'piece',
        description: 'Delicate silver petals that shimmer with captured moonbeams, only blooming in pure lunar light.',
        baseAmount: 3,
        rarity: 'rare'
      }
    ],
    cooldown: 45
  },
  {
    id: 'frozen_peaks',
    name: 'Frozen Peaks',
    description: 'Windswept mountain summits where eternal winter preserves the essence of ancient storms.',
    reagents: [
      {
        name: 'snow_ash',
        unit: 'g',
        description: 'Fine, pearl-white powder that feels cold to the touch and sparkles with tiny ice crystals that never melt.',
        baseAmount: 10,
        rarity: 'common'
      },
      {
        name: 'frost_essence',
        unit: 'ml',
        description: 'Liquid cold itself, captured from the breath of winter winds and crystallized into pure essence.',
        baseAmount: 6,
        rarity: 'uncommon'
      }
    ],
    cooldown: 60
  }
];

type SidebarTab = 'inventory' | 'craft' | 'quests' | 'gather';

function App() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [incantation, setIncantation] = useState('');
  const [output, setOutput] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [dialogueInput, setDialogueInput] = useState('');
  const [dialogueLoading, setDialogueLoading] = useState(false);

  // Sidebar state
  const [activeTab, setActiveTab] = useState<SidebarTab>('craft');
  const [inventory, setInventory] = useState<Material[]>([
    {
      name: 'cobalt_echo',
      quantity: 50,
      unit: 'ml',
      description: 'A shimmering azure liquid that resonates with faint musical tones when disturbed, containing traces of crystallized starlight.'
    },
    {
      name: 'lunar_sap',
      quantity: 30,
      unit: 'ml',
      description: 'Silvery, viscous fluid that glows softly in darkness, harvested from moonlit trees during the new moon.'
    },
    {
      name: 'snow_ash',
      quantity: 25,
      unit: 'g',
      description: 'Fine, pearl-white powder that feels cold to the touch and sparkles with tiny ice crystals that never melt.'
    }
  ]);
  const [craftedPotions, setCraftedPotions] = useState<PotionResult[]>([]);
  const [imagePollingIntervals, setImagePollingIntervals] = useState<Map<string, number>>(new Map());
  const [potionPreview, setPotionPreview] = useState<{
    state: 'none' | 'loading' | 'revealed';
    potion?: PotionResult;
    recipeHash?: string;
  }>({ state: 'none' });
  const [gatheringLocations, setGatheringLocations] = useState<GatheringLocation[]>(GATHERING_LOCATIONS);
  const [gatheringInProgress, setGatheringInProgress] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [gatherInput, setGatherInput] = useState('');
  const [gatherOutput, setGatherOutput] = useState<string[]>([]);
  const [gatherLoading, setGatherLoading] = useState(false);
  const [discoveredReagents, setDiscoveredReagents] = useState<Set<string>>(new Set(['cobalt_echo', 'lunar_sap', 'snow_ash'])); // Start with basic reagents discovered
  const [dynamicReagents, setDynamicReagents] = useState<{ [locationId: string]: any[] }>({});

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

    // Add event listener for incantation submit (Ctrl+Enter)
    const handleIncantationSubmit = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail?.value && materials.length > 0 && !loading) {
        craft();
      }
    };

    document.addEventListener('incantation-submit', handleIncantationSubmit);

    // Cleanup intervals on unmount
    return () => {
      imagePollingIntervals.forEach(intervalId => {
        clearInterval(intervalId);
      });
      document.removeEventListener('incantation-submit', handleIncantationSubmit);
    };
  }, [materials, loading]);

  const openMessage = async (questId: string) => {
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
              if (data.type === 'typing' && data.complete) {
                // Immediately refresh quests to show the dialogue interface
                const questsResponse = await fetch('http://localhost:3001/api/quests');
                if (questsResponse.ok) {
                  const questData = await questsResponse.json();
                  setQuests(questData);
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

  const canGatherFrom = (location: GatheringLocation): boolean => {
    if (!location.lastGathered) return true;
    const now = Date.now();
    const cooldownMs = location.cooldown * 60 * 1000; // Convert minutes to milliseconds
    return (now - location.lastGathered) >= cooldownMs;
  };

  const getTimeUntilNextGather = (location: GatheringLocation): string => {
    if (!location.lastGathered) return '';
    const now = Date.now();
    const cooldownMs = location.cooldown * 60 * 1000;
    const timeLeft = cooldownMs - (now - location.lastGathered);

    if (timeLeft <= 0) return '';

    const minutes = Math.ceil(timeLeft / (60 * 1000));
    return `${minutes}m`;
  };

  const gatherFromLocation = async (locationId: string) => {
    const location = gatheringLocations.find(loc => loc.id === locationId);
    if (!location || !canGatherFrom(location) || gatheringInProgress) return;

    setGatheringInProgress(locationId);

    // Simulate gathering time (2-4 seconds)
    const gatherTime = 2000 + Math.random() * 2000;

    setTimeout(() => {
      // Calculate gathered reagents
      const gatheredReagents: Material[] = [];

      location.reagents.forEach(reagent => {
        let amount = reagent.baseAmount;

        // Add randomness based on rarity
        const randomMultiplier = 0.7 + Math.random() * 0.6; // 0.7 to 1.3
        amount = Math.floor(amount * randomMultiplier);

        // Rarity bonus chance
        if (reagent.rarity === 'uncommon' && Math.random() < 0.3) {
          amount += Math.floor(reagent.baseAmount * 0.5);
        } else if (reagent.rarity === 'rare' && Math.random() < 0.15) {
          amount += Math.floor(reagent.baseAmount * 0.8);
        }

        if (amount > 0) {
          gatheredReagents.push({
            name: reagent.name,
            quantity: amount,
            unit: reagent.unit,
            description: reagent.description
          });
        }
      });

      // Update inventory
      setInventory(prevInventory => {
        const newInventory = [...prevInventory];

        gatheredReagents.forEach(gathered => {
          const existingIndex = newInventory.findIndex(item => item.name === gathered.name);
          if (existingIndex >= 0) {
            newInventory[existingIndex].quantity += gathered.quantity;
          } else {
            newInventory.push(gathered);
          }
        });

        return newInventory;
      });

      // Update location cooldown
      setGatheringLocations(prevLocations =>
        prevLocations.map(loc =>
          loc.id === locationId
            ? { ...loc, lastGathered: Date.now() }
            : loc
        )
      );

      setGatheringInProgress(null);
    }, gatherTime);
  };

  const selectLocation = (locationId: string) => {
    setSelectedLocation(locationId);
    const location = gatheringLocations.find(loc => loc.id === locationId);
    if (location) {
      setGatherOutput([
        `🌍 You arrive at the ${location.name}`,
        `${location.description}`,
        '',
        '💡 Try commands like:',
        '• "examine" - Look around carefully',
        '• "search" - Search for reagents',
        '• "gather [reagent]" - Attempt to collect specific reagents',
        '• "listen" - Listen to the environment',
        '• "focus" - Channel your alchemical senses',
        ''
      ]);
    }
  };

  const processGatherCommand = async (command: string) => {
    if (!selectedLocation || gatherLoading) return;

    const location = gatheringLocations.find(loc => loc.id === selectedLocation);
    if (!location) return;

    setGatherLoading(true);
    const cmd = command.toLowerCase().trim();

    // Add user command to output
    setGatherOutput(prev => [...prev, `> ${command}`]);

    try {
      // Check if this is a gather command that should actually gather reagents
      if (cmd.includes('gather') && canGatherFrom(location)) {
        // Handle actual gathering
        const gatherResponse = handleActualGathering(location, cmd);
        setGatherOutput(prev => [...prev, ...gatherResponse, '']);
        setGatherLoading(false);
        return;
      }

      // For exploration commands, use LLM with discovery mechanics
      const context = {
        lastGathered: location.lastGathered,
        canGather: canGatherFrom(location),
        timeUntilNext: getTimeUntilNextGather(location),
        discoveredReagents: Array.from(discoveredReagents),
        undiscoveredCount: location.reagents.filter(r => !discoveredReagents.has(r.name)).length,
        dynamicReagents: dynamicReagents[selectedLocation] || []
      };

      const response = await fetch('http://localhost:3001/api/explore-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationId: selectedLocation, command: cmd, context })
      });

      if (response.ok) {
        const data = await response.json();
        let narrative = data.narrative;

        // Check for reagent discovery (30% chance on exploration commands)
        if (['search', 'examine', 'focus', 'listen'].some(verb => cmd.includes(verb))) {
          const discoveryChance = Math.random();

          if (discoveryChance < 0.3) { // 30% chance
            // First try to discover static reagents
            const undiscoveredStatic = location.reagents.filter(r => !discoveredReagents.has(r.name));

            if (undiscoveredStatic.length > 0 && Math.random() < 0.6) {
              // 60% chance to discover static reagent
              const reagent = undiscoveredStatic[Math.floor(Math.random() * undiscoveredStatic.length)];
              setDiscoveredReagents(prev => new Set([...prev, reagent.name]));
              narrative += `\n\n🎉 Discovery! You found ${reagent.name.replace('_', ' ')}!`;
            } else {
              // 40% chance to generate completely new dynamic reagent
              await generateDynamicReagent(selectedLocation, cmd);
            }
          }
        }

        setGatherOutput(prev => [...prev, narrative, '']);
      } else {
        // Fallback to hardcoded responses
        const fallbackResponse = getFallbackResponse(location, cmd);
        setGatherOutput(prev => [...prev, ...fallbackResponse, '']);
      }
    } catch (error) {
      console.error('Error processing command:', error);
      const fallbackResponse = getFallbackResponse(location, cmd);
      setGatherOutput(prev => [...prev, ...fallbackResponse, '']);
    }

    setGatherLoading(false);
  };

  const generateDynamicReagent = async (locationId: string, discoveryMethod: string) => {
    try {
      const response = await fetch('http://localhost:3001/api/generate-reagent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId,
          context: { discoveryMethod }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const newReagent = data.reagent;

        if (newReagent && newReagent.name) {
          // Add to dynamic reagents for this location
          setDynamicReagents(prev => ({
            ...prev,
            [locationId]: [...(prev[locationId] || []), newReagent]
          }));

          // Mark as discovered
          setDiscoveredReagents(prev => new Set([...prev, newReagent.name]));

          // Add to inventory with small amount
          const amount = Math.floor(newReagent.baseAmount * (0.7 + Math.random() * 0.6));
          setInventory(prev => {
            const existingIndex = prev.findIndex(item => item.name === newReagent.name);
            if (existingIndex >= 0) {
              // Update existing item
              const updated = [...prev];
              updated[existingIndex] = {
                ...updated[existingIndex],
                quantity: updated[existingIndex].quantity + amount
              };
              return updated;
            } else {
              // Add new item
              return [...prev, {
                name: newReagent.name,
                quantity: amount,
                unit: newReagent.unit,
                description: newReagent.description
              }];
            }
          });

          setGatherOutput(prev => [...prev,
            `✨ INCREDIBLE DISCOVERY! ✨`,
          `You have discovered a completely new reagent: ${newReagent.name.replace('_', ' ')}!`,
          `${newReagent.description}`,
          `You carefully collect ${amount} ${newReagent.unit} of this precious substance.`,
          `Rarity: ${newReagent.rarity}`
          ]);
        }
      }
    } catch (error) {
      console.error('Error generating dynamic reagent:', error);
    }
  };

  const handleActualGathering = (location: GatheringLocation, command: string): string[] => {
    // Extract reagent name from command
    const reagentName = command.replace('gather', '').trim();
    const reagent = location.reagents.find(r =>
      r.name.toLowerCase().includes(reagentName) || reagentName.includes(r.name.toLowerCase())
    );

    if (reagentName && reagent) {
      return gatherSpecificReagent(location, reagent);
    } else {
      return gatherAllReagents(location);
    }
  };

  const getFallbackResponse = (location: GatheringLocation, command: string): string[] => {
    // Keep the original hardcoded responses as fallback
    if (command.includes('examine') || command.includes('look')) {
      return getExamineResponse(location);
    } else if (command.includes('search')) {
      return getSearchResponse(location);
    } else if (command.includes('listen')) {
      return getListenResponse(location);
    } else if (command.includes('focus')) {
      return getFocusResponse(location);
    } else if (command.includes('help')) {
      return [
        '📖 Available commands:',
        '• examine - Look around carefully',
        '• search - Search for reagents',
        '• gather [reagent] - Collect specific reagents',
        '• listen - Listen to the environment',
        '• focus - Channel your alchemical senses'
      ];
    } else {
      return [
        '❓ You try to ' + command + ', but nothing happens.',
        'Type "help" for available commands.'
      ];
    }
  };

  const gatherSpecificReagent = (location: GatheringLocation, reagent: any): string[] => {
    if (!canGatherFrom(location)) {
      return [`You cannot gather from ${location.name} yet. ${getTimeUntilNextGather(location)}`];
    }

    // Calculate gathered amount with randomness
    const randomMultiplier = 0.7 + Math.random() * 0.6; // 0.7 to 1.3
    let amount = Math.floor(reagent.baseAmount * randomMultiplier);

    // Rarity bonus chance
    if (reagent.rarity === 'uncommon' && Math.random() < 0.3) {
      amount += Math.floor(reagent.baseAmount * 0.2);
    } else if (reagent.rarity === 'rare' && Math.random() < 0.15) {
      amount += Math.floor(reagent.baseAmount * 0.5);
    } else if (reagent.rarity === 'legendary' && Math.random() < 0.05) {
      amount += Math.floor(reagent.baseAmount * 1.0);
    }

    // Update inventory
    setInventory(prev => {
      const existingIndex = prev.findIndex(item => item.name === reagent.name);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + amount
        };
        return updated;
      } else {
        return [...prev, {
          name: reagent.name,
          quantity: amount,
          unit: reagent.unit,
          description: reagent.description
        }];
      }
    });

    // Set cooldown
    setGatheringLocations(prev => prev.map(loc =>
      loc.id === location.id ? { ...loc, lastGathered: Date.now() } : loc
    ));

    return [
      `You carefully gather ${amount} ${reagent.unit} of ${reagent.name.replace('_', ' ')}.`,
      reagent.description || `A ${reagent.rarity} reagent from ${location.name}.`,
      `${location.name} will replenish in ${location.cooldown} minutes.`
    ];
  };

  const gatherAllReagents = (location: GatheringLocation): string[] => {
    if (!canGatherFrom(location)) {
      return [`You cannot gather from ${location.name} yet. ${getTimeUntilNextGather(location)}`];
    }

    const results: string[] = [];
    const allReagents = [
      ...location.reagents.filter(r => discoveredReagents.has(r.name)),
      ...(dynamicReagents[location.id] || []).filter(r => discoveredReagents.has(r.name))
    ];

    allReagents.forEach(reagent => {
      // Calculate gathered amount with randomness
      const randomMultiplier = 0.7 + Math.random() * 0.6;
      let amount = Math.floor(reagent.baseAmount * randomMultiplier);

      // Rarity bonus chance
      if (reagent.rarity === 'uncommon' && Math.random() < 0.3) {
        amount += Math.floor(reagent.baseAmount * 0.2);
      } else if (reagent.rarity === 'rare' && Math.random() < 0.15) {
        amount += Math.floor(reagent.baseAmount * 0.5);
      } else if (reagent.rarity === 'legendary' && Math.random() < 0.05) {
        amount += Math.floor(reagent.baseAmount * 1.0);
      }

      // Update inventory
      setInventory(prev => {
        const existingIndex = prev.findIndex(item => item.name === reagent.name);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            quantity: updated[existingIndex].quantity + amount
          };
          return updated;
        } else {
          return [...prev, {
            name: reagent.name,
            quantity: amount,
            unit: reagent.unit,
            description: reagent.description
          }];
        }
      });

      const prefix = (dynamicReagents[location.id] || []).some(r => r.name === reagent.name) ? '✨ ' : '';
      results.push(`${prefix}${reagent.name.replace('_', ' ')}: ${amount} ${reagent.unit}`);
    });

    // Set cooldown
    setGatheringLocations(prev => prev.map(loc =>
      loc.id === location.id ? { ...loc, lastGathered: Date.now() } : loc
    ));

    return [
      `You gather resources from ${location.name}:`,
      ...results,
      `${location.name} will replenish in ${location.cooldown} minutes.`
    ];
  };

  const getExamineResponse = (location: GatheringLocation): string[] => {
    const responses = {
      crystal_caves: [
        '🔍 The cavern walls shimmer with embedded crystals of every hue.',
        'Cobalt-blue formations pulse with inner light, creating musical echoes.',
        'Fine crystal dust sparkles in the air, catching what little light filters down.',
        'Ancient formations suggest this place has been growing for millennia.'
      ],
      moonlit_grove: [
        '🔍 Silver trees stretch toward an eternal moon, their bark gleaming.',
        'Luminous sap weeps from carefully tended cuts in the tree trunks.',
        'Delicate moon petals drift down like silver snow from the canopy.',
        'The air itself seems to shimmer with captured moonbeams.'
      ],
      frozen_peaks: [
        '🔍 Endless white stretches before you, broken by crystalline ice formations.',
        'The wind carries particles of snow ash that never seem to melt.',
        'Frost essence pools in natural ice bowls, liquid cold made manifest.',
        'Your breath creates clouds that sparkle with tiny ice crystals.'
      ]
    };
    return responses[location.id as keyof typeof responses] || ['You examine the area carefully.'];
  };

  const getSearchResponse = (location: GatheringLocation): string[] => {
    const canGather = canGatherFrom(location);
    if (!canGather) {
      return [
        '⏰ The area shows signs of recent gathering.',
        `You must wait ${getTimeUntilNextGather(location)} before the reagents replenish.`
      ];
    }

    const reagentList = location.reagents.map(r =>
      `• ${r.name} (${r.rarity}) - ${r.description}`
    ).join('\n');

    return [
      '🔎 You search the area thoroughly and discover:',
      reagentList,
      '',
      `Use "gather [reagent name]" to collect them.`
    ];
  };

  const getListenResponse = (location: GatheringLocation): string[] => {
    const responses = {
      crystal_caves: [
        '👂 You hear the faint musical resonance of the crystals.',
        'Deep underground, water drips in a rhythmic pattern.',
        'The crystals seem to hum with ancient power.'
      ],
      moonlit_grove: [
        '👂 Silver leaves rustle with an otherworldly whisper.',
        'The eternal moon seems to sing a lullaby to the trees.',
        'You hear the gentle drip of luminous sap.'
      ],
      frozen_peaks: [
        '👂 The wind howls across the peaks with icy fury.',
        'Ice crystals chime like distant bells in the breeze.',
        'The silence between gusts is profound and absolute.'
      ]
    };
    return responses[location.id as keyof typeof responses] || ['You listen carefully to your surroundings.'];
  };

  const getFocusResponse = (location: GatheringLocation): string[] => {
    const canGather = canGatherFrom(location);
    if (!canGather) {
      return [
        '🧘 You focus your alchemical senses...',
        'The magical energies here are dormant, recently harvested.',
        `They will regenerate in ${getTimeUntilNextGather(location)}.`
      ];
    }

    const reagentCount = location.reagents.length;
    const rareReagents = location.reagents.filter(r => r.rarity === 'rare').length;

    return [
      '🧘 You focus your alchemical senses...',
      `You detect ${reagentCount} types of reagents in this area.`,
      rareReagents > 0 ? `✨ You sense ${rareReagents} rare essence(s) nearby!` : '💫 The magical energies here are stable and ready for harvest.',
      'The area pulses with harvestable energy.'
    ];
  };

  const pollForImage = async (recipeHash: string) => {
    try {
      const response = await fetch(`http://localhost:3001/api/recipe/${recipeHash}/image`);
      if (response.ok) {
        const data = await response.json();
        if (data.hasImage && data.imageUrl) {
          // Update the crafted potion with the new image
          setCraftedPotions(prev =>
            prev.map((potion, index) => {
              // Find the potion by matching recipe hash
              // We'll store the hash as a temporary property
              if ((potion as any).recipeHash === recipeHash) {
                const updatedPotion = { ...potion, imageUrl: data.imageUrl };
                // Remove the temporary hash property
                delete (updatedPotion as any).recipeHash;
                return updatedPotion;
              }
              return potion;
            })
          );

          // Update potion preview if this is the active preview
          setPotionPreview(prev => {
            if (prev.state === 'loading' && prev.recipeHash === recipeHash && prev.potion) {
              return {
                state: 'revealed',
                potion: { ...prev.potion, imageUrl: data.imageUrl },
                recipeHash
              };
            }
            return prev;
          });

          // Clear the polling interval
          const intervals = imagePollingIntervals;
          const intervalId = intervals.get(recipeHash);
          if (intervalId) {
            clearInterval(intervalId);
            intervals.delete(recipeHash);
            setImagePollingIntervals(new Map(intervals));
          }

          return true; // Image found
        }
      }
    } catch (error) {
      console.error('Error polling for image:', error);
    }
    return false; // No image yet
  };

  const startImagePolling = (recipeHash: string) => {
    // Don't start polling if already polling for this recipe
    if (imagePollingIntervals.has(recipeHash)) {
      return;
    }

    const intervalId = setInterval(async () => {
      const imageFound = await pollForImage(recipeHash);
      if (imageFound) {
        // Polling will be cleared in pollForImage
      }
    }, 2000); // Poll every 2 seconds

    setImagePollingIntervals(prev => new Map(prev.set(recipeHash, intervalId)));

    // Stop polling after 60 seconds to avoid infinite polling
    setTimeout(() => {
      const intervals = imagePollingIntervals;
      const currentIntervalId = intervals.get(recipeHash);
      if (currentIntervalId === intervalId) {
        clearInterval(intervalId);
        intervals.delete(recipeHash);
        setImagePollingIntervals(new Map(intervals));
      }
    }, 60000);
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
    setPotionPreview({ state: 'none' }); // Clear previous preview

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

                    // Add crafted potion to inventory with temporary hash for tracking
                    const potionWithHash = { ...recipe.result, recipeHash: recipe.hash };
                    setCraftedPotions(prev => [...prev, potionWithHash]);

                    // Set up potion preview
                    if (recipe.result.imageUrl) {
                      // Image already available - show immediately
                      setPotionPreview({
                        state: 'revealed',
                        potion: recipe.result,
                        recipeHash: recipe.hash
                      });
                    } else {
                      // Show loading state and start polling
                      setPotionPreview({
                        state: 'loading',
                        potion: recipe.result,
                        recipeHash: recipe.hash
                      });
                      startImagePolling(recipe.hash);
                    }

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
            >
              Open Message
            </button>
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
              className={`tab-btn ${activeTab === 'craft' ? 'active' : ''}`}
              onClick={() => setActiveTab('craft')}
            >
              ⚗️ Craft
            </button>
            <button
              className={`tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}
              onClick={() => setActiveTab('inventory')}
            >
              📦 Inventory
            </button>
            <button
              className={`tab-btn ${activeTab === 'quests' ? 'active' : ''}`}
              onClick={() => setActiveTab('quests')}
            >
              🎯 Quests
            </button>

            <button
              className={`tab-btn ${activeTab === 'gather' ? 'active' : ''}`}
              onClick={() => setActiveTab('gather')}
            >
              🌿 Gather
            </button>
          </div>

          {/* Tab Content */}
          <div className="tab-content">
            {activeTab === 'craft' && (
              <div className="workbench-content">
                <h2>Reagents</h2>
                <div className="reagent-picker">
                  {STARTER_REAGENTS.map(reagent => (
                    <button
                      key={reagent.name}
                      onClick={() => addMaterial(reagent)}
                      className="reagent-btn"
                      title={reagent.description}
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
                          min="1"
                        />
                        <span>{material.unit} {material.name}</span>
                        <button onClick={() => removeMaterial(index)} className="remove-btn">×</button>
                      </div>
                    ))
                  )}
                </div>

                <div className="incantation">
                  <h3>Incantation</h3>
                  <IncantationEditor
                    value={incantation}
                    onChange={setIncantation}
                    placeholder="Speak your incantation..."
                  />
                </div>

                <button
                  onClick={craft}
                  disabled={loading || materials.length === 0 || !incantation}
                  className="craft-btn"
                >
                  {loading ? 'Crafting...' : 'Craft Potion'}
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
                        <div className="item-header">
                          <h4 className="item-name">{item.name.replace(/_/g, ' ')}</h4>
                          <span className="item-quantity">{item.quantity} {item.unit}</span>
                        </div>
                        {item.description && (
                          <p className="item-description">{item.description}</p>
                        )}
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
                          <div className="potion-image">
                            {potion.imageUrl ? (
                              <img src={potion.imageUrl} alt={potion.name} />
                            ) : (potion as any).recipeHash && imagePollingIntervals.has((potion as any).recipeHash) ? (
                              <div className="potion-image-loading">
                                ✨<br />Crafting<br />Icon...
                              </div>
                            ) : (
                              <div style={{ fontSize: '2rem' }}>🧪</div>
                            )}
                          </div>
                          <div className="potion-info">
                            <div className="potion-header">
                              <h4 className="potion-name">{potion.name}</h4>
                              <span className="potion-rarity">★{potion.rarity}</span>
                            </div>
                            <div className="potion-effects">
                              <strong>Effects:</strong> {potion.effects.join(', ')}
                            </div>
                            {potion.description && (
                              <p className="potion-description">{potion.description}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'quests' && (
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

            {activeTab === 'gather' && (
              <div className="gather-content">
                <h3>🌿 Gathering Locations</h3>
                <div className="gathering-locations">
                  {gatheringLocations.map(location => (
                    <div key={location.id} className="location-card">
                      <h4>{location.name}</h4>
                      <p className="location-description">{location.description}</p>

                      <div className="location-reagents">
                        <strong>Known Reagents:</strong>
                        <ul>
                          {location.reagents
                            .filter(reagent => discoveredReagents.has(reagent.name))
                            .map((reagent, index) => (
                              <li key={index} className={`reagent-${reagent.rarity}`}>
                                {reagent.name.replace('_', ' ')} ({reagent.baseAmount}{reagent.unit}) - {reagent.rarity}
                              </li>
                            ))}
                          {(dynamicReagents[location.id] || [])
                            .filter(reagent => discoveredReagents.has(reagent.name))
                            .map((reagent, index) => (
                              <li key={`dynamic-${index}`} className={`reagent-${reagent.rarity}`}>
                                ✨ {reagent.name.replace('_', ' ')} ({reagent.baseAmount}{reagent.unit}) - {reagent.rarity}
                              </li>
                            ))}
                          {(location.reagents.filter(reagent => !discoveredReagents.has(reagent.name)).length +
                            (dynamicReagents[location.id] || []).filter(reagent => !discoveredReagents.has(reagent.name)).length) > 0 && (
                              <li className="reagent-unknown">
                                ??? - {location.reagents.filter(reagent => !discoveredReagents.has(reagent.name)).length +
                                  (dynamicReagents[location.id] || []).filter(reagent => !discoveredReagents.has(reagent.name)).length} unknown reagents await discovery...
                              </li>
                            )}
                        </ul>
                      </div>

                      <div className="location-actions">
                        <button
                          className={`location-select-btn ${selectedLocation === location.id ? 'selected' : ''}`}
                          onClick={() => selectLocation(location.id)}
                        >
                          {selectedLocation === location.id ? '📍 Selected' : '🗺️ Select Location'}
                        </button>

                        <div className="location-status">
                          {gatheringInProgress === location.id ? (
                            <span className="status-gathering">⏳ Gathering...</span>
                          ) : canGatherFrom(location) ? (
                            <span className="status-ready">✅ Ready</span>
                          ) : (
                            <span className="status-cooldown">
                              ⏰ {getTimeUntilNextGather(location)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {selectedLocation && (
                  <div className="selected-location-info">
                    <h4>📍 Current Location: {gatheringLocations.find(loc => loc.id === selectedLocation)?.name}</h4>
                    <p>Use the text interface on the right to explore and gather reagents!</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="output-section">
          <h3>
            {activeTab === 'craft' && '🧪 Cauldron Output'}
            {activeTab === 'inventory' && '📦 Potion Collection'}
            {activeTab === 'gather' && '🌍 Location Explorer'}
            {activeTab === 'quests' && '📜 Quest Journal'}
          </h3>

          {activeTab === 'craft' && (
            <div className="craft-output">
              {output.length > 0 ? (
                <>
                  {output.map((line, index) => (
                    <div key={index} className="output-line">{line}</div>
                  ))}

                  {/* Potion Preview (Loot Box) */}
                  {potionPreview.state !== 'none' && (
                    <div className="potion-preview">
                      {potionPreview.state === 'loading' && (
                        <div className="potion-preview-loading">
                          <div className="mystical-cauldron"></div>
                          <div className="brewing-text">
                            ✨ Your creation is taking shape...
                          </div>
                          <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                            Brewing magical essence...
                          </div>
                        </div>
                      )}

                      {potionPreview.state === 'revealed' && potionPreview.potion && (
                        <div className="potion-preview-revealed">
                          <div className="reveal-title sparkle-text-fade">
                            ✨ Behold your creation! ✨
                          </div>

                          <div className={`revealed-potion rarity-${potionPreview.potion.rarity}`}>
                            <div className="revealed-potion-icon">
                              {potionPreview.potion.imageUrl ? (
                                <img src={potionPreview.potion.imageUrl} alt={potionPreview.potion.name} />
                              ) : (
                                <div style={{
                                  width: '100%',
                                  height: '100%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '4rem',
                                  background: 'linear-gradient(135deg, #4a90e2, #7b68ee)'
                                }}>
                                  🧪
                                </div>
                              )}
                            </div>

                            <div className="revealed-potion-info">
                              <div className="revealed-potion-name">
                                {potionPreview.potion.name}
                              </div>
                              <div className="revealed-potion-rarity">
                                <span className="rarity-stars">
                                  {'★'.repeat(Math.min(potionPreview.potion.rarity, 5))}
                                </span>
                                {' '}
                                <span style={{
                                  color: potionPreview.potion.rarity >= 4 ? '#f59e0b' :
                                    potionPreview.potion.rarity >= 3 ? '#a855f7' :
                                      potionPreview.potion.rarity >= 2 ? '#3b82f6' : '#22c55e'
                                }}>
                                  {potionPreview.potion.rarity >= 5 ? 'Legendary' :
                                    potionPreview.potion.rarity >= 4 ? 'Epic' :
                                      potionPreview.potion.rarity >= 3 ? 'Rare' :
                                        potionPreview.potion.rarity >= 2 ? 'Uncommon' : 'Common'}
                                </span>
                              </div>
                              <div className="revealed-potion-effects">
                                <strong>Effects:</strong>
                                <ul style={{ marginTop: '0.5rem', paddingLeft: '1rem' }}>
                                  {potionPreview.potion.effects.map((effect, index) => (
                                    <li key={index}>{effect}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="no-output">Select reagents and craft a potion to see results here.</div>
              )}
            </div>
          )}

          {activeTab === 'inventory' && (
            <div className="potion-collection">
              {craftedPotions.length > 0 ? (
                <div className="potions-grid">
                  {craftedPotions.map((potion, index) => (
                    <div key={index} className="potion-card">
                      <div className="potion-card-image">
                        {potion.imageUrl ? (
                          <img src={potion.imageUrl} alt={potion.name} />
                        ) : (potion as any).recipeHash && imagePollingIntervals.has((potion as any).recipeHash) ? (
                          <div className="potion-card-image-loading">
                            ✨ Crafting Icon...
                          </div>
                        ) : (
                          <div style={{ fontSize: '3rem' }}>🧪</div>
                        )}
                      </div>
                      <div className="potion-card-content">
                        <h4 className="potion-name">{potion.name}</h4>
                        <p className="potion-description">{potion.description}</p>
                        <div className="potion-effects">
                          <strong>Effects:</strong>
                          <ul>
                            {potion.effects.map((effect, effectIndex) => (
                              <li key={effectIndex}>{effect}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-potions">No potions crafted yet. Visit the Craft tab to create your first potion!</p>
              )}
            </div>
          )}

          {activeTab === 'gather' && (
            <div className="gather-output">
              {selectedLocation ? (
                <>
                  <div className="gather-text-output">
                    {gatherOutput.length > 0 ? (
                      <div className="output-content">
                        {gatherOutput.map((line, index) => (
                          <p key={index} className="output-line">{line}</p>
                        ))}
                      </div>
                    ) : (
                      <p className="no-output">Select a location to begin exploring...</p>
                    )}
                  </div>

                  <div className="gather-input-section">
                    <div className="input-group">
                      <input
                        type="text"
                        value={gatherInput}
                        onChange={(e) => setGatherInput(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && gatherInput.trim() && !gatherLoading) {
                            processGatherCommand(gatherInput.trim());
                            setGatherInput('');
                          }
                        }}
                        placeholder="Type a command (e.g., 'examine', 'search', 'gather cobalt_echo')..."
                        className="gather-input"
                        disabled={gatherLoading}
                      />
                      <button
                        onClick={() => {
                          if (gatherInput.trim() && !gatherLoading) {
                            processGatherCommand(gatherInput.trim());
                            setGatherInput('');
                          }
                        }}
                        disabled={!gatherInput.trim() || gatherLoading}
                        className="gather-submit-btn"
                      >
                        {gatherLoading ? '⏳' : '➤'}
                      </button>
                    </div>
                    <p className="input-hint">
                      💡 Try: examine, search, gather [reagent], listen, focus, help
                    </p>
                  </div>
                </>
              ) : (
                <div className="no-location-selected">
                  <p>🗺️ Select a gathering location to begin your adventure!</p>
                  <p>Choose from the Crystal Caves, Moonlit Grove, or Frozen Peaks to start exploring.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'quests' && (
            <div className="quest-output">
              {/* Quest content will go here */}
              <p className="no-output">Quest system coming soon...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;