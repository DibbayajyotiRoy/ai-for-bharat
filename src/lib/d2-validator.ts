// D2 Syntax Validator and Cleaner

export function cleanD2Syntax(d2Code: string): string {
  if (!d2Code || !d2Code.trim()) {
    return generateFallbackDiagram();
  }

  try {
    // Remove any markdown code fences
    let cleaned = d2Code.replace(/```d2/g, '').replace(/```/g, '').trim();

    // Add direction metadata for horizontal layout
    if (!cleaned.includes('direction:')) {
      cleaned = 'direction: right\n\n' + cleaned;
    }

    // Fix common D2 syntax errors
    
    // 1. Remove square brackets with ANY content - D2 doesn't support them
    cleaned = cleaned.replace(/\[[^\]]*\]/g, '');
    
    // 2. Remove parentheses with ANY content
    cleaned = cleaned.replace(/\([^)]*\)/g, '');
    
    // 3. Remove curly braces
    cleaned = cleaned.replace(/[{}]/g, '');
    
    // 4. Fix arrow syntax - ensure spaces around arrows
    cleaned = cleaned.replace(/(\w+)\s*->\s*(\w+)/g, '$1 -> $2');
    cleaned = cleaned.replace(/(\w+)\s*<-\s*(\w+)/g, '$1 <- $2');
    
    // 5. Clean up node names - remove quotes and special chars
    cleaned = cleaned.replace(/["']/g, '');
    
    // 6. Fix multi-word labels - keep only simple text after colon
    cleaned = cleaned.split('\n').map(line => {
      if (line.includes(':') && !line.startsWith('direction:')) {
        const parts = line.split(':');
        if (parts.length >= 2) {
          // Keep arrow part and simple label
          const arrowPart = parts[0].trim();
          const labelPart = parts.slice(1).join(':').trim()
            .replace(/[^\w\s-]/g, '') // Remove special chars except spaces and hyphens
            .substring(0, 50); // Limit label length
          return `${arrowPart}: ${labelPart}`;
        }
      }
      return line;
    }).join('\n');
    
    // 7. Ensure each statement is on its own line
    cleaned = cleaned.split(/[;\n]/).map(line => line.trim()).filter(line => line).join('\n');
    
    // 8. Validate basic structure - must have arrows or simple nodes
    const lines = cleaned.split('\n');
    const validLines = lines.filter(line => {
      // Keep direction line and lines with arrows
      return line.startsWith('direction:') || line.includes('->') || line.includes('<-') || /^\w+$/.test(line);
    });
    
    if (validLines.length <= 1) {
      console.warn('[D2 Validator] No valid lines found, using fallback');
      return generateFallbackDiagram();
    }
    
    // 9. Ensure we have at least 3 nodes for a meaningful diagram
    const arrowLines = validLines.filter(line => line.includes('->') || line.includes('<-'));
    if (arrowLines.length < 2) {
      console.warn('[D2 Validator] Too few lines, using fallback');
      return generateFallbackDiagram();
    }
    
    return validLines.join('\n');
    
  } catch (error) {
    console.error('[D2 Validator] Cleaning failed:', error);
    return generateFallbackDiagram();
  }
}

export function generateFallbackDiagram(): string {
  return `direction: right

Input -> Process: Start
Process -> Validate: Check
Validate -> Execute: Run
Execute -> Output: Result
Output -> User: Display`;
}

export function validateD2Syntax(d2Code: string): { valid: boolean; error?: string } {
  try {
    const cleaned = cleanD2Syntax(d2Code);
    
    // Basic validation rules
    const lines = cleaned.split('\n');
    
    for (const line of lines) {
      // Check for invalid characters
      if (line.includes('[') || line.includes(']') || line.includes('{') || line.includes('}') || line.includes('(') || line.includes(')')) {
        return { valid: false, error: 'Invalid characters found' };
      }
      
      // Check for proper arrow syntax
      if (line.includes('->') || line.includes('<-')) {
        const parts = line.split(/->|<-/);
        if (parts.length !== 2) {
          return { valid: false, error: 'Invalid arrow syntax' };
        }
      }
    }
    
    return { valid: true };
    
  } catch (error: any) {
    return { valid: false, error: error.message };
  }
}
