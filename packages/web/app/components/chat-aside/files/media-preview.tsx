export type MediaKind = 'image' | 'video' | 'audio' | 'pdf' | null;

export function MediaPreview({
  kind,
  src,
  fileName,
}: {
  kind: Exclude<MediaKind, null>;
  src: string;
  fileName: string;
}) {
  if (kind === 'image') {
    return (
      <div className='flex min-h-full items-start justify-center p-6'>
        <img
          src={src}
          alt={fileName}
          className='h-auto max-w-full object-contain'
        />
      </div>
    );
  }

  if (kind === 'pdf') {
    return (
      <div className='h-full min-h-[600px] w-full'>
        <iframe
          src={src}
          title={fileName}
          className='h-full min-h-[600px] w-full border-0'
        />
      </div>
    );
  }

  if (kind === 'audio') {
    return (
      <div className='flex min-h-full items-start justify-center p-6'>
        <audio
          src={src}
          controls
          preload='metadata'
          className='w-full max-w-2xl'
        />
      </div>
    );
  }

  return (
    <div className='flex min-h-full items-start justify-center p-6'>
      <video
        src={src}
        controls
        preload='metadata'
        className='h-auto max-h-[calc(100vh-6rem)] max-w-full'
      />
    </div>
  );
}
