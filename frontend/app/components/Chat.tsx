"use client";

import React, { useState, useRef } from "react";
import "./chat.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPaperPlane,
  faArrowUpFromBracket,
  faRobot,
  faUser,
} from "@fortawesome/free-solid-svg-icons";
import Sidebar from "./Sidebar";

// Assuming these functions are correctly implemented
import { sendMessageToAssistant, uploadFile } from "../services/api";

interface Message {
  type: "user" | "ai";
  text: string;
}

const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (inputValue.trim() === "") return;

    setMessages([...messages, { type: "user", text: inputValue }]);
    setInputValue("");
    setIsTyping(true);

    try {
      const response = await sendMessageToAssistant(inputValue);
      setMessages((prevMessages) => [
        ...prevMessages,
        { type: "ai", text: response.response },
      ]);
      setIsTyping(false);
    } catch (error) {
      console.error("Error in sending message:", error);
      setIsTyping(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      await uploadFile(file);
      console.log("File uploaded successfully");
    } catch (error) {
      console.error("Error in file upload:", error);
    }
  };
  const openFileExplorer = () => {
    fileInputRef.current.click();
  };
  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      // When Enter is pressed without Shift, send the message
      event.preventDefault();
      sendMessage(event);
    } else if (event.key === "Enter" && event.shiftKey) {
      // When Shift + Enter is pressed, add a new line
      // The default behavior of Shift + Enter is to add a new line,
      // so you don't need to explicitly handle it.
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-900">
      <Sidebar />
      <div className="flex w-full h-full max-w-6xl px-4 items-center justify-center">
        <div className="flex flex-col w-3/4 h-full mr-4">
          <div className="text-white rounded-lg p-6 flex flex-col h-full">
            <div className="font-bold text-3xl text-center mb-4">
              Your AI Assistant
            </div>
            <div
              className="flex-1 overflow-auto p-4 rounded-lg flex-1 overflow-auto p-4 rounded-lg chat-message-container"
              style={{ minHeight: "200px" }}
            >
              {messages.length === 0 && (
                <p className="text-gray-300">
                  Start a conversation and explore the power of AI. Your chat
                  history will be displayed here.
                </p>
              )}
              {messages.map((message, index) => (
                <div key={index} className="flex items-start mb-2">
                  <FontAwesomeIcon
                    icon={message.type === "user" ? faUser : faRobot}
                    alt={message.type}
                    className="mr-2 " // You can adjust the size using width and height attributes or CSS classes
                    style={{ width: "30px", height: "30px" }}
                  />
                  <span className="bg-gray-800 p-2 rounded-lg ">
                    {message.text}
                  </span>
                </div>
              ))}
              {isTyping && (
                <div className="flex items-start mb-2 ">
                  <FontAwesomeIcon
                    icon={faRobot}
                    className="text-xl mr-2 mt-1 "
                  />
                  <span className="typing-indicator">Typing...</span>{" "}
                  {/* Typing indicator next to AI response */}
                </div>
              )}
            </div>
            <form onSubmit={sendMessage} className="mt-4 flex">
              <div className="relative flex-grow">
                <FontAwesomeIcon
                  icon={faArrowUpFromBracket}
                  className="absolute top-1/2 left-5 -translate-y-1/2 text-white cursor-pointer"
                  onClick={openFileExplorer}
                />
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter a prompt here"
                  className="w-full pl-12 pr-12 p-4 rounded-lg bg-gray-900 border border-white text-white overflow-hidden"
                  style={{ minHeight: "30px", maxHeight: "250px" }}
                />
                <FontAwesomeIcon
                  icon={faPaperPlane}
                  className="absolute top-1/2 right-5 -translate-y-1/2 text-white cursor-pointer"
                  onClick={sendMessage}
                />
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
