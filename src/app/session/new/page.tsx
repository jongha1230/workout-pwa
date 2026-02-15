"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function NewSessionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const routineId = searchParams.get("routineId");

  const handleStart = () => {
    const sessionId = crypto.randomUUID();
    router.push(`/session/${sessionId}`);
  };

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle>새 세션</CardTitle>
          <CardDescription>
            {routineId
              ? `선택된 루틴: ${routineId}`
              : "루틴 없이 바로 세션을 시작합니다."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleStart}>세션 시작</Button>
        </CardContent>
      </Card>
    </main>
  );
}

export default function NewSessionPage() {
  return (
    <Suspense fallback={<main className="mx-auto w-full max-w-xl p-4" />}>
      <NewSessionContent />
    </Suspense>
  );
}
