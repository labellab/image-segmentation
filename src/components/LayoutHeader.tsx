import React, { FC } from "react";
import { Layout as AntLayout } from "antd";

const { Header } = AntLayout;

type Props = {};

const LayoutHeader: FC<Props> = () => {
  return (
    <Header className='header' id='header'>
      <div id='header-inner'>
        <div id='logo'>
          <img src=' https://avatars3.githubusercontent.com/u/61448501?s=200&v=4' alt='logo' />

          <span>Image Segmentation</span>
        </div>
      </div>
    </Header>
  );
};

export default LayoutHeader;
