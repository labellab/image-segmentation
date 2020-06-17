import React, { FC, useEffect } from "react";
import { Card } from "antd";

type Props = {
  canvas: fabric.Canvas | null;
  imageURL: string;
};
const CanvasOutput: FC<Props> = ({ canvas, imageURL }) => {
  useEffect(() => {}, []);

  return (
    <Card className='canvas-card'>
      <canvas id='canvas-output'></canvas>
    </Card>
  );
};

export default CanvasOutput;
