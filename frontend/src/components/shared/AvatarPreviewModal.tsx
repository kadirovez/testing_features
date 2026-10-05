import { X } from "lucide-react";
import { useLocale } from "../../context/LocaleContext";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { IconButton } from "./IconButton";

interface AvatarPreviewModalProps {
  imageUrl: string;
  onClose: () => void;
}

export function AvatarPreviewModal({ imageUrl, onClose }: AvatarPreviewModalProps) {
  const { t } = useLocale();

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showClose={false}
        aria-describedby={undefined}
        className="w-auto max-w-[min(92vw,640px)] overflow-visible border-0 bg-transparent p-0 shadow-none"
      >
        <DialogTitle className="sr-only">{t("avatar.previewLabel")}</DialogTitle>
        <IconButton
          label={t("common.close")}
          className="absolute top-2 right-2 z-[1] bg-black/50 text-white hover:bg-black/65 hover:text-white"
          onClick={onClose}
        >
          <X strokeWidth={1.75} />
        </IconButton>
        <img className="block max-h-[86dvh] max-w-full rounded-xl object-contain" src={imageUrl} alt="" draggable={false} />
      </DialogContent>
    </Dialog>
  );
}
