import React, {useEffect, useState, useRef} from 'react';
import ReactMarkdown from 'react-markdown'
import {useNavigate, useParams} from 'react-router-dom';
import {Button, Dropdown, Avatar, Loader, Input } from "rsuite";
import Alert from "../../components/Alert/Alert.tsx";
import CopyIcon from "@rsuite/icons/Copy";
import TrashIcon from "@rsuite/icons/Trash";
import {ArrowLeft, ArrowRightLine} from "@rsuite/icons";
import StopOutlineIcon from '@rsuite/icons/StopOutline';
import axiosInstance from '../../hooks/hostInstance.ts';

interface Message {
  role: "user" | "bot";
  content: string | React.ReactNode;
}


const Chat: React.FC = () => {
  const { chatId, projectId } = useParams(); // Extract projectId from URL

  const WEBSOCKET_URL = import.meta.env.DEV? "ws://127.0.0.1:8000/ws/chat/": "wss://patentrag.boxytabs.com/ws/chat/";
  const errorMessage: string = "I cannot process your request at the moment. Please try again later or contact the developer for assistance.";
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [message, setMessage] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [inputDisabled, setInputDisabled] = useState<boolean>(false);
  const [showCopyBtn, setShowCopyBtn] = useState<boolean>(false);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [usedTokens, setUsedTokens] = useState(0);
  let socket = useRef<WebSocket | null>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const modelSizes: Record<string, number> = {
    "gemini-2.5-pro": 128000,
    "gemini-2.0-flash-001": 128000,
    "deepseek-R1": 128000,
    "lama-405": 128000,
    "claude-sonnet3": 200000,
    "gpt-o1": 120257,
    "qwen-plus": 131072,
  };

  const selectBestModel = (requiredTokens: number) => {
  
    // Find the first model that can handle the required tokens
      const bm = Object.entries(modelSizes) // Convert object to array
      .filter(([_, t]) => t > requiredTokens) // Keep models with capacity > requiredTokens
      .sort((a, b) => b[1] - a[1]) // Sort by token capacity (largest first)
      .map(([m]) => m)[0] || null;

      console.log("BEST MODEL: " + bm);

      return bm; // Return model name or null if no match
  };

  const defaultModel: string = "gemini-2.5-pro";
  const [selectedModel, setSelectedModel] = useState<string>(defaultModel);

  const fetchTotalTokensUsed = (async ()=>{
    const res = await axiosInstance.post(`total-tokens/`,
      {
        project_id: projectId,
        chats: chatHistory
      }
    );
    if(res.status === 200){
        setUsedTokens(res.data.message);
    }else{
        setUsedTokens(0);
    }
  })

  useEffect(()=>{
        // fetchCapacity().then(r => console.log(r));
        fetchTotalTokensUsed();
  }, [chatHistory])

  useEffect(() => {
    const threadString = localStorage.getItem(chatId?.toString() || "threads" );
    const allThreads = threadString ? JSON.parse(threadString) : [];
    setChatHistory(allThreads?.messages || []);
    
    // const selectBestModel = (requiredTokens: number) => {
    //   return (
    //     Object.entries(modelSizes)
    //       .filter(([_, tokens]) => tokens >= requiredTokens) // Find models that meet the requirement
    //       .sort((a, b) => b[1] - a[1]) // Sort by highest token capacity
    //       .map(([model]) => model)[0] || null // Select the best model or return null
    //   );
    // };

    // const bestModel = selectBestModel(usedTokens);
    // setSelectedModel(bestModel || defaultModel);
    console.log(
      `Chat history loaded for chat ID ${chatId}:`,
      chatHistory
    );
  }, []);


  useEffect(()=>{
    const getModel = localStorage.getItem(chatId || "");
    console.log("JSON FORM: ", getModel)
    if(getModel && getModel !== ""){
      const modelName = JSON.parse(getModel || "")
      setSelectedModel(modelName.model);
      console.log("FOUND SELECTED MODEL! " + modelName?.model );
    }
  }, [navigate, chatId])

  // useEffect(()=>{
    
  // }, [selectedModel])

  useEffect(()=>{
      if(chatHistory.length > 0){
        setShowCopyBtn(true);
      }

  }, [chatHistory])

  const clearChatHistory = (chatId: string) => {
      const chatString = localStorage.getItem(chatId);
      if (!chatString) return;
      localStorage.setItem(chatId, JSON.stringify({messages: [], model: selectedModel}));
      setChatHistory([])
      Alert("Chat history cleared", "success");
      setInputDisabled(false)
      setLoading(false);
      setIsStreaming(false);
  };

  const sendMessage = (message: string) => {
    socket.current = new WebSocket(WEBSOCKET_URL);

    socket.current.onopen = () => {
        setLoading(true);
        socket?.current?.send(JSON.stringify({ unique_id: projectId, chat_history: chatHistory.slice(-3), user_prompt: message, model: selectedModel}));
    };

    socket.current.onmessage = (event) => {
        let data = JSON.parse(event.data);

        if(data.status === 500){
            setInputDisabled(false)
            setLoading(false);
            setShowCopyBtn(false);
            setIsStreaming(false);
            console.log("Error:", event);
            setChatHistory((prevChatHistory) => {
            const lastMessageIndex = prevChatHistory.length - 1;
            const lastMessage = prevChatHistory[lastMessageIndex];

            if (lastMessage && lastMessage.role === "bot") {

              const updatedMessage = {
                ...lastMessage,
                content: errorMessage,
              };

              const updatedChatHistory = [...prevChatHistory];
              updatedChatHistory[lastMessageIndex] = updatedMessage;
              const messageString = {messages: updatedChatHistory, model: selectedModel};
              localStorage.setItem(chatId?.toString() || "threads", JSON.stringify(messageString));
              return updatedChatHistory;
            }

            return [...prevChatHistory, { role: "bot", content: errorMessage }];
          });
            Alert(data.error, "error");
        }

        if(data.status === 400){
          setInputDisabled(false)
          setLoading(false);
          setShowCopyBtn(false);
          setIsStreaming(false);
          console.log("Error:", event);
          setChatHistory((prevChatHistory) => {
          const lastMessageIndex = prevChatHistory.length - 1;
          const lastMessage = prevChatHistory[lastMessageIndex];

          if (lastMessage && lastMessage.role === "bot") {

            const updatedMessage = {
              ...lastMessage,
              content: errorMessage,
            };

            const updatedChatHistory = [...prevChatHistory];
            updatedChatHistory[lastMessageIndex] = updatedMessage;
            const messageString = {messages: updatedChatHistory, model: selectedModel};
            localStorage.setItem(chatId?.toString() || "threads", JSON.stringify(messageString));
            return updatedChatHistory;
          }

          return [...prevChatHistory, { role: "bot", content: errorMessage }];
        });
          Alert(data.error, "error");
      }

        if(data.status === "ready"){
            setInputDisabled(true);
            setLoading(false);
            setIsStreaming(true);
            sectionRef.current?.scrollTo({ top: sectionRef.current?.scrollHeight, behavior: "smooth" });
            setChatHistory((prevChatHistory) => {
            const lastMessageIndex = prevChatHistory.length - 1;
            const lastMessage = prevChatHistory[lastMessageIndex];

            if (lastMessage && lastMessage.role === "bot") {

              const updatedMessage = {
                ...lastMessage,
                content: "",
              };

              const updatedChatHistory = [...prevChatHistory];
              updatedChatHistory[lastMessageIndex] = updatedMessage;
              const messageString = {messages: updatedChatHistory, model: selectedModel};
              localStorage.setItem(chatId?.toString() || "threads", JSON.stringify(messageString));
              return updatedChatHistory;
            }

            return [...prevChatHistory, { role: "bot", content: "" }];
          });
        }

        if(data.status === "streaming"){
            console.log(data);
            setChatHistory((prevChatHistory) => {
            const lastMessageIndex = prevChatHistory.length - 1;
            const lastMessage = prevChatHistory[lastMessageIndex];

            // lastMessage.content = "";

            if (lastMessage && lastMessage.role === "bot") {
              // Append new data to the previous bot message
              const updatedMessage = {
                ...lastMessage,
                content: lastMessage.content + data.message,
              };

              // Return a new array with the updated message
              const updatedChatHistory = [...prevChatHistory];
              updatedChatHistory[lastMessageIndex] = updatedMessage;
               const messageString = {messages: updatedChatHistory, model: selectedModel};
              localStorage.setItem(chatId?.toString() || "threads", JSON.stringify(messageString));
              return updatedChatHistory;
            }
            // localStorage.setItem(chatId?.toString() || "threads", JSON.stringify(updatedChatHistory));
            // If no previous bot message, add a new one
            return [...prevChatHistory, { role: "bot", content: data.message }];
          });

        }

        if(data.status === "completed"){
            console.log("RESPONSE FINISHED!");
            setInputDisabled(false)
            setShowCopyBtn(true);
            setIsStreaming(false);
            // setChatHistory((prev)=> [...prev, {role: "bot", content: botResponse}]);
        }

    }

    socket.current.onerror = (event) => {
        setInputDisabled(false)
        setLoading(false);
        setIsStreaming(false);
        console.log("Error:", event);
        Alert("Something went wrong!", "error");
    }
  };

  const handleSubmission = (_e: any) => {
      if(message.trim() === "" && !inputDisabled){
          Alert("Please enter a message", "error");
          return;
      }

      setInputDisabled(true);
      setMessage("");
      const newUserMessage: Message = { role: "user", content: message };
      setChatHistory((prev)=> [...prev, newUserMessage]);
      setChatHistory((prev)=> [...prev,  {role: "bot", content: ""}]);
      const messageString = {messages: chatHistory, model: selectedModel};
      localStorage.setItem(chatId?.toString() || "threads", JSON.stringify(messageString));
      sectionRef.current?.scrollTo({ top: sectionRef.current?.scrollHeight, behavior: "smooth" });
      sendMessage(message);
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      handleSubmission(event);
    }
  };

  const handleButtonClick = (e: any) => {
      handleSubmission(e);
  }

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    Alert("Response copied to clipboard", "success");
  };
  
  return (
    <div style={{display: "flex", flexDirection: "column", width: "100%", height: "100vh", overflowY: "hidden", overflowX: "hidden", padding: "0", margin: "0"}}>
        <div style={{width: "100%", textAlign: "center", padding: "10px"}}>
            <Button startIcon={<ArrowLeft />} onClick={()=> navigate(`/projects/${projectId}`)} style={{alignSelf: "start", position: "absolute", top: "10px", left: "10px"}}>BACK</Button>
            <Dropdown 
            color={"orange"} 
            title={selectedModel} 
            style={{alignSelf: "center"}} 
            onSelect={(value) =>{
              
              if(usedTokens < modelSizes[value]){
                setSelectedModel(value);
                const messageString = {messages: chatHistory, model: value};
                localStorage.setItem(chatId?.toString() || "threads", JSON.stringify(messageString));  
              } else{
                setSelectedModel(selectBestModel(usedTokens) || "");
                Alert("Tokens too high! Either reduce Instruction, Knowlege Base or change model.", "error");
                return;
              }
            }} 
            appearance={"ghost"}>
                <Dropdown.Item eventKey={defaultModel}>{defaultModel}</Dropdown.Item>
                <Dropdown.Item eventKey="gemini-2.0-pro">gemini-2.0-pro</Dropdown.Item>
                <Dropdown.Item eventKey="deepseek-R1">deepseek-R1</Dropdown.Item>
                <Dropdown.Item eventKey="lama-405">lama-405</Dropdown.Item>
                <Dropdown.Item eventKey="gpt-o1">gpt-o1</Dropdown.Item>
                <Dropdown.Item eventKey="claude-sonnet3">claude-sonnet3</Dropdown.Item>
                <Dropdown.Item eventKey="qwen-plus">qwen-plus</Dropdown.Item>
            </Dropdown>
            <p style={{color: "white", alignSelf: "end", position: "absolute", top: "10px", right: "10px"}}>{usedTokens} / {modelSizes[selectedModel]}</p>
       </div>

        <div style={{
            width: "100%", 
            height: "70vh", 
            overflowY: "scroll", 
            paddingBottom: "20px"
          }} ref={sectionRef}>
            {
                chatHistory.map((message, index) => {
                    return (
                        <div key={index} style={{
                            width: "50%",
                            borderRadius: "15px",
                            display: "block",
                            marginLeft: "auto",
                            marginRight: "auto",
                            textAlign: "left",
                            marginTop: "10px",
                            padding: "20px",
                            color: "white",
                            backgroundColor: message.role === "user"? "#1f1e1d": "#333331",
                            marginBottom: message.role === "bot"? "30px": "10px"
                        }}>

                            <div style={{
                                fontSize: "1.2rem",
                                flexDirection: message.role === "user"? "row": "column",
                                display: message.role === "user"? "flex": "block",
                                justifyContent: message.role === "user"? "start": "",
                            }}>
                                {
                                    message.role === "user"? <Avatar circle style={{ background: '#e5e5e2', color: '#000', marginRight: "10px" }}> P </Avatar>: ""
                                }

                                <div style={{marginTop: "10px"}} key={index}>
                                    

                                    {message.role === "bot" && message.content === "" && loading ? (
                                          <Loader size="sm" content="Thinking..." />
                                        ) : (
                                          message.role === "bot"?
                                          <ReactMarkdown>{message?.content?.toString()}</ReactMarkdown>:
                                          message?.content?.toString()
                                        )}

                                    {/* {
                                      message.role === "user"?
                                      message.content: ""
                                    } */}

                                </div>
                                

                            </div>

                            {
                                 message.role === "bot" && showCopyBtn? <Button appearance={"ghost"}
                                    color={"green"} startIcon={<CopyIcon />}
                                    style={{
                                        fontSize: "1.3rem",
                                        marginTop: "5px",
                                        alignSelf: "end",
                                        width: "4%",
                                        border: "none",
                                        position: "relative",
                                        padding: "10px"
                                 }}
                                    onClick={()=> copyToClipboard(message.content as string)}></Button>
                                : ""
                            }
                        </div>
                    )


                })
            }

            {/*{*/}
            {/*            loading && chatHistory.length > 0 && chatHistory[chatHistory.length - 1].role === "bot" && (*/}
            {/*                <div style={{*/}
            {/*                width: "50%",*/}
            {/*                borderRadius: "15px",*/}
            {/*                display: "block",*/}
            {/*                marginLeft: "auto",*/}
            {/*                marginRight: "auto",*/}
            {/*                textAlign: "left",*/}
            {/*                marginTop: "10px",*/}
            {/*                padding: "20px",*/}
            {/*                color: "white",*/}
            {/*                backgroundColor: chatHistory[chatHistory.length - 1].role === "user"? "#1f1e1d": "#333331",*/}
            {/*                marginBottom: chatHistory[chatHistory.length - 1].role === "bot"? "30px": "10px"*/}
            {/*            }}>*/}

            {/*                <div style={{*/}
            {/*                    fontSize: "1.2rem",*/}
            {/*                    flexDirection: chatHistory[chatHistory.length - 1].role === "user"? "row": "column",*/}
            {/*                    display: chatHistory[chatHistory.length - 1].role === "user"? "flex": "block",*/}
            {/*                    justifyContent: chatHistory[chatHistory.length - 1].role === "user"? "start": "",*/}
            {/*                }}>*/}
            {/*                    <div style={{marginTop: "10px"}}>*/}
            {/*                         <Loader size="sm" content="Thinking..." />*/}
            {/*                    </div>*/}

            {/*                </div>*/}
            {/*            </div>*/}
            {/*            )*/}
            {/*}*/}
        </div>

        <div style={{
            width: "100%", 
            // height: "20vh",
            display: "flex", 
            justifyContent: "center", 
            flexDirection: "row",
            position: "absolute", 
            bottom: "0", 
            paddingBottom: "10px",
            paddingTop: "10px", 
            marginLeft: "aut", 
            marginRight: "auto",
            // borderTop: "10px solid rgba(38, 38, 37, 0.7)",
            
            backgroundColor: "#262625"
          }}>
            <Button style={{fontSize: "1.3rem", height: "8vh", marginRight: "10px"}} onClick={()=> clearChatHistory(chatId? chatId : "")} startIcon={
               isStreaming? <StopOutlineIcon />: <TrashIcon />
            } appearance={"primary"} color={"red"}></Button>
            <Input
                as={"textarea"}
                // row={5}
                disabled={inputDisabled}
                placeholder={"Start a conversation..."}
                value={message}
                onChange={setMessage}
                onKeyDown={handleKeyDown}
                style={{
                    border: "none",
                    fontSize: "1.3rem",
                    backgroundColor: "#1f1e1d",
                    paddingLeft: "10px",
                    color: "white",
                    width: "50%",
                    height: "20vh",
                    maxHeight: "20vh",
                    minHeight: "20vh",
                    maxWidth: "50%",
                    whiteSpace: "pre-line"
                }}></Input>
            <Button disabled={inputDisabled} style={{fontSize: "1.3rem", height: "8vh", marginLeft: "10px"}} onClick={handleButtonClick} appearance={"primary"} startIcon={
                isStreaming? <Loader size={"sm"} />: <ArrowRightLine />
            }></Button>
        </div>
    </div>
  );
};

export default Chat;