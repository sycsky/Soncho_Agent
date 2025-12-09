import React from 'react';

interface AvatarProps {
  name?: string;
  src?: string;
  size?: number;
  borderClassName?: string;
  bgClassName?: string;
  textClassName?: string;
}

const isFullWidth = (ch: string) => {
  const cp = ch.codePointAt(0) || 0;
  if ((cp >= 0x4E00 && cp <= 0x9FFF) || (cp >= 0x3400 && cp <= 0x4DBF)) return true;
  if ((cp >= 0x3040 && cp <= 0x309F) || (cp >= 0x30A0 && cp <= 0x30FF)) return true;
  if (cp >= 0xAC00 && cp <= 0xD7AF) return true;
  if ((cp >= 0xFF01 && cp <= 0xFF60) || (cp >= 0xFFE0 && cp <= 0xFFE6)) return true;
  return false;
};

const getInitials = (n?: string) => {
  const s = (n || '').trim();
  if (!s) return 'U';
  const chars = Array.from(s);
  const preferred = chars.filter(ch => /\p{L}|\p{N}/u.test(ch));
  const source = preferred.length ? preferred : chars;
  const first = source[0] || 'U';
  if (isFullWidth(first)) return first;
  let out = '';
  for (const ch of source) {
    if (isFullWidth(ch)) break;
    out += ch;
    if (out.length >= 2) break;
  }
  return /^[A-Za-z]+$/.test(out) ? out.toUpperCase() : out || first;
};

export const Avatar: React.FC<AvatarProps> = ({ name, src, size = 24, borderClassName = '', bgClassName = 'bg-gray-200', textClassName = 'text-gray-600' }) => {
  if (src) {
    return <img src={src} style={{ width: size, height: size }} className={`rounded-full ${borderClassName}`} />;
  }
  return (
    <div style={{ width: size, height: size }} className={`rounded-full ${bgClassName} flex items-center justify-center ${borderClassName}`}>
      <span className={`font-bold ${textClassName}`} style={{ fontSize: Math.max(10, Math.floor(size * 0.4)) }}>{getInitials(name)}</span>
    </div>
  );
};

export default Avatar;
