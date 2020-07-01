export const setCanvasImage = ({ img, canvas }: { img: fabric.Image; canvas: fabric.Canvas }) => {
  let { clientWidth, clientHeight } = document.querySelector(".canvas-card")!;

  let drawWidth = 0;
  let drawHeight = 0;

  if (img.height! / img.width! >= clientHeight / clientWidth) {
    drawHeight = clientHeight;
    drawWidth = clientHeight * (img.width! / img.height!);
  } else {
    drawWidth = clientWidth;
    drawHeight = clientWidth / (img.width! / img.height!);
  }

  canvas.setWidth(clientWidth);
  canvas.setHeight(clientHeight);

  img.scaleToWidth(drawWidth);
  img.scaleToHeight(drawHeight);

  canvas.add(img);
  // canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));
  canvas.renderAll();
};
