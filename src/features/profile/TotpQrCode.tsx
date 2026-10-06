import QRCode from "qrcode";

// Four modules of quiet zone, as the QR specification requires.
const quietZone = 4;

// Derived locally from the validated provisioning URI during render; there is
// no network request, canvas, image URL, or authenticator handoff. The label
// names the purpose and never the encoded value.
export function TotpQrCode({
  value,
  label,
}: {
  readonly value: string;
  readonly label: string;
}) {
  const { modules } = QRCode.create(value, { errorCorrectionLevel: "M" });
  let path = "";
  for (let row = 0; row < modules.size; row++)
    for (let column = 0; column < modules.size; column++)
      if (modules.get(row, column) !== 0)
        path += `M${column + quietZone} ${row + quietZone}h1v1h-1z`;
  const extent = modules.size + quietZone * 2;
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${extent} ${extent}`}
      shapeRendering="crispEdges"
      className="size-48 max-w-full sm:size-56"
    >
      <rect width={extent} height={extent} fill="#fff" />
      <path d={path} fill="#000" />
    </svg>
  );
}
