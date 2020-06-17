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
    indexMap: number[];
    rgbData: Uint8Array;
  }) => void;
};

/**
 * Convert RGBA into XYZ color space.
 * RGBA: Red Green Blue Alpha
 * Get more infomation at http://www.easyrgb.com/en/math.php
 */
function rgb2xyz(rgba: Uint8Array, w: number, h: number) {
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

function computeSLICSegmentation(imageData: ImageData, options: Options): number[] {
  return [];
}

function remapLabels(segmentation: number[]) {
  const map: any = {};
  let index = 0;
  for (var i = 0; i < segmentation.length; ++i) {
    var label = segmentation[i];
    if (map[label] === undefined) map[label] = index++;
    segmentation[i] = map[label];
  }
  return index;
}
