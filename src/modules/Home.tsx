import React, { FC, useState, useEffect } from "react";
import { fabric } from "fabric";
import CanvasInput from "../components/CanvasInput";
import CanvasOutput from "../components/CanvasOutput";
import { Button, Upload, Divider } from "antd";
import { UploadProps } from "antd/lib/upload";
import {
  FileImageOutlined,
  ArrowRightOutlined,
  EditOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import slicAlgorithm from "../utils/SLICAlgorithm";

type Props = {};
type SLICResult = {
  indexMap: Int32Array;
  rgbData: Uint8Array;
  segments: {
    [pixel: number]: {
      mask: any;
      count: number;
      mp: [number, number, number];
      red: Uint32Array;
      green: Uint32Array;
      blue: Uint32Array;
      edges?: {
        [k: number]: number;
      };
    };
  };
};
const Home: FC<Props> = () => {
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [canvasInput, setCanvasInput] = useState<fabric.Canvas | null>(null);
  const [canvasOutput, setCanvasOutput] = useState<fabric.Canvas | null>(null);

  const [imageURL, setImageURL] = useState("");

  const uploadProps: UploadProps = {
    name: "file",
    accept: ".png,.jpg,.jpeg",
    showUploadList: false,
    onChange({ file, fileList }) {
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
          red: new Uint32Array(256),
          green: new Uint32Array(256),
          blue: new Uint32Array(256),
        };
      }

      segments[current].count += 1;
      segments[current].mp[0] += rgbData[4 * i];
      segments[current].mp[1] += rgbData[4 * i + 1];
      segments[current].mp[2] += rgbData[4 * i + 2];
      segments[current].red[rgbData[4 * i]] += 1;
      segments[current].green[rgbData[4 * i + 1]] += 1;
      segments[current].blue[rgbData[4 * i + 2]] += 1;
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

  const handleSegment = () => {
    const data = canvasInput!
      .getContext()
      .getImageData(0, 0, canvasInput!.getWidth(), canvasInput!.getHeight());

    const result = callbackSegmentation({
      ...slicAlgorithm(data, 30),
      segments: {},
    });
    renderSuperpixels(result);
  };

  const renderSuperpixels = (result: SLICResult) => {
    const context = canvasOutput!.getContext();
    // if (window.devicePixelRatio) {
    //   context.scale(window.devicePixelRatio, window.devicePixelRatio);
    // }
    const imageData = context.createImageData(canvasOutput!.getWidth(), canvasOutput!.getHeight());
    const data = imageData.data;
    let seg;
    for (let i = 0; i < result.indexMap.length; ++i) {
      seg = result.segments[result.indexMap[i]];
      data[4 * i + 3] = 255;
      if (result.indexMap[i] == result.indexMap[i + 1]) {
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
      new fabric.Canvas("canvas-input", { selection: false, enableRetinaScaling: false })
    );
    setCanvasOutput(
      new fabric.Canvas("canvas-output", { selection: false, enableRetinaScaling: false })
    );
  }, []);

  return (
    <>
      <div className='tools' style={styles.Tools}>
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
        <CanvasOutput canvas={canvasOutput} />
      </div>
    </>
  );
};

const styles = {
  Tools: {
    marginBottom: 20,
  },
};

export default Home;
