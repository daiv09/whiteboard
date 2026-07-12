import type { Metadata } from "next";
import Whiteboard from "@/app/components/Whiteboard";

export const metadata: Metadata = {
  title: "whiteboard",
  description: "A high-performance drawing canvas with dynamic bounding box tracking and a 1 FPS VLM API capture pipeline.",
};

export default function Home() {
  return (
    <main className="w-full h-screen overflow-hidden flex flex-col bg-[#F5F5F7]">
      <Whiteboard />
    </main>
  );
}
