interface AvatarProps {
  src?: string | null;
  name: string;
  /** px単位のサイズ */
  size?: number;
  /** 背景色（画像がない場合） */
  bg?: string;
}

export default function Avatar({
  src,
  name,
  size = 32,
  bg = "var(--gray-6)",
}: AvatarProps) {
  const fontSize = Math.round(size * 0.4);

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover",
          flexShrink: 0,
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize,
        fontWeight: 600,
        color: "#fff",
        flexShrink: 0,
      }}
    >
      {name.charAt(0)}
    </div>
  );
}
