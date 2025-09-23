import path from "path";
import { Jimp } from "jimp";
import sharp from "sharp";
export async function imageOverlay(overlayPath, voucherCode = "9AA2509D") {
  try {
    const basePath = path.join("public", "qr_bg.png"); // background image
    const outputPath = path.join("public", `${voucherCode}.png`);
    const outputFinall = path.join(
      "public",
      "final",
      `${voucherCode}_finall.png`
    );

    // Load images
    const [baseImage, overlayImage] = await Promise.all([
      Jimp.read(basePath),
      Jimp.read(overlayPath),
    ]);

    // === 1. Resize QR overlay ===
    const qrSize = 180;
    overlayImage.resize({ w: qrSize, h: qrSize });

    // === 2. Position QR on the right side ===
    const x = baseImage.bitmap.width - qrSize - 40; // 40px padding from right
    const y = baseImage.bitmap.height / 2 - qrSize / 2; // center vertically

    baseImage.composite(overlayImage, x, y);

    // === 4. Save final ===
    await baseImage.write(outputPath);

    const svg = `
    <svg width="200" height="150">
      <style>
        .title { fill: white; font-size: 12px; font-family: Arial, sans-serif; }
      </style>
      <text x="50" y="100" class="title">Hello World 🚀</text>
    </svg>
  `;

    await sharp(outputPath)
      .composite([{ input: Buffer.from(svg), top: 50, left: 50 }])
      .toFile(outputFinall);

    console.log(`✅ Image processed successfully → ${outputPath}`);

    return outputFinall;
  } catch (err) {
    console.error("❌ Error in imageOverlay:", err);
    throw err;
  }
}
