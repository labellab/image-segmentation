import React from "react";
import { HashRouter } from "react-router-dom";
import LayoutHeader from "./components/LayoutHeader";
import { Layout } from "antd";
import Routes from "./routes";

function App() {
  return (
    <div className='App'>
      <HashRouter>
        <LayoutHeader />
        <Layout>
          <Layout.Content id='main'>
            <Routes />
          </Layout.Content>
        </Layout>
      </HashRouter>
    </div>
  );
}

export default App;
