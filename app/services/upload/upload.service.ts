
export type UploadedFile = {
  id: string
  url: string
  name: string
  mime_type: string
  extension: string
  size: number
  width: number | null
  height: number | null
  duration: number | null
}

export type UploadOptions = {
  /** Cropped image blob — pass when the user has cropped an image */
  croppedBlob?: Blob
  cropMode?: string
  title?: string
  description?: string
}

/**
 * Upload any file (image, video, document) to the media service.
 * Returns the stored file record including a ready-to-use public URL.
 */
export async function uploadFile(
  file: File,
  options: UploadOptions = {}
): Promise<UploadedFile> {
  const { croppedBlob, cropMode, title, description } = options

  const fd = new FormData()
  fd.append(
    "file",
    croppedBlob
      ? new File([croppedBlob], file.name, { type: "image/jpeg" })
      : file
  )
  if (cropMode)    fd.append("crop_mode", cropMode)
  if (title)       fd.append("title", title)
  if (description) fd.append("description", description)

  const res = await fetch("/api/media/upload", {
    method: "POST",
    body: fd,
    credentials: "include",
  })

  const data = await res.json()
  if (!data.ok) throw new Error(data.error ?? "Upload failed")

  return data.item as UploadedFile
}
