import React, { useEffect } from "react";
import { X } from "lucide-react";
import { WarningCircle } from "@phosphor-icons/react";
import { Button } from "./Button";

export function Backdrop({ onClose }: { onClose: () => void }) {
  return <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = "max-w-md",
}: {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <Backdrop onClose={onClose} />
      <div
        className={`relative w-full ${maxWidth} max-h-[90vh] overflow-y-auto custom-scrollbar bg-bg-card rounded-2xl border border-white/10 shadow-2xl p-6 z-50 animate-in fade-in zoom-in-95 duration-200`}
      >
        <div className="flex justify-between items-center mb-6">
          {title ? (
            <h3 className="text-xl font-bold text-white">{title}</h3>
          ) : (
            <div />
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-text-sub hover:text-white hover:bg-white/10 bg-white/5 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="text-text-main">{children}</div>
        {footer && <div className="mt-8 flex gap-2">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "확인",
  cancelText = "취소",
  variant = "brand",
  isLoading = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "brand" | "danger";
  isLoading?: boolean;
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="flex flex-col gap-6">
        <div className="flex gap-4">
          {variant === "danger" && (
            <div className="w-12 h-12 rounded-full bg-status-danger/10 flex items-center justify-center flex-shrink-0">
              <WarningCircle className="w-6 h-6 text-status-danger" weight="fill" />
            </div>
          )}
          <div className="flex-1">
            <p className="text-text-sub leading-relaxed">{description}</p>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button variant={variant} onClick={onConfirm} disabled={isLoading}>
            {isLoading ? "처리 중..." : confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
