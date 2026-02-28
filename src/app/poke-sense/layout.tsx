import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PokéSense - Pokemon Learning Adventure",
  description: "Catch Pokemon and learn about them in this fun adventure game!",
};

export default function PokeSenseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 top-[60px] overflow-auto">
      {children}
    </div>
  );
}
