import { getStickerPlacement, drawSticker } from '../stickers/sticker-art.js';

const face = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109];
const features = [
  [70, 63, 105, 66, 107, 55, 133, 153, 145, 144, 163, 33],
  [300, 293, 334, 296, 336, 285, 362, 380, 374, 373, 390, 263],
  [61, 40, 37, 0, 267, 270, 291, 321, 314, 17, 84, 91],
];
export const portraitLooks = [
  ['portrait-soft', 'Soft Portrait'],
  ['portrait-studio', 'Studio Light'],
  ['rosy-glow', 'Rosy Glow'],
];

export function isPortraitEffect(id) {
  return id === 'dog' || portraitLooks.some(([look]) => look === id);
}

export function paintPortrait(ctx, buffer, source, points, width, height, id) {
  const placement = getStickerPlacement(points, width, height);
  if (!placement || !source?.videoWidth) return;
  const { cx, cy, scale, angle, top, nose, mouth } = placement;
  if (buffer.width !== width || buffer.height !== height) {
    buffer.width = width;
    buffer.height = height;
  }
  const paint = buffer.getContext('2d');
  const trace = (indices) => {
    if (!indices.every((i) => points[i])) return;
    paint.beginPath();
    indices.forEach((i, index) => {
      const { x, y } = points[i];
      if (index === 0) paint.moveTo(x * width, y * height);
      else paint.lineTo(x * width, y * height);
    });
    paint.closePath();
    paint.fill();
  };
  paint.clearRect(0, 0, width, height);
  paint.save();
  paint.fillStyle = '#fff';
  paint.filter = `blur(${Math.max(1.5, scale * .035)}px)`;
  if (id === 'dog') {
    paint.save();
    paint.translate(cx, cy);
    paint.rotate(angle);
    paint.scale(scale, scale);
    paint.beginPath();
    paint.ellipse(nose.x, (nose.y + mouth.y) / 2, .47, .41, 0, 0, Math.PI * 2);
    paint.fill();
    paint.restore();
  } else {
    trace(face);
    paint.globalCompositeOperation = 'destination-out';
    paint.filter = `blur(${Math.max(1, scale * .014)}px)`;
    features.forEach(trace);
  }
  paint.globalCompositeOperation = 'source-in';
  paint.filter = id === 'dog' ? 'saturate(.96)' :
    `blur(${Math.min(3.5, Math.max(1.2, scale * .018))}px) brightness(${id === 'portrait-studio' ? 1.14 : 1.035})`;
  if (id === 'dog' && points[13]) {
    const x = points[13].x * width;
    const y = points[13].y * height;
    paint.translate(x, y);
    paint.rotate(angle);
    paint.scale(1.19, 1.09);
    paint.rotate(-angle);
    paint.translate(-x, -y);
  }
  paint.drawImage(source, 0, 0, width, height);
  paint.restore();
  ctx.save();
  ctx.globalAlpha = id === 'portrait-studio' ? .74 : id === 'dog' ? .92 : .55;
  ctx.drawImage(buffer, 0, 0, width, height);
  ctx.restore();

  if (id === 'rosy-glow') drawSticker(ctx, points, width, height, id);
  if (id !== 'dog') return;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.scale(scale, scale);
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(top.x + side * .49, top.y - .10);
    ctx.scale(side, 1);
    const shading = ctx.createLinearGradient(0, -.15, .49, .35);
    shading.addColorStop(0, '#a96c4e');
    shading.addColorStop(.42, '#71412f');
    shading.addColorStop(1, '#271713');
    ctx.fillStyle = shading;
    ctx.beginPath();
    ctx.moveTo(-.09, .12);
    ctx.bezierCurveTo(.01, -.42, .48, -.29, .55, .02);
    ctx.bezierCurveTo(.64, .32, .54, .68, .32, .65);
    ctx.bezierCurveTo(.11, .59, .15, .23, -.09, .12);
    ctx.fill();
    ctx.restore();
  }
  const nostril = ctx.createRadialGradient(nose.x - .07, nose.y - .07, .01, nose.x, nose.y, .23);
  nostril.addColorStop(0, '#766165');
  nostril.addColorStop(.44, '#362b2e');
  nostril.addColorStop(1, '#151013');
  ctx.fillStyle = nostril;
  ctx.beginPath();
  ctx.moveTo(nose.x - .23, nose.y - .06);
  ctx.bezierCurveTo(nose.x - .21, nose.y - .20, nose.x + .21, nose.y - .20, nose.x + .23, nose.y - .06);
  ctx.bezierCurveTo(nose.x + .21, nose.y + .03, nose.x + .04, nose.y + .16, nose.x, nose.y + .15);
  ctx.bezierCurveTo(nose.x - .04, nose.y + .16, nose.x - .21, nose.y + .03, nose.x - .23, nose.y - .06);
  ctx.fill();

  const upper = points[13];
  const lower = points[14];
  const gap = lower && Math.hypot((lower.x - upper.x) * width, (lower.y - upper.y) * height) / scale;
  if (gap > .12) {
    const length = Math.min(.65, gap * 1.7);
    const pink = ctx.createLinearGradient(0, mouth.y, 0, mouth.y + length);
    pink.addColorStop(0, '#7c274c');
    pink.addColorStop(.46, '#e681a3');
    pink.addColorStop(1, '#f3abc0');
    ctx.fillStyle = pink;
    ctx.beginPath();
    ctx.moveTo(mouth.x - .13, mouth.y + .09);
    ctx.bezierCurveTo(mouth.x - .17, mouth.y + length, mouth.x + .18, mouth.y + length, mouth.x + .13, mouth.y + .09);
    ctx.quadraticCurveTo(mouth.x, mouth.y, mouth.x - .13, mouth.y + .09);
    ctx.fill();
  }
  ctx.restore();
}
