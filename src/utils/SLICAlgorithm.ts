export default function (imageData: ImageData, options: Options) {
  options.regionSize = ~~options.regionSize;

  const segmentation = computeSLICSegmentation(imageData, options);
  const numSegments = remapLabels(segmentation);

  if (options.callback) {
    var rgbData = new Uint8Array(imageData.data);
    options.callback({
      width: imageData.width,
      height: imageData.height,
      size: numSegments,
      indexMap: segmentation,
      rgbData: rgbData,
    });
  }
}

type Options = {
  regionSize: number;
  callback: (obj: {
    width: number;
    height: number;
    size: number;
    indexMap: Int32Array;
    rgbData: Uint8Array;
  }) => void;
};

/**
 * Convert RGBA into XYZ color space.
 * RGBA: Red Green Blue Alpha
 * Get more infomation at http://www.easyrgb.com/en/math.php
 */
function rgb2xyz(rgba: Uint8ClampedArray, w: number, h: number) {
  const xyz = new Float32Array(3 * w * h);
  for (let i = 0; i < w * h; i += 1) {
    let r = rgba[4 * i] / 255;
    let g = rgba[4 * i + 1] / 255;
    let b = rgba[4 * i + 2] / 255;
    r = r ** 2.19921875;
    g = g ** 2.19921875;
    b = b ** 2.19921875;
    xyz[i] = r * 0.488718 + g * 0.31068 + b * 0.200602;
    xyz[w * h + i] = r * 0.176204 + g * 0.812985 + b * 0.0108109;
    xyz[2 * w * h + i] = g * 0.0102048 + b * 0.989795;
  }
  return xyz;
}

/**
 * Convert XYZ to Lab
 * Get more infomation at http://www.easyrgb.com/en/math.php
 */
function xyz2lab(xyz: Float32Array, w: number, h: number) {
  function f(s: number): number {
    if (s > 0.008856) {
      return s ** 0.3333333333;
    } else {
      return 7.78706891568 * s + 0.1379310345;
    }
  }
  const xw = 1.0 / 3.0,
    yw = 1.0 / 3.0,
    Yw = 1.0,
    Xw = xw / yw,
    Zw = ((1 - xw - yw) / yw) * Yw,
    ix = 1.0 / Xw,
    iy = 1.0 / Yw,
    iz = 1.0 / Zw;
  const lab = new Float32Array(3 * w * h);
  for (let i = 0; i < w * h; i += 1) {
    const fx = f(xyz[i] * ix),
      fy = f(xyz[w * h + i] * iy),
      fz = f(xyz[2 * w * h + i] * iz);
    lab[i] = 116.0 * fy - 16.0;
    lab[i + w * h] = 500.0 * (fx - fy);
    lab[i + 2 * w * h] = 200.0 * (fy - fz);
  }
  return lab;
}

function computeSLICSegmentation(imageData: ImageData, options: Options): Int32Array {
  const { width, height } = imageData,
    numRegionsX = ~~(width / options.regionSize),
    numRegionsY = ~~(height / options.regionSize),
    numRegions = ~~(numRegionsX * numRegionsY),
    numPixels = ~~(width * height),
    edgeMap = new Float32Array(numPixels),
    masses = new Array(numPixels),
    currentCenters = new Float32Array(5 * numRegions),
    newCenters = new Float32Array(5 * numRegions),
    clusterParams = new Float32Array(2 * numRegions),
    mcMap = new Float32Array(numPixels),
    msMap = new Float32Array(numPixels),
    distanceMap = new Float32Array(numPixels),
    labData = xyz2lab(
      rgb2xyz(imageData.data, imageData.width, imageData.height),
      imageData.width,
      imageData.height
    );

  computeEdge(labData, edgeMap, imageData.width, imageData.height);
  initializeKmeansCenters(
    labData,
    edgeMap,
    currentCenters,
    clusterParams,
    numRegionsX,
    numRegionsY,
    options.regionSize,
    imageData.width,
    imageData.height
  );

  const segmentation = new Int32Array(numPixels);

  // The experiments show that it suffices to run the algorithm for 4 to 10 iterations, Here we use 10.
  for (let i = 0; i < 10; i += 1) {
    assignSuperpixelLabel(
      labData,
      segmentation,
      mcMap,
      msMap,
      distanceMap,
      currentCenters,
      clusterParams,
      numRegionsX,
      numRegionsY,
      options.regionSize,
      imageData.width,
      imageData.height
    );

    let j = 0;
    for (let j = 0; j < masses.length; j += 1) {
      masses[j] = 0;
    }
    for (let j = 0; j < newCenters.length; j += 1) {
      newCenters[j] = 0;
    }
    computeCenter(
      labData,
      segmentation,
      masses,
      newCenters,
      numRegions,
      imageData.width,
      imageData.height
    );

    const error = computeResidualError(currentCenters, newCenters);
    if (error < 1e-5) break;

    for (let j = 0; j < currentCenters.length; j += 1) {
      currentCenters[j] = newCenters[i];
    }
  }
  //   const minRegionSize = options.regionSize ** 2 / 4;
  //   eliminateSmallRegions(segmentation, minRegionSize, numPixels, imageData.width, imageData.height);

  console.log(`
  图宽：${imageData.width}
  图高：${imageData.height}
  regionSize：${options.regionSize}
  numRegions：${numRegions}
`);
  console.log(currentCenters);
  console.log(labData);
  console.log(edgeMap);

  return segmentation;
}

function eliminateSmallRegions(
  segmentation: Int32Array,
  minRegionSize: number,
  numPixels: number,
  w: number,
  h: number
) {}

function computeCenter(
  labData: Float32Array,
  segmentation: Int32Array,
  masses: number[],
  centers: Float32Array,
  numRegions: number,
  w: number,
  h: number
) {
  let region: number = 0;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      region = segmentation[y * w + x];
      masses[region] += 1;
      centers[region * 5] += x;
      centers[region * 5 + 1] += y;
      centers[region * 5 + 2] += labData[y * w + x];
      centers[region * 5 + 3] += labData[w * h + y * w + x];
      centers[region * 5 + 4] += labData[2 * w * h + y * w + x];
    }
  }
  for (region = 0; region < numRegions; region += 1) {
    const iMass = 1.0 / Math.max(masses[region], 1e-8);
    centers[region * 5] = centers[region * 5] * iMass;
    centers[region * 5 + 1] = centers[region * 5 + 1] * iMass;
    centers[region * 5 + 2] = centers[region * 5 + 2] * iMass;
    centers[region * 5 + 3] = centers[region * 5 + 3] * iMass;
    centers[region * 5 + 4] = centers[region * 5 + 4] * iMass;
  }
}

function assignSuperpixelLabel(
  labData: Float32Array,
  segmentation: Int32Array,
  mcMap: Float32Array,
  msMap: Float32Array,
  distanceMap: Float32Array,
  centers: Float32Array,
  clusterParams: Float32Array,
  numRegionsX: number,
  numRegionsY: number,
  regionSize: number,
  w: number,
  h: number
) {
  let x, y;
  for (let i = 0; i < distanceMap.length; i += 1) {
    distanceMap[i] = Infinity;
  }
  for (let region = 0; region < numRegionsX * numRegionsY; region += 1) {
    const cx = Math.round(centers[region * 5]);
    const cy = Math.round(centers[region * 5 + 1]);
    for (y = Math.max(0, cy - regionSize); y < Math.min(h, cy + regionSize); y += 1) {
      for (x = Math.max(0, cx - regionSize); x < Math.min(w, cx + regionSize); x += 1) {
        const spatial = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2),
          dL = labData[y * w + x] - centers[5 * region + 2],
          dA = labData[w * h + y * w + x] - centers[5 * region + 3],
          dB = labData[2 * w * h + y * w + x] - centers[5 * region + 4],
          appearance = Math.sqrt(dL ** 2 + dA ** 2 + dB ** 2),
          distance =
            appearance + (clusterParams[region * 2] / clusterParams[region * 2 + 1]) * spatial;
        if (distance < distanceMap[y * w + x]) {
          distanceMap[y * w + x] = distance;
          segmentation[y * w + x] = region;
        }
      }
    }
  }
}

function computeResidualError(prevCenters: Float32Array, centers: Float32Array): number {
  let error = 0.0;
  for (let i = 0; i < prevCenters.length; i += 1) {
    const d = prevCenters[i] - centers[i];
    error += Math.sqrt(d * d);
  }
  return error;
}

function initializeKmeansCenters(
  labData: Float32Array,
  edgeMap: Float32Array,
  centers: Float32Array,
  clusterParams: Float32Array,
  numRegionsX: number,
  numRegionsY: number,
  regionSize: number,
  w: number,
  h: number
) {
  let i = 0,
    j = 0,
    x,
    y;
  for (let v = 0; v < numRegionsY; v += 1) {
    for (let u = 0; u < numRegionsX; u += 1) {
      var centerx = 0,
        centery = 0,
        minEdgeValue = Infinity,
        xp,
        yp;

      x = Math.round(regionSize * (u + 0.5));
      y = Math.round(regionSize * (v + 0.5));
      x = Math.max(Math.min(x, w - 1), 0);
      y = Math.max(Math.min(y, h - 1), 0);

      for (yp = Math.max(0, y - 1); yp <= Math.min(h - 1, y + 1); yp += 1) {
        for (xp = Math.max(0, x - 1); xp <= Math.min(w - 1, x + 1); xp += 1) {
          const edgeValue = edgeMap[yp * w + xp];
          if (edgeValue < minEdgeValue) {
            minEdgeValue = edgeValue;
            centerx = xp;
            centery = yp;
          }
        }
      }

      centers[i++] = centerx;
      centers[i++] = centery;
      centers[i++] = labData[centery * w + centerx];
      centers[i++] = labData[w * h + centery * w + centerx];
      centers[i++] = labData[2 * w * h + centery * w + centerx];

      clusterParams[j++] = 10 * 10;
      clusterParams[j++] = regionSize * regionSize;
    }
  }
}

function computeEdge(labData: Float32Array, edgeMap: Float32Array, w: number, h: number) {
  for (let k = 0; k < 3; k += 1) {
    for (let y = 1; y < h - 1; y += 1) {
      for (let x = 1; x < w - 1; x += 1) {
        const a = labData[k * w * h + y * w + x - 1],
          b = labData[k * w * h + y * w + x + 1],
          c = labData[k * w * h + (y + 1) * w + x],
          d = labData[k * w * h + (y - 1) * w + x];
        edgeMap[y * w + x] = edgeMap[y * w + x] + (a - b) ** 2 + (c - d) ** 2;
      }
    }
  }
}

function remapLabels(segmentation: Int32Array) {
  const map: { [label: number]: number } = {};
  let index = 0;
  for (var i = 0; i < segmentation.length; ++i) {
    var label = segmentation[i];
    if (map[label] === undefined) map[label] = index++;
    segmentation[i] = map[label];
  }
  return index;
}
