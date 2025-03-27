import { Routes, Route } from "react-router-dom";
import { RoutePaths } from "./RoutPaths.ts";
import MainLayout from "../layouts/MainLayout.tsx";
import Home from "../pages/Home/Home.tsx"
import Projects from "../pages/Projects/Projects.tsx";
import Project from "../pages/Project/Project.tsx";
import Chat from "../pages/Chat/Chat.tsx";

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path={RoutePaths.HOME}
        element={
          <MainLayout>
            <Home />
          </MainLayout>
        }
      />

      <Route
        path={RoutePaths.PROJECTS}
        element={
          <MainLayout>
            <Projects />
          </MainLayout>
        }
      />

      <Route
        path={RoutePaths.PROJECT}
        element={
          <MainLayout>
            <Project />
          </MainLayout>
        }
      />

       <Route
        path={RoutePaths.CHAT}
        element={
          <MainLayout>
            <Chat />
          </MainLayout>
        }
      />

    </Routes>
  );
};

export default AppRoutes;