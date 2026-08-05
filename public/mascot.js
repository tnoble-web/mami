/**
 * FRIDGE's mascot, hand-drawn as inline SVG.
 *
 * Drawn rather than borrowed for two reasons: the app loads no external assets,
 * and an emoji logo renders as a different picture on every phone. This looks the
 * same everywhere.
 *
 * The face reacts to the fridge's actual state, so the header carries a little
 * information as well as personality: content when stocked, worried when
 * something is running low, glum when a shelf is empty.
 *
 * Every shape wears a class and the root sets `fill="none"
 * stroke="currentColor"`. Colours therefore live entirely in the stylesheet,
 * which is what makes one drawing work in both light and dark mode — inline
 * fills would be overridden by the CSS anyway, since presentation attributes
 * lose to stylesheet rules.
 */

const MOUTHS = {
  happy: '<path class="mascot-mouth" d="M17 41.5q5 4 10 0"/>',
  worried: '<path class="mascot-mouth" d="M17.5 42h7"/>',
  sad: '<path class="mascot-mouth" d="M17 43q5 -4 10 0"/>',
};

/** Half-closed eyes carry the glum mood without the mouth doing all of it. */
const SAD_EYES = '<path class="mascot-eye-line" d="M14.6 34.4q1.9 -2.2 3.8 0"/>'
  + '<path class="mascot-eye-line" d="M23.6 34.4q1.9 -2.2 3.8 0"/>';

function eyesFor(mood, radius) {
  if (mood === 'sad') return SAD_EYES;
  return `<circle class="mascot-eye" cx="16.5" cy="34" r="${radius}"/>`
    + `<circle class="mascot-eye" cx="25.5" cy="34" r="${radius}"/>`;
}

/**
 * Lines and eyes are fattened at small sizes. Scaling the drawing down
 * proportionally keeps it *correct* but turns the face into a smudge at logo
 * size, which is exactly where the mood most needs to survive.
 */
function weightsFor(size) {
  if (size < 48) return { stroke: 2.8, eye: 2.7 };
  if (size < 90) return { stroke: 2.3, eye: 2.3 };
  return { stroke: 2, eye: 2.1 };
}

/**
 * @param {'happy'|'worried'|'sad'} mood
 * @param {number} size  rendered height in px
 * @returns {string} standalone SVG markup
 */
export function fridgeMascot(mood = 'happy', size = 28) {
  const safeMood = MOUTHS[mood] ? mood : 'happy';
  const width = Math.round((size * 42) / 58);
  const weight = weightsFor(size);

  // Blushing only when happy, so the cheer is earned.
  const cheeks = safeMood === 'happy'
    ? '<circle class="mascot-blush" cx="12.4" cy="38.8" r="1.9"/>'
      + '<circle class="mascot-blush" cx="29.6" cy="38.8" r="1.9"/>'
    : '';

  return `<svg class="mascot mascot-${safeMood}" width="${width}" height="${size}"`
    + ' viewBox="0 0 42 58" role="img" aria-label="FRIDGE"'
    + ` fill="none" stroke="currentColor" stroke-width="${weight.stroke}" stroke-linecap="round">`
    // Feet first, so the body sits on top of them.
    + '<rect class="mascot-foot" x="7" y="49" width="5" height="7" rx="2"/>'
    + '<rect class="mascot-foot" x="30" y="49" width="5" height="7" rx="2"/>'
    + '<rect class="mascot-body" x="3" y="2" width="36" height="50" rx="7"/>'
    + '<path class="mascot-line" d="M3 19h36"/>'
    + '<rect class="mascot-handle" x="31.5" y="8" width="3" height="7" rx="1.5"/>'
    + '<rect class="mascot-handle" x="31.5" y="24" width="3" height="10" rx="1.5"/>'
    + eyesFor(safeMood, weight.eye)
    + MOUTHS[safeMood]
    + cheeks
    + '</svg>';
}

/** Which face the current stock levels deserve. */
export function moodForDrinks(drinks = []) {
  if (!drinks.length) return 'worried';
  if (drinks.some((d) => d.status === 'out' || d.stock <= 0)) return 'sad';
  if (drinks.some((d) => d.status === 'low' || d.status === 'critical')) return 'worried';
  return 'happy';
}

/**
 * A row of cartoon drinks — two cans, a bottle, a carton — used as a decorative
 * divider on the printed sheet. Purely ornamental, so it's hidden from screen
 * readers.
 */
export function drinkRow(height = 34) {
  const width = Math.round((height * 108) / 42);
  return `<svg class="drink-row" width="${width}" height="${height}" viewBox="0 0 108 42"`
    + ' aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8"'
    + ' stroke-linejoin="round">'
    // Can, with the lip near the top that cans have.
    + '<rect class="art-can" x="5" y="12" width="16" height="27" rx="3.5"/>'
    + '<path class="art-line" d="M5 18h16"/>'
    // Bottle: neck, shoulders, body, cap.
    + '<path class="art-bottle" d="M33 39V22q0-3.4 2.8-5V12h6.4v5Q45 18.6 45 22v17q0 2-2 2h-8q-2 0-2-2z"/>'
    + '<rect class="art-cap" x="35.2" y="7.5" width="7.6" height="4.5" rx="1.5"/>'
    // Second can.
    + '<rect class="art-can-alt" x="57" y="12" width="16" height="27" rx="3.5"/>'
    + '<path class="art-line" d="M57 18h16"/>'
    // Carton with a folded gable top.
    + '<path class="art-carton" d="M85 39V19h18v20q0 2-2 2H87q-2 0-2-2z"/>'
    + '<path class="art-carton-top" d="M85 19l9-8 9 8"/>'
    + '</svg>';
}
