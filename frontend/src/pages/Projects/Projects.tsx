import React, {useEffect} from "react";
import NavBar from "../../components/NavBar/NavBar.tsx";
// import Alert from "../../components/Alert/Alert.tsx";
// import {Panel} from "rsuite";
import Alert from "../../components/Alert/Alert.tsx";
import {useNavigate} from "react-router-dom";
import { Button, Loader } from 'rsuite';
import AddOutlineIcon from '@rsuite/icons/AddOutline';
import {useProjectList, ProjectList} from "../../hooks/useGetFiles.ts";
// import TrashIcon from "@rsuite/icons/Trash";
import CloseIcon from "@rsuite/icons/Close";

const Projects: React.FC = () => {

  const navigate = useNavigate();
  const { isPending: projectListPending, error: projectListError, data: projectListData } = useProjectList();
   

  useEffect(()=>{
    //   console.log("projectListError", projectListError);
    //   console.log("projectListPending", projectListPending);
    //   console.log("projectList", projectListData);
  }, [projectListData, projectListError, projectListPending])

  const handleNavigate = (projectId: any) => {
    navigate(`/projects/${projectId}`); // Navigates to the route with the parameter
  };

  const formatDate = (isoString: string): string => {
      const date = new Date(isoString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true, // Ensures AM/PM format
      });
  };

    return (
        <>
            <NavBar projectName="" />

           <div style={{
               overflow: "hidden",
               marginLeft: "auto",
               marginRight: "auto",
               position: "relative",
               padding: "0",
               display: "flex",
               flexDirection: "column",
               justifyContent: "center",
               width: "99%",
               height: "85vh"

           }}>

                <div style={{
                    position:"relative",
                    padding: "5px",
                    width: "100%",
                    height: "15%",
                    display: "flex",
                    flexDirection: "row",
                    justifyContent: "flex-start"
                }}>
                    <Button startIcon={<AddOutlineIcon />} color="orange" appearance="ghost" style={{padding: "7px", width: "10%", height: "100%"}}>
                        Create Project
                    </Button>
               </div>

               <div style={{
                   position: "relative",
                   padding:"0",
                   width: "100%",
                   height: "100%",
                   overflowY: "scroll",
                   overflowX: "unset",
                   paddingTop: "10px",
                   paddingBottom: "10px",
               }}>
                    {
                        projectListPending? <div style={{
                            margin: "auto",
                             position: "absolute",
                             display: "block",
                             // border: "1px solid white",
                             // width: "100%",
                             textAlign: "center",
                             width: "100%"
 
                         }}>
                            <Loader speed="normal" size="lg" />
                        </div> : projectListData?.map((item: ProjectList, _key) => {
                            return (
                                <div
                                    key={item?.unique_id}
                                    onClick={() => handleNavigate(item?.unique_id)}
                                    // header={item}
                                    style={{
                                        borderRadius: "15px",
                                        width: "auto",
                                        margin: "5px",
                                        display: "flex",
                                        flexDirection: "row",
                                        justifyContent: "start",
                                        border: "2px solid white",
                                        marginTop: "10px",
                                        padding: "10px",
                                        cursor: "pointer",
                                        height: "20%",
                                    }}>
                                    <div style={{
                                        width: "90%",
                                        height: "100%",
                                        display: "flex",
                                        justifyContent: "start",
                                        flexDirection: "column",
                                        paddingLeft: "40px"
                                    }}>
                                        <h2 style={{color: "white"}} >{item?.project_name}</h2>
                                        <p style={{color: "white", fontSize: "1.3rem"}} ><i>{formatDate(item?.created_at)}</i></p>
                                    </div>
                                    <div style={{
                                        width: "10%",
                                        height: "100%",
                                        display: "flex",
                                        justifyContent: "end",
                                        alignItems: "right"
                                    }}>
                                        <Button appearance="ghost" color="red" style={{
                                            alignSelf: "start",
                                            width: "auto",
                                            padding: "10px",
                                            border: "none"
                                        }} startIcon={<CloseIcon />} onClick={()=> Alert("Project removed", "success")}></Button>
                                    </div>
                                </div>
                            )
                           })
                    }
                   


               </div>

           </div>
        </>
    );
};

export default Projects;