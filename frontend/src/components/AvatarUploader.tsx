import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import Cropper from "react-easy-crop";
import type { Area, Point } from "react-easy-crop";
import { createPortal } from "react-dom";
import { Alert, Button, Spinner } from "flowbite-react";
import { getErrorMessage, mediaApi, settingsApi } from "@/api";
import type { User } from "@/api/types";
import { mediaUrl } from "@/utils/helpers";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_SIDE_PX = 512;
const JPEG_QUALITY = 0.9;

const primaryButtonClasses =
  "bg-sky-600 enabled:hover:bg-sky-500 dark:bg-sky-400 dark:text-slate-900 dark:enabled:hover:bg-sky-300";

class UploadError extends Error {}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image), { once: true });
    image.addEventListener(
      "error",
      () => reject(new UploadError("This image could not be read. Try a different photo.")),
      { once: true }
    );
    image.src = src;
  });
}

async function cropToAvatarFile(objectUrl: string, area: Area): Promise<File> {
  const image = await loadImage(objectUrl);
  const scale = Math.min(1, MAX_SIDE_PX / Math.max(area.width, area.height));
  const width = Math.max(1, Math.round(area.width * scale));
  const height = Math.max(1, Math.round(area.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new UploadError("Your browser could not process this image.");
  context.imageSmoothingQuality = "high";
  context.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, width, height);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) =>
        result ? resolve(result) : reject(new UploadError("This image could not be cropped.")),
      "image/jpeg",
      JPEG_QUALITY
    );
  });
  return new File([blob], "avatar.jpg", { type: "image/jpeg" });
}

export interface AvatarUploaderProps {
  user: User;
  onChanged: () => Promise<void> | void;
}

export function AvatarUploader({ user, onChanged }: AvatarUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pixels, setPixels] = useState<Area | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  const avatarSrc = mediaUrl(user.avatar?.file_path ?? user.avatar?.url);
  const initial = (
    user.first_name?.trim() ||
    user.username?.trim() ||
    user.name?.trim() ||
    "?"
  )
    .charAt(0)
    .toUpperCase();

  useEffect(() => {
    if (!objectUrl) return;
    return () => URL.revokeObjectURL(objectUrl);
  }, [objectUrl]);

  useEffect(() => {
    if (!objectUrl) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [objectUrl]);

  const resetModal = useCallback(() => {
    setObjectUrl(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setPixels(null);
    setError("");
  }, []);

  const closeModal = useCallback(() => {
    if (saving) return;
    resetModal();
  }, [saving, resetModal]);

  useEffect(() => {
    if (!objectUrl) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [objectUrl, closeModal]);

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError("");
    if (!file.type.startsWith("image/")) {
      setError("That file is not an image. Pick a JPG, PNG or WebP photo.");
      return;
    }
    if (file.size === 0) {
      setError("That file is empty. Pick another photo.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError("That photo is larger than 10 MB. Pick a smaller one.");
      return;
    }

    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setPixels(null);
    setObjectUrl(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!objectUrl || !pixels) return;
    setSaving(true);
    setError("");
    try {
      const file = await cropToAvatarFile(objectUrl, pixels);
      const { data } = await mediaApi.uploadPhoto(file);
      if (!data.file_id) throw new UploadError("The upload did not return a file id. Please try again.");
      await settingsApi.updateProfile(user.id, { avatar_id: data.file_id });
      await onChanged();
      resetModal();
    } catch (err) {
      setError(
        err instanceof UploadError
          ? err.message
          : getErrorMessage(err, "Could not save your photo.")
      );
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    setRemoving(true);
    setError("");
    try {
      await settingsApi.updateProfile(user.id, { avatar_id: null });
      await onChanged();
    } catch (err) {
      setError(getErrorMessage(err, "Could not remove your photo."));
    } finally {
      setRemoving(false);
    }
  };

  const onBackdropMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) closeModal();
  };

  return (
    <div className="mb-6">
      <div className="flex items-center gap-5">
        {avatarSrc ? (
          <img
            src={avatarSrc}
            alt="Your avatar"
            className="h-24 w-24 shrink-0 rounded-full object-cover ring-2 ring-slate-200 dark:ring-white/15"
          />
        ) : (
          <div
            aria-hidden="true"
            className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-sky-100 text-3xl font-bold text-sky-600 dark:bg-sky-900/40 dark:text-sky-400"
          >
            {initial}
          </div>
        )}

        <div className="flex min-w-0 flex-col items-start gap-3">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            {user.name || user.username}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={saving || removing}
              className={primaryButtonClasses}
            >
              Change photo
            </Button>
            {avatarSrc && (
              <Button
                type="button"
                color="red"
                outline
                onClick={handleRemove}
                disabled={saving || removing}
              >
                {removing && <Spinner size="sm" className="mr-2" />}
                Remove photo
              </Button>
            )}
          </div>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFileChange}
      />

      {error && !objectUrl && (
        <Alert color="failure" className="mt-4">
          {error}
        </Alert>
      )}

      {objectUrl &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Crop your photo"
            onMouseDown={onBackdropMouseDown}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
          >
            <div className="glass-moon max-h-[90vh] w-full max-w-lg overflow-y-auto p-6 shadow-2xl">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Crop your photo</h3>
              <p className="mb-4 mt-1 text-sm text-slate-500 dark:text-slate-400">
                Drag to reposition, then zoom to frame your photo.
              </p>

              <div className="relative h-[340px] w-full overflow-hidden rounded-xl bg-slate-900 dark:bg-moon-dark">
                <Cropper
                  image={objectUrl}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={(_, croppedAreaPixels) => setPixels(croppedAreaPixels)}
                />
              </div>

              <div className="mt-5">
                <label
                  htmlFor="avatar-zoom"
                  className="mb-2 block text-sm font-semibold text-slate-900 dark:text-white"
                >
                  Zoom
                </label>
                <input
                  id="avatar-zoom"
                  type="range"
                  min={1}
                  max={3}
                  step={0.01}
                  value={zoom}
                  onChange={(event) => setZoom(Number(event.target.value))}
                  disabled={saving}
                  className="w-full accent-sky-600 dark:accent-sky-400"
                />
              </div>

              {error && (
                <Alert color="failure" className="mt-4">
                  {error}
                </Alert>
              )}

              <div className="mt-6 flex justify-end gap-3">
                <Button type="button" color="gray" onClick={closeModal} disabled={saving}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !pixels}
                  className={primaryButtonClasses}
                >
                  {saving && <Spinner size="sm" className="mr-2" />}
                  {saving ? "Saving…" : "Save avatar"}
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
