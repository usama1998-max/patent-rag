import { FC } from "react";
import ButtonNavigate from "../../components/ButtonNavigate/ButtonNavigate.tsx"
import {RoutePaths} from "../../routes/RoutPaths.ts";
import { Opulento } from "uvcanvas";

const Home: FC = () => {
  return (
      <>
          <Opulento />  
          <div style={{
              width: "100%",
              padding: 0,
              margin: 0,
              height: "95vh",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              textAlign: "center",
              zIndex: -1
          }}>
                <Opulento />
          </div>

          <div style={{
            // border: "2px solid red",
            flexDirection: "column",
            justifyContent: "center",
            textAlign: "center",
            position: "absolute",
            display: "block",
            top: "40%",
            left: 0,
            right: 0,
            zIndex: 0
            }}>
                <h1 style={{"padding": "10px", color: "#d97757"}}>Patent-RAG</h1>
                <p style={{color: "white"}}>A web application for extracting and visualizing information from patent documents.</p>
                <ButtonNavigate text="Get Started" to={RoutePaths.PROJECTS} />
                <p style={{marginTop: "20px", color: "white"}}>version 1.1</p>
          </div>
          
      </>
  );
};

export default Home;
