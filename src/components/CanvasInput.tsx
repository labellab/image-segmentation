import React, { FC, useEffect } from "react";
import { Card } from "antd";
import { fabric } from "fabric";
import { setCanvasImage } from "../utils/canvasUtil";

type Props = {
  canvas: fabric.Canvas | null;
  imageURL: string;
  isDrawing: boolean;
};

let zoom = 1;
let draggingBg = false;
const CanvasInput: FC<Props> = ({ canvas, imageURL, isDrawing }) => {
  useEffect(() => {
    if (!canvas) return;
    fabric.Image.fromURL(imageURL, async (img) => {
      setCanvasImage({ img, canvas });

      canvas.on("mouse:wheel", (opt: any) => {
        const delta = opt.e.deltaY;
        zoom = canvas.getZoom() + delta / 1000;
        if (zoom > 10) {
          zoom = 10;
        }
        if (zoom < 0.3) {
          zoom = 0.3;
        }
        //@ts-ignore
        canvas.zoomToPoint({ x: opt.pointer.x, y: opt.pointer.y }, zoom);
        opt.e.preventDefault();
        opt.e.stopPropagation();
      });

      canvas.on("mouse:down", (e: any) => {
        if (e.e.altKey) {
          draggingBg = true;
          return;
        }
      });

      canvas.on("mouse:move", (e: any) => {
        if (draggingBg) {
          canvas.relativePan(new fabric.Point(e.e.movementX, e.e.movementY));
        }
      });

      canvas.on("mouse:up", (e: any) => {
        draggingBg = false;
      });
    });
  }, [imageURL]);

  return (
    <Card className='canvas-card'>
      <canvas id='canvas-input'></canvas>
    </Card>
  );
};

export default CanvasInput;
