import React from "react";
import { HashRouter, Switch, Route } from "react-router-dom";
import Page404 from "../404";
import Home from "../modules/Home";

export type MyRouteProps = {
  component: any;
  exact?: boolean;
  path: string;
  // nav: string
};

export const routes: MyRouteProps[] = [
  {
    path: "/",
    exact: true,
    component: Home,
  },
];

const Routes = () => (
  <HashRouter>
    <Switch>
      {routes.map(({ path, exact, component }) => (
        <Route path={path} key={path} exact={exact} component={component} />
      ))}
      <Route component={Page404} />
    </Switch>
  </HashRouter>
);

export default Routes;
