import React, { useState, useEffect } from "react";
import { fabric } from "fabric";
import CanvasInput from "./components/CanvasInput";
import CanvasSuperpixel from "./components/CanvasSuperpixel";
import { Button, Upload, Divider, Layout } from "antd";
import { UploadProps } from "antd/lib/upload";
import {
  FileImageOutlined,
  ArrowRightOutlined,
  EditOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import slicAlgorithm from "./utils/SLICAlgorithm";
import CanvasOutput from "./components/CanvasOutput";
import LayoutHeader from "./components/LayoutHeader";

let inputData: ImageData | undefined;
let maskData: ImageData | undefined;

function App() {
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [imageURL, setImageURL] = useState("");

  const [canvasInput, setCanvasInput] = useState<fabric.Canvas | null>(null);
  const [canvasSuperpixel, setCanvasSuperpixel] = useState<fabric.Canvas | null>(null);
  const [canvasOutput, setCanvasOutput] = useState<fabric.Canvas | null>(null);

  const uploadProps: UploadProps = {
    name: "file",
    accept: ".png,.jpg,.jpeg",
    showUploadList: false,
    onChange({ file, fileList }) {
      if (canvasInput) {
        canvasInput.remove(...canvasInput.getObjects());
      }
      if (file.status !== "uploading") {
        const reader = new FileReader();
        reader.addEventListener("load", () => {
          setImageURL(reader.result as string);
        });
        reader.readAsDataURL(file.originFileObj!);
      }
    },
  };

  const callbackSegmentation = (res: SLICResult): SLICResult => {
    const { indexMap, rgbData, segments } = res;

    for (let i = 0; i < indexMap.length; i += 1) {
      const current = indexMap[i];
      if (!segments.hasOwnProperty(current)) {
        segments[current] = {
          mask: { b: 0, f: 0 },
          count: 0,
          mp: [0, 0, 0],
          role: {
            foreground: false,
            background: false,
            mixed: false,
            unknown: false,
          },
          // red: new Uint32Array(256),
          // green: new Uint32Array(256),
          // blue: new Uint32Array(256),
        };
      }

      segments[current].count += 1;
      segments[current].mp[0] += rgbData[4 * i];
      segments[current].mp[1] += rgbData[4 * i + 1];
      segments[current].mp[2] += rgbData[4 * i + 2];
      // segments[current].red[rgbData[4 * i]] += 1;
      // segments[current].green[rgbData[4 * i + 1]] += 1;
      // segments[current].blue[rgbData[4 * i + 2]] += 1;
    }
    for (const s in segments) {
      segments[s].mp[0] = segments[s].mp[0] / segments[s].count;
      segments[s].mp[1] = segments[s].mp[1] / segments[s].count;
      segments[s].mp[2] = segments[s].mp[2] / segments[s].count;
      segments[s].edges = {};
      // for (const k in segments) {
      //   if (s !== k) {
      //     segments[s].edges![k] = 1.0;
      //   }
      // }
    }
    return { ...res, segments };
  };

  const handleExtract = () => {
    if (!canvasInput) return;

    canvasInput!.isDrawingMode = false;
    canvasInput.discardActiveObject();

    canvasInput.forEachObject((obj) => {
      if (!obj.isType("image")) {
        obj.opacity = 0;
      }
    });
    canvasInput.renderAll();
    inputData = canvasInput
      .getContext()
      .getImageData(0, 0, canvasInput.getWidth(), canvasInput.getHeight());

    canvasInput.forEachObject((obj) => {
      if (!obj.isType("image")) {
        obj.opacity = 1;
      } else {
        obj.opacity = 0;
      }
    });
    canvasInput.renderAll();
    maskData = canvasInput
      .getContext()
      .getImageData(0, 0, canvasInput.getWidth(), canvasInput.getHeight());

    canvasInput.forEachObject((obj) => {
      if (obj.isType("image")) {
        obj.opacity = 1;
      } else {
        obj.opacity = 0.6;
      }
    });
    canvasInput.renderAll();
  };

  const handleSegment = () => {
    if (!canvasInput) return;

    handleExtract();
    const result = callbackSegmentation({
      ...slicAlgorithm(inputData!, 30),
      segments: {},
    });
    renderSuperpixels(result);
    renderOutput(result);
  };

  const renderSuperpixels = (result: SLICResult) => {
    const { indexMap } = result;
    const context = canvasSuperpixel!.getContext();
    // if (window.devicePixelRatio) {
    //   context.scale(window.devicePixelRatio, window.devicePixelRatio);
    // }
    const imageData = context.createImageData(
      canvasSuperpixel!.getWidth(),
      canvasSuperpixel!.getHeight()
    );
    const { data } = imageData;
    let seg;
    for (let i = 0; i < indexMap.length; ++i) {
      seg = result.segments[indexMap[i]];
      data[4 * i + 3] = 255;
      if (indexMap[i] === indexMap[i + 1]) {
        data[4 * i + 0] = seg.mp[0];
        data[4 * i + 1] = seg.mp[1];
        data[4 * i + 2] = seg.mp[2];
      } else {
        data[4 * i + 0] = 0;
        data[4 * i + 1] = 0;
        data[4 * i + 2] = 0;
      }
    }
    context.putImageData(imageData, 0, 0);
  };

  const renderOutput = (result: SLICResult) => {
    const { rgbData, indexMap, segments } = result;
    const mask = maskData!.data;
    for (let i = 0; i < indexMap.length; i += 1) {
      //@ts-ignore
      if (mask[4 * i] === 0 && mask[4 * i + 1] === 128 && mask[4 * i + 2] === 0) {
        segments[indexMap[i]].mask.f++;
      }
      //@ts-ignore
      if (mask[4 * i] === 255 && mask[4 * i + 1] === 0 && mask[4 * i + 2] === 0) {
        segments[indexMap[i]].mask.b++;
      }
    }
    Object.values(segments).forEach((item) => {
      if (item.mask.f > 0 && item.mask.b === 0) {
        item.role.foreground = true;
      } else if (item.mask.f === 0 && item.mask.b > 0) {
        item.role.background = true;
      } else if (item.mask.f > 0 && item.mask.b > 0) {
        item.role.mixed = true;
      } else {
        item.role.unknown = true;
      }
    });

    const context = canvasOutput!.getContext();
    const imageData = context.createImageData(canvasOutput!.getWidth(), canvasOutput!.getHeight());
    const { data } = imageData;

    for (let i = 0; i < indexMap.length; i += 1) {
      if (segments[indexMap[i]].role.foreground) {
        data[4 * i] = rgbData[4 * i];
        data[4 * i + 1] = rgbData[4 * i + 1];
        data[4 * i + 2] = rgbData[4 * i + 2];
        data[4 * i + 3] = 255;
      } else {
        data[4 * i + 3] = 0;
      }
    }
    context.putImageData(imageData, 0, 0);
  };

  const handleFreeDrawing = (mode: 1 | 0) => {
    setIsDrawingMode(true);
    canvasInput!.isDrawingMode = true;
    canvasInput!.freeDrawingBrush.width = 6;
    canvasInput!.freeDrawingBrush.color = mode === 1 ? "green" : "red";
  };

  const stopFreeDrawing = () => {
    canvasInput!.isDrawingMode = false;
    setIsDrawingMode(false);
  };

  useEffect(() => {
    setCanvasInput(
      new fabric.Canvas("canvas-input", {
        selection: false,
        enableRetinaScaling: false,
      })
    );
    setCanvasSuperpixel(
      new fabric.Canvas("canvas-superpixel", {
        selection: false,
        enableRetinaScaling: false,
      })
    );
    setCanvasOutput(
      new fabric.Canvas("canvas-output", {
        selection: false,
        enableRetinaScaling: false,
      })
    );
  }, []);

  return (
    <>
      <LayoutHeader />
      <Layout>
        <Layout.Content id='main'>
          <div className='tools'>
            <Upload {...uploadProps}>
              <Button type='primary' ghost>
                <FileImageOutlined /> Add image
              </Button>
            </Upload>
            <Divider type='vertical' />
            <Button
              type='primary'
              ghost
              style={{ color: "green", borderColor: "green" }}
              onClick={() => handleFreeDrawing(1)}>
              <EditOutlined /> Draw Foreground
            </Button>
            <Divider type='vertical' />
            <Button
              type='primary'
              ghost
              style={{ color: "red", borderColor: "red" }}
              onClick={() => handleFreeDrawing(0)}>
              <EditOutlined /> Draw background
            </Button>
            <Divider type='vertical' />
            {isDrawingMode && [
              <Button onClick={stopFreeDrawing}>
                <CloseOutlined /> Stop drawing
              </Button>,
              <Divider type='vertical' />,
            ]}
            <Button type='primary' ghost onClick={handleSegment}>
              <ArrowRightOutlined /> Segment
            </Button>
          </div>
          <div className='canvas-stage'>
            <CanvasInput canvas={canvasInput} imageURL={imageURL} isDrawing={isDrawingMode} />
            <CanvasSuperpixel canvas={canvasSuperpixel} />
            <CanvasOutput canvas={canvasOutput} />
          </div>
        </Layout.Content>
      </Layout>
    </>
  );
}

type SLICResult = {
  indexMap: Int32Array;
  rgbData: Uint8Array;
  segments: {
    [pixel: number]: {
      mask: {
        f: number; // foreground
        b: number; // background
      };
      role: {
        foreground: boolean;
        background: boolean;
        mixed: boolean;
        unknown: boolean;
      };
      count: number;
      mp: [number, number, number]; // RGB
      // red: Uint32Array;
      // green: Uint32Array;
      // blue: Uint32Array;
      edges?: {
        [k: number]: number;
      };
    };
  };
};

export default App;
