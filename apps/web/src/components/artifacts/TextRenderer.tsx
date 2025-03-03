/**
 * TextRenderer Component
 * 
 * A rich text editor component that handles both markdown and WYSIWYG editing.
 * Features:
 * - Real-time markdown parsing and rendering
 * - Raw markdown view toggle
 * - Text selection tracking
 * - Streaming content support
 * - Copy functionality
 */

import { useGraphContext } from "@/contexts/GraphContext";
import { cn } from "@/lib/utils";
import "@blocknote/core/fonts/inter.css";
import {
  getDefaultReactSlashMenuItems,
  SuggestionMenuController,
  useCreateBlockNote,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import "@blocknote/shadcn/style.css";
import { ArtifactMarkdownV3 } from "@opencanvas/shared/types";
import { getArtifactContent, isArtifactMarkdownContent } from "@opencanvas/shared/utils/artifacts";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import React, { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { TooltipIconButton } from "../ui/assistant-ui/tooltip-icon-button";
import { Textarea } from "../ui/textarea";
import { CopyText } from "./components/CopyText";

/**
 * Utility function to clean text by replacing escaped newlines
 */
const cleanText = (text: string) => {
  return text.replaceAll("\\\n", "\n");
};

/**
 * ViewRawText Component
 * Toggle button for switching between rendered and raw markdown views
 * Includes animation effects and tooltip
 */
function ViewRawText({
  isRawView,
  setIsRawView,
}: {
  isRawView: boolean;
  setIsRawView: Dispatch<SetStateAction<boolean>>;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
    >
      <TooltipIconButton
        tooltip={`View ${isRawView ? "rendered" : "raw"} markdown`}
        variant="outline"
        delayDuration={400}
        onClick={() => setIsRawView((p) => !p)}
      >
        {isRawView ? (
          <EyeOff className="w-5 h-5 text-gray-600" />
        ) : (
          <Eye className="w-5 h-5 text-gray-600" />
        )}
      </TooltipIconButton>
    </motion.div>
  );
}

/**
 * Props interface for the TextRenderer component
 * @property isEditing - Controls whether the editor is in edit mode
 * @property isHovering - Tracks mouse hover state for UI elements
 * @property isInputVisible - Controls visibility of input elements
 */
export interface TextRendererProps {
  isEditing: boolean;
  isHovering: boolean;
  isInputVisible: boolean;
}

/**
 * TextRendererComponent
 * 
 * Core text editing component with features:
 * 1. BlockNote editor integration
 * 2. Real-time markdown conversion
 * 3. Text selection tracking
 * 4. Streaming content handling
 * 5. Raw markdown editing mode
 * 
 * State Management:
 * - Tracks raw markdown content
 * - Manages view mode (raw/rendered)
 * - Handles manual updates
 * - Synchronizes with global artifact state
 */
export function TextRendererComponent(props: TextRendererProps) {
  /**
   * Editor instance and global state management
   * Handles document structure and content updates
   */
  const editor = useCreateBlockNote({});
  const { graphData } = useGraphContext();
  const {
    artifact,
    isStreaming,
    updateRenderedArtifactRequired,
    firstTokenReceived,
    setArtifact,
    setSelectedBlocks,
    setUpdateRenderedArtifactRequired,
  } = graphData;

  /**
   * Local state for managing editor behavior and content
   */
  const [rawMarkdown, setRawMarkdown] = useState("");
  const [isRawView, setIsRawView] = useState(false);
  const [manuallyUpdatingArtifact, setManuallyUpdatingArtifact] =
    useState(false);

  /**
   * Effect: Text Selection Handling
   * Tracks selected text and updates global state
   * Maintains selection context for operations
   */
  useEffect(() => {
    const selectedText = editor.getSelectedText();
    const selection = editor.getSelection();

    if (selectedText && selection) {
      if (!artifact) {
        console.error("Artifact not found");
        return;
      }

      const currentBlockIdx = artifact.currentIndex;
      const currentContent = artifact.contents.find(
        (c) => c.index === currentBlockIdx
      );
      if (!currentContent) {
        console.error("Current content not found");
        return;
      }
      if (!isArtifactMarkdownContent(currentContent)) {
        console.error("Current content is not markdown");
        return;
      }

      (async () => {
        const [markdownBlock, fullMarkdown] = await Promise.all([
          editor.blocksToMarkdownLossy(selection.blocks),
          editor.blocksToMarkdownLossy(editor.document),
        ]);
        setSelectedBlocks({
          fullMarkdown: cleanText(fullMarkdown),
          markdownBlock: cleanText(markdownBlock),
          selectedText: cleanText(selectedText),
        });
      })();
    }
  }, [editor.getSelectedText()]);

  /**
   * Effect: Input Visibility
   * Clears selection when input becomes invisible
   */
  useEffect(() => {
    if (!props.isInputVisible) {
      setSelectedBlocks(undefined);
    }
  }, [props.isInputVisible]);

  /**
   * Effect: Artifact Synchronization
   * Handles:
   * - Streaming content updates
   * - Manual content changes
   * - Block parsing and rendering
   */
  useEffect(() => {
    if (!artifact) {
      return;
    }
    if (
      !isStreaming &&
      !manuallyUpdatingArtifact &&
      !updateRenderedArtifactRequired
    ) {
      return;
    }

    try {
      const currentIndex = artifact.currentIndex;
      const currentContent = artifact.contents.find(
        (c) => c.index === currentIndex && c.type === "text"
      ) as ArtifactMarkdownV3 | undefined;
      if (!currentContent) return;

      // Blocks are not found in the artifact, so once streaming is done we should update the artifact state with the blocks
      (async () => {
        const markdownAsBlocks = await editor.tryParseMarkdownToBlocks(
          currentContent.fullMarkdown
        );
        editor.replaceBlocks(editor.document, markdownAsBlocks);
        setUpdateRenderedArtifactRequired(false);
        setManuallyUpdatingArtifact(false);
      })();
    } finally {
      setManuallyUpdatingArtifact(false);
      setUpdateRenderedArtifactRequired(false);
    }
  }, [artifact, updateRenderedArtifactRequired]);

  /**
   * Effect: Raw View Toggle
   * Manages transitions between raw and rendered views
   * Handles markdown parsing and block conversion
   */
  useEffect(() => {
    if (isRawView) {
      editor.blocksToMarkdownLossy(editor.document).then(setRawMarkdown);
    } else if (!isRawView && rawMarkdown) {
      try {
        (async () => {
          setManuallyUpdatingArtifact(true);
          const markdownAsBlocks =
            await editor.tryParseMarkdownToBlocks(rawMarkdown);
          editor.replaceBlocks(editor.document, markdownAsBlocks);
          setManuallyUpdatingArtifact(false);
        })();
      } catch (_) {
        setManuallyUpdatingArtifact(false);
      }
    }
  }, [isRawView, editor]);

  /**
   * Composition tracking for input methods
   * Prevents unwanted updates during IME composition
   */
  const isComposition = useRef(false);

  /**
   * Content Change Handler
   * Updates artifact state with new content
   * Manages real-time content synchronization
   */
  const onChange = async () => {
    if (
      isStreaming ||
      manuallyUpdatingArtifact ||
      updateRenderedArtifactRequired
    )
      return;

    const fullMarkdown = await editor.blocksToMarkdownLossy(editor.document);
    setArtifact((prev) => {
      if (!prev) {
        return {
          currentIndex: 1,
          contents: [
            {
              index: 1,
              fullMarkdown: fullMarkdown,
              title: "Untitled",
              type: "text",
            },
          ],
        };
      } else {
        return {
          ...prev,
          contents: prev.contents.map((c) => {
            if (c.index === prev.currentIndex) {
              return {
                ...c,
                fullMarkdown: fullMarkdown,
              };
            }
            return c;
          }),
        };
      }
    });
  };

  /**
   * Raw Markdown Change Handler
   * Handles direct markdown text updates
   * Synchronizes with artifact state
   */
  const onChangeRawMarkdown = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newRawMarkdown = e.target.value;
    setRawMarkdown(newRawMarkdown);
    setArtifact((prev) => {
      if (!prev) {
        return {
          currentIndex: 1,
          contents: [
            {
              index: 1,
              fullMarkdown: newRawMarkdown,
              title: "Untitled",
              type: "text",
            },
          ],
        };
      } else {
        return {
          ...prev,
          contents: prev.contents.map((c) => {
            if (c.index === prev.currentIndex) {
              return {
                ...c,
                fullMarkdown: newRawMarkdown,
              };
            }
            return c;
          }),
        };
      }
    });
  };

  return (
    <div className="w-full h-full mt-2 flex flex-col border-t-[1px] border-gray-200 overflow-y-auto py-5 relative">
      {props.isHovering && artifact && (
        <div className="absolute flex gap-2 top-2 right-4 z-10">
          <CopyText currentArtifactContent={getArtifactContent(artifact)} />
          <ViewRawText isRawView={isRawView} setIsRawView={setIsRawView} />
        </div>
      )}

      {/* MARKDOWN RAW VIEW */}
      {isRawView ? (
        <Textarea
          className="whitespace-pre-wrap font-mono text-md px-[54px] border-0 shadow-none h-full outline-none ring-0 rounded-none  focus-visible:ring-0 focus-visible:ring-offset-0"
          value={rawMarkdown}
          onChange={onChangeRawMarkdown}
        />
      ) : (
        <>
          <style jsx global>{`
            .pulse-text .bn-block-group {
              animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
            }

            @keyframes pulse {
              0%,
              100% {
                opacity: 1;
              }
              50% {
                opacity: 0.3;
              }
            }
          `}</style>
          <BlockNoteView
            theme="light"
            formattingToolbar={false}
            slashMenu={false}
            onCompositionStartCapture={() => (isComposition.current = true)}
            onCompositionEndCapture={() => (isComposition.current = false)}
            onChange={onChange}
            editable={
              !isStreaming || props.isEditing || !manuallyUpdatingArtifact
            }
            editor={editor}
            className={cn(
              isStreaming && !firstTokenReceived ? "pulse-text" : "",
              "custom-blocknote-theme"
            )}
          >
            <SuggestionMenuController
              getItems={async () =>
                getDefaultReactSlashMenuItems(editor).filter(
                  (z) => z.group !== "Media"
                )
              }
              triggerCharacter={"/"}
            />
          </BlockNoteView>
        </>
      )}
    </div>
  );
}

/**
 * Memoized TextRenderer
 * Optimizes rendering performance for complex markdown content
 */
export const TextRenderer = React.memo(TextRendererComponent);
