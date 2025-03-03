/**
 * ArtifactTitle Component
 * 
 * A header component that displays the title of an artifact along with its save status.
 * Provides real-time visual feedback about the artifact's save state using icons.
 */

import { CircleCheck, CircleX, LoaderCircle } from "lucide-react";

/**
 * Props for the ArtifactTitle component
 * @property {string} title - The display title of the artifact
 * @property {boolean} isArtifactSaved - Indicates if the artifact has been successfully saved
 * @property {boolean} artifactUpdateFailed - Indicates if the last save attempt failed
 */
interface ArtifactTitleProps {
  title: string;
  isArtifactSaved: boolean;
  artifactUpdateFailed: boolean;
}

/**
 * Renders an artifact's title with a dynamic save status indicator
 * 
 * Features:
 * - Truncates long titles with ellipsis (line-clamp-1)
 * - Shows real-time save status with appropriate icons
 * - Provides visual feedback for three states:
 *   1. Saved (green checkmark)
 *   2. Saving (animated spinner)
 *   3. Failed to save (red X)
 * 
 * @param props - The component props of type ArtifactTitleProps
 */
export function ArtifactTitle(props: ArtifactTitleProps) {
  return (
    <div className="pl-[6px] pt-3 flex flex-col items-start justify-start ml-[6px] gap-1 max-w-1/2">
      <h1 className="text-xl font-medium text-gray-600 line-clamp-1">
        {props.title}
      </h1>
      <span className="mt-auto">
        {/* When SAVED */}
        {props.isArtifactSaved ? (
          // saved in gray text
          <span className="flex items-center justify-start gap-1 text-gray-400">
            <p className="text-xs font-light">Saved</p>
            {/* CIRCLE SAVING ICON */}
            <CircleCheck className="w-[10px] h-[10px]" />
          </span>

          // SAVED=FALSE + ARTIFACTFAILED=FALSE, THEN LOADING
        ) : !props.artifactUpdateFailed ? (
          <span className="flex items-center justify-start gap-1 text-gray-400">
            <p className="text-xs font-light">Saving</p>
            <LoaderCircle className="animate-spin w-[10px] h-[10px]" />
          </span>

          // SAVED=FALSE + ARTIFACTFAILED=TRUE, THEN FAILED
        ) : props.artifactUpdateFailed ? (
          <span className="flex items-center justify-start gap-1 text-red-300">
            <p className="text-xs font-light">Failed to save</p>
            <CircleX className="w-[10px] h-[10px]" />
          </span>

          // ELSE, NULL
        ) : null}
      </span>
    </div>
  );
}
