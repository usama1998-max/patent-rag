import { FC } from 'react';

interface NavBarProps {
  projectName: string;
}


const NavBar: FC<NavBarProps> = ({projectName}: NavBarProps) => {
        return (<>
            <div className="rs-nav-bar" style={{display: "flex", flexDirection: "row", position: "relative", padding: "10px"}}>
               <h1 style={{textAlign: "left", display: "block", position: "relative", left: "10px", color: "white"}}>Patent-RAG</h1>
               <h3 style={{textAlign: "right", display: "block", position: "absolute", right: "10px", marginTop: "10px", color: "white"}}>{projectName}</h3>
            </div>
        </>)
}

export default NavBar;
