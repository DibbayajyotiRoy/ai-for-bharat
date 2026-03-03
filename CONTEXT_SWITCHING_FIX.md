# Context Switching Issue - Analysis & Fix

## Problem

When users switch topics, the conversation history from previous topics is still being injected into new queries. This causes:

1. **Irrelevant context** - Old conversations about React pollute new questions about Python
2. **Confused responses** - The AI tries to connect unrelated topics
3. **Poor UX** - Users expect clean context switches but get mixed responses
4. **Wasted tokens** - Injecting irrelevant history wastes tokens and slows responses

## Current Behavior

```typescript
// orchestrator.ts - ALWAYS fetches history
const recentInteractions = await fetchRecentInteractions(userId, 5);
contextSummary = summarizeHistory(recentInteractions);
const enrichedContent = contextSummary ? `${content}${contextSummary}` : content;
```

This means EVERY query gets the last 5 interactions appended, regardless of relevance.

## Root Causes

1. **No topic detection** - System doesn't know when user switches topics
2. **No context relevance check** - All history is treated as relevant
3. **No manual reset** - Users can't clear context manually
4. **No session management** - No concept of "conversation sessions"

## Solutions

### Solution 1: Smart Context Detection (Recommended)

Only inject history if the new query is related to recent conversations.

```typescript
// Add to orchestrator.ts
function isContextRelevant(newQuery: string, recentInteractions: Interaction[]): boolean {
  if (recentInteractions.length === 0) return false;
  
  // Extract key terms from new query
  const newTerms = extractKeyTerms(newQuery);
  
  // Check if any recent interaction shares key terms
  const recentTerms = recentInteractions
    .slice(0, 2) // Only check last 2 interactions
    .flatMap(i => extractKeyTerms(i.content));
  
  // If 30%+ overlap, context is relevant
  const overlap = newTerms.filter(term => recentTerms.includes(term)).length;
  const relevance = overlap / Math.max(newTerms.length, 1);
  
  return relevance > 0.3;
}

function extractKeyTerms(text: string): string[] {
  // Remove common words and extract meaningful terms
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might', 'can', 'what', 'how', 'why', 'when', 'where', 'who']);
  
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.has(word))
    .slice(0, 10); // Top 10 terms
}
```

### Solution 2: Session-Based Context (Better UX)

Add a "New Topic" button that clears context.

```typescript
// Add to page.tsx
const [sessionId, setSessionId] = useState(Date.now());

const handleNewTopic = () => {
  setSessionId(Date.now());
  setInput('');
  setResult('');
  // This creates a new "session" - history won't be fetched
};

// Pass sessionId to API
const response = await fetch('/api/explain', {
  method: 'POST',
  body: JSON.stringify({ 
    content: input, 
    level, 
    mode, 
    userId: currentUser?.id || 'anonymous',
    sessionId // New field
  }),
});
```

### Solution 3: Time-Based Context Expiry

Don't use context if last interaction was >30 minutes ago.

```typescript
// In orchestrator.ts
const recentInteractions = await fetchRecentInteractions(userId, 5);

// Filter out old interactions (>30 min)
const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
const relevantInteractions = recentInteractions.filter(
  i => i.timestamp > thirtyMinutesAgo
);

if (relevantInteractions.length > 0) {
  contextSummary = summarizeHistory(relevantInteractions);
}
```

### Solution 4: Explicit Context Control (Most Flexible)

Let users toggle context on/off.

```typescript
// Add to page.tsx
const [useContext, setUseContext] = useState(true);

// In toolbar
<button
  onClick={() => setUseContext(!useContext)}
  className={`px-3 py-1.5 rounded-md text-xs ${useContext ? 'bg-primary text-white' : 'bg-muted'}`}
>
  {useContext ? '🔗 Context On' : '🔗 Context Off'}
</button>

// Pass to API
body: JSON.stringify({ 
  content: input, 
  level, 
  mode, 
  userId: currentUser?.id || 'anonymous',
  useContext // New field
}),
```

## Recommended Implementation

Combine Solutions 1, 2, and 3 for best results:

1. **Smart detection** - Auto-detect topic changes
2. **Manual control** - "New Topic" button for explicit resets
3. **Time expiry** - Auto-expire old context

This gives users control while being smart by default.
