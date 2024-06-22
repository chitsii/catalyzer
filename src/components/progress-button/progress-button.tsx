import { useEffect } from "react";
import { useMachine } from "@xstate/react";
import { progressButtonMachine } from "@/components/progress-button/state-machine";
import { Check, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

import { info, warn } from "@tauri-apps/plugin-log";

import { Loader2 } from "lucide-react";
const Icons = {
  spinner: Loader2,
};

type ProgressButtonProps = {
  successColorClass?: string;
  onClick?: () => void;
  onCompleteDownload: () => void;
  onCompleteExtract: () => void;
  onError?: (error: Error) => void;
  download_progress: number;
  extract_progress: number;
  label: string;
};

const ProgressButton = ({
  successColorClass,
  onClick,
  onCompleteDownload,
  onCompleteExtract,
  onError,
  download_progress,
  extract_progress,
  label,
}: ProgressButtonProps) => {
  const [state, send] = useMachine(progressButtonMachine);

  useEffect(() => {
    info(`download_progress: ${download_progress}`);
    if (download_progress) {
      if (download_progress >= 100 && !state.matches("inExtractProgress")) {
        try {
          send({ type: "completeDownload" });
        } catch (e: any) {
          onError?.(e);
        }
      } else {
        send({ type: "setProgress", progress: download_progress });
      }
    }
  }, [download_progress]);

  useEffect(() => {
    info(`extract_progress: ${extract_progress}`);
    if (extract_progress) {
      if (extract_progress >= 100 && !state.matches("success")) {
        try {
          send({ type: "completeExtract" });
        } catch (e: any) {
          onError?.(e);
        }
      } else {
        send({ type: "setProgress", progress: extract_progress });
      }
    }
  }, [extract_progress]);

  const handleClick = () => {
    send({ type: "click" });
    onClick?.();
  };

  const prefixIcon = <File className="h-3.5 w-3.5" />;
  const buttonLabel = <span className="sm:whitespace-nowrap">{label}</span>;
  const progressBarDL = <Progress value={state.context.download_progress} className="w-[60px] h-[10px]" />;
  const progressBarExt = <Progress value={state.context.extract_progress} className="w-[60px] h-[10px]" />;
  const successIcon = <Check className="h-5 w-5" />;

  const bgColor = `[&>*>*]:bg-${successColorClass}`;
  const bgColorClassDL = state.context.download_progress >= 100 ? bgColor : "[&>*>*]:bg-primary-900";
  const bgColorClassExt = state.context.extract_progress >= 100 ? bgColor : "[&>*>*]:bg-primary-900";

  return (
    <div className="flex flex-col justify-center items-center h-full">
      <Button
        variant="outline"
        className={`w-[250px] h-7 gap-1 group ${!state.matches("idle") ? "pointer-events-none" : ""}`}
        onClick={handleClick}
      >
        {state.matches("idle") && (
          <span className="flex gap-1 items-center animate-in fade-in zoom-in spin-in">
            <span className="transition-all duration-200 group-hover:-rotate-12">{prefixIcon}</span>
            {buttonLabel}
          </span>
        )}
        {state.matches("inDownloadProgress") && (
          <>
            <span className={`transition-color animate-in fade-in zoom-in absolute`}>
              <span className={bgColorClassDL}>{progressBarDL}</span>
            </span>
            {/* <span className="absolute top-0 left-0 w-full h-full flex justify-center items-center">Downloading...</span> */}
          </>
        )}
        {state.matches("inExtractProgress") && (
          <>
            <span className={`transition-color animate-in fade-in zoom-in absolute`}>
              <Icons.spinner className="h-5 w-5 animate-spin" />
              {/* <span className={bgColorClassExt}>{progressBarExt}</span> */}
              {/* <span className="absolute top-0 left-0 w-full h-full flex justify-center items-center">Extracting...</span> */}
            </span>
          </>
        )}
        {state.matches("success") && <span className="animate-in fade-in zoom-in spin-in">{successIcon}</span>}
        {state.matches("successFadeOut") && <span className="animate-out fade-out zoom-out">{successIcon}</span>}
      </Button>
    </div>
  );
};

export default ProgressButton;
