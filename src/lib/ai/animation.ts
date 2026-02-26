import { invokeModelWithFallback } from './models';

export interface AnimationStep {
  action: 'create_node' | 'create_edge' | 'highlight' | 'unhighlight' | 'traverse' | 'delete_node' | 'update_value' | 'swap' | 'compare';
  nodeId?: string;
  value?: any;
  position?: { x: number; y: number };
  fromId?: string;
  toId?: string;
  label?: string;
  color?: string;
  description?: string;
  duration?: number;
}

export interface AnimationData {
  title: string;
  description: string;
  steps: AnimationStep[];
  initialState?: any;
  finalState?: any;
}

const ANIMATION_SYSTEM_PROMPT = `You are an expert at creating step-by-step animations for data structures and algorithms.

Your task is to generate a JSON animation script that shows how data structures work visually.

RULES:
1. Return ONLY valid JSON - no markdown, no explanation
2. Break down the concept into small, clear steps
3. Each step should have a description explaining what's happening
4. Use appropriate actions: create_node, create_edge, highlight, unhighlight, traverse, delete_node, update_value, swap, compare
5. Position nodes logically (x: 0-800, y: 0-400)
6. For structural queries (like "what is binary tree"), show the structure being built step by step
7. For operational queries (like "insert into tree"), show the operation step by step
8. Keep it simple and educational

RESPONSE FORMAT:
{
  "title": "Concept Name",
  "description": "Brief overview",
  "steps": [
    {
      "action": "create_node",
      "nodeId": "node1",
      "value": 5,
      "position": { "x": 400, "y": 100 },
      "description": "Create root node with value 5"
    },
    {
      "action": "create_node",
      "nodeId": "node2",
      "value": 3,
      "position": { "x": 300, "y": 200 },
      "description": "Create left child with value 3"
    },
    {
      "action": "create_edge",
      "fromId": "node1",
      "toId": "node2",
      "label": "left",
      "description": "Connect root to left child"
    },
    {
      "action": "highlight",
      "nodeId": "node1",
      "color": "#3b82f6",
      "description": "Highlight the root node"
    }
  ]
}`;

export async function generateAnimation(
  concept: string,
  operation: string,
  level: 'Beginner' | 'Intermediate' | 'Advanced'
): Promise<AnimationData> {
  const prompt = `Generate a step-by-step animation for: ${operation} in ${concept}

Skill level: ${level}

Examples:
- "Insert at head in Linked List" → Show creating new node, updating pointers
- "Binary Search in Array" → Show comparing elements, narrowing search space
- "Push to Stack" → Show adding element to top
- "Bubble Sort" → Show comparing and swapping adjacent elements

Generate the animation JSON now.`;

  try {
    const response = await invokeModelWithFallback(
      prompt,
      ANIMATION_SYSTEM_PROMPT,
      2048
    );

    // Parse JSON from response
    let jsonStr = response.content.trim();
    
    // Remove markdown code blocks if present
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```\n?$/g, '');
    }

    const animationData = JSON.parse(jsonStr);
    
    console.log('[Animation] Generated successfully:', animationData.title);
    return animationData;
  } catch (error: any) {
    console.error('[Animation] Generation failed:', error.message);
    
    // Fallback: Return a simple example animation
    return getFallbackAnimation(concept, operation);
  }
}

function getFallbackAnimation(concept: string, operation: string): AnimationData {
  // Simple linked list insertion as fallback
  return {
    title: `${operation} - ${concept}`,
    description: 'Animation generation failed. Showing a simple example.',
    steps: [
      {
        action: 'create_node',
        nodeId: 'node1',
        value: 10,
        position: { x: 100, y: 200 },
        description: 'Create first node',
      },
      {
        action: 'create_node',
        nodeId: 'node2',
        value: 20,
        position: { x: 250, y: 200 },
        description: 'Create second node',
      },
      {
        action: 'create_edge',
        fromId: 'node1',
        toId: 'node2',
        label: 'next',
        description: 'Link nodes together',
      },
      {
        action: 'highlight',
        nodeId: 'node1',
        color: '#3b82f6',
        description: 'Operation complete',
      },
    ],
  };
}

// Detect if content requires animation vs static diagram
export function shouldUseAnimation(content: string): boolean {
  // Always generate animations for data structures and algorithms
  const dataStructureKeywords = [
    'tree', 'linked list', 'array', 'stack', 'queue', 'graph', 'hash',
    'binary', 'heap', 'trie', 'bst', 'avl', 'red-black'
  ];
  
  const algorithmKeywords = [
    'sort', 'search', 'algorithm', 'traverse', 'insert', 'delete',
    'push', 'pop', 'enqueue', 'dequeue', 'dfs', 'bfs'
  ];
  
  const contentLower = content.toLowerCase();
  
  return dataStructureKeywords.some(keyword => contentLower.includes(keyword)) ||
         algorithmKeywords.some(keyword => contentLower.includes(keyword));
}

// Detect visualization type
export function detectVisualizationType(content: string): 'animation' | 'diagram' | 'both' {
  return shouldUseAnimation(content) ? 'animation' : 'diagram';
}
