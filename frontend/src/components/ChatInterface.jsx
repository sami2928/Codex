"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@mui/material";
import StopCircleSharpIcon from "@mui/icons-material/StopCircleSharp";
import {
  Search,
  Add,
  Lightbulb,
  ArrowUpward,
  Menu,
  Edit,
  Autorenew,
  ContentCopy,
  Share,
  ThumbUpAlt,
  ThumbDownAlt,
} from "@mui/icons-material";

import { PenSquare } from "lucide-react";

import { Textarea } from "./ui/textarea";
import { cn } from "../lib/utils";

// Polyfill for vibration API if not available
if (!navigator.vibrate) {
  navigator.vibrate = () => {};
}

// Type definitions (converted to JSDoc comments for JavaScript)
/**
 * @typedef {'none' | 'add' | 'deepSearch' | 'think'} ActiveButton
 * @typedef {'user' | 'system'} MessageType
 *
 * @typedef {Object} Message
 * @property {string} id
 * @property {string} content
 * @property {MessageType} type
 * @property {boolean} [completed]
 * @property {boolean} [newSection]
 *
 * @typedef {Object} MessageSection
 * @property {string} id
 * @property {Message[]} messages
 * @property {boolean} isNewSection
 * @property {boolean} [isActive]
 * @property {number} sectionIndex
 *
 * @typedef {Object} StreamingWord
 * @property {number} id
 * @property {string} text
 */

// Faster word delay for smoother streaming
const WORD_DELAY = 40; // ms per word
const CHUNK_SIZE = 2; // Number of words to add at once

export default function ChatInterface() {
  const [inputValue, setInputValue] = useState("");
  const textareaRef = useRef(null);
  const chatContainerRef = useRef(null);
  const newSectionRef = useRef(null);
  const [hasTyped, setHasTyped] = useState(false);
  const [activeButton, setActiveButton] = useState("none");
  const [isMobile, setIsMobile] = useState(false);
  const [messages, setMessages] = useState([]);
  const [messageSections, setMessageSections] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingWords, setStreamingWords] = useState([]);
  const [streamingMessageId, setStreamingMessageId] = useState(null);
  const [viewportHeight, setViewportHeight] = useState(0);
  const messagesEndRef = useRef(null);
  const [completedMessages, setCompletedMessages] = useState(new Set());
  const [activeSectionId, setActiveSectionId] = useState(null);
  const inputContainerRef = useRef(null);
  const shouldFocusAfterStreamingRef = useRef(false);
  const mainContainerRef = useRef(null);
  // Store selection state
  const selectionStateRef = useRef({ start: null, end: null });
  // Constants for layout calculations to account for the padding values
  const HEADER_HEIGHT = 48; // .75rem height + padding
  const INPUT_AREA_HEIGHT = 100; // Approximate height of input area with padding
  const TOP_PADDING = 48; // pt-12 (48px = 3rem)
  const BOTTOM_PADDING = 128; // pb-32 (128px = 8rem)
  const ADDITIONAL_OFFSET = 16; // Reduced offset for fine-tuning
  const [copiedMessageId, setCopiedMessageId] = useState(null);

  // Check if device is mobile and get viewport height
  useEffect(() => {
    const checkMobileAndViewport = () => {
      const isMobileDevice = window.innerWidth < 768;
      setIsMobile(isMobileDevice);

      // Capture the viewport height
      const vh = window.innerHeight;
      setViewportHeight(vh);

      // Apply fixed height to main container on mobile
      if (isMobileDevice && mainContainerRef.current) {
        mainContainerRef.current.style.height = `${vh}px`;
      }
    };

    checkMobileAndViewport();

    // Set initial height
    if (mainContainerRef.current) {
      mainContainerRef.current.style.height = isMobile
        ? `${viewportHeight}px`
        : "100svh";
    }

    // Update on resize
    window.addEventListener("resize", checkMobileAndViewport);

    return () => {
      window.removeEventListener("resize", checkMobileAndViewport);
    };
  }, [isMobile, viewportHeight]);

  // Organize messages into sections
  useEffect(() => {
    if (messages.length === 0) {
      setMessageSections([]);
      setActiveSectionId(null);
      return;
    }

    const sections = [];
    let currentSection = {
      id: `section-${Date.now()}-0`,
      messages: [],
      isNewSection: false,
      sectionIndex: 0,
    };

    messages.forEach((message) => {
      if (message.newSection) {
        // Start a new section
        if (currentSection.messages.length > 0) {
          // Mark previous section as inactive
          sections.push({
            ...currentSection,
            isActive: false,
          });
        }

        // Create new active section
        const newSectionId = `section-${Date.now()}-${sections.length}`;
        currentSection = {
          id: newSectionId,
          messages: [message],
          isNewSection: true,
          isActive: true,
          sectionIndex: sections.length,
        };

        // Update active section ID
        setActiveSectionId(newSectionId);
      } else {
        // Add to current section
        currentSection.messages.push(message);
      }
    });

    // Add the last section if it has messages
    if (currentSection.messages.length > 0) {
      sections.push(currentSection);
    }

    setMessageSections(sections);
  }, [messages]);

  // Scroll to maximum position when new section is created, but only for sections after the first
  useEffect(() => {
    if (messageSections.length > 1) {
      setTimeout(() => {
        const scrollContainer = chatContainerRef.current;

        if (scrollContainer) {
          // Scroll to maximum possible position
          scrollContainer.scrollTo({
            top: scrollContainer.scrollHeight,
            behavior: "smooth",
          });
        }
      }, 100);
    }
  }, [messageSections]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messageSections]);

  // Focus the textarea on component mount (only on desktop)
  useEffect(() => {
    if (textareaRef.current && !isMobile) {
      textareaRef.current.focus();
    }
  }, [isMobile]);

  // Set focus back to textarea after streaming ends (only on desktop)
  useEffect(() => {
    if (!isStreaming && shouldFocusAfterStreamingRef.current && !isMobile) {
      focusTextarea();
      shouldFocusAfterStreamingRef.current = false;
    }
  }, [isStreaming, isMobile]);

  // Calculate available content height (viewport minus header and input)
  const getContentHeight = () => {
    // Calculate available height by subtracting the top and bottom padding from viewport height
    return viewportHeight - TOP_PADDING - BOTTOM_PADDING - ADDITIONAL_OFFSET;
  };

  // Save the current selection state
  const saveSelectionState = () => {
    if (textareaRef.current) {
      selectionStateRef.current = {
        start: textareaRef.current.selectionStart,
        end: textareaRef.current.selectionEnd,
      };
    }
  };

  // Restore the saved selection state
  const restoreSelectionState = () => {
    const textarea = textareaRef.current;
    const { start, end } = selectionStateRef.current;

    if (textarea && start !== null && end !== null) {
      // Focus first, then set selection range
      textarea.focus();
      textarea.setSelectionRange(start, end);
    } else if (textarea) {
      // If no selection was saved, just focus
      textarea.focus();
    }
  };

  const focusTextarea = () => {
    if (textareaRef.current && !isMobile) {
      textareaRef.current.focus();
    }
  };

  const handleInputContainerClick = (e) => {
    // Only focus if clicking directly on the container, not on buttons or other interactive elements
    if (
      e.target === e.currentTarget ||
      (e.currentTarget === inputContainerRef.current &&
        !e.target.closest("button"))
    ) {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  };

  const simulateTextStreaming = async (text) => {
    // Split text into words
    const words = text.split(" ");
    let currentIndex = 0;
    setStreamingWords([]);
    setIsStreaming(true);

    return new Promise((resolve) => {
      const streamInterval = setInterval(() => {
        if (currentIndex < words.length) {
          // Add a few words at a time
          const nextIndex = Math.min(currentIndex + CHUNK_SIZE, words.length);
          const newWords = words.slice(currentIndex, nextIndex);

          setStreamingWords((prev) => [
            ...prev,
            {
              id: Date.now() + currentIndex,
              text: newWords.join(" ") + " ",
            },
          ]);

          currentIndex = nextIndex;
        } else {
          clearInterval(streamInterval);
          resolve();
        }
      }, WORD_DELAY);
    });
  };

  const getAIResponse = async (userMessage) => {
    try {
      const response = await fetch("http://localhost:5000/gemini", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: userMessage }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch response from backend");
      }

      const data = await response.json();
      return data.bot; // Assuming the response text is in the 'bot' field
    } catch (error) {
      console.error("Error fetching AI response:", error);
      return "Sorry, I couldn't process your request at the moment.";
    }
  };

  const startLoader = (setLoaderText) => {
    let loaderText = "";
    const loadInterval = setInterval(() => {
      loaderText += ".";
      if (loaderText === "....") {
        loaderText = "";
      }
      setLoaderText(loaderText);
    }, 300);

    return loadInterval;
  };

  const stopLoader = (loadInterval) => {
    clearInterval(loadInterval);
  };

  const simulateAIResponse = async (userMessage) => {
    const messageId = Date.now().toString();
    setStreamingMessageId(messageId);

    setMessages((prev) => [
      ...prev,
      {
        id: messageId,
        content: "",
        type: "system",
      },
    ]);

    const setLoaderText = (text) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, content: text } : msg
        )
      );
    };

    const loadInterval = startLoader(setLoaderText);
    const response = await getAIResponse(userMessage);
    stopLoader(loadInterval); // Stop the loader

    // Add a delay before the second vibration
    setTimeout(() => {
      // Add vibration when streaming begins
      navigator.vibrate(50);
    }, 200); // 200ms delay to make it distinct from the first vibration

    // Stream the text
    await simulateTextStreaming(response);

    // Update with complete message
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? { ...msg, content: response, completed: true }
          : msg
      )
    );

    // Add to completed messages set to prevent re-animation
    setCompletedMessages((prev) => new Set(prev).add(messageId));

    // Add vibration when streaming ends
    navigator.vibrate(50);

    // Reset streaming state
    setStreamingWords([]);
    setStreamingMessageId(null);
    setIsStreaming(false);
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value;

    // Only allow input changes when not streaming
    if (!isStreaming) {
      setInputValue(newValue);

      if (newValue.trim() !== "" && !hasTyped) {
        setHasTyped(true);
      } else if (newValue.trim() === "" && hasTyped) {
        setHasTyped(false);
      }

      const textarea = textareaRef.current;
      if (textarea) {
        textarea.style.height = "auto";
        const newHeight = Math.max(24, Math.min(textarea.scrollHeight, 160));
        textarea.style.height = `${newHeight}px`;
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputValue.trim() && !isStreaming) {
      // Add vibration when message is submitted
      navigator.vibrate(50);

      const userMessage = inputValue.trim();

      // Add as a new section if messages already exist
      const shouldAddNewSection = messages.length > 0;

      const newUserMessage = {
        id: `user-${Date.now()}`,
        content: userMessage,
        type: "user",
        newSection: shouldAddNewSection,
      };

      // Reset input before starting the AI response
      setInputValue("");
      setHasTyped(false);
      setActiveButton("none");

      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }

      // Add the message after resetting input
      setMessages((prev) => [...prev, newUserMessage]);

      // Only focus the textarea on desktop, not on mobile
      if (!isMobile) {
        focusTextarea();
      } else {
        // On mobile, blur the textarea to dismiss the keyboard
        if (textareaRef.current) {
          textareaRef.current.blur();
        }
      }

      // Start AI response
      simulateAIResponse(userMessage);
    }
  };

  const handleKeyDown = (e) => {
    // Handle Cmd+Enter on both mobile and desktop
    if (!isStreaming && e.key === "Enter" && e.metaKey) {
      e.preventDefault();
      handleSubmit(e);
      return;
    }

    // Only handle regular Enter key (without Shift) on desktop
    if (!isStreaming && !isMobile && e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const toggleButton = (button) => {
    if (!isStreaming) {
      // Save the current selection state before toggling
      saveSelectionState();

      setActiveButton((prev) => (prev === button ? "none" : button));

      // Restore the selection state after toggling
      setTimeout(() => {
        restoreSelectionState();
      }, 0);
    }
  };

  const regenerateResponse = async (messageId) => {
    const message = messages.find((msg) => msg.id === messageId);
    if (message) {
      const setLoaderText = (text) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId ? { ...msg, content: text } : msg
          )
        );
      };

      const loadInterval = startLoader(setLoaderText);
      const response = await getAIResponse(message.content);
      stopLoader(loadInterval); // Stop the loader

      // Stream the text
      await simulateTextStreaming(response);

      // Update with complete message
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? { ...msg, content: response, completed: true }
            : msg
        )
      );

      // Add to completed messages set to prevent re-animation
      setCompletedMessages((prev) => new Set(prev).add(messageId));

      // Add vibration when streaming ends
      navigator.vibrate(50);

      // Reset streaming state
      setStreamingWords([]);
      setStreamingMessageId(null);
      setIsStreaming(false);
    }
  };

  const copyToClipboard = (message) => {
    navigator.clipboard.writeText(message.content).then(() => {
      setCopiedMessageId(message.id);
      setTimeout(() => {
        setCopiedMessageId(null);
      }, 2000); // Hide the message after 2 seconds
    });
  };

  const shareMessage = (text) => {
    const url = window.location.href; // Current page URL

    if (navigator.share) {
      navigator
        .share({
          title: "Shared Message",
          text: text,
          url: url,
        })
        .catch((error) => console.error("Error sharing", error));
    } else {
      // Fallback for browsers that do not support navigator.share
      const encodedText = encodeURIComponent(text);
      const encodedUrl = encodeURIComponent(url);

      const shareOptions = [
        {
          name: "Twitter",
          url: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
        },
        {
          name: "Facebook",
          url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
        },
        {
          name: "LinkedIn",
          url: `https://www.linkedin.com/shareArticle?mini=true&url=${encodedUrl}&title=${encodedText}`,
        },
        {
          name: "WhatsApp",
          url: `https://api.whatsapp.com/send?text=${encodedText}%20${encodedUrl}`,
        },
        {
          name: "Telegram",
          url: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
        },
        {
          name: "Email",
          url: `mailto:?subject=Shared Message&body=${encodedText}%20${encodedUrl}`,
        },
      ];

      let shareLinks = "Share this message on:\n\n";
      shareOptions.forEach((option) => {
        shareLinks += `${option.name}: ${option.url}\n`;
      });

      alert(shareLinks);
    }
  };

  const handleThumbsUp = (messageId) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? { ...msg, upvoted: !msg.upvoted, downvoted: false }
          : msg
      )
    );
  };

  const handleThumbDown = (messageId) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? { ...msg, downvoted: !msg.downvoted, upvoted: false }
          : msg
      )
    );
  };

  const handleButtonClick = (action, message) => {
    switch (action) {
      case "autoRenew":
        regenerateResponse(message.id);
        break;
      case "copyContent":
        copyToClipboard(message);
        break;
      case "shareContent":
        shareMessage(message.content);
        break;
      case "thumbUp":
        handleThumbsUp(message.id);
        break;
      case "thumbDown":
        handleThumbDown(message.id);
        break;
      default:
        break;
    }
  };

  const renderMessage = (message) => {
    const isCompleted = completedMessages.has(message.id);
  
    return (
      <div
        key={message.id}
        className={cn(
          "flex flex-col",
          message.type === "user" ? "items-end" : "items-start w-full"
        )}
      >
        <div
          className={cn(
            "max-w-[80%] px-4 py-2 rounded-2xl",
            message.type === "user"
              ? "bg-white border border-gray-200 rounded-br-none self-end"
              : "bg-gray-100 text-gray-900"
          )}
        >
          {/* For user messages or completed system messages, render without animation */}
          {message.content && (
            <span
              className={
                message.type === "system" && !isCompleted
                  ? "bg-gray-200 text-gray-800 self-start text-left"
                  : ""
              }
            >
              {message.content}
            </span>
          )}
  
          {/* For streaming messages, render with animation */}
          {message.id === streamingMessageId && (
            <span className="inline">
              {streamingWords.map((word) => (
                <span key={word.id} className="animate-fade-in inline">
                  {word.text}
                </span>
              ))}
            </span>
          )}
        </div>
  
        {/* Message actions */}
        {message.type === "system" && message.completed && (
          <div className="flex items-center gap-2 px-4 pb-5 mt-1 mb-2">
            <button
              className="text-gray-400 hover:text-gray-600 transition-colors"
              onClick={() => handleButtonClick("autoRenew", message)}
            >
              <Autorenew className="h-4 w-4" />
            </button>
            <button
              className="text-gray-400 hover:text-gray-600 transition-colors"
              onClick={() => handleButtonClick("copyContent", message)}
            >
              <ContentCopy className="h-4 w-4" />
            </button>
            <button
              className="text-gray-400 hover:text-gray-600 transition-colors"
              onClick={() => handleButtonClick("shareContent", message)}
            >
              <Share className="h-4 w-4" />
            </button>
            <button
              className={cn(
                "text-gray-400 hover:text-gray-600 transition-colors",
                message.upvoted && "text-yellow-500"
              )}
              onClick={() => handleButtonClick("thumbUp", message)}
            >
              <ThumbUpAlt className="h-4 w-4" />
            </button>
            <button
              className={cn(
                "text-gray-400 hover:text-gray-600 transition-colors",
                message.downvoted && "text-yellow-500"
              )}
              onClick={() => handleButtonClick("thumbDown", message)}
            >
              <ThumbDownAlt className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    );
  };

  // Determine if a section should have fixed height (only for sections after the first)
  const shouldApplyHeight = (sectionIndex) => {
    return sectionIndex > 0;
  };

  const handleStopStreaming = () => {
    // Stop the streaming process
    setIsStreaming(false);
    setStreamingWords([]);
    setStreamingMessageId(null);
  };

  return (
    <div
      ref={mainContainerRef}
      className="bg-gray-50 flex flex-col overflow-hidden"
      style={{ height: isMobile ? `${viewportHeight}px` : "100vh" }}
    >
      <header className="fixed top-0 left-0 right-0 h-12 flex items-center px-4 z-20 bg-gray-50">
        <div className="w-full flex items-center justify-between px-2">
          <Button variant="ghost" size="icon" className="rounded-full h-8 w-8">
            <Menu className="h-5 w-5 text-gray-700" />
            <span className="sr-only">Menu</span>
          </Button>

          <h1 className="text-base font-medium text-gray-800">
            Codex Coding AI
          </h1>

          <Button variant="ghost" size="icon" className="rounded-full h-8 w-8">
            <PenSquare className="h-5 w-5 text-gray-700" />
            <span className="sr-only">New Chat</span>
          </Button>
        </div>
      </header>

      <div
        ref={chatContainerRef}
        className="flex-grow pt-12 px-4 overflow-y-auto pb-[100px]"
      >
        <div className="max-w-3xl mx-auto space-y-4">
          {messageSections.map((section, sectionIndex) => (
            <div
              key={section.id}
              ref={
                sectionIndex === messageSections.length - 1 &&
                section.isNewSection
                  ? newSectionRef
                  : null
              }
            >
              {section.isNewSection && (
                <div
                  style={
                    section.isActive && shouldApplyHeight(section.sectionIndex)
                      ? { height: `${getContentHeight()}px` }
                      : {}
                  }
                  className="pt-4 flex flex-col justify-start"
                >
                  {section.messages.map((message) => renderMessage(message))}
                </div>
              )}

              {!section.isNewSection && (
                <div>
                  {section.messages.map((message) => renderMessage(message))}
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-3 bg-gray-50">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div
            ref={inputContainerRef}
            className={cn(
              "relative w-full rounded-3xl border border-gray-200 bg-white p-3 cursor-text",
              isStreaming && "opacity-80"
            )}
            onClick={handleInputContainerClick}
          >
            <div className="pb-9">
              <Textarea
                ref={textareaRef}
                placeholder={
                  isStreaming ? "Waiting for response..." : "Ask Anything"
                }
                className="min-h-[1.5rem] max-h-[10rem] w-full rounded-3xl border-0 bg-transparent text-gray-900 placeholder:text-gray-400 placeholder:text-base focus-visible:ring-0 focus-visible:ring-offset-0 text-base pl-2 pr-4 pt-0 pb-0 resize-none overflow-y-auto leading-tight"
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                  // Ensure the textarea is scrolled into view when focused
                  if (textareaRef.current) {
                    textareaRef.current.scrollIntoView({
                      behavior: "smooth",
                      block: "center",
                    });
                  }
                }}
              />
            </div>

            <div className="absolute bottom-3 left-3 right-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className={cn(
                      "rounded-full h-8 w-8 flex-shrink-0 border-gray-200 p-0 transition-colors",
                      activeButton === "add" && "bg-gray-100 border-gray-300"
                    )}
                    onClick={() => toggleButton("add")}
                    disabled={isStreaming}
                  >
                    <Add
                      className={cn(
                        "h-4 w-4 text-gray-500",
                        activeButton === "add" && "text-gray-700"
                      )}
                    />
                    <span className="sr-only">Add</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "rounded-full h-8 px-3 flex items-center border-gray-200 gap-1.5 transition-colors",
                      activeButton === "deepSearch" &&
                        "bg-gray-100 border-gray-300"
                    )}
                    onClick={() => toggleButton("deepSearch")}
                    disabled={isStreaming}
                  >
                    <Search
                      className={cn(
                        "h-4 w-4 text-gray-500",
                        activeButton === "deepSearch" && "text-gray-700"
                      )}
                    />
                    <span
                      className={cn(
                        "text-gray-900 text-sm",
                        activeButton === "deepSearch" && "font-medium"
                      )}
                    >
                      DeepSearch
                    </span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "rounded-full h-8 px-3 flex items-center border-gray-200 gap-1.5 transition-colors",
                      activeButton === "think" && "bg-gray-100 border-gray-300"
                    )}
                    onClick={() => toggleButton("think")}
                    disabled={isStreaming}
                  >
                    <Lightbulb
                      className={cn(
                        "h-4 w-4 text-gray-500",
                        activeButton === "think" && "text-gray-700"
                      )}
                    />
                    <span
                      className={cn(
                        "text-gray-900 text-sm",
                        activeButton === "think" && "font-medium"
                      )}
                    >
                      Think
                    </span>
                  </Button>
                </div>

                {isStreaming ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="rounded-full h-8 w-8 border-0 flex-shrink-0 transition-all duration-200 bg-red-500"
                    onClick={handleStopStreaming}
                  >
                    <StopCircleSharpIcon className="h-4 w-4 text-white" />
                    <span className="sr-only">Stop</span>
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    variant="outline"
                    size="icon"
                    className={cn(
                      "rounded-full h-8 w-8 border-0 flex-shrink-0 transition-all duration-200",
                      hasTyped ? "bg-black scale-110" : "bg-gray-200"
                    )}
                    disabled={!inputValue.trim() || isStreaming}
                  >
                    <ArrowUpward
                      className={cn(
                        "h-4 w-4 transition-colors",
                        hasTyped ? "text-white" : "text-gray-500"
                      )}
                    />
                    <span className="sr-only">Submit</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
