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
];

export const poseImage = (pose) => `${import.meta.env.BASE_URL}poses/${pose.image}.jpg`;
