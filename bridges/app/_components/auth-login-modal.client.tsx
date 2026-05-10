"use client";

import { useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  authUrl: string;
  onSuccess: () => void;
};

export function AuthLoginModal({ open, onOpenChange, authUrl, onSuccess }: Props) {
  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (e.data?.type === "AUTH_SUCCESS") {
        onSuccess();
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onSuccess]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-3">
          <DialogTitle className="text-sm">Sign in to Fractera</DialogTitle>
        </DialogHeader>
        <iframe
          src={`${authUrl}/register`}
          className="w-full border-0"
          style={{ height: 440 }}
          title="Sign in"
        />
      </DialogContent>
    </Dialog>
  );
}
