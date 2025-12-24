const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10], // Natural minor
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  locrian: [0, 1, 3, 5, 6, 8, 10],
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
};

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function getNoteName(pitch) {
  const noteIndex = pitch % 12;
  const octave = Math.floor(pitch / 12) - 1;
  return NOTE_NAMES[noteIndex] + octave;
}

function isNoteInScale(pitch, keyRoot, scaleType) {
  if (scaleType === 'chromatic') return true;

  const scaleIntervals = SCALES[scaleType];
  const keyIndex = NOTE_NAMES.indexOf(keyRoot);
  if (keyIndex === -1) return true; // Should not happen

  const noteIndex = pitch % 12;

  // Normalize note relative to key root
  let relativeIndex = noteIndex - keyIndex;
  if (relativeIndex < 0) relativeIndex += 12;

  return scaleIntervals.includes(relativeIndex);
}
