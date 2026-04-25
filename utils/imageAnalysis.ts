import { Image } from "react-native";

// Standard AI latent grid sizes (Stable Diffusion, DALL-E, Midjourney, Flux etc.)
const AI_GRID_SIZES = new Set([
  256, 320, 384, 448, 512, 576, 640, 704, 768, 832, 896, 960, 1024,
  1088, 1152, 1216, 1280, 1344, 1408, 1472, 1536, 2048,
]);

export interface ImageInfo {
  width: number;
  height: number;
  pixelCount: number;
  isSquare: boolean;
  isAIGridDimension: boolean;
  isHighRes: boolean;
  aspectRatioLabel: string;
  megapixels: number;
}

export async function getImageInfo(uri: string): Promise<ImageInfo | null> {
  return new Promise((resolve) => {
    Image.getSize(
      uri,
      (width, height) => {
        const pixelCount = width * height;
        const megapixels = pixelCount / 1_000_000;
        const isSquare = width === height;
        const isHighRes = pixelCount >= 8_000_000; // 8MP+ = very likely real camera

        // AI generators use latent grid sizes (multiples of 64)
        const isAIGridDimension =
          (AI_GRID_SIZES.has(width) && AI_GRID_SIZES.has(height)) ||
          (width % 64 === 0 && height % 64 === 0 && pixelCount <= 4_194_304); // ≤4MP

        const ar = width / height;
        let aspectRatioLabel = "unknown";
        if (Math.abs(ar - 1) < 0.01) aspectRatioLabel = "1:1 (square)";
        else if (Math.abs(ar - 4 / 3) < 0.03) aspectRatioLabel = "4:3";
        else if (Math.abs(ar - 3 / 2) < 0.03) aspectRatioLabel = "3:2";
        else if (Math.abs(ar - 16 / 9) < 0.04) aspectRatioLabel = "16:9";
        else if (Math.abs(ar - 9 / 16) < 0.04) aspectRatioLabel = "9:16 (portrait)";
        else if (Math.abs(ar - 3 / 4) < 0.03) aspectRatioLabel = "3:4";
        else if (Math.abs(ar - 2 / 3) < 0.03) aspectRatioLabel = "2:3";
        else aspectRatioLabel = `${width}×${height}`;

        resolve({
          width,
          height,
          pixelCount,
          megapixels: Math.round(megapixels * 10) / 10,
          isSquare,
          isAIGridDimension,
          isHighRes,
          aspectRatioLabel,
        });
      },
      () => resolve(null)
    );
  });
}
