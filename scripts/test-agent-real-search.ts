/**
 * scripts/test-agent-real-search.ts
 *
 * Verifies that the Research Mode agent returns real, up-to-date sources
 * via the Tavily Search API, not just the curated static fallbacks.
 *
 * Usage:
 *   npm run test:agent
 *   (or) npx tsx scripts/test-agent-real-search.ts
 *
 * Requirements:
 *   TAVILY_API_KEY must be set in .env (or the environment).
 */

import { executeAgentPipeline } from '../src/lib/ai/agent';

// A recent topic — any real search API should return 2024/2025-dated results.
const TEST_QUERY = 'Latest React 19 features and improvements';

async function run() {
  console.log('='.repeat(60));
  console.log('  Learning Copilot — Real Search Agent Test');
  console.log('='.repeat(60));

  const tavilyKey = process.env.TAVILY_API_KEY;

  if (!tavilyKey) {
    console.warn('\n  WARNING: TAVILY_API_KEY is not set.');
    console.warn('  The agent will use curated static sources as a fallback.');
    console.warn('  Set TAVILY_API_KEY in .env to test live search.\n');
  } else {
    console.log('\n  TAVILY_API_KEY detected — testing live search.\n');
  }

  console.log(`Query: "${TEST_QUERY}"\n`);

  const start = Date.now();

  try {
    const result = await executeAgentPipeline(TEST_QUERY, 'Intermediate');
    const elapsed = ((Date.now() - start) / 1000).toFixed(2);

    console.log('-'.repeat(60));
    console.log(`Sources returned (${result.sources.length}):`);
    result.sources.forEach((s, i) => {
      console.log(`\n  [${i + 1}] ${s.title}`);
      console.log(`       URL         : ${s.url}`);
      console.log(`       Credibility : ${s.credibility}`);
      console.log(`       Summary     : ${s.summary.substring(0, 120)}...`);
    });

    console.log('\n' + '-'.repeat(60));
    console.log('Answer preview (first 400 chars):');
    console.log(result.answer.substring(0, 400) + '...');

    console.log('\n' + '-'.repeat(60));
    console.log('Agent steps:');
    result.steps.forEach(step => {
      console.log(`  ${step.name}: ${step.output}`);
    });

    console.log('\n' + '='.repeat(60));
    console.log(`Completed in ${elapsed}s`);

    // Validation checks
    let failures = 0;

    if (result.sources.length === 0) {
      console.error('  FAIL: No sources returned');
      failures++;
    } else {
      console.log('  PASS: Sources returned');
    }

    if (!result.answer || result.answer.length < 100) {
      console.error('  FAIL: Answer too short or missing');
      failures++;
    } else {
      console.log('  PASS: Answer present');
    }

    if (tavilyKey && result.sources.some(s => s.url.includes('example.com'))) {
      console.error('  FAIL: Received placeholder URLs despite Tavily key being set');
      failures++;
    } else {
      console.log('  PASS: Source URLs look real');
    }

    console.log('='.repeat(60));
    process.exit(failures > 0 ? 1 : 0);

  } catch (err: any) {
    console.error(`\n  ERROR: ${err.message}`);
    console.log('='.repeat(60));
    process.exit(1);
  }
}

run();
