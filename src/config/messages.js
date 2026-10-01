// =============================================================================
// messages.js — every funny line in the game, in one place.
// Mix of Nigerian Pidgin and a little Yoruba. Add more lines to any list and
// the game picks one at random. {area} / {time} get replaced automatically.
// =============================================================================

export const MESSAGES = {
  start: ['Oya, e je ka lo!', 'Hold your steering well o!', 'Iwo Road to Ojoo. Oya!'],

  // Shown when you reach a checkpoint. Area-specific lines win if they exist.
  checkpoint: {
    default: ['Welcome to {area}!', 'Kaabo si {area}!', '{area} don show!'],
    beere: ['Welcome to Beere!', 'Beere! Roundabout no be race track o!'],
    dugbe: ['Welcome to Dugbe!', 'Dugbe! Cocoa House dey greet you.'],
    mokola: ['Mokola! Hold body, go-slow dey!', 'Welcome to Mokola!'],
    sango: ['Sango! E ku ise!', 'Welcome to Sango!'],
    'ui-gate': ['UI Gate! Aluta continua!', 'Welcome to UI Gate!'],
  },

  finish: ['Ojoo don reach!', 'Ojoo don reach! E se gan!'],

  crashVehicle: [
    'Ah ah! Na so you dey drive?',
    'Driver, face front!',
    'Who go pay for my side mirror?!',
    'Wahala! You don jam motor!',
    'Ehn! You no see me?',
  ],
  crashPerson: ['Ah! Look road o!', 'Driver! You wan kill person?', 'Pele o! Slow down!'],
  crashObstacle: ['You no see the leaves for road?', 'Broken-down motor! Ah!'],

  pothole: ['Pothole don catch you!', 'Gbam! Pothole!', 'This road no get owner!', 'Ahh, my shock absorber!'],

  horn: ['Oya, move!', 'Shift!', 'Oya na!', 'Commot for road!'],
  hornOkada: ['Okada, shift!', 'Oya move, okada man!'],

  // What Micra taxi drivers shout when they stop anyhow to load or drop passengers.
  taxiStop: [
    'Wole pelu change e o!',
    'Mi o ni change o!',
    'Ojoo! Ojoo! One chance!',
    'Front seat, two people!',
    'Passenger don see im bus stop!',
    'Owo da?!',
  ],

  aiHonk: ['Driver move!', 'Oya na!', 'You dey sleep?'],

  // ----- Work mode -----
  work: {
    tip: 'Passengers dey wait for RIGHT side.\nSlow down beside them to carry them!',
    dropTip: 'Stop for the yellow DROP box\nso your passengers fit come down.',
    full: ['Motor don full!', 'No space again!', 'Abeg, next motor!'],
    drop: ['E se, driver!', 'Thank you o!', 'God go bless you!', 'Correct driver!'],
    missed: ['Driver! You pass my stop!', 'Ah! I said {area}!', 'You no hear me? {area}!'],
    jump: ['"I no fit die for this motor!"', '"Stop! I dey come down!"', '"Driver, you wan kill us?"'],
    terminus: ['{area}! Everybody come down!', '{area}! Last stop o!'],
    turnBack: ['Turn back! Load again!', 'Oya, the other way!'],
    night: ['Night don reach! Park am.', 'Day don end! Time to see Oga.'],
    late: ['Night dey come o! Last trips!', 'Time don dey go. Oga dey wait!'],

    // Fare haggling. {stop} = where they're going, {price}/{counter} = naira.
    offer: ['{stop}, {price}?', 'Driver, {stop} {price}?', 'Abeg {stop}, {price}.', '{stop}! Se {price} ni?'],
    accept: ['Oya, no wahala.', 'Okay, I go pay.', 'E no bad. Make we go.'],
    counter: ['Ehn?! Make am {counter}.', 'Haba! {counter} last.', 'Driver, {counter} abeg.'],
    walk: ['Your motor no be the only motor!', 'I go wait for another one.', 'Ole! Too cost!'],
    negotiateTip: 'Passenger dey price you!\nTap a fare, or press 1 / 2 / 3.',
  },

  pause: ['Rest small, traffic no go run.', 'Oya, drink pure water first.', 'Hold on, make I buy gala.', 'Go-slow don pause small.'],

  lowTime: ['Time dey go o!', 'Quick quick!', 'Oya, sharp sharp!'],

  win: ['You try well well!', 'Correct driver!', 'Ibadan road no fit you!'],
  lose: ['Time don finish! Go-slow don win today.', 'Ehn ehn! Traffic don hold you.', 'Next time, oya move faster!'],

  share: 'I drove from {start} to {finish} in {time} on {title}. Can you beat me?',
  shareWork: 'Day {day} for Ibadan road: I carry {passengers} passengers, make {money} and settle my Oga on {title}. Can you hustle pass me?',
  shareOwned: 'I don finish paying for my {vehicle} in {days} days on {title}! The motor na my own now. Your turn:',
  shareCollected: 'Oga collect im {vehicle} from me on day {days} of {title}. Ibadan road no easy o! Try am:',
  shareLose:'Ibadan traffic held me at {area} on {title}. Can you reach {finish}?',
};

/** Pick a random line from a list and fill in {placeholders}. */
export function pickLine(list, vars = {}) {
  const line = Array.isArray(list) ? list[Math.floor(Math.random() * list.length)] : list;
  return fillVars(line, vars);
}

/** Replace {key} placeholders in a string with values from vars. */
export function fillVars(text, vars = {}) {
  return text.replace(/\{(\w+)\}/g, (m, key) => (key in vars ? vars[key] : m));
}
