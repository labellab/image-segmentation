import React, { FC } from "react";
import { Link } from "react-router-dom";
import { Button } from "antd";

const Page404: FC = () => {
  return (
    <>
      <p>Oops... Page not found.</p>
      <Link to='/'>
        <Button type='primary'>Home</Button>
      </Link>
    </>
  );
};

export default Page404;
