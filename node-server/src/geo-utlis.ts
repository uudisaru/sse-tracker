import proj4 from "proj4";

export type Location = [number, number];
export function loadCoordinates(csv: string): Location[] {
  const coords = csv.split(/\n/);
  return coords.map(coord => {
    const point = coord.split(",", 3);
    // From Lat / Lon to Lon / Lat
    return proj4("EPSG:4326", "EPSG:3857", [
      Number(point[1]),
      Number(point[0])
    ]);
  });
}

function distance(from: Location, to: Location) {
  return Math.sqrt(Math.abs(from[0] - to[0]) * Math.abs(from[1] - to[1]));
}

export async function* locationGenerator(locations: Location[], speed: number) {
  let i = 0;
  let ts = 0;
  for (; i < locations.length - 1; i++) {
    yield {
      i,
      pos: locations[i],
      ts: Math.round(ts),
    };
    const dist = distance(locations[i], locations[i + 1]);
    const interval = (dist / speed) * 1000;
    ts += interval;
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  yield {
    i,
    pos: locations[i],
    ts: Math.round(ts),
  };
}
