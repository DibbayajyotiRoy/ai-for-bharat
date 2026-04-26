# Compact Layout Redesign Plan

## Goal
Move input to bottom (like ChatGPT/Gemini) and make everything fit in one viewport

## New Layout Structure

```
┌─────────────────────────────────────────┐
│  Navbar (compact, sticky top)          │
├─────────────────────────────────────────┤
│                                         │
│  Results Area (scrollable)              │
│  - Mental Model Card                    │
│  - Main Content                         │
│  - Animation/Visual                     │
│  - Key Takeaways (collapsed by default) │
│  - Follow-up Questions                  │
│                                         │
├─────────────────────────────────────────┤
│  Input Box (sticky bottom)              │
│  - Compact controls                     │
│  - Language/Level/Mode inline           │
│  - Auto-focus on load                   │
└─────────────────────────────────────────┘
```

## Key Changes

1. **Input at Bottom**
   - Sticky position at bottom
   - Always visible
   - Compact height (2-3 lines max)
   - Expand on focus

2. **Compact Controls**
   - Level/Mode/Language in single row
   - Smaller buttons
   - Icons only on mobile

3. **Results Fill Screen**
   - No wasted space
   - Smooth scroll
   - Auto-scroll to new content

4. **Translation at API Level**
   - No post-processing
   - Instant results
   - Code stays in English

## Implementation Steps

1. ✅ Add language parameter to API
2. ✅ Update orchestrator to pass language
3. ✅ Update normal.ts with language instructions
4. ✅ Remove client-side translation
5. ⏳ Redesign page layout
6. ⏳ Move input to bottom
7. ⏳ Make compact controls
8. ⏳ Test on mobile

