export const memePoses = [
  {
    image: 'roaring-duo',
    title: 'Calm versus chaos',
    cue: 'Face each other. One rests a hand under their chin, the other roars.',
  },
  {
    image: 'thinking-monkey',
    title: 'Thinking monkey',
    cue: 'Put a finger on your chin and look up like you are deep in thought.',
  },
  {
    image: 'time-out',
    title: 'Time out',
    cue: 'Make a T with your hands and keep a straight face.',
  },
  {
    image: 'back-to-back',
    title: 'Back-to-back duo',
    cue: 'Stand back-to-back, look over your shoulders, and hold up finger guns.',
  },
  {
    image: 'straight-face',
    title: 'Straight face',
    cue: 'Look straight at the camera with wide eyes and a tiny smirk.',
  },
  {
    image: 'chin-in-hands',
    title: 'Chin in hands',
    cue: 'Tuck both hands under your chin and stare straight into the camera.',
  },
  {
    image: 'wedding-duo',
    title: 'Two reactions',
    cue: 'One person hides their face while the other laughs with both hands up.',
  },
  {
    image: 'six-seven',
    title: 'Six seven',
    cue: 'Hold both palms up, tilt your head, and stick out your tongue.',
  },
  {
    image: 'monkey-chaos',
    title: 'Monkey chaos',
    cue: 'One person sticks out their tongue. The other looks up and covers their mouth.',
  },
  {
    image: 'dog-side-eye',
    title: 'Side-eye and chaos',
    cue: 'One gives a wide-eyed side-eye. The other leans in and sticks their tongue out.',
  },
  {
    image: 'serious-prayer',
    title: 'Praying for strength',
    cue: 'Clasp your hands under your chin. One squeezes their eyes shut and the other looks up.',
  },
  {
    image: 'holding-in-a-laugh',
    title: 'Holding in a laugh',
    cue: 'Close your eyes, scrunch your nose, and press your lips together.',
  },
  {
    image: 'smirk-and-scream',
    title: 'Smirk and scream',
    cue: 'One raises an eyebrow and smirks. The other looks up, mouth open and tongue out.',
  },
  {
    image: 'shy-blush',
    title: 'Shy blush',
    cue: 'Tuck your chin, bring your hands close, and give the camera a shy smile.',
  },
  {
    image: 'talk-to-the-hand',
    title: 'Talk to the hand',
    cue: 'One person looks at an imaginary phone and puts a hand up. The other keeps talking.',
  },
  {
    image: 'he-did-it',
    title: 'He did it',
    cue: 'Point a thumb at your friend. They duck their head and cover their face.',
  },
  {
    image: 'who-me',
    title: 'Who, me?',
    cue: 'Point to your chest and look straight at the camera in disbelief.',
  },
  {
    image: 'mind-blown',
    title: 'Mind blown',
    cue: 'Put both hands against your head, widen your eyes, and drop your jaw.',
  },
];

export const poseImage = (pose) => `${import.meta.env.BASE_URL}poses/${pose.image}.jpg`;
