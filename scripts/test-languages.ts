/**
 * scripts/test-languages.ts
 *
 * Verifies that Amazon Translate correctly renders key Indian languages
 * for both short Mental Model text and multi-line Takeaway bullet points.
 *
 * Usage:
 *   npm run test:languages
 *   (or) npx tsx scripts/test-languages.ts
 */

import { translateText, LANGUAGE_NAMES, type SupportedLanguage } from '../src/lib/ai/translation';

const MENTAL_MODEL =
  'A race condition occurs when two processes access shared data simultaneously and the final outcome depends on the order of execution — like two chefs writing on the same recipe card at once.';

const TAKEAWAYS = `- Race conditions happen when shared state is accessed without synchronisation.
- Use locks, mutexes, or atomic operations to prevent them.
- They are hard to reproduce because they depend on exact timing.`;

const LANGUAGES: SupportedLanguage[] = ['hi', 'bn', 'mr'];

async function runTests() {
  console.log('='.repeat(60));
  console.log('  Learning Copilot — Language Translation Test');
  console.log('='.repeat(60));
  console.log();
  console.log('Original (English):');
  console.log('  Mental Model :', MENTAL_MODEL);
  console.log('  Takeaways    :');
  TAKEAWAYS.split('\n').forEach(line => console.log('    ', line));
  console.log();

  let passed = 0;
  let failed = 0;

  for (const lang of LANGUAGES) {
    const name = LANGUAGE_NAMES[lang];
    console.log('-'.repeat(60));
    console.log(`Testing: ${name} (${lang})`);

    try {
      const [mentalModel, takeaways] = await Promise.all([
        translateText(MENTAL_MODEL, lang),
        translateText(TAKEAWAYS, lang),
      ]);

      // Basic sanity: translated text must differ from source (unless Amazon Translate
      // returns the source unchanged when it can't translate, which would be a failure).
      const mentalModelOk = mentalModel !== MENTAL_MODEL && mentalModel.trim().length > 0;
      const takeawaysOk   = takeaways   !== TAKEAWAYS   && takeaways.trim().length   > 0;

      console.log(`  Mental Model [${mentalModelOk ? 'PASS' : 'FAIL'}]: ${mentalModel}`);
      console.log(`  Takeaways    [${takeawaysOk ? 'PASS' : 'FAIL'}]:`);
      takeaways.split('\n').forEach(line => console.log('    ', line));

      if (mentalModelOk && takeawaysOk) {
        passed++;
        console.log(`  => PASS`);
      } else {
        failed++;
        console.log(`  => FAIL — translated text identical to source`);
      }
    } catch (err: any) {
      failed++;
      console.error(`  => ERROR: ${err.message}`);
    }

    console.log();
  }

  console.log('='.repeat(60));
  console.log(`Results: ${passed} passed, ${failed} failed out of ${LANGUAGES.length} languages`);
  console.log('='.repeat(60));

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
