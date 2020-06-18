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

  const handleSegment = () => {
    const data = canvasInput!
      .getContext()
      .getImageData(0, 0, canvasInput!.getWidth(), canvasInput!.getHeight());
    console.log(data);
    slicAlgorithm(data, {
      regionSize: 40,
      callback: ({ indexMap }) => {
        console.log(indexMap);
      },
    });
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
