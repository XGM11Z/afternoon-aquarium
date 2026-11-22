'use strict';
// Read device-local civil time. All four transitions are continuous across midnight.
function aquariumDaylight(date) {
  const hour = date.getHours() + date.getMinutes() / 60;
  const stops = [
    [0, .02, .00], [5, .02, .00], [6.5, .42, .84], [8.5, .92, .2],
    [11, 1, .02], [15, 1, .12], [17.5, .67, .9], [19.5, .15, .36],
    [21, .02, .00], [24, .02, .00]
  ];
  let index = 1;
  while (stops[index][0] < hour) index++;
  const a = stops[index-1], b = stops[index];
  const t = (hour-a[0])/(b[0]-a[0]), blend = t*t*(3-2*t);
  return {
    light: a[1] + (b[1]-a[1])*blend,
    warmth: a[2] + (b[2]-a[2])*blend,
    label: hour<5.5 || hour>=20 ? '夜间' : hour<8.5 ? '清晨' : hour<16.5 ? '白昼' : '黄昏',
    clock: String(date.getHours()).padStart(2,'0') + '∶' + String(date.getMinutes()).padStart(2,'0')
  };
}
