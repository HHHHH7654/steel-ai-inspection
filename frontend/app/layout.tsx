import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SteelVision | 热轧钢带划痕检测与质量追溯",
  description: "面向智能质检的热轧钢带表面划痕检测、人工复核与质量追溯 Web 平台。",
  openGraph: {
    title: "SteelVision | 热轧钢带划痕检测与质量追溯",
    description: "真实文件校验、Mock 推理、人工复核与实施边界清晰的质量检测演示系统。",
    images: ["/steelvision-og-v3.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "SteelVision | 热轧钢带划痕检测与质量追溯",
    description: "真实文件校验、Mock 推理与人工复核。",
    images: ["/steelvision-og-v3.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
