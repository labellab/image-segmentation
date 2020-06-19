import React, { FC, useEffect } from "react";
import { Card } from "antd";

type Props = {
  canvas: fabric.Canvas | null;
  imageURL?: string;
};
const CanvasOutput: FC<Props> = ({ canvas, imageURL }) => {
  useEffect(() => {
    if (!canvas) return;
    let { clientWidth, clientHeight } = document.querySelector(".canvas-card")!;

    clientWidth = clientWidth;
    clientHeight = clientHeight;

    canvas.setWidth(clientWidth);
    canvas.setHeight(clientHeight);
  }, [canvas]);

  return (
    <Card className='canvas-card'>
      <canvas id='canvas-output'></canvas>
    </Card>
  );
};

export default CanvasOutput;
