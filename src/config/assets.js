// =============================================================================
// assets.js — sprite swap manifest.
//
// Right now every texture is drawn by code (see src/art/textures.js), so the
// game needs zero image files. To use your own art later:
//   1. Put a PNG in /public/sprites/ (e.g. public/sprites/player.png)
//   2. Set its path below, e.g.  player: 'sprites/player.png'
//   3. Draw it facing UP (front of the vehicle at the top of the image),
//      roughly the size noted in the comment. That's it.
// Any key left as null keeps using the generated drawing.
// =============================================================================

export const SPRITE_FILES = {
  player: null, // your yellow-and-maroon Micra taxi, ~46x74
  'car-0': null, // cars ~38x72 (car-0 … car-5 are colour variations)
  'car-1': null,
  'car-2': null,
  'car-3': null,
  'car-4': null,
  'car-5': null,
  micra: null, // AI Micra taxi ~46x74
  'micra-hazard': null, // same Micra with hazard lights on
  truck: null, // ~50x120
  okada: null, // ~20x40
  'okada-2': null, // okada carrying a passenger
  keke: null, // ~32x50
  'player-keke': null, // your own Maruwa in work mode, ~42x58
  pothole: null, // ~44x30
  'pothole-puddle': null,
  'ped-0': null, // pedestrians ~22x22 (ped-0 … ped-3)
  'ped-1': null,
  'ped-2': null,
  'ped-3': null,
  hawker: null, // pedestrian with a tray on the head
  'broken-car': null, // obstacle: broken-down car with leaves behind it, ~48x130
};

// Number of colour variants generated for cars and pedestrians.
export const CAR_VARIANTS = 6;
export const PED_VARIANTS = 4;
