"use client";

/**
 * Canvas Component
 * 
 * This is the main canvas component that serves as the primary workspace interface.
 * It manages the layout and interaction between the chat interface and artifact display.
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
 * It consists of two main parts:
 * 1. Chat interface panel (left side)
 * 2. Artifact display panel (right side)
 * 
 * Features:
 * - Resizable panels
 * - Collapsible chat interface
 * - Quick start functionality for code and text
 * - Web search results integration
 */
export function CanvasComponent() {
  // State management for user context, graph data, and thread information
  const { graphData } = useGraphContext();
  const { user } = useUserContext();
  const { threadId, clearThreadsWithNoValues, setModelName, setModelConfig } =
    useThreadContext();
  const { setArtifact, chatStarted, setChatStarted } = graphData;
  const { toast } = useToast();

  // Local state for UI controls
  const [isEditing, setIsEditing] = useState(false);
  const [webSearchResultsOpen, setWebSearchResultsOpen] = useState(false);
  const [chatCollapsed, setChatCollapsed] = useState(false);

  // URL parameter handling for chat collapsed state
  const searchParams = useSearchParams();
  const router = useRouter();
  const chatCollapsedSearchParam = searchParams.get(CHAT_COLLAPSED_QUERY_PARAM);

  /**
   * Effect to sync chat collapsed state with URL parameters
   * Ensures chat state persistence across page reloads
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
   * Effect to clean up unused threads when user or thread changes
   */
  useEffect(() => {
    if (!threadId || !user) return;
    // Clear threads with no values
    clearThreadsWithNoValues();
  }, [threadId, user]);

  /**
   * Handles the quick start functionality for creating new artifacts
   * @param type - The type of artifact to create ('text' or 'code')
   * @param language - The programming language for code artifacts
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
      {/* Initial state when chat hasn't started */}
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

      {/* Active chat panel when chat is not collapsed */}
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

      {/* Main content area with artifact display */}
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

// Memoized version of the canvas component for performance optimization
export const Canvas = React.memo(CanvasComponent);
