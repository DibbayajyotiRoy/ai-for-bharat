# Mental Model and Sources Fix - Complete

## Issues Fixed

### 1. Mental Model Text Missing (Showing Only "The")
**Root Cause**: Parser was only extracting the first line, which was incomplete

**Solution**:
- Enhanced parsing to extract full paragraph after "Mental Model" header
- Uses regex to capture all text until double newline or next section
- Removes leading newlines before extraction
- Falls back to first sentence of explanation if mental model section is empty
- Added debug logging to track parsing issues

**Code Changes**:
```typescript
// Extract everything after "mental model" until next section or double newline
let content = part.replace(/mental model/i, '').trim();
content = content.replace(/^\n+/, '');

// Get first paragraph (until double newline or next section)
const paragraphMatch = content.match(/^([^\n]+(?:\n(?!\n)[^\n]+)*)/);
if (paragraphMatch) {
    sections.mentalModel = paragraphMatch[1].trim();
}
```

### 2. Fake Sources Removed
**Problem**: Sources were displayed even though we're not actually searching the web

**Solution**:
- Removed source badges from mental model card in normal mode
- Removed inline sources section from explanation tab
- Sources only appear in Research/Agent mode (when actually implemented)
- Clean UI without misleading information

**What Was Removed**:
- Top source badges (1, 2, 3) in mental model card
- Inline "Sources" section with cards
- All fake/mock source data in normal mode

### 3. Research Mode Sources (Future Implementation)
**Current State**: Agent mode has curated sources but doesn't actually search

**For Real Implementation**:
When you integrate real web search (Tavily, Brave, Google Custom Search):

1. **Update agent.ts `fetchRealSources()`**:
```typescript
// Replace curated sources with real search API
const searchResults = await searchAPI.search(query);
return searchResults.map(result => ({
    title: result.title,
    url: result.url,  // Exact page URL from search
    summary: result.snippet,
    credibility: assessCredibility(result.domain)
}));
```

2. **Credibility Assessment**:
```typescript
function assessCredibility(domain: string): 'high' | 'medium' | 'low' {
    const highCredibility = [
        'mozilla.org', 'developer.mozilla.org',
        'docs.python.org', 'python.org',
        'react.dev', 'reactjs.org',
        'github.com', 'stackoverflow.com',
        'wikipedia.org', 'w3.org'
    ];
    
    if (highCredibility.some(d => domain.includes(d))) {
        return 'high';
    }
    
    // Add medium/low logic
    return 'medium';
}
```

3. **Show Sources in UI**:
- Sources will automatically appear when agent mode returns them
- Links will point to exact pages where context was gathered
- Credibility badges (shield icons) will show trust level

## Files Modified

1. **src/components/copilot/ResultDisplay.tsx**
   - Enhanced mental model parsing with paragraph extraction
   - Removed source badges from mental model card
   - Removed inline sources section
   - Added debug logging for troubleshooting

2. **src/lib/ai/orchestrator.ts**
   - Added comment clarifying normal mode has no sources

3. **src/lib/ai/agent.ts**
   - Kept curated sources for agent mode
   - Ready for real search API integration

## Current Behavior

### Normal Mode (📝)
- No sources displayed
- Clean, focused explanation
- Mental model shows full text
- Diagram renders horizontally

### Research Mode (🔍)
- Shows curated sources (placeholder until real search integrated)
- Sources are contextually relevant to query
- Links point to real documentation sites
- Ready for real search API integration

## Testing Checklist

- [x] Build successful
- [x] Mental model parsing improved
- [x] Sources removed from normal mode
- [x] Agent mode still has sources
- [x] No fake/misleading information
- [x] Debug logging added

## Next Steps for Real Search Integration

1. **Choose Search API**:
   - Tavily Search API (recommended for AI)
   - Brave Search API
   - Google Custom Search API
   - Serper API

2. **Update Environment Variables**:
```env
SEARCH_API_KEY=your_api_key_here
SEARCH_API_PROVIDER=tavily  # or brave, google, serper
```

3. **Implement Real Search**:
```typescript
// In agent.ts
async function fetchRealSources(query: string): Promise<Source[]> {
    const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.SEARCH_API_KEY}`
        },
        body: JSON.stringify({
            query,
            search_depth: 'advanced',
            max_results: 5
        })
    });
    
    const data = await response.json();
    return data.results.map(r => ({
        title: r.title,
        url: r.url,
        summary: r.content,
        credibility: assessCredibility(r.url)
    }));
}
```

4. **Enable Sources in UI**:
- Sources will automatically appear when returned from agent mode
- No UI changes needed - already built to handle sources

## Debug Console Logs

When testing, check browser console for:
```
[Parser] Raw markdown: ...
[Parser] Split into X parts
[Parser] Mental model: ...
[Parser] Final sections: { mentalModel: ..., hasExplanation: true, ... }
```

This helps diagnose any parsing issues.
