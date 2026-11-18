import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { CloseIcon } from "@/components/koi/icons";
import "./PictureViewer.css";

export interface PictureViewerProps {
  src: string;
  alt: string;
  open: boolean;
  onClose: () => void;
}

function largeVersion(src: string): string {
  return src.replace(/\.(jpe?g|png|webp)$/i, "-large.$1");
}

export function PictureViewer({ src, alt, open, onClose }: PictureViewerProps) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [current, setCurrent] = useState(() => largeVersion(src));

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    } else if (!open && dialog.open) {
      if (typeof dialog.close === "function") dialog.close();
      else dialog.removeAttribute("open");
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="koi-viewer"
      aria-label={alt}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {open && (
        <figure className="koi-viewer__figure">
          <img
            src={current}
            alt={alt}
            className="koi-viewer__img"
            onError={() => {
              if (current !== src) setCurrent(src);
            }}
          />
          <figcaption className="koi-viewer__caption">{alt}</figcaption>
        </figure>
      )}
      <button
        type="button"
        className="koi-iconbtn koi-viewer__close"
        aria-label={t("koi.close")}
        title={t("koi.close")}
        onClick={onClose}
      >
        <CloseIcon size={16} />
      </button>
    </dialog>
  );
}
