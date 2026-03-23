"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import HomeView from "@/components/home/home-view";
import { useHomeOverview } from "@/components/home/use-home-overview";
import { useStartSession } from "@/components/home/use-start-session";

const SESSION_SHELL_PREFETCH_PATH =
  "/session/11111111-1111-1111-1111-111111111111";
export default function Home() {
  const router = useRouter();
  const overview = useHomeOverview();
  const sessionStart = useStartSession();

  useEffect(() => {
    router.prefetch("/routines");
    router.prefetch("/session/new");
    router.prefetch(SESSION_SHELL_PREFETCH_PATH);
  }, [router]);

  return <HomeView overview={overview} sessionStart={sessionStart} />;
}
