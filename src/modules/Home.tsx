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

  const callbackSegmentation = (res: {
    width: number;
    height: number;
    size: number;
    indexMap: Int32Array;
    rgbData: Uint8Array;
  }) => {
    const { indexMap, width, height, rgbData } = res;
    const segments: {
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
    } = {};

    const numPixels = indexMap.length;
    for (let i = 0; i < numPixels; i += 1) {
      const current = indexMap[i];
      console.log("🔥", current);
      // if (!segments.hasOwnProperty(current)) {
      //   segments[current] = {
      //     mask: { b: 0, f: 0 },
      //     count: 0,
      //     mp: [0, 0, 0],
      //     red: new Uint32Array(256),
      //     green: new Uint32Array(256),
      //     blue: new Uint32Array(256),
      //   };
      // }

      // const y = ~~(i / width),
      //   x = i % width;
      // segments[current].count += 1;
      // segments[current].mp[0] += rgbData[4 * i];
      // segments[current].mp[1] += rgbData[4 * i + 1];
      // segments[current].mp[2] += rgbData[4 * i + 2];
      // segments[current].red[rgbData[4 * i]] += 1;
      // segments[current].green[rgbData[4 * i + 1]] += 1;
      // segments[current].blue[rgbData[4 * i + 2]] += 1;

      // Object.keys(segments).forEach((key) => {
      //   const s = +key;
      //   segments[s].mp[0] = segments[s].mp[0] / segments[s].count;
      //   segments[s].mp[1] = segments[s].mp[1] / segments[s].count;
      //   segments[s].mp[2] = segments[s].mp[2] / segments[s].count;
      //   segments[s].edges = {};
      //   Object.keys(segments).forEach((key2) => {
      //     const k = +key2;
      //     if (s !== k) {
      //       segments[s].edges![k] = 1.0;
      //     }
      //   });
      // });
    }
    return { ...res, segments };
  };

  const handleSegment = () => {
    const data = canvasInput!
      .getContext()
      .getImageData(0, 0, canvasInput!.getWidth(), canvasInput!.getHeight());
    console.log(data);
    const result = slicAlgorithm(data, {
      regionSize: 40,
    });
    // console.log(callbackSegmentation(result));
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
    setCanvasInput(new fabric.Canvas("canvas-input", { selection: false }));
    setCanvasOutput(new fabric.Canvas("canvas-output", { selection: false }));
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
        <CanvasOutput canvas={canvasInput} imageURL={imageURL} />
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
