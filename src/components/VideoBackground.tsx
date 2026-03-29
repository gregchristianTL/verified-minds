"use client";

/**
 *
 */
interface VideoBackgroundProps {
  src: string;
  overlayOpacity?: number;
}

/**
 *
 * @param root0
 * @param root0.src
 * @param root0.overlayOpacity
 */
export default function VideoBackground({
  src,
  overlayOpacity = 0.4,
}: VideoBackgroundProps): React.ReactElement {
  return (
    <>
      <video
        autoPlay
        muted
        loop
        playsInline
        className="fixed inset-0 w-full h-full object-cover -z-20"
        aria-hidden="true"
      >
        <source src={src} type="video/mp4" />
      </video>
      {/* Dark overlay for text readability */}
      <div
        className="fixed inset-0 -z-10"
        style={{ backgroundColor: `rgba(0, 0, 0, ${overlayOpacity})` }}
        aria-hidden="true"
      />
    </>
  );
}
