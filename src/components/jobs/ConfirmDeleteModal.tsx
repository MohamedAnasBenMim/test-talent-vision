"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangleIcon, Loader2Icon, Trash2Icon } from "lucide-react";

type ConfirmDeleteModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title: string;
  isDeleting?: boolean;
};

export default function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  isDeleting = false,
}: ConfirmDeleteModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isDeleting && !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] border border-border/80 shadow-2xl p-6 sm:p-7">
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-destructive/10 text-destructive border border-destructive/20 mt-0.5">
            <AlertTriangleIcon className="size-6" />
          </div>
          <div className="space-y-2">
            <DialogHeader className="p-0 text-left">
              <DialogTitle className="text-xl font-extrabold text-foreground tracking-tight">
                Delete Job Position?
              </DialogTitle>
            </DialogHeader>
            <DialogDescription className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Are you sure you want to permanently delete position{" "}
              <span className="font-bold text-foreground underline decoration-destructive/40 underline-offset-2">"{title}"</span>? All associated data and application records will be affected. This action cannot be undone.
            </DialogDescription>
          </div>
        </div>

        <DialogFooter className="mt-6 flex flex-row items-center justify-end gap-3 pt-3 border-t border-border/60">
          <Button
            type="button"
            variant="outline"
            size="default"
            onClick={onClose}
            disabled={isDeleting}
            className="h-10 px-5 text-sm font-semibold"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="default"
            onClick={onConfirm}
            disabled={isDeleting}
            className="h-10 px-5 text-sm font-semibold gap-2 shadow-md shadow-destructive/20"
          >
            {isDeleting ? (
              <>
                <Loader2Icon className="size-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2Icon className="size-4" />
                Delete Position
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
