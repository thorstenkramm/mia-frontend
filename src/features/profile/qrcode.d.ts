// Local typings for the pinned `qrcode` 1.5.4 package; MIA uses only `create`,
// whose module matrix it renders as inline SVG (no canvas, data:, or blob: URL).
declare module "qrcode" {
  type QrModules = {
    readonly size: number;
    get(row: number, column: number): number;
  };
  type QrSymbol = { readonly modules: QrModules };
  type QrCodeLibrary = {
    create(
      text: string,
      options: { readonly errorCorrectionLevel: "L" | "M" | "Q" | "H" },
    ): QrSymbol;
  };
  const qrcode: QrCodeLibrary;
  export default qrcode;
}
