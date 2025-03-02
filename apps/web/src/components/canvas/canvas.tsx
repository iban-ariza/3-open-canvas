"use client";

/**
 * Canvas Component
 * 
 * This is the main canvas component that serves as the primary workspace interface.
 * It manages the layout and interaction between the chat interface and artifact display.
 * 
 * Architecture:
 * - Uses React Server Components (marked with "use client")
 * - Implements a resizable two-panel layout system
 * - Manages state through multiple React contexts (Graph, User, Thread)
 */

import { ArtifactRenderer } from "@/components/artifacts/ArtifactRenderer";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { WebSearchResults } from "@/components/web-search-results";
import { CHAT_COLLAPSED_QUERY_PARAM } from "@/constants";
import { useGraphContext } from "@/contexts/GraphContext";
import { useThreadContext } from "@/contexts/ThreadProvider";
import { useUserContext } from "@/contexts/UserContext";
import { useToast } from "@/hooks/use-toast";
import { getLanguageTemplate } from "@/lib/get_language_template";
import {
  ALL_MODEL_NAMES,
  DEFAULT_MODEL_CONFIG,
  DEFAULT_MODEL_NAME,
} from "@opencanvas/shared/models";
import {
  ArtifactCodeV3,
  ArtifactMarkdownV3,
  ArtifactV3,
  CustomModelConfig,
  ProgrammingLanguageOptions,
} from "@opencanvas/shared/types";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import NoSSRWrapper from "../NoSSRWrapper";
import { ContentComposerChatInterface } from "./content-composer";

/**
 * CanvasComponent handles the main workspace layout and functionality.
 * 
 * State Management:
 * - GraphContext: Manages artifact data and chat state
 * - UserContext: Handles user authentication and preferences
 * - ThreadContext: Controls conversation threading and model configurations
 * 
 * URL State:
 * - Maintains chat collapse state in URL parameters
 * - Enables shareable URLs with preserved interface state
 * 
 * Layout Components:
 * - ResizablePanelGroup: Main container with drag-adjustable panels
 * - Left Panel: Chat interface (collapsible)
 * - Right Panel: Artifact display and web search results
 */
export function CanvasComponent() {
  // Context hooks provide global state management
  // graphData: Manages artifacts and chat state
  // user: Contains user authentication and preferences
  // threadContext: Handles conversation management and model settings
  const { graphData } = useGraphContext();
  const { user } = useUserContext();
  const { threadId, clearThreadsWithNoValues, setModelName, setModelConfig } =
    useThreadContext();
  const { setArtifact, chatStarted, setChatStarted } = graphData;
  const { toast } = useToast();

  /**
   * Local State Management:
   * isEditing: Controls artifact editing mode
   * webSearchResultsOpen: Controls visibility of search sidebar
   * chatCollapsed: Manages chat panel collapse state
   */
  const [isEditing, setIsEditing] = useState(false);
  const [webSearchResultsOpen, setWebSearchResultsOpen] = useState(false);
  const [chatCollapsed, setChatCollapsed] = useState(false);

  /**
   * URL State Management:
   * - searchParams: Access to URL query parameters
   * - router: Next.js router for URL manipulation
   * - chatCollapsedSearchParam: Tracks chat panel state in URL
   */
  const searchParams = useSearchParams();
  const router = useRouter();
  const chatCollapsedSearchParam = searchParams.get(CHAT_COLLAPSED_QUERY_PARAM);

  /**
   * Effect: URL State Synchronization
   * - Parses chat collapsed state from URL
   * - Handles invalid URL parameters gracefully
   * - Updates UI state based on URL parameters
   */
  useEffect(() => {
    try {
      if (chatCollapsedSearchParam) {
        setChatCollapsed(JSON.parse(chatCollapsedSearchParam));
      }
    } catch (e) {
      setChatCollapsed(false);
      const queryParams = new URLSearchParams(searchParams.toString());
      queryParams.delete(CHAT_COLLAPSED_QUERY_PARAM);
      router.replace(`?${queryParams.toString()}`, { scroll: false });
    }
  }, [chatCollapsedSearchParam]);

  /**
   * Effect: Thread Cleanup
   * - Triggers when user or thread ID changes
   * - Removes empty conversation threads
   * - Maintains clean thread state
   */
  useEffect(() => {
    if (!threadId || !user) return;
    // Clear threads with no values
    clearThreadsWithNoValues();
  }, [threadId, user]);

  /**
   * Quick Start Handler
   * Creates new artifacts with predefined templates
   * 
   * @param type - Artifact type ('text' or 'code')
   * @param language - Programming language for code artifacts
   * 
   * Process:
   * 1. Validates required parameters
   * 2. Initializes chat
   * 3. Creates appropriate artifact template
   * 4. Updates application state
   */
  const handleQuickStart = (
    type: "text" | "code",
    language?: ProgrammingLanguageOptions
  ) => {
    if (type === "code" && !language) {
      toast({
        title: "Language not selected",
        description: "Please select a language to continue",
        duration: 5000,
      });
      return;
    }
    setChatStarted(true);

    let artifactContent: ArtifactCodeV3 | ArtifactMarkdownV3;
    if (type === "code" && language) {
      artifactContent = {
        index: 1,
        type: "code",
        title: `Quick start ${type}`,
        code: getLanguageTemplate(language),
        language,
      };
    } else {
      artifactContent = {
        index: 1,
        type: "text",
        title: `Quick start ${type}`,
        fullMarkdown: "",
      };
    }

    const newArtifact: ArtifactV3 = {
      currentIndex: 1,
      contents: [artifactContent],
    };
    // Do not worry about existing items in state. This should
    // never occur since this action can only be invoked if
    // there are no messages/artifacts in the thread.
    setArtifact(newArtifact);
    setIsEditing(true);
  };

  return (
    <ResizablePanelGroup direction="horizontal" className="h-screen">
      {/* Initial Interface State
          Shown when no chat is active
          Provides quick start options and thread selection */}
      {!chatStarted && (
        <NoSSRWrapper>
          {/* Chat interface - adds query string param if chat is collapsed. (replaces the URL with router.replace) */}
          <ContentComposerChatInterface
            chatCollapsed={chatCollapsed}
            setChatCollapsed={(c) => {
              setChatCollapsed(c);
              const queryParams = new URLSearchParams(searchParams.toString());
              queryParams.set(CHAT_COLLAPSED_QUERY_PARAM, JSON.stringify(c));
              // route user to same page, but with additional params (are going to be used by other components)
              router.replace(`?${queryParams.toString()}`, { scroll: false });
            }}
            switchSelectedThreadCallback={(thread) => {
              // Chat should only be "started" if there are messages present
              if ((thread.values as Record<string, any>)?.messages?.length) {
                setChatStarted(true);
                if (thread?.metadata?.customModelName) {
                  setModelName(
                    thread.metadata.customModelName as ALL_MODEL_NAMES
                  );
                } else {
                  setModelName(DEFAULT_MODEL_NAME);
                }

                if (thread?.metadata?.modelConfig) {
                  setModelConfig(
                    (thread?.metadata?.customModelName ??
                      DEFAULT_MODEL_NAME) as ALL_MODEL_NAMES,
                    (thread.metadata?.modelConfig ??
                      DEFAULT_MODEL_CONFIG) as CustomModelConfig
                  );
                } else {
                  setModelConfig(DEFAULT_MODEL_NAME, DEFAULT_MODEL_CONFIG);
                }
              } else {
                setChatStarted(false);
              }
            }}
            setChatStarted={setChatStarted}
            hasChatStarted={chatStarted}
            handleQuickStart={handleQuickStart}
          />
        </NoSSRWrapper>
      )}

      {/* Active Chat Interface
          - Displays when chat is active and not collapsed
          - Contains thread history and input interface
          - Handles model selection and configuration */}
      {!chatCollapsed && chatStarted && (
        <ResizablePanel
          defaultSize={25}
          minSize={15}
          maxSize={50}
          className="transition-all duration-700 h-screen mr-auto bg-gray-50/70 shadow-inner-right"
          id="chat-panel-main"
          order={1}
        >
          <NoSSRWrapper>
            <ContentComposerChatInterface
              chatCollapsed={chatCollapsed}
              setChatCollapsed={(c) => {
                setChatCollapsed(c);
                const queryParams = new URLSearchParams(
                  searchParams.toString()
                );
                queryParams.set(CHAT_COLLAPSED_QUERY_PARAM, JSON.stringify(c));
                router.replace(`?${queryParams.toString()}`, { scroll: false });
              }}
              switchSelectedThreadCallback={(thread) => {
                // Chat should only be "started" if there are messages present
                if ((thread.values as Record<string, any>)?.messages?.length) {
                  setChatStarted(true);
                  if (thread?.metadata?.customModelName) {
                    setModelName(
                      thread.metadata.customModelName as ALL_MODEL_NAMES
                    );
                  } else {
                    setModelName(DEFAULT_MODEL_NAME);
                  }

                  if (thread?.metadata?.modelConfig) {
                    setModelConfig(
                      (thread?.metadata.customModelName ??
                        DEFAULT_MODEL_NAME) as ALL_MODEL_NAMES,
                      (thread.metadata.modelConfig ??
                        DEFAULT_MODEL_CONFIG) as CustomModelConfig
                    );
                  } else {
                    setModelConfig(DEFAULT_MODEL_NAME, DEFAULT_MODEL_CONFIG);
                  }
                } else {
                  setChatStarted(false);
                }
              }}
              setChatStarted={setChatStarted}
              hasChatStarted={chatStarted}
              handleQuickStart={handleQuickStart}
            />
          </NoSSRWrapper>
        </ResizablePanel>
      )}

      {/* Main Content Area
          - Displays artifacts and search results
          - Adjusts size based on chat panel state
          - Handles artifact editing and rendering */}
      {chatStarted && (
        <>
          <ResizableHandle />
          <ResizablePanel
            defaultSize={chatCollapsed ? 100 : 75}
            maxSize={85}
            minSize={50}
            id="canvas-panel"
            order={2}
            className="flex flex-row w-full"
          >
            {/* Artifact display area */}
            <div className="w-full ml-auto">
              <ArtifactRenderer
                chatCollapsed={chatCollapsed}
                setChatCollapsed={(c) => {
                  setChatCollapsed(c);
                  const queryParams = new URLSearchParams(
                    searchParams.toString()
                  );
                  queryParams.set(
                    CHAT_COLLAPSED_QUERY_PARAM,
                    JSON.stringify(c)
                  );
                  router.replace(`?${queryParams.toString()}`, {
                    scroll: false,
                  });
                }}
                setIsEditing={setIsEditing}
                isEditing={isEditing}
              />
            </div>
            {/* Web search results sidebar */}
            <WebSearchResults
              open={webSearchResultsOpen}
              setOpen={setWebSearchResultsOpen}
            />
          </ResizablePanel>
        </>
      )}
    </ResizablePanelGroup>
  );
}

/**
 * Memoized Canvas Component
 * - Prevents unnecessary re-renders
 * - Optimizes performance for complex state changes
 * - Maintains smooth panel resizing
 */
export const Canvas = React.memo(CanvasComponent);
