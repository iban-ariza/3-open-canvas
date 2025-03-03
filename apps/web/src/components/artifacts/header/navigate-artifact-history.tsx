import { TooltipIconButton } from "@/components/ui/assistant-ui/tooltip-icon-button";
import { Forward } from "lucide-react";

interface NavigateArtifactHistoryProps {
  isBackwardsDisabled: boolean;
  isForwardDisabled: boolean;
  setSelectedArtifact: (prevState: number) => void;
  currentArtifactIndex: number;
  totalArtifactVersions: number;
}

/*
Function - navigation components in the canvas. An artifact is basically a response from chatGPT. 
1. backwards / forwards buttons - hover on those and you see the previous/next words with (version X / N versions)
2. artifact - is basically each chatGPT response in canvas. One response = one artifact. current index - index pointing to the appropriate canvas/artifact

*/
export function NavigateArtifactHistory(props: NavigateArtifactHistoryProps) {
  const prevTooltip = `Previous (${props.currentArtifactIndex - 1}/${props.totalArtifactVersions})`;
  const nextTooltip = `Next (${props.currentArtifactIndex + 1}/${props.totalArtifactVersions})`;

  return (
    <div className="flex items-center justify-center gap-1">
      {/* HELPER TOOL TIP */}
      {/* Display tool tip, basically a 'help' when you hover an icon. Delay for the time to appear when hovering */}
      <TooltipIconButton
        tooltip={prevTooltip}
        side="left"
        variant="ghost"
        delayDuration={400}
        onClick={() => {
          if (!props.isBackwardsDisabled) {
            props.setSelectedArtifact(props.currentArtifactIndex - 1);
          }
        }}
        // disable when 
        disabled={props.isBackwardsDisabled}
        className="w-fit h-fit p-2"
      >
        {/* BACKWARD BUTTON (effect = scale-x-[-1]) */}
        <Forward
          aria-disabled={props.isBackwardsDisabled}
          className="w-6 h-6 text-gray-600 scale-x-[-1]"
        />
      </TooltipIconButton>
      {/* HELPER TOOL TIP */}
      <TooltipIconButton
        tooltip={nextTooltip}
        variant="ghost"
        side="right"
        delayDuration={400}
        onClick={() => {
          if (!props.isForwardDisabled) {
            props.setSelectedArtifact(props.currentArtifactIndex + 1);
          }
        }}
        disabled={props.isForwardDisabled}
        className="w-fit h-fit p-2"
      >
        {/* FORWARD BUTTON */}
        <Forward
          aria-disabled={props.isForwardDisabled}
          className="w-6 h-6 text-gray-600"
        />
      </TooltipIconButton>
    </div>
  );
}
