/**
 * Largest Triangle Three Buckets (LTTB) algorithm for visual-preserving downsampling.
 * This implementation is specifically adapted for historical market data points { x: Date, y: number }.
 */

export interface DataPoint {
  x: Date;
  y: number;
}

export function downsampleLTTB(data: DataPoint[], threshold: number): DataPoint[] {
  const dataLength = data.length;
  if (threshold >= dataLength || threshold === 0) {
    return data; // Nothing to do
  }

  const sampled: DataPoint[] = [];
  let sampledIndex = 0;

  // Bucket size. Leave room for start and end data points
  const every = (dataLength - 2) / (threshold - 2);

  let a = 0;
  let maxAreaPoint = { x: new Date(), y: 0 };
  let nextA = 0;

  sampled[sampledIndex++] = data[a]; // Always add the first point

  for (let i = 0; i < threshold - 2; i++) {
    // Calculate point average for next bucket (containing c)
    let avgX = 0;
    let avgY = 0;
    let avgRangeStart = Math.floor((i + 1) * every) + 1;
    let avgRangeEnd = Math.floor((i + 2) * every) + 1;
    avgRangeEnd = avgRangeEnd < dataLength ? avgRangeEnd : dataLength;

    const avgRangeLength = avgRangeEnd - avgRangeStart;

    for (; avgRangeStart < avgRangeEnd; avgRangeStart++) {
      avgX += data[avgRangeStart].x.getTime();
      avgY += data[avgRangeStart].y;
    }
    avgX /= avgRangeLength;
    avgY /= avgRangeLength;

    // Get the range for this bucket
    let rangeOffs = Math.floor((i + 0) * every) + 1;
    const rangeTo = Math.floor((i + 1) * every) + 1;

    // Point a
    const pointAX = data[a].x.getTime();
    const pointAY = data[a].y;

    let maxArea = -1;
    let area = -1;

    for (; rangeOffs < rangeTo; rangeOffs++) {
      // Calculate triangle area over three buckets
      area = Math.abs(
        (pointAX - avgX) * (data[rangeOffs].y - pointAY) -
        (pointAX - data[rangeOffs].x.getTime()) * (avgY - pointAY)
      ) * 0.5;

      if (area > maxArea) {
        maxArea = area;
        maxAreaPoint = data[rangeOffs];
        nextA = rangeOffs;
      }
    }

    sampled[sampledIndex++] = maxAreaPoint; // Pick this point from the bucket
    a = nextA; // This a is the next a (chosen b)
  }

  sampled[sampledIndex++] = data[dataLength - 1]; // Always add last

  return sampled;
}
