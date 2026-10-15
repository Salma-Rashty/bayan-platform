"use client";

import { useRef, useState } from "react";
import { DownloadIcon, EyeIcon, Loader2Icon, MaximizeIcon, XIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { api, ApiError } from "@/lib/api";
import { formatBytes } from "@/lib/teacher-application-form";
import type { TeacherApplicationFile } from "@/lib/types";

type FileKind = "cv" | "video";

interface FileLinks {
  view_url: string;
  download_url: string;
  expires_at: string;
}

const LABELS: Record<FileKind, string> = { cv: "CV", video: "Video" };

/**
 * Files are on a private disk: each View/Download asks the API (as the signed-in admin) for
 * short-lived signed links, so no standing file URL is ever exposed.
 */
function fetchLinks(applicationId: number, kind: FileKind): Promise<FileLinks> {
  return api.post<FileLinks>(`/teacher-applications/${applicationId}/files/${kind}/links`);
}

/** The download link answers with Content-Disposition: attachment, so the page stays put. */
function startDownload(url: string) {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

function FileViewer({
  kind,
  file,
  open,
  onOpenChange,
  links,
  linksError,
  onRetry,
}: {
  kind: FileKind;
  file: TeacherApplicationFile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  links: FileLinks | null;
  linksError: string | null;
  onRetry: () => void;
}) {
  const stage = useRef<HTMLDivElement>(null);
  // Keyed by URL, so a fresh set of links (a retry) starts loading again.
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const url = links?.view_url ?? null;
  const loading = !linksError && (!url || (loadedUrl !== url && failedUrl !== url));
  const failed = !!url && failedUrl === url;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex h-[min(90vh,56rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5">
          <div className="min-w-0">
            <DialogTitle className="truncate">
              {LABELS[kind]}: {file.name}
            </DialogTitle>
            {file.size !== null && <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>}
          </div>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="outline" disabled={!links} onClick={() => links && startDownload(links.download_url)}>
              <DownloadIcon data-icon="inline-start" />
              Download
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={!url || failed}
              onClick={() => stage.current?.requestFullscreen().catch(() => toast.error("Fullscreen isn't available here."))}
            >
              <MaximizeIcon data-icon="inline-start" />
              Fullscreen
            </Button>
            <DialogClose render={<Button size="icon-sm" variant="ghost" aria-label="Close viewer" />}>
              <XIcon />
            </DialogClose>
          </div>
        </div>

        <div ref={stage} className="relative min-h-0 flex-1 bg-muted/40">
          {linksError ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
              <p className="text-sm text-muted-foreground">{linksError}</p>
              <Button size="sm" variant="outline" onClick={onRetry}>
                Try again
              </Button>
            </div>
          ) : failed ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
              <p className="max-w-sm text-sm text-muted-foreground">
                This video couldn&apos;t be played here. Its format may not be supported by your browser, or the
                link expired. Try again, or download it to watch.
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={onRetry}>
                  Try again
                </Button>
                <Button size="sm" onClick={() => links && startDownload(links.download_url)}>
                  <DownloadIcon data-icon="inline-start" />
                  Download
                </Button>
              </div>
            </div>
          ) : (
            url &&
            (kind === "cv" ? (
              <iframe
                key={url}
                src={url}
                title={`CV: ${file.name}`}
                className="size-full border-0 bg-background"
                onLoad={() => setLoadedUrl(url)}
              />
            ) : (
              <video
                key={url}
                src={url}
                controls
                preload="metadata"
                className="size-full bg-black object-contain"
                onLoadedMetadata={() => setLoadedUrl(url)}
                onError={() => setFailedUrl(url)}
              />
            ))
          )}

          {loading && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2Icon className="size-4 animate-spin" aria-hidden />
              Loading {LABELS[kind].toLowerCase()}...
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * View + Download for one of an application's files. View opens an in-page viewer (PDF or
 * video); files the browser can't preview (e.g. a Word CV) are download-only, with a note.
 */
export function ApplicationFileActions({
  applicationId,
  kind,
  file,
}: {
  applicationId: number;
  kind: FileKind;
  file: TeacherApplicationFile | null;
}) {
  const [open, setOpen] = useState(false);
  const [links, setLinks] = useState<FileLinks | null>(null);
  const [linksError, setLinksError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  if (!file) {
    return <span className="text-muted-foreground">{kind === "video" ? "No video provided" : "Not provided"}</span>;
  }

  function loadLinks() {
    setLinks(null);
    setLinksError(null);
    fetchLinks(applicationId, kind)
      .then(setLinks)
      .catch((error) => setLinksError(errorMessage(error, `Couldn't open this ${LABELS[kind].toLowerCase()}.`)));
  }

  async function download() {
    setDownloading(true);
    try {
      startDownload((await fetchLinks(applicationId, kind)).download_url);
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't start the download."));
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        {file.previewable && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setOpen(true);
              loadLinks();
            }}
          >
            <EyeIcon data-icon="inline-start" />
            View
          </Button>
        )}
        <Button size="sm" variant="outline" disabled={downloading} onClick={download}>
          <DownloadIcon data-icon="inline-start" />
          {downloading ? "Preparing..." : "Download"}
        </Button>
      </div>
      {!file.previewable && (
        <p className="text-xs text-muted-foreground">
          This {kind === "cv" ? "CV isn't a PDF" : "file isn't a video the browser can play"}, so it can only be
          downloaded.
        </p>
      )}
      {file.previewable && (
        <FileViewer
          kind={kind}
          file={file}
          open={open}
          onOpenChange={setOpen}
          links={links}
          linksError={linksError}
          onRetry={loadLinks}
        />
      )}
    </div>
  );
}
