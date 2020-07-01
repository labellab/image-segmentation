import React, { FC, useEffect } from "react";
import { Card } from "antd";

type Props = {
  canvas: fabric.Canvas | null;
};
const CanvasSuperpixel: FC<Props> = ({ canvas }) => {
  useEffect(() => {
    if (!canvas) return;
    let { clientWidth, clientHeight } = document.querySelector(".canvas-card")!;

    canvas.setWidth(clientWidth);
    canvas.setHeight(clientHeight);
  }, [canvas]);

  return (
    <Card className='canvas-card'>
      <canvas id='canvas-superpixel'></canvas>
    </Card>
  );
};

export default CanvasSuperpixel;
