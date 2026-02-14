import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center text-center">
        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight">
          Gokul Mess
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-md">
          Authentic Homemade Meals. <br />
          Digitized for Speed & Convenience.
        </p>
        
        <div className="flex gap-4 items-center flex-col sm:flex-row">
          <Link href="/login">
            <Button size="lg" className="rounded-full text-lg px-8 py-6">
              Enter Mess Portal
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
