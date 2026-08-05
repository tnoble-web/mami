/**
 * Venue page scaffolder — `npm run new:venue`
 *
 * Asks for the things I cannot know (name, address, website), writes a new
 * venue file with those filled in and the rest marked TODO, and registers it
 * in content/venues/index.ts.
 *
 * It deliberately does NOT ask for the light, the rain plan or the spots.
 * Typing that into a terminal prompt produces one-line answers, and one-line
 * answers are what make a page look like filler. Write those in the file, in
 * full sentences, with the worked example open beside you.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const VENUES_DIR = path.join(process.cwd(), 'content', 'venues');
const REGISTRY = path.join(VENUES_DIR, 'index.ts');

function slugify(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents so "Belvédère" → "belvedere"
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** venue-slug → venueSlug, for the import identifier. */
function camelCase(slug) {
  return slug.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
}

function template({ name, slug, street, city, region, postalCode, website, aliases }) {
  const aliasLines = aliases.map((a) => `    '${a.replace(/'/g, "\\'")}',`).join('\n');
  const escapedName = name.replace(/'/g, "\\'");

  return `import type { Venue } from './types';

/**
 * TO FINISH THIS PAGE, fill in every field marked TODO and set
 * \`published: true\`. Run \`npm run check:venues\` to see what is missing.
 *
 * Do not invent the first-hand details. A wrong claim about someone's venue
 * is how you lose a referral source — leave a field null instead.
 */
const venue: Venue = {
  slug: '${slug}',
  name: '${escapedName}',
  aliases: [
${aliasLines}
  ],

  address: {
    street: ${street ? `'${street.replace(/'/g, "\\'")}'` : 'null'},
    city: '${city.replace(/'/g, "\\'")}',
    region: '${region}',
    postalCode: ${postalCode ? `'${postalCode}'` : 'null'},
    country: 'CA',
  },

  geo: null,
  venueWebsite: ${website ? `'${website}'` : 'null'},

  // Keep under ~60 characters or Google truncates it.
  title: '${escapedName} Wedding Photographer | No Greater Love',

  // TODO: ~155 characters, written to earn a click from a human.
  metaDescription: 'TODO',

  // TODO: two or three paragraphs, first person, specific to this property.
  intro: ['TODO'],

  shotCount: null, // TODO
  firstShotYear: null, // TODO

  lightNotes: null, // TODO — best light, and exactly when
  ceremonySpots: [], // TODO
  portraitSpots: [], // TODO
  rainPlan: null, // TODO — couples worry about this most
  gettingReady: null, // TODO
  timelineTips: [], // TODO
  restrictions: null, // TODO

  heroImage: null, // TODO
  gallery: [], // TODO — six to twelve strong frames from here

  faqs: [], // TODO — at least three, phrased the way a couple asks them

  vendors: [],
  relatedVenueSlugs: [],

  published: false,
};

export default venue;
`;
}

async function registerVenue(slug) {
  const identifier = camelCase(slug);
  let source = await fs.readFile(REGISTRY, 'utf8');

  if (source.includes(`from './${slug}'`)) {
    console.log(`  Already registered in index.ts — leaving it alone.`);
    return;
  }

  // Insert the import after the last existing venue import.
  const importLine = `import ${identifier} from './${slug}';`;
  const imports = [...source.matchAll(/^import .+ from '\.\/.+';$/gm)];
  if (imports.length === 0) throw new Error('Could not find imports in index.ts');
  const lastImport = imports[imports.length - 1];
  const insertAt = lastImport.index + lastImport[0].length;
  source = source.slice(0, insertAt) + '\n' + importLine + source.slice(insertAt);

  // Insert into the array, before the closing bracket.
  source = source.replace(
    /(export const allVenues: Venue\[\] = \[)([\s\S]*?)(\n\];)/,
    (_, open, body, close) => `${open}${body}\n  ${identifier},${close}`,
  );

  await fs.writeFile(REGISTRY, source, 'utf8');
  console.log(`  Registered in content/venues/index.ts`);
}

const rl = readline.createInterface({ input, output });

/**
 * Pull one line at a time from stdin.
 *
 * Deliberately an async iterator rather than rl.question(). With piped input,
 * question() lets readline race ahead and consume every buffered line while
 * the first answer is still being awaited, so every prompt after the first
 * hangs forever. Pulling on demand works for both a real terminal and a pipe,
 * which also makes this script testable.
 */
const lines = rl[Symbol.asyncIterator]();

async function ask(question, fallback = '') {
  output.write(question);
  const { value, done } = await lines.next();
  if (done) {
    output.write('\n');
    return fallback;
  }
  return (value ?? '').trim() || fallback;
}

try {
  console.log('\nNew venue page\n');

  const name = await ask('Venue name, spelled the way they spell it: ');
  if (!name) {
    console.error('A name is required.');
    process.exit(1);
  }

  const slug = slugify(await ask(`URL slug [${slugify(name)}]: `, slugify(name)));
  const file = path.join(VENUES_DIR, `${slug}.ts`);

  try {
    await fs.access(file);
    console.error(`\ncontent/venues/${slug}.ts already exists. Nothing written.`);
    process.exit(1);
  } catch {
    // Does not exist, which is what we want.
  }

  const street = await ask('Street address (optional): ');
  const city = await ask('City [Ottawa]: ', 'Ottawa');
  const region = (await ask('Province [ON]: ', 'ON')).toUpperCase();
  const postalCode = await ask('Postal code (optional): ');
  const website = await ask("Venue's own website (optional): ");

  console.log(
    '\nAliases — other spellings couples actually type, comma separated.\n' +
      'Include the short form they really use ("the aviation museum", "beantown").',
  );
  const aliasInput = await ask('Aliases: ');
  const aliases = [
    ...new Set(
      [name.toLowerCase(), ...aliasInput.split(',').map((a) => a.trim().toLowerCase())].filter(
        Boolean,
      ),
    ),
  ];

  await fs.writeFile(file, template({ name, slug, street, city, region, postalCode, website, aliases }), 'utf8');
  console.log(`\n  Wrote content/venues/${slug}.ts`);
  await registerVenue(slug);

  console.log(
    `\nNext:\n` +
      `  1. Open content/venues/${slug}.ts and fill in every TODO.\n` +
      `     Keep content/venues/_example-maplewood-barn.ts open beside it — that\n` +
      `     is the level of specificity that makes these pages work.\n` +
      `  2. Add your photographs from this venue to public/venues/${slug}/.\n` +
      `  3. Run npm run check:venues.\n` +
      `  4. Set published: true when it comes back clean.\n`,
  );
} finally {
  rl.close();
}
