'use client';

/**
 * Renders a user avatar — supports both emoji strings and base64/URL images.
 */
interface AvatarProps {
  src: string;        // emoji character OR data URL / http URL
  size?: number;      // px, default 40
  style?: React.CSSProperties;
  className?: string;
}

export function renderAvatar(src: string, size = 40, extraStyle?: React.CSSProperties): React.ReactNode {
  const isImage = src.startsWith('data:') || src.startsWith('http') || src.startsWith('/');
  if (isImage) {
    return (
      <img
        src={src}
        alt="avatar"
        style={{
          width: size, height: size, borderRadius: '50%',
          objectFit: 'cover', display: 'block',
          ...extraStyle,
        }}
      />
    );
  }
  // Emoji — render as text, centered
  return (
    <span style={{ fontSize: size * 0.55, lineHeight: 1, userSelect: 'none', ...extraStyle }}>
      {src}
    </span>
  );
}

export default function Avatar({ src, size = 40, style, className }: AvatarProps) {
  const isImage = src.startsWith('data:') || src.startsWith('http') || src.startsWith('/');
  if (isImage) {
    return (
      <img
        src={src}
        alt="avatar"
        className={className}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', display: 'block', ...style }}
      />
    );
  }
  return (
    <span className={className} style={{ fontSize: size * 0.55, lineHeight: 1, userSelect: 'none', ...style }}>
      {src}
    </span>
  );
}
