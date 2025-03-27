import React, {useEffect, useState} from 'react';
import {useNavigate, useParams} from 'react-router-dom';
import { useQueryClient } from "@tanstack/react-query";
import NavBar from "../../components/NavBar/NavBar.tsx";
import {Progress, Dropdown, Divider, Uploader, Button, Popover, Loader, Input} from "rsuite";
import AttachmentIcon from '@rsuite/icons/Attachment';
import PlusIcon from '@rsuite/icons/Plus';
import FolderFillIcon from '@rsuite/icons/FolderFill';
import PageIcon from '@rsuite/icons/Page';
import Alert from "../../components/Alert/Alert.tsx";
import CloseIcon from '@rsuite/icons/Close';
import {useProjectDocumentList} from "../../hooks/useGetFiles.ts";
import {ArrowLeft, Check} from "@rsuite/icons";
import { v4 as uuidv4 } from "uuid";
import axiosInstance from "../../hooks/hostInstance.ts";
import TrashIcon from "@rsuite/icons/Trash";


type FileType = {
  fileKey: string | number;
  name: string;
  blobFile?: File;
};

// interface Message {
//   role: "user" | "bot";
//   content: string;
// }


type Threads = {
  name: string;
  id: string;
  created_at: string;
  projectId: string;
  model: string;
};

const ProjectDetails: React.FC = () => {
  const { projectId } = useParams();
  const [files, setFiles] = useState<FileType[]>([]);
  const [threads, setThreads] = useState<Threads[]>([]);
  const [knowledgeCapacity, setKnowledgeCapacity] = useState(0.0);
  const [usedTokens, setUsedTokens] = useState(0);
  const [popoverVisible, setPopoverVisible] = useState(false);
  const [popoverChatNameVisible, setPopoverChatNameVisible] = useState(false);
  const [chatName, setChatName] = useState("");
  const [instruction, setInstruction] = useState<string>("");
  const [instructionCount, setInstructionCount] = useState(0);
  const [knowledgeBaseCount, setKnowledgeBaseCount] = useState(0);
  const [key, setKey] = useState(0);
  const [isRemovePending, setIsRemovePending] = useState(false);
  const [isUploadPending, setIsUploadPending] = useState(false);
  
  const queryClient = useQueryClient()
  // const loader: bool = true; 
  
  const navigate = useNavigate();
  const { isPending: projectDocumentListPending, error: _projectDocumentListError, data: projectDocumentListData } = useProjectDocumentList(projectId || null);
  
  const [removePending, setRemovePending] = useState<{ [key: string]: boolean }>({});

  const fetchCapacity = (async ()=>{
        const res = await axiosInstance.get(`knowledge-capacity/${projectId}/`);
        if(res.status === 200){
            setKnowledgeCapacity(res.data.message);
            setUsedTokens(res.data.tokens);
            setInstructionCount(res.data.instruction);
            setKnowledgeBaseCount(res.data.knowledge);
        }else{
            setKnowledgeCapacity(0.0);
            setUsedTokens(0);
            setInstructionCount(0);
            setKnowledgeBaseCount(0);
        }
  })


  useEffect(()=>{
    const threadString = localStorage.getItem("threads");
    const allThreads: Threads[] = threadString ? JSON.parse(threadString) : [];
    const filteredThreads = allThreads?.filter((thread) => thread.projectId === projectId);
    setThreads(filteredThreads);
    fetchCapacity().then(r => console.log(r));
  }, [projectId, files])


    useEffect(()=>{
        fetchCapacity().then(r => console.log(r));
    }, [isRemovePending, instruction, popoverVisible, projectDocumentListData])

  const handleNavigate = (chatId: any) => {
    navigate(`/projects/${projectId}/chat/${chatId}`); // Navigates to the route with the parameter
  };

  const handleChange = (fileList: any) => {
     console.log("Current Files:", fileList);
     setFiles([]);
      setKey(prevKey => prevKey + 1);
      if(fileList.length < 2){
        setFiles(fileList); // Update the state with the file list
        Alert("File uploaded successfully", "success");
    }else {
        setFiles(fileList.slice(1));
        Alert("Only one file can be uploaded at a time", "error");
    }
  };

  const setRedis = async (projectId: any) => {
      const redisSet = await axiosInstance.post(`redis/set-file/`, {unique_id: projectId});
        if(redisSet.status === 200){
            // const redisGet = await axiosInstance.post(`redis/get-file/${projectId}/`);
            console.log("Redis set successfully");
        }else {
            console.log("Error setting redis");
        }
  }

  const getFileExtension = (filename: string): string => {
    const parts = filename.split(".");
    return parts.length > 1 ? parts.pop()! : ""; // Get last part as extension
  };

  const handleAddDocument = async (file: any, projectId: any) => {
      // const queryClient = useQueryClient();
      const formData = new FormData();
      formData.append('file', file.blobFile);
      formData.append('project_id', projectId);
      
      setIsUploadPending(true);

      try {
        const resp = await axiosInstance.post('add-document/', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        console.log('File uploaded successfully:', resp.data);
        fetchCapacity()
        await setRedis(projectId);
        await queryClient.invalidateQueries({queryKey: ["document"]});
        setFiles([]);
        setIsUploadPending(false);
      } catch (error) {
        console.error('Error uploading file:', error);
        fetchCapacity()
        await setRedis(projectId);
        await queryClient.invalidateQueries({queryKey: ["document"]});
        setFiles([]);
        setIsUploadPending(false);
      }
  };

  const handleRemoveDocument = async (uniqueId: any) => {
      setIsRemovePending(true);
      setRemovePending(prev => ({ ...prev, [uniqueId]: true }));  
      try {
        const resp = await axiosInstance.delete('remove-document/uuid/', {data: {unique_id: uniqueId}});
        console.log('File uploaded successfully:', resp.data);
        await fetchCapacity();
        await setRedis(projectId);
        await queryClient.invalidateQueries({queryKey: ["document"]});
        Alert("Document removed successfully", "success");
        setIsRemovePending(false);
      } catch (error) {
        console.error('Error uploading file:', error);
        await fetchCapacity().then(r => console.log(r));
        await setRedis(projectId);
        await queryClient.invalidateQueries({queryKey: ["document"]});
        Alert("Error removing document", "error");
        setIsRemovePending(false);
      }
      setRemovePending(prev => ({ ...prev, [uniqueId]: false })); // Reset state
  };

  const handleClearKnowledge = async () => {
      try {
        const resp = await axiosInstance.delete('remove-document/all/', {data: {project_id: projectId}});

        if(resp.status === 500){
            console.error('Error uploading file:', resp.data);
            await fetchCapacity();
            await queryClient.invalidateQueries({queryKey: ["document"]});
            Alert("Error removing document", "error");
        }

        await fetchCapacity();
        await queryClient.invalidateQueries({queryKey: ["document"]});
        Alert("Document removed successfully", "success");
      } catch (error) {
        console.error('Error uploading file:', error);
        fetchCapacity().then(r => console.log(r));
        await queryClient.invalidateQueries({queryKey: ["document"]});
        Alert("Error removing document", "error");
      }
  }

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
         <Popover style={{
                    width: "40%",
                    marginRight: "auto",
                    marginLeft: "auto",
                    display: popoverVisible? "flex": "none",
                    flexDirection: "column",
                    alignSelf: "center",
                    zIndex: "999999",
                    padding: "20px",
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    backgroundColor: "#262625",
                    border: "2px solid white",
                    borderRadius: "15px",
                }} visible={popoverVisible}>
                  <h3 style={{color: "white"}}>Custom Instruction</h3>
                  <textarea style={{
                      width: "100%",
                      height: "300px",
                      maxHeight: "300px",
                      backgroundColor: "#262625",
                      color: "white",
                      border: "1px solid white",
                      borderRadius: "15px",
                      padding: "1px",
                      resize: "none",
                      fontSize: "1.2rem",
                  }} value={instruction} onChange={(e)=>{
                        
                    setInstruction(e.target.value);

                  }}></textarea>
                  {/* <p style={{color: "white"}}>Tokens: {"0"}</p> */}
                  <div style={{
                      display: "flex",
                      flexDirection: "row",
                      justifyContent: "space-between",
                      width: "100%",
                  }}>
                    <Button appearance={"ghost"} color={"green"} style={{width: "30%", marginTop: "10px"}} onClick={ async ()=>{
                     
                    //  if(usedTokens > 2000){
                    //     Alert("You are exceeding limit! Either reduce knowledge or instruction", "error");
                    //     return;
                    //  }

                     const res = await axiosInstance.post(`add-project-instruction/`, {project_id: projectId, instruction: instruction});
                       if(res.status === 200){
                        Alert("Instruction saved successfully!", "success");
                        setPopoverVisible(false);
                        
                       }else {
                        
                        Alert("Error fetching instruction", "error");
                       }
                  }}>Save</Button>
                    <Button appearance={"ghost"} color={"red"} style={{width: "30%", marginTop: "10px"}} onClick={()=>{
                    setPopoverVisible(false);
                  }}>Cancel</Button>
                  </div>

         </Popover>


         <Popover style={{
                    width: "40%",
                    marginRight: "auto",
                    marginLeft: "auto",
                    display: popoverChatNameVisible? "flex": "none",
                    flexDirection: "column",
                    alignSelf: "center",
                    zIndex: "999999",
                    padding: "20px",
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    backgroundColor: "#262625",
                    border: "2px solid white",
                    borderRadius: "15px",
                }} visible={popoverChatNameVisible}>
                  <h3 style={{color: "white"}}>New Chat</h3>
                  <Input style={{
                      width: "100%",
                    //   height: "300px",
                    //  maxHeight: "300px",
                      backgroundColor: "#262625",
                      color: "white",
                      border: "1px solid white",
                    //   borderRadius: "15px",
                      padding: "5px",
                    //   resize: "none",
                      fontSize: "1.5rem",
                  }} 
                  value={chatName} 
                  onChange={setChatName} />
                  
                  {/* <p style={{color: "white"}}>Tokens: {"0"}</p> */}
                  <div style={{
                      display: "flex",
                      flexDirection: "row",
                      justifyContent: "space-between",
                      width: "100%",
                  }}>
                    <Button appearance={"ghost"} color={"green"} style={{width: "30%", marginTop: "10px"}} onClick={ async ()=>{
                        if(chatName === ""){
                            Alert("Please provide a chat name!", "error");
                            return;
                        }
                        
                        const chatSession = {
                            name: chatName, 
                            id: uuidv4(), 
                            projectId: projectId, 
                            created_at: new Date().toISOString(),
                        };

                         const threadString = localStorage.getItem("threads");
                         const existingThreads = threadString ? JSON.parse(threadString) : [];

                         // Add the new thread to the existing list
                         const updatedThreads = [...existingThreads, chatSession];

                         // Update state and localStorage
                         setThreads(updatedThreads);
                         localStorage.setItem("threads", JSON.stringify(updatedThreads));
                         setPopoverChatNameVisible(false);
                         setChatName("");
                         Alert("Chat created successfully!", "success");
                    }}>Save</Button>

                    <Button appearance={"ghost"} color={"red"} style={{width: "30%", marginTop: "10px"}} onClick={()=>{
                    setPopoverChatNameVisible(false);
                    setChatName("");
                  }}>Cancel</Button>
                  </div>

         </Popover>

        <NavBar projectName="Project-ABC" />
        <Button startIcon={<ArrowLeft />} onClick={()=> navigate(`/projects`)} style={{alignSelf: "start", position: "relative", left: "10px"}}>BACK</Button>       
           <div style={{
               overflow: "hidden",
               padding: "10px",
               display: "flex",
               flexDirection: "row",
               justifyContent: "space-around",
               height: "85vh",
           }}>
               <div style={{
                   width: "50%",
                   height: "80vh",
               }}>

                   <div style={{display: "flex", flexDirection:"column", justifyContent: "space-between", width: "100%", padding: "10px"}}>
                       <h2 style={{color: "white"}}>@Threads</h2>
                       <div style={{
                           width: "100%",
                           display: "flex",
                           flexDirection: "column",
                           overflowY: "scroll",
                           overflowX: "hidden",
                           height: "70vh",
                           paddingBottom: "200px",
                           padding: "10px",
                       }}>
                       
                       {
                        threads?.map((item, key) => {
                    return (
                        <div
                            key={key}
                            style={{
                                borderRadius: "15px",
                                width: "100%",
                                display: "flex",
                                border: "2px solid white",
                                marginTop: "10px",
                                height: "100px",
                                cursor: "pointer",
                            }}>

                            <div onClick={() =>{
                            
                                handleNavigate(item?.id.toString());
                            }} style={{width: "100%", padding: "10px", paddingLeft: "30px"}}>
                                <h3 style={{color: "white"}}>@ {item?.name}</h3>
                                <p style={{color: "white", fontSize: "1.3rem"}} ><i>{formatDate(item?.created_at)}</i></p>
                            </div>

                            <div style={{width: "6%", height:"100px", alignSelf: "end"}}>
                                <Button color={"red"} appearance={"ghost"} startIcon={<CloseIcon/>} style={{marginTop: "5px", alignSelf:"center", border: "none"}} onClick={()=>{
                                    const updatedThreads = threads.filter((thread) => thread.id !== item.id);
                                    localStorage.setItem("threads", JSON.stringify(updatedThreads));
                                    setThreads(updatedThreads);
                                    localStorage.removeItem(item?.id);
                                }}></Button>
                            </div>

                        </div>

                    )
                        })
                       }
                       </div>

                   </div>
               </div>

               <div style={{
                   display: "flex",
                   flexDirection:"column",
                   justifyContent: "start",
                   alignItems: "center",
                   padding: "20px",
                   width: "40%",
                   border: "2px solid white",
                   borderRadius: "15px",
                   height: "80vh"
               }}>

                   <div style={{
                       display: "flex",
                       flexDirection: "column",
                       justifyContent: "start",
                       alignItems: "center",
                       width: "100%",
                       padding: "10px"
                   }}>

                       <div style={{width: "100%", flexDirection: "row", justifyContent: "space-between", display: "flex"}}>
                           <div style={{alignSelf: "start", marginTop: "10px", color: "white"}}>
                               <FolderFillIcon color={"white"} /> Project Knowledge
                           </div>

                           <div style={{alignSelf: "end"}}>
                               <Dropdown title="Add Content" appearance={"ghost"} icon={<PlusIcon />}>
                                <Uploader
                                    key={key}
                                    action={"#"}
                                    fileList={files}
                                    fileListVisible={false}
                                    multiple={false}
                                    accept={".txt"}
                                    autoUpload={false}

                                    onChange={handleChange}>
                                    <Dropdown.Item icon={<AttachmentIcon />}>
                                        Upload File
                                    </Dropdown.Item>
                                </Uploader>
                              </Dropdown>
                           </div>
                       </div>

                       <div style={{width: "100%", display: "flex", justifyContent: "space-evenly", flexDirection: "row", marginTop: "20px"}}>
                               <Button color={"green"} appearance={"ghost"} startIcon={<Check />} onClick={async ()=>{
                                   // @ts-ignore
                                   const res = await axiosInstance.get(`get-project-instruction/${projectId}/`, {project_id: projectId});

                                   if(res.status === 200){
                                    setInstruction(res.data.message);
                                    setPopoverVisible(true);
                                   }else {
                                    Alert("Error fetching instruction", "error");
                                   }


                               }}>Instruction</Button>

                           <Button color={"orange"} appearance={"ghost"} startIcon={<PlusIcon />} onClick={async ()=>{
                                 setPopoverChatNameVisible(true);
                           }}
                           >New Chat</Button>

                           <Button color={"red"} appearance={"ghost"} startIcon={<TrashIcon />} onClick={async ()=> handleClearKnowledge()}
                           >Clear Knowledge</Button>

                           </div>

                       <div style={{width: "100%", display: "flex", justifyContent: "start", flexDirection: "column", marginTop: "10px"}}>
                           <ul>
                           {files?.map((file, index)=>{
                               return (
                                   <li key={file?.fileKey || index} style={{display: "flex", flexDirection: "row", justifyContent: "start", width: "90%", padding: "10px", border: "1px solid white", borderRadius: "5px", cursor: "pointer"}}>
                                       <p style={{color: "white", marginRight: "20px"}}>{file?.name?.slice(0, 10)}...{getFileExtension(file?.name)}</p>
                                       {
                                        isUploadPending? <Loader size='sm' content="uploading document..." style={{color: "white"}} />:
                                        <div style={{marginLeft: "50%"}}>
                                            <Button color={"green"} appearance={"ghost"} startIcon={<Check />} style={{marginRight: "20px"}} onClick={async ()=>{
                                                await handleAddDocument(file, projectId);
                                            }}></Button>
                                            <Button color={"red"} appearance={"ghost"} startIcon={<CloseIcon />} onClick={()=> setFiles([])}></Button>
                                       </div>
                                       }
                                   </li>
                               )
                           })}
                           </ul>

                       </div>

                       <div style={{width: "100%", display: "flex", justifyContent: "start", flexDirection: "column", marginTop: "10px"}}>
                           <Progress.Line percent={knowledgeCapacity} strokeColor="#ffc107" showInfo={false} />
                           <div  style={{width: "100%", display: "flex", justifyContent: "space-between", flexDirection: "column", marginTop: "10px"}}>
                            <strong style={{marginLeft: "10px", color: "white"}}> {knowledgeCapacity}% of knowledge capacity used</strong>
                            <strong style={{marginLeft: "10px", color: usedTokens > 128000? "red": "white"}}> Instruction ({instructionCount}) + Knowledge Base ({knowledgeBaseCount}) = {usedTokens} Tokens</strong> 
                           </div>
                           
                       </div>

                       <Divider />

                       <div style={{
                           width: "100%",
                           display: "flex",
                           justifyContent: "start",
                           flexDirection: "column",
                           overflowY: "scroll",
                           overflowX: "hidden",
                           height: "28vh",
                           paddingBottom: "100px",
                           paddingRight: "10px",
                       }}>

                        {projectDocumentListPending? <div style={{
                                            margin: "auto",
                                            position: "relative",
                                            display: "block",
                                            textAlign: "center",
                                        }}>
                            <Loader speed="normal" size="lg" />
                        </div>: projectDocumentListData?.map((item, key) => {
                        return (
                            <div key={key} style={{
                                marginTop: "10px",
                                padding: "10px",
                                display: "flex",
                                flexDirection: "row",
                                justifyContent: "space-between",
                                border: "2px solid white",
                                borderRadius: "5px",

                            }}>
                                <div style={{alignSelf: "start", width: "100%", padding: "10px", color: "white"}}>
                                    <PageIcon color={"white"} style={{fontSize: "1.5rem", marginRight: "10px",}} /> {item?.file?.split("/").pop()}
                                </div>
                                {
                                    removePending[item.unique_id] ? <Loader size='sm'style={{
                                        alignSelf: "end", 
                                        border: "none", 
                                        marginBottom: "15px", 
                                        marginRight: "10px" 
                                    }} />: <Button appearance="ghost" color="red" style={{
                                        alignSelf: "end", 
                                        width: "50px", 
                                        height: "50px", 
                                        border: "none" 
                                    }} startIcon={<CloseIcon />}
                                    onClick={()=> handleRemoveDocument(item?.unique_id)}></Button>
                                }
                                
                            </div>
                        )
                        })}
                       </div>


                   </div>
               </div>

           </div>
    </>
  );
};

export default ProjectDetails;